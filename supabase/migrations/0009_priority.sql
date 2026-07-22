-- Manual "most wanted" flag on an application (user request, idea 1 of 4).
-- Deliberately a plain boolean, not computed from other fields -- the user
-- sets it explicitly, same tier of decision as is_archived. Not null/
-- default false so existing rows and new manual entries start unflagged.

alter table applications add column is_priority boolean not null default false;
