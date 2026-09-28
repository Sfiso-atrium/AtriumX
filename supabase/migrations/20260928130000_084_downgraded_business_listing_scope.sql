-- Keep existing listing data after a business plan expires, but stop exposing
-- its listings to universities that are outside the seller's current reach.
CREATE OR REPLACE FUNCTION public.can_view_listing_scope(
  p_viewer_id uuid,
  p_seller_id uuid,
  p_listing_universities text[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_type text;
  v_viewer_university text;
  v_seller_type text;
  v_seller_university text;
  v_is_accommodation boolean := false;
  v_viewer_allowed text[] := '{}';
  v_seller_allowed text[] := '{}';
BEGIN
  SELECT account_type, university
  INTO v_viewer_type, v_viewer_university
  FROM public.profiles
  WHERE id = p_viewer_id;

  SELECT account_type, university
  INTO v_seller_type, v_seller_university
  FROM public.profiles
  WHERE id = p_seller_id;

  IF v_viewer_type IS NULL OR v_seller_type IS NULL THEN
    RETURN false;
  END IF;

  IF v_seller_type = 'business' THEN
    v_seller_allowed := public.effective_business_universities(p_seller_id);
  END IF;

  IF v_viewer_type = 'student' THEN
    IF v_viewer_university IS NULL THEN
      RETURN false;
    END IF;
    IF v_seller_type = 'business' THEN
      RETURN v_viewer_university = ANY(COALESCE(p_listing_universities, '{}'))
        AND v_viewer_university = ANY(v_seller_allowed);
    END IF;
    IF COALESCE(array_length(p_listing_universities, 1), 0) > 0 THEN
      RETURN v_viewer_university = ANY(p_listing_universities);
    END IF;
    RETURN v_seller_university = v_viewer_university;
  END IF;

  IF v_viewer_type = 'business' THEN
    SELECT COALESCE(is_accommodation, false)
    INTO v_is_accommodation
    FROM public.business_profiles
    WHERE id = p_viewer_id;
    IF v_is_accommodation THEN
      RETURN false;
    END IF;

    v_viewer_allowed := public.effective_business_universities(p_viewer_id);
    IF v_seller_type = 'business' THEN
      RETURN EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p_listing_universities, '{}')) AS scope(university)
        WHERE scope.university = ANY(v_viewer_allowed)
          AND scope.university = ANY(v_seller_allowed)
      );
    END IF;
    IF COALESCE(array_length(p_listing_universities, 1), 0) > 0 THEN
      RETURN p_listing_universities && v_viewer_allowed;
    END IF;
    RETURN v_seller_university IS NOT NULL
      AND v_seller_university = ANY(v_viewer_allowed);
  END IF;

  RETURN false;
END;
$$;
