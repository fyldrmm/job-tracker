-- Interview scheduling (M13). One row per interview round on an application.
--
-- Deliberately a separate table rather than columns on `applications`: an
-- application can have several rounds (user requirement -- the card stays in
-- the Interview column and gains "round 2", "round 3" over time), and columns
-- can't hold a growing list.
--
-- A row exists ONLY when the user actually supplied a date. "Skip -- I don't
-- have the details yet" is the absence of a row, which is what makes the
-- calendar export safe by construction: nothing half-filled can ever be
-- exported, because there is nothing to export. Hence scheduled_at is NOT
-- NULL -- a nullable date would reintroduce exactly the state this design
-- rules out.

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  -- 1, 2, 3 ... surfaced as the "nth round" indicator on the card.
  round int not null,
  -- timestamptz, not date+time columns: built from the user's local date/time
  -- inputs and stored UTC, so the .ics (DTSTART...Z) lands on the right
  -- instant regardless of which device imports it.
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  -- Remote interviews put the meeting link in `location`; on-site ones put
  -- the address there. Both map onto the single LOCATION field an .ics has.
  is_remote boolean not null default false,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_application_id_idx on interviews (application_id);

-- Rounds are numbered max(round) + 1 client-side; the unique index is the
-- backstop that keeps two devices racing on the same application from both
-- claiming round 2.
create unique index interviews_application_round_idx on interviews (application_id, round);

create trigger interviews_set_updated_at
  before update on interviews
  for each row
  execute function set_updated_at();

alter table interviews enable row level security;

-- Like stage_history (0001_init.sql), interviews has no user_id column of its
-- own, so every policy scopes through the parent application's ownership.
create policy "interviews_select_own"
  on interviews for select
  using (
    exists (
      select 1 from applications
      where applications.id = interviews.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "interviews_insert_own"
  on interviews for insert
  with check (
    exists (
      select 1 from applications
      where applications.id = interviews.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "interviews_update_own"
  on interviews for update
  using (
    exists (
      select 1 from applications
      where applications.id = interviews.application_id
        and applications.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from applications
      where applications.id = interviews.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "interviews_delete_own"
  on interviews for delete
  using (
    exists (
      select 1 from applications
      where applications.id = interviews.application_id
        and applications.user_id = auth.uid()
    )
  );
