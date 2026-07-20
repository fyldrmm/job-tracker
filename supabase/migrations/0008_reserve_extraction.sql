-- Atomic quota enforcement for AI extraction (AUDIT.md M2).
--
-- The Edge Function used to read both counts, compare, call Anthropic
-- (seconds of wall-clock), then insert. Concurrent requests all pass the
-- check before any row lands, so the per-user and global monthly caps --
-- the stated wallet protection -- were bypassable with simple parallelism.
--
-- This function reserves a slot (inserts the row with tokens still null)
-- inside the same transaction as the count check, serialized by an advisory
-- lock so two concurrent callers can't both see room and both insert.
-- Volume is tiny, so one global lock is fine -- no need to key it per user.
--
-- SECURITY DEFINER + a hardcoded grant to service_role only: p_user_id is a
-- parameter, so without that restriction any authenticated caller could
-- insert extraction_events rows attributed to *any* user, or pass inflated
-- limits to bypass the caps outright. This function must never be callable
-- from the browser.
create or replace function reserve_extraction(
  p_user_id uuid,
  p_per_user_limit int,
  p_global_limit int,
  p_month_start timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_count int;
  v_global_count int;
  v_event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('reserve_extraction'));

  select count(*) into v_user_count
    from extraction_events
    where user_id = p_user_id and created_at >= p_month_start;

  if v_user_count >= p_per_user_limit then
    return jsonb_build_object('status', 'per_user');
  end if;

  select count(*) into v_global_count
    from extraction_events
    where created_at >= p_month_start;

  if v_global_count >= p_global_limit then
    return jsonb_build_object('status', 'global');
  end if;

  insert into extraction_events (user_id)
    values (p_user_id)
    returning id into v_event_id;

  return jsonb_build_object('status', 'ok', 'event_id', v_event_id);
end;
$$;

revoke execute on function reserve_extraction(uuid, int, int, timestamptz) from public, anon, authenticated;
grant execute on function reserve_extraction(uuid, int, int, timestamptz) to service_role;
