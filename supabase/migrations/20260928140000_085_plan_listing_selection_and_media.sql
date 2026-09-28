-- Preserve listings and uploaded media when a plan expires. Owners choose
-- which listings use the remaining slots; public media follows current limits.
BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS plan_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.current_listing_plan(p_seller_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p.account_type
    WHEN 'student' THEN public.effective_student_plan(p.id)
    WHEN 'business' THEN public.effective_business_plan(p.id)
  END FROM public.profiles p WHERE p.id = p_seller_id;
$$;

CREATE OR REPLACE FUNCTION public.normal_listing_plan_visible(p_listing_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT l.plan_enabled AND l.status IN ('active', 'pending')
      AND public.normal_listing_limit_for_account(l.seller_id) > 0
      AND EXISTS (SELECT 1 FROM public.profiles seller WHERE seller.id = l.seller_id
        AND (seller.account_type = 'student' OR (seller.account_type = 'business'
          AND l.universities && public.effective_business_universities(l.seller_id))))
      AND (SELECT count(*) FROM public.listings other
           WHERE other.seller_id = l.seller_id AND other.plan_enabled
             AND other.status IN ('active', 'pending'))
          <= public.normal_listing_limit_for_account(l.seller_id)
    FROM public.listings l WHERE l.id = p_listing_id
  ), false);
$$;

-- Restrictive policy also covers guests. Existing owner and moderation reads
-- still work, so paused content remains available for management.
DROP POLICY IF EXISTS listings_select_current_plan ON public.listings;
CREATE POLICY listings_select_current_plan ON public.listings AS RESTRICTIVE
FOR SELECT USING (
  seller_id = auth.uid() OR public.is_admin(auth.uid())
  OR public.normal_listing_plan_visible(id)
);

CREATE OR REPLACE FUNCTION public.enforce_normal_listing_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit integer;
  v_current integer;
BEGIN
  -- Changes that do not take another slot (including edits and pausing) must
  -- remain possible while the owner is resolving an expired plan.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.seller_id = OLD.seller_id AND (
      NOT NEW.plan_enabled OR NEW.status NOT IN ('active', 'pending')
      OR (OLD.plan_enabled AND OLD.status IN ('active', 'pending'))
    ) THEN RETURN NEW; END IF;
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = NEW.seller_id FOR UPDATE;
  v_limit := public.normal_listing_limit_for_account(NEW.seller_id);
  IF COALESCE(v_limit, 0) = 0 THEN
    RAISE EXCEPTION 'A complete student or normal business account is required.';
  END IF;
  IF NOT NEW.plan_enabled OR NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_current FROM public.listings l
  WHERE l.seller_id = NEW.seller_id AND l.id <> NEW.id
    AND l.plan_enabled AND l.status IN ('active', 'pending');
  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'Your current plan allows up to % active listings. Choose which to show on My Listings.', v_limit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_normal_listing_limit_trigger ON public.listings;
CREATE TRIGGER enforce_normal_listing_limit_trigger
BEFORE INSERT OR UPDATE OF plan_enabled, status, seller_id ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_normal_listing_limit();

CREATE OR REPLACE FUNCTION public.select_plan_listings(p_listing_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ids uuid[];
  v_limit integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to manage your listings.'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_user FOR UPDATE;
  v_limit := public.normal_listing_limit_for_account(v_user);
  IF COALESCE(v_limit, 0) = 0 THEN RAISE EXCEPTION 'A complete student or normal business account is required.'; END IF;
  SELECT COALESCE(array_agg(DISTINCT id), '{}'::uuid[]) INTO v_ids
  FROM unnest(COALESCE(p_listing_ids, '{}'::uuid[])) AS selected(id)
  WHERE id IS NOT NULL;
  IF cardinality(v_ids) > v_limit THEN
    RAISE EXCEPTION 'Choose up to % listings for your current plan.', v_limit;
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) AS selected(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.listings l
      WHERE l.id = selected.id AND l.seller_id = v_user AND l.status IN ('active', 'pending'))) THEN
    RAISE EXCEPTION 'Choose only your own active listings.';
  END IF;

  UPDATE public.listings SET plan_enabled = false
  WHERE seller_id = v_user AND status IN ('active', 'pending')
    AND plan_enabled AND NOT (id = ANY(v_ids));
  UPDATE public.listings SET plan_enabled = true
  WHERE seller_id = v_user AND id = ANY(v_ids) AND NOT plan_enabled;
END;
$$;

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
    l.video_url,
    greatest(cardinality(l.image_urls) - caps.photos, 0),
    CASE WHEN l.seller_id = auth.uid() OR caps.plan IN ('ghost', 'visible', 'loud', 'unmissable')
      THEN l.universities
      ELSE ARRAY(SELECT university FROM unnest(l.universities) AS target(university)
        WHERE university = ANY(public.effective_business_universities(l.seller_id))) END
  FROM public.listings l
  CROSS JOIN LATERAL (SELECT public.current_listing_plan(l.seller_id) AS plan) p
  CROSS JOIN LATERAL (SELECT p.plan, CASE p.plan
    WHEN 'visible' THEN 1 WHEN 'featured' THEN 1 WHEN 'loud' THEN 2
    WHEN 'unmissable' THEN 3 WHEN 'campus_partner' THEN 3 ELSE 0 END AS photos) caps
  WHERE l.id = ANY(COALESCE(p_listing_ids, '{}'::uuid[]));
$$;

CREATE OR REPLACE FUNCTION public.current_accommodation_plan(p_seller_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN accommodation_plan_expires_at IS NOT NULL
    AND accommodation_plan_expires_at <= now() THEN 'accommodation_free'
    ELSE accommodation_plan END
  FROM public.business_profiles WHERE id = p_seller_id AND is_accommodation IS TRUE;
$$;

CREATE OR REPLACE FUNCTION public.get_accommodation_plan_display(p_listing_ids uuid[])
RETURNS TABLE (
  listing_id uuid, effective_plan text, image_urls text[], video_url text,
  hidden_photo_count integer, video_hidden boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.id, p.plan,
    CASE WHEN a.seller_id = auth.uid() THEN a.image_urls
      ELSE COALESCE(a.image_urls[1:caps.photos], '{}'::text[]) END,
    CASE WHEN a.seller_id = auth.uid() OR p.plan = 'accommodation_premium'
      THEN a.video_url ELSE NULL END,
    greatest(cardinality(a.image_urls) - caps.photos, 0),
    a.video_url IS NOT NULL AND p.plan <> 'accommodation_premium'
  FROM unnest(COALESCE(p_listing_ids, '{}'::uuid[])) AS requested(id)
  CROSS JOIN LATERAL jsonb_populate_record(NULL::public.accommodation_listings,
    public.get_accommodation_listing_detail(requested.id)) AS a
  CROSS JOIN LATERAL (SELECT public.current_accommodation_plan(a.seller_id) AS plan) p
  CROSS JOIN LATERAL (SELECT CASE p.plan WHEN 'accommodation_premium' THEN 30
    WHEN 'accommodation_featured' THEN 12 ELSE 3 END AS photos) caps
  WHERE a.id IS NOT NULL AND p.plan IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.current_listing_plan(uuid), public.normal_listing_plan_visible(uuid),
  public.current_accommodation_plan(uuid), public.get_listing_plan_display(uuid[]),
  public.get_accommodation_plan_display(uuid[]), public.select_plan_listings(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_listing_plan(uuid), public.normal_listing_plan_visible(uuid),
  public.current_accommodation_plan(uuid), public.get_listing_plan_display(uuid[]),
  public.get_accommodation_plan_display(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_plan_listings(uuid[]) TO authenticated;

-- Admins and owners can fetch stored rows, but the ordinary feed must still
-- exclude listings paused by the current plan.
CREATE OR REPLACE FUNCTION public.get_normal_marketplace_listing_ids(p_listing_ids uuid[])
RETURNS uuid[] LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(array_agg(l.id), '{}'::uuid[])
  FROM public.listings l
  WHERE l.id = ANY(COALESCE(p_listing_ids, '{}'::uuid[]))
    AND l.status = 'active' AND auth.uid() IS NOT NULL
    AND public.normal_listing_plan_visible(l.id)
    AND public.can_view_listing_scope(auth.uid(), l.seller_id, l.universities);
$$;
COMMIT;
