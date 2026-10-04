-- Fix accommodation university reach after a plan upgrade.
-- Saved universities should all become active whenever they fit inside the
-- current accommodation plan. active_universities is only needed when a
-- downgrade leaves more saved universities than the current plan permits.
BEGIN;

CREATE OR REPLACE FUNCTION public.effective_accommodation_universities(p_listing_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN cardinality(COALESCE(a.universities, '{}'::text[])) BETWEEN 1
        AND public.accommodation_university_limit(a.seller_id)
      THEN a.universities
      WHEN cardinality(COALESCE(a.active_universities, '{}'::text[])) BETWEEN 1
        AND public.accommodation_university_limit(a.seller_id)
        AND a.active_universities <@ a.universities
      THEN a.active_universities
      ELSE '{}'::text[]
    END
    FROM public.accommodation_listings a
    WHERE a.id = p_listing_id
  ), '{}'::text[]);
$$;

REVOKE ALL ON FUNCTION public.effective_accommodation_universities(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_accommodation_universities(uuid) TO anon, authenticated;

COMMIT;
