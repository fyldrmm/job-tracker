-- Usage tracking for AI job-detail extraction (M8), so the Edge Function can
-- enforce a per-user monthly cap and a global monthly cap before calling the
-- Anthropic API. One row per successful extraction.

create table extraction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index extraction_events_user_id_created_at_idx on extraction_events (user_id, created_at);

alter table extraction_events enable row level security;

-- Users can see their own usage (for a "X of N left this month" display).
-- Inserts happen inside the extract-job-details Edge Function via the
-- service-role key, on the user's behalf -- not directly from the client.
create policy "extraction_events_select_own"
  on extraction_events for select
  using (auth.uid() = user_id);
