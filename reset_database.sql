-- DANGER: This script will DELETE ALL DATA and TABLES in your database.
-- Run this only if you want to completely reset your database.

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS substitutes CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Note: We do not drop auth.users as that is managed by Supabase Auth system.
-- If you want to clear users, you should do it via the Supabase Dashboard > Authentication > Users.
