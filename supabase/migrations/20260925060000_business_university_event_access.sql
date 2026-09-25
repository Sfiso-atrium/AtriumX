-- 064_business_university_event_access.sql
-- Keep a business account's selected university set authoritative for
-- business-facing university access and event visibility.

-- Older business accounts were created before business_profiles.universities
-- existed. Their signup university is already stored on profiles.university,
-- so use that value to establish the new account-level access set where it is
-- still empty.
UPDATE business_profiles bp
SET universities = ARRAY[p.university]
FROM profiles p
WHERE bp.id = p.id
  AND p.account_type = 'business'
  AND p.university IS NOT NULL
  AND trim(p.university) <> ''
  AND COALESCE(array_length(bp.universities, 1), 0) = 0;

-- Students remain scoped to their profile university. Businesses are scoped
-- to the universities explicitly selected on their business account.
DROP POLICY IF EXISTS "events_select_same_university" ON events;
CREATE POLICY "events_select_same_university" ON events
  FOR SELECT TO authenticated
  USING (
    university IS NULL
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          (p.account_type = 'business' AND EXISTS (
            SELECT 1
            FROM business_profiles bp
            WHERE bp.id = p.id
              AND events.university = ANY(COALESCE(bp.universities, '{}'))
          ))
          OR
          (p.account_type <> 'business' AND university = p.university)
        )
    )
  );
