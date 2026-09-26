-- 072_public_profile_projections.sql
-- Keep public profile data intentionally small while preserving fields already
-- used by the application's public profile/listing views.
--
-- PostgreSQL cannot remove columns from an existing view with CREATE OR REPLACE
-- VIEW. The previous version attempted to remove columns from profiles_public,
-- so the migration failed with 42P16. The dependent policy is dropped first,
-- then the view is recreated with the intended public projection, and the policy
-- is restored.

DROP POLICY IF EXISTS "business_reviews_insert_student" ON business_reviews;
DROP VIEW IF EXISTS profiles_public;

CREATE VIEW profiles_public AS
SELECT
  id,
  full_name,
  residence,
  avatar_initials,
  avatar_color,
  account_type,
  university,
  avg_rating,
  total_ratings,
  total_listings,
  joined_date
FROM profiles;

GRANT SELECT ON profiles_public TO anon, authenticated;

-- business_profiles contains private account/operational fields. Keep direct
-- table reads to the owner and admins; public readers use the projection below.
DROP POLICY IF EXISTS "business_profiles_select_all" ON business_profiles;
DROP POLICY IF EXISTS "business_profiles_select_own_or_admin" ON business_profiles;
CREATE POLICY "business_profiles_select_own_or_admin" ON business_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE OR REPLACE VIEW business_profiles_public AS
SELECT
  id,
  business_name,
  business_type,
  custom_business_type,
  physical_address,
  website,
  created_at
FROM business_profiles;

GRANT SELECT ON business_profiles_public TO anon, authenticated;

-- Restore the existing business-review insert rule that depends on
-- profiles_public. No behavior change: it still requires the caller to be the
-- student_id and the target profile to be a business account.
CREATE POLICY "business_reviews_insert_student" ON business_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM profiles_public
      WHERE id = business_id
      AND account_type = 'business'
    )
  );

-- Keep seller message-plan enforcement available to an actual conversation
-- participant without making the seller's plan part of the public profile data.
CREATE OR REPLACE FUNCTION get_conversation_message_limit(p_conversation_id uuid)
RETURNS TABLE (max_messages integer, seller_locked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_plan text;
  v_account_type text;
BEGIN
  SELECT seller_id
    INTO v_seller_id
  FROM conversations
  WHERE id = p_conversation_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid());

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Conversation access denied.';
  END IF;

  SELECT plan, account_type
    INTO v_plan, v_account_type
  FROM profiles
  WHERE id = v_seller_id;

  max_messages := CASE v_plan
    WHEN 'ghost' THEN 3
    WHEN 'visible' THEN 10
    WHEN 'loud' THEN 999
    WHEN 'unmissable' THEN 999
    WHEN 'noticeboard' THEN 0
    WHEN 'featured' THEN 999
    WHEN 'campus_partner' THEN 999
    ELSE 999
  END;

  seller_locked := (v_account_type = 'business' AND v_plan = 'noticeboard');
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION get_conversation_message_limit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_conversation_message_limit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_conversation_message_limit(uuid) TO authenticated;
