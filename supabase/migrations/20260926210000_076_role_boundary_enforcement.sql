-- 076_role_boundary_enforcement.sql
-- Enforce two existing role-boundary rules at the database level:
-- 1) users may edit normal profile fields, but not role/security/stat fields;
-- 2) accommodation providers must not use the normal business listing/event flows.

-- ---------------------------------------------------------------------------
-- PROFILE SECURITY FIELDS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION guard_profile_security_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verified server/admin operations may change protected profile fields.
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR current_user = 'postgres'
     OR current_user = 'supabase_admin'
     OR is_admin(auth.uid())
  THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.account_type IS DISTINCT FROM OLD.account_type
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
     OR NEW.avg_rating IS DISTINCT FROM OLD.avg_rating
     OR NEW.total_ratings IS DISTINCT FROM OLD.total_ratings
     OR NEW.total_listings IS DISTINCT FROM OLD.total_listings
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     OR NEW.joined_date IS DISTINCT FROM OLD.joined_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Protected profile fields cannot be changed from the client.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_security_columns_trigger ON profiles;
CREATE TRIGGER guard_profile_security_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_profile_security_columns();

REVOKE ALL ON FUNCTION guard_profile_security_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION guard_profile_security_columns() FROM anon, authenticated;

-- The base profiles table is private. Public users continue to use the
-- deliberately limited profiles_public view.
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- NORMAL BUSINESS LISTINGS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "listings_insert_own" ON listings;
CREATE POLICY "listings_insert_own" ON listings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  );

DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own" ON listings
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = seller_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  )
  WITH CHECK (
    auth.uid() = seller_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  );

DROP POLICY IF EXISTS "listings_delete_own" ON listings;
CREATE POLICY "listings_delete_own" ON listings
  FOR DELETE TO authenticated
  USING (
    auth.uid() = seller_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  );

CREATE OR REPLACE FUNCTION block_accommodation_normal_listing_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM profiles p
    JOIN business_profiles bp ON bp.id = p.id
    WHERE p.id = NEW.seller_id
      AND p.account_type = 'business'
      AND bp.is_accommodation = true
  ) THEN
    RAISE EXCEPTION 'Accommodation providers must use the accommodation listing flow.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_accommodation_normal_listing_flow_trigger ON listings;
CREATE TRIGGER block_accommodation_normal_listing_flow_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION block_accommodation_normal_listing_flow();

REVOKE ALL ON FUNCTION block_accommodation_normal_listing_flow() FROM PUBLIC;
REVOKE ALL ON FUNCTION block_accommodation_normal_listing_flow() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  );

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = host_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  )
  WITH CHECK (
    auth.uid() = host_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  );

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events
  FOR DELETE TO authenticated
  USING (
    auth.uid() = host_id
    AND (
      (SELECT account_type FROM profiles WHERE id = auth.uid()) <> 'business'
      OR NOT EXISTS (
        SELECT 1
        FROM business_profiles bp
        WHERE bp.id = auth.uid()
          AND bp.is_accommodation = true
      )
    )
  );

CREATE OR REPLACE FUNCTION block_accommodation_event_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM profiles p
    JOIN business_profiles bp ON bp.id = p.id
    WHERE p.id = NEW.host_id
      AND p.account_type = 'business'
      AND bp.is_accommodation = true
  ) THEN
    RAISE EXCEPTION 'Accommodation providers must use the accommodation experience and cannot create normal business events.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_accommodation_event_flow_trigger ON events;
CREATE TRIGGER block_accommodation_event_flow_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION block_accommodation_event_flow();

REVOKE ALL ON FUNCTION block_accommodation_event_flow() FROM PUBLIC;
REVOKE ALL ON FUNCTION block_accommodation_event_flow() FROM anon, authenticated;
