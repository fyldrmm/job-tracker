-- Newsletter abuse hardening (security review 2026-07-28, Finding #6).
-- Before this, newsletter-subscribe added straight to the Resend audience
-- on every call: unauthenticated, unrate-limited, single opt-in. Anyone
-- could list-bomb third-party addresses (spam complaints against
-- fazare.dev's sending domain, Resend suspension risk) and there was no
-- provable, timestamped consent record for an EU-facing product.
--
-- Two pieces:
-- 1. An IP-hash-keyed rate limit (same SECURITY DEFINER + advisory-lock +
--    service_role-only shape as 0008_reserve_extraction.sql / 0016's
--    password_attempts). Keyed on IP, not email, because email is exactly
--    what's being abused -- an attacker rotating target addresses from one
--    machine must still be caught.
-- 2. A pending-confirmation table for double opt-in. newsletter-subscribe
--    no longer touches Resend directly -- it inserts a pending row and
--    emails a confirmation link; only newsletter-confirm (clicking that
--    link) adds the address to Resend. This is intentionally NOT wired to
--    beta access -- LandingPage.tsx's onSubscribed/submitted UX only
--    depends on the initial POST succeeding, never on confirmation, so the
--    beta funnel is unaffected.

create table newsletter_rate_limit (
  ip_hash text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

create or replace function check_newsletter_rate_limit(p_ip_hash text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row newsletter_rate_limit;
begin
  perform pg_advisory_xact_lock(hashtext('newsletter_rate_limit:' || p_ip_hash));

  select * into v_row from newsletter_rate_limit where ip_hash = p_ip_hash;

  if v_row is null or v_row.window_start < now() - (p_window_seconds || ' seconds')::interval then
    insert into newsletter_rate_limit (ip_hash, count, window_start)
      values (p_ip_hash, 1, now())
      on conflict (ip_hash) do update set count = 1, window_start = now();
    return true;
  end if;

  if v_row.count >= p_limit then
    return false;
  end if;

  update newsletter_rate_limit set count = count + 1 where ip_hash = p_ip_hash;
  return true;
end;
$$;

revoke execute on function check_newsletter_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_newsletter_rate_limit(text, int, int) to service_role;

-- Never exposed via PostgREST -- RLS enabled with zero policies, matching
-- password_attempts. Only the two newsletter Edge Functions (service-role
-- clients) ever touch this table.
create table newsletter_pending_confirmations (
  token uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

alter table newsletter_rate_limit enable row level security;
alter table newsletter_pending_confirmations enable row level security;
