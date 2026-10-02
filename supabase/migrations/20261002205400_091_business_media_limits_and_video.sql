-- Business media limits: Noticeboard 3 photos, Featured 5 photos,
-- Campus Partner 10 photos plus one optional video.
-- Keep existing media after a later downgrade, but prevent adding/replacing
-- media beyond the user's current effective business plan.

CREATE OR REPLACE FUNCTION public.enforce_business_listing_media_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_is_accommodation boolean := false;
  v_plan text;
  v_max_photos integer;
BEGIN
  SELECT p.account_type, COALESCE(bp.is_accommodation, false)
  INTO v_account_type, v_is_accommodation
  FROM public.profiles p
  LEFT JOIN public.business_profiles bp ON bp.id = p.id
  WHERE p.id = NEW.seller_id;

  IF v_account_type IS DISTINCT FROM 'business' OR v_is_accommodation THEN
    RETURN NEW;
  END IF;

  v_plan := public.effective_business_plan(NEW.seller_id);
  v_max_photos := CASE v_plan
    WHEN 'campus_partner' THEN 10
    WHEN 'featured' THEN 5
    ELSE 3
  END;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(cardinality(NEW.image_urls), 0) > v_max_photos THEN
      RAISE EXCEPTION 'Your current business plan allows up to % photos per listing.', v_max_photos;
    END IF;
    IF NEW.video_url IS NOT NULL AND v_plan IS DISTINCT FROM 'campus_partner' THEN
      RAISE EXCEPTION 'Listing video is available on the Campus Partner plan.';
    END IF;
  ELSE
    IF NEW.image_urls IS DISTINCT FROM OLD.image_urls
       AND COALESCE(cardinality(NEW.image_urls), 0) > v_max_photos
       AND COALESCE(cardinality(NEW.image_urls), 0) >= COALESCE(cardinality(OLD.image_urls), 0) THEN
      RAISE EXCEPTION 'Your current business plan allows up to % photos per listing.', v_max_photos;
    END IF;
    IF NEW.video_url IS DISTINCT FROM OLD.video_url
       AND NEW.video_url IS NOT NULL
       AND v_plan IS DISTINCT FROM 'campus_partner' THEN
      RAISE EXCEPTION 'Listing video is available on the Campus Partner plan.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_business_listing_media_limits_trigger ON public.listings;
CREATE TRIGGER enforce_business_listing_media_limits_trigger
BEFORE INSERT OR UPDATE OF seller_id, image_urls, video_url ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_listing_media_limits();

-- Public media projection must use the same limits as the listing forms.
CREATE OR REPLACE FUNCTION public.get_listing_plan_display(p_listing_ids uuid[])
RETURNS TABLE (
  listing_id uuid, plan_enabled boolean, plan_visible boolean,
  max_listings integer, effective_plan text, image_urls text[], video_url text,
  hidden_photo_count integer, universities text[]
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT l.id, l.plan_enabled, public.normal_listing_plan_visible(l.id),
    CASE caps.plan WHEN 'loud' THEN 2 WHEN 'featured' THEN 2
      WHEN 'unmissable' THEN 3 WHEN 'campus_partner' THEN 3 ELSE 1 END,
    caps.plan,
    CASE WHEN l.seller_id = auth.uid() THEN l.image_urls
      ELSE COALESCE(l.image_urls[1:caps.photos], '{}'::text[]) END,
    CASE WHEN l.seller_id = auth.uid() OR caps.plan = 'campus_partner'
      THEN l.video_url ELSE NULL END,
    greatest(cardinality(l.image_urls) - caps.photos, 0),
    CASE WHEN l.seller_id = auth.uid() OR caps.plan IN ('ghost', 'visible', 'loud', 'unmissable')
      THEN l.universities
      ELSE ARRAY(SELECT university FROM unnest(l.universities) AS target(university)
        WHERE university = ANY(public.effective_business_universities(l.seller_id))) END
  FROM public.listings l
  CROSS JOIN LATERAL (SELECT public.current_listing_plan(l.seller_id) AS plan) p
  CROSS JOIN LATERAL (SELECT p.plan, CASE p.plan
    WHEN 'visible' THEN 1
    WHEN 'loud' THEN 2
    WHEN 'unmissable' THEN 3
    WHEN 'noticeboard' THEN 3
    WHEN 'featured' THEN 5
    WHEN 'campus_partner' THEN 10
    ELSE 0 END AS photos) caps
  WHERE l.id = ANY(COALESCE(p_listing_ids, '{}'::uuid[]));
$$;
