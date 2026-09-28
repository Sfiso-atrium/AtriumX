-- 081_listing_visibility_query_fixes.sql
-- Keep admin listing access independent from recursive profile-policy checks.
-- The frontend now reads seller display data through profiles_public instead
-- of embedding the private profiles table in listing queries.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = uid), false);
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- Make the profile admin rule use the non-recursive helper explicitly.
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins must be able to read every listing status for moderation.
DROP POLICY IF EXISTS "listings_select_admin" ON public.listings;
CREATE POLICY "listings_select_admin" ON public.listings
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep the existing admin moderation permission, but use the same safe check.
DROP POLICY IF EXISTS "listings_update_admin" ON public.listings;
CREATE POLICY "listings_update_admin" ON public.listings
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
