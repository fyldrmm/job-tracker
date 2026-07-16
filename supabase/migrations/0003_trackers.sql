-- Multiple named trackers per user (e.g. "US Applications" / "EU Applications").
-- A tracker is a self-contained board: its own 4 pipeline columns and its
-- own slice of the archive. The Archive *view* stays a single screen (per
-- product decision) but groups entries by tracker.

create table trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trackers_user_id_idx on trackers (user_id);

create trigger trackers_set_updated_at
  before update on trackers
  for each row
  execute function set_updated_at();

alter table trackers enable row level security;

create policy "trackers_select_own"
  on trackers for select
  using (auth.uid() = user_id);

create policy "trackers_insert_own"
  on trackers for insert
  with check (auth.uid() = user_id);

create policy "trackers_update_own"
  on trackers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trackers_delete_own"
  on trackers for delete
  using (auth.uid() = user_id);

-- Add the column nullable first so existing rows aren't rejected, backfill
-- a default tracker per user, then tighten to NOT NULL.
alter table applications add column tracker_id uuid references trackers (id) on delete cascade;

do $$
declare
  r record;
  new_tracker_id uuid;
begin
  for r in select distinct user_id from applications where tracker_id is null loop
    insert into trackers (user_id, name) values (r.user_id, 'My Applications')
      returning id into new_tracker_id;
    update applications set tracker_id = new_tracker_id
      where user_id = r.user_id and tracker_id is null;
  end loop;
end $$;

alter table applications alter column tracker_id set not null;

create index applications_tracker_id_idx on applications (tracker_id);
