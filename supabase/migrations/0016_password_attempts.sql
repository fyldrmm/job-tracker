-- Rate limiting for account-action's password verification (security review
-- 2026-07-28, Finding #3). Before this, a stolen session token could grind
-- the password check indefinitely -- confirmed live: 6 rapid wrong-password
-- attempts all processed identically, no counter, no lockout anywhere.
--
-- Same shape as 0008_reserve_extraction.sql: SECURITY DEFINER + an advisory
-- lock so concurrent requests from the same account can't race the counter,
-- and a hardcoded grant to service_role only -- p_user_id is a parameter, so
-- without that restriction any authenticated caller could check or reset
-- another user's lockout state.
create table password_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failures int not null default 0,
  locked_until timestamptz
);

create or replace function check_password_attempt(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_until timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('password_attempt:' || p_user_id::text));

  select locked_until into v_locked_until
    from password_attempts
    where user_id = p_user_id;

  if v_locked_until is not null and v_locked_until > now() then
    return jsonb_build_object('locked', true, 'locked_until', v_locked_until);
  end if;

  return jsonb_build_object('locked', false);
end;
$$;

-- Called after the password check regardless of outcome: resets the counter
-- on success, increments (and locks past a threshold) on failure. 5 failures
-- -> 15 minute lock; the lock window itself resets the failure count so a
-- lock always requires 5 *fresh* failures, not 5 total since account
-- creation.
create or replace function record_password_result(p_user_id uuid, p_success boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('password_attempt:' || p_user_id::text));

  if p_success then
    delete from password_attempts where user_id = p_user_id;
    return;
  end if;

  insert into password_attempts (user_id, failures, locked_until)
    values (p_user_id, 1, null)
    on conflict (user_id) do update
      set failures = password_attempts.failures + 1,
          locked_until = case
            when password_attempts.failures + 1 >= 5 then now() + interval '15 minutes'
            else password_attempts.locked_until
          end;
end;
$$;

revoke execute on function check_password_attempt(uuid) from public, anon, authenticated;
grant execute on function check_password_attempt(uuid) to service_role;

revoke execute on function record_password_result(uuid, boolean) from public, anon, authenticated;
grant execute on function record_password_result(uuid, boolean) to service_role;

-- No RLS policies needed beyond the default (RLS not even enabled) -- the
-- table is never exposed via PostgREST; every access goes through the two
-- SECURITY DEFINER functions above, both service_role-only.
alter table password_attempts enable row level security;
