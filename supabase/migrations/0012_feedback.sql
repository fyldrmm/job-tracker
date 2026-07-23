-- Feedback box: a 1-5 star rating plus an optional free-text comment,
-- reachable from the sidebar. Insert-only from the client -- reviewed
-- directly in the Supabase dashboard (Table Editor connects as the
-- project owner and bypasses RLS), so there's no SELECT policy for
-- anon/authenticated and no in-app admin view.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  -- Null for guests; set to auth.uid() when signed in so submissions can be
  -- followed up with. on delete set null (not cascade) -- feedback is a
  -- historical record and shouldn't disappear if the account is later deleted.
  user_id uuid references auth.users (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

-- A guest (auth.uid() is null) may only insert with user_id null; a signed-in
-- user may only insert their own id -- either way, no one can attribute
-- feedback to someone else.
create policy "feedback_insert_own_or_guest"
  on feedback for insert
  with check (user_id is null or auth.uid() = user_id);
