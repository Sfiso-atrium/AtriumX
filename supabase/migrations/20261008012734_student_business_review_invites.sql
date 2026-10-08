-- Shared invitation links are public; publishing must require an active student.
-- Preserve the existing one-review-per-student/business constraint and public reads.
ALTER POLICY business_reviews_insert_student ON public.business_reviews
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = student_id
    AND student_id <> business_id
    AND reply IS NULL AND replied_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles AS reviewer
      WHERE reviewer.id = (SELECT auth.uid())
        AND reviewer.account_type = 'student'
        AND NOT COALESCE(reviewer.is_blocked, false)
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles_public AS business
      WHERE business.id = business_reviews.business_id
        AND business.account_type = 'business'
    )
  );
