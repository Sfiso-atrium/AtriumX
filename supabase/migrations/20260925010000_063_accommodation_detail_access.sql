-- Accommodation detail access is separate from accommodation-feed visibility.
-- Feed RLS may hide a reported listing after its correction deadline, but the
-- owner must still be able to open that listing from their profile and edit it.
-- This RPC applies the same public visibility rules for non-owners while
-- explicitly preserving owner access.

CREATE OR REPLACE FUNCTION public.get_accommodation_listing_detail(
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.accommodation_listings%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_can_view boolean := false;
BEGIN
  SELECT *
  INTO v_listing
  FROM public.accommodation_listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- The owner may always open their own listing, including after the
  -- 3-day report correction deadline. This is what allows profile-based
  -- access and correction after the listing disappears from the feed.
  IF v_user_id IS NOT NULL AND v_listing.seller_id = v_user_id THEN
    RETURN to_jsonb(v_listing);
  END IF;

  -- Non-owners may only open listings that are still publicly visible.
  IF v_listing.status <> 'active'
     OR (v_listing.report_edit_deadline_at IS NOT NULL
         AND v_listing.report_edit_deadline_at <= now()) THEN
    RETURN NULL;
  END IF;

  -- Preserve the existing public accommodation visibility rules.
  IF v_user_id IS NULL THEN
    v_can_view := true;
  ELSE
    v_can_view := EXISTS (
      SELECT 1
      FROM public.profiles me
      WHERE me.id = v_user_id
        AND me.account_type = 'student'
        AND (
          me.university IS NULL
          OR me.university = ANY(v_listing.universities)
        )
    ) OR EXISTS (
      SELECT 1
      FROM public.profiles me
      JOIN public.business_profiles bp ON bp.id = me.id
      WHERE me.id = v_user_id
        AND me.account_type = 'business'
        AND bp.is_accommodation = true
    );
  END IF;

  IF NOT v_can_view THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_listing);
END;
$$;

REVOKE ALL ON FUNCTION public.get_accommodation_listing_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accommodation_listing_detail(uuid) TO anon, authenticated;
