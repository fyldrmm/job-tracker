-- DB-level backstop for field lengths (security review 2026-07-28,
-- Finding #8). Client-side maxLength already exists on every field below
-- (ApplicationForm.tsx, TrackerTabs.tsx, FeedbackModal.tsx) -- these
-- constraints just close the gap where a stolen token or a direct API call
-- bypasses client validation entirely. Limits match the existing client
-- maxLengths exactly, so nothing legitimate is newly rejected.
--
-- Not covered here: the account display name, which lives in Supabase
-- Auth's user_metadata (GoTrue-managed, not a plain table this migration
-- can reach) -- its 100-char client-side maxLength (AccountModal.tsx,
-- AuthModal.tsx) is left as the only guard, an accepted gap the review
-- itself rated Low.
alter table applications
  add constraint applications_company_length check (char_length(company) <= 200),
  add constraint applications_role_title_length check (char_length(role_title) <= 200),
  add constraint applications_salary_range_length check (salary_range is null or char_length(salary_range) <= 200),
  add constraint applications_location_length check (location is null or char_length(location) <= 200),
  add constraint applications_job_link_length check (job_link is null or char_length(job_link) <= 2000),
  add constraint applications_notes_length check (notes is null or char_length(notes) <= 5000);

alter table trackers
  add constraint trackers_name_length check (char_length(name) <= 100);

alter table feedback
  add constraint feedback_comment_length check (comment is null or char_length(comment) <= 2000);
