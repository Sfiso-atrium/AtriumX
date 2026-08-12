-- 021_fix_business_review_insert_check.sql
-- business_reviews_insert_student (migration 014) checks business_id is a
-- real business account by querying `profiles` directly. Migration 018
-- locked `profiles` down to owner-only reads, so that EXISTS subquery now
-- runs under the reviewing student's own permissions and can no longer see
-- the seller's row — every review insert has been silently rejected since.
-- profiles_public already exposes account_type safely to everyone, so the
-- check just needs to read from there instead. No new data exposure: this
-- view has been readable by any authenticated user since migration 016.
DROP POLICY IF EXISTS "business_reviews_insert_student" ON business_reviews;
CREATE POLICY "business_reviews_insert_student" ON business_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (SELECT 1 FROM profiles_public WHERE id = business_id AND account_type = 'business')
  );
