-- Job Application Tracker — initial schema (M1)
-- Data model per job-tracker-mvp-brief.md §5. RLS is enabled on every table
-- from the start — this is a hard requirement, not an optimization to add later.

create type application_stage as enum ('eyes_on', 'applied', 'interview', 'offer');
create type archive_reason as enum ('rejected', 'withdrawn', 'no_response', 'accepted');

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role_title text not null,
  job_link text,
  date_applied date not null default current_date,
  current_stage application_stage not null default 'applied',
  salary_range text,
  location text,
  notes text,
  is_archived boolean not null default false,
  archive_reason archive_reason,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_idx on applications (user_id);
create index applications_user_id_is_archived_idx on applications (user_id, is_archived);

create table stage_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  stage application_stage not null,
  entered_at timestamptz not null default now()
);

create index stage_history_application_id_idx on stage_history (application_id);

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_set_updated_at
  before update on applications
  for each row
  execute function set_updated_at();

-- Row Level Security — every table, every user scoped to their own rows.
alter table applications enable row level security;
alter table stage_history enable row level security;

create policy "applications_select_own"
  on applications for select
  using (auth.uid() = user_id);

create policy "applications_insert_own"
  on applications for insert
  with check (auth.uid() = user_id);

create policy "applications_update_own"
  on applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "applications_delete_own"
  on applications for delete
  using (auth.uid() = user_id);

-- stage_history has no user_id column (per the brief's data model), so its
-- RLS policies scope through the parent application's ownership instead.
create policy "stage_history_select_own"
  on stage_history for select
  using (
    exists (
      select 1 from applications
      where applications.id = stage_history.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "stage_history_insert_own"
  on stage_history for insert
  with check (
    exists (
      select 1 from applications
      where applications.id = stage_history.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "stage_history_delete_own"
  on stage_history for delete
  using (
    exists (
      select 1 from applications
      where applications.id = stage_history.application_id
        and applications.user_id = auth.uid()
    )
  );
