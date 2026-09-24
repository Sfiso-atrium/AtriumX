-- 059_accommodation_listings_visible_to_accommodation_businesses.sql
--
-- accommodation_listings_select_student_or_owner (migration 054) only ever
-- let a viewer see two kinds of rows: their own listing (any status), or —
-- if they were a student — active listings matching their university. A
-- signed-in business account fell into neither branch, so no matter what
-- the app asked for, every OTHER provider's listing came back empty for
-- them. That's what made the accommodation home page ("Other
-- accommodation") show nothing even when listings clearly existed.
--
-- This adds a third case: a signed-in business account flagged as an
-- accommodation provider (business_profiles.is_accommodation = true) can
-- see every active listing, the same way an anonymous visitor can — with
-- no university restriction, since a business account has no single
-- university of its own to match against, and this page is meant to be a
-- market-wide view for them. An ordinary (non-accommodation) business
-- still isn't included here, since this is specifically about
-- accommodation providers browsing each other's listings.

DROP POLICY IF EXISTS "accommodation_listings_select_student_or_owner" ON accommodation_listings;

CREATE POLICY "accommodation_listings_select_student_or_owner" ON accommodation_listings
FOR SELECT USING (
  seller_id = auth.uid()
  OR (
    status = 'active'
    AND (
      auth.uid() IS NULL
      OR EXISTS (
        SELECT 1 FROM profiles me
        WHERE me.id = auth.uid()
        AND me.account_type = 'student'
        AND (
          me.university IS NULL
          OR me.university = ANY(accommodation_listings.universities)
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles me
        JOIN business_profiles bp ON bp.id = me.id
        WHERE me.id = auth.uid()
        AND me.account_type = 'business'
        AND bp.is_accommodation = true
      )
    )
  )
);
