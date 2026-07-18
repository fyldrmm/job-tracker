-- Employment type (full-time/part-time/freelance) and work mode
-- (on-site/remote/hybrid) as optional, structured fields on an application
-- -- user request, and also extractable from a screenshot in M8's
-- extract-job-details Edge Function. Nullable: existing rows and manual
-- entries with no strong opinion just leave these unset.

create type employment_type as enum ('full_time', 'part_time', 'freelance');
create type work_mode as enum ('on_site', 'remote', 'hybrid');

alter table applications add column employment_type employment_type;
alter table applications add column work_mode work_mode;
