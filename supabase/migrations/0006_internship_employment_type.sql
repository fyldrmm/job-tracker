-- Add 'internship' as a fourth employment_type option (user request).
-- ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
-- statement that uses the new value, but as its own standalone statement
-- (which is how the Supabase SQL editor runs this file) it's safe.
alter type employment_type add value 'internship';
