-- Self-service account deletion (M6).
--
-- The client SDK cannot delete a user's own auth.users row directly -- that
-- normally requires the service_role key, which must never be in frontend
-- code. Instead, this function runs with elevated privilege (SECURITY
-- DEFINER) but is hardcoded to delete only auth.uid() -- the caller's own
-- row, never a parameter -- so an authenticated user can only ever delete
-- themselves, not anyone else.
--
-- Deleting the auth.users row cascades (via the existing FK in
-- 0001_init.sql) through applications -> stage_history, so this is a
-- complete wipe of the user's data, not just an orphaned auth account.
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;
