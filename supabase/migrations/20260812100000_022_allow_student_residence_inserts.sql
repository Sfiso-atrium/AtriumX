-- 022_allow_student_residence_inserts.sql
-- EditProfile.tsx already upserts a new residence into this table when a
-- student saves one that doesn't exist yet — but the original insert
-- policy was admin-only, so that upsert has been failing silently ever
-- since. Students can now add a new residence name; only admins can still
-- edit or remove existing ones, so nobody can vandalize the list.
DROP POLICY IF EXISTS "residences_insert_admin" ON residences;
CREATE POLICY "residences_insert_authenticated" ON residences FOR INSERT TO authenticated
  WITH CHECK (true);
