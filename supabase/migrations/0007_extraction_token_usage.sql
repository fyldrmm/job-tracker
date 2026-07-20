-- Track Anthropic token usage per extraction event, for cost visibility in
-- the Supabase Table Editor. Nullable -- existing rows predate this and
-- have no usage data; extract-job-details/index.ts populates both columns
-- for every new event going forward.

alter table extraction_events add column input_tokens integer;
alter table extraction_events add column output_tokens integer;
