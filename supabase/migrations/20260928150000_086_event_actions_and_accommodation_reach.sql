-- Complete event interaction permissions and retain accommodation university
-- data when its current plan supports fewer universities.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_interact_with_event(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.status = 'active'
      AND public.can_view_event_scope(auth.uid(), CASE
        WHEN cardinality(e.target_universities) > 0 THEN e.target_universities
        ELSE ARRAY[e.university] END)
  );
$$;

CREATE OR REPLACE FUNCTION public.increment_event_likes(event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  inserted_count integer;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.can_interact_with_event(event_id) THEN
    RAISE EXCEPTION 'This event is not available to your account.';
  END IF;
  INSERT INTO public.event_likes(event_id, user_id)
    VALUES (increment_event_likes.event_id, actor) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 1 THEN
    UPDATE public.events SET like_count = like_count + 1
    WHERE id = increment_event_likes.event_id;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "event_comments_select_all" ON public.event_comments;
CREATE POLICY "event_comments_select_all" ON public.event_comments
FOR SELECT TO authenticated
USING (author_id = auth.uid() OR public.can_interact_with_event(event_id));
DROP POLICY IF EXISTS "event_comments_insert_own" ON public.event_comments;
CREATE POLICY "event_comments_insert_own" ON public.event_comments
FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_interact_with_event(event_id));
DROP POLICY IF EXISTS "event_comments_update_own" ON public.event_comments;
CREATE POLICY "event_comments_update_own" ON public.event_comments
FOR UPDATE TO authenticated
USING (author_id = auth.uid() AND public.can_interact_with_event(event_id))
WITH CHECK (author_id = auth.uid() AND public.can_interact_with_event(event_id));
-- Existing unlike and comment deletion permissions retain the ability to
-- remove one's own past interaction after university access changes.

ALTER TABLE public.accommodation_listings
  ADD COLUMN IF NOT EXISTS active_universities text[];

CREATE OR REPLACE FUNCTION public.accommodation_university_limit(p_seller_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.current_accommodation_plan(p_seller_id)
    WHEN 'accommodation_free' THEN 1 WHEN 'accommodation_featured' THEN 2
    WHEN 'accommodation_premium' THEN 3 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.effective_accommodation_universities(p_listing_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT CASE
    WHEN cardinality(COALESCE(a.active_universities, a.universities)) BETWEEN 1
      AND public.accommodation_university_limit(a.seller_id)
      AND COALESCE(a.active_universities, a.universities) <@ a.universities
    THEN COALESCE(a.active_universities, a.universities) ELSE '{}'::text[] END
    FROM public.accommodation_listings a WHERE a.id = p_listing_id), '{}'::text[]);
$$;

CREATE OR REPLACE FUNCTION public.enforce_accommodation_plan_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  max_universities integer := public.accommodation_university_limit(NEW.seller_id);
BEGIN
  NEW.plan_tier := public.current_accommodation_plan(NEW.seller_id);
  IF NEW.plan_tier IS NULL THEN RAISE EXCEPTION 'Accommodation account required.'; END IF;
  -- Unrelated edits must remain possible after a downgrade. Existing targets
  -- are retained; visibility is handled separately until an owner selects.
  IF TG_OP = 'INSERT' OR NEW.universities IS DISTINCT FROM OLD.universities
    OR NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    IF COALESCE(cardinality(NEW.universities), 0) NOT BETWEEN 1 AND max_universities THEN
      RAISE EXCEPTION 'Your plan allows access to % universities.', max_universities;
    END IF;
    NEW.active_universities := NULL;
  ELSIF NEW.active_universities IS DISTINCT FROM OLD.active_universities
    AND NEW.active_universities IS NOT NULL THEN
    IF cardinality(NEW.active_universities) NOT BETWEEN 1 AND max_universities
      OR NOT NEW.active_universities <@ NEW.universities
      OR array_position(NEW.active_universities, NULL) IS NOT NULL THEN
      RAISE EXCEPTION 'Choose between 1 and % saved universities.', max_universities;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.select_accommodation_universities(p_listing_id uuid, p_universities text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  saved_targets text[];
  selected_targets text[];
  max_universities integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT a.universities INTO saved_targets FROM public.accommodation_listings a
  WHERE a.id = p_listing_id AND a.seller_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose your own accommodation listing.'; END IF;
  SELECT COALESCE(array_agg(DISTINCT trim(u) ORDER BY trim(u)), '{}') INTO selected_targets
  FROM unnest(COALESCE(p_universities, '{}')) AS value(u) WHERE trim(u) <> '';
  max_universities := public.accommodation_university_limit(auth.uid());
  IF cardinality(selected_targets) NOT BETWEEN 1 AND max_universities
    OR NOT selected_targets <@ saved_targets THEN
    RAISE EXCEPTION 'Choose between 1 and % saved universities.', max_universities;
  END IF;
  UPDATE public.accommodation_listings SET active_universities = selected_targets
  WHERE id = p_listing_id;
END;
$$;

DROP POLICY IF EXISTS "accommodation_select_current_reach" ON public.accommodation_listings;
CREATE POLICY "accommodation_select_current_reach" ON public.accommodation_listings
AS RESTRICTIVE FOR SELECT USING (
  seller_id = auth.uid() OR public.is_admin(auth.uid()) OR (
    cardinality(public.effective_accommodation_universities(id)) > 0 AND (
      auth.uid() IS NULL
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND p.account_type = 'student'
        AND p.university = ANY(public.effective_accommodation_universities(public.accommodation_listings.id)))
      OR EXISTS (SELECT 1 FROM public.business_profiles bp
        WHERE bp.id = auth.uid() AND bp.is_accommodation = true)
    )
  )
);

CREATE OR REPLACE FUNCTION public.get_accommodation_listing_detail(p_listing_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  listing public.accommodation_listings%ROWTYPE;
  allowed_universities text[];
BEGIN
  SELECT * INTO listing FROM public.accommodation_listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF listing.seller_id = auth.uid() THEN RETURN to_jsonb(listing); END IF;
  allowed_universities := public.effective_accommodation_universities(p_listing_id);
  IF listing.status <> 'active' OR cardinality(allowed_universities) = 0
    OR listing.report_edit_deadline_at <= now() THEN RETURN NULL; END IF;
  IF auth.uid() IS NOT NULL AND NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND p.account_type = 'student' AND p.university = ANY(allowed_universities))
    OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.business_profiles bp ON bp.id = p.id
      WHERE p.id = auth.uid() AND p.account_type = 'business' AND bp.is_accommodation = true)
  ) THEN RETURN NULL; END IF;
  listing.universities := allowed_universities;
  RETURN to_jsonb(listing);
END;
$$;

-- Extend the display projection while keeping original media for the owner.
DROP FUNCTION IF EXISTS public.get_accommodation_plan_display(uuid[]);
CREATE FUNCTION public.get_accommodation_plan_display(p_listing_ids uuid[])
RETURNS TABLE (
  listing_id uuid, effective_plan text, image_urls text[], video_url text,
  hidden_photo_count integer, video_hidden boolean, universities text[],
  active_universities text[], max_universities integer, reach_paused boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.id, p.plan,
    CASE WHEN a.seller_id = auth.uid() THEN a.image_urls
      ELSE COALESCE(a.image_urls[1:caps.photos], '{}'::text[]) END,
    CASE WHEN a.seller_id = auth.uid() OR p.plan = 'accommodation_premium'
      THEN a.video_url ELSE NULL END,
    greatest(cardinality(a.image_urls) - caps.photos, 0),
    a.video_url IS NOT NULL AND p.plan <> 'accommodation_premium',
    a.universities, public.effective_accommodation_universities(a.id),
    public.accommodation_university_limit(a.seller_id),
    cardinality(public.effective_accommodation_universities(a.id)) = 0
  FROM unnest(COALESCE(p_listing_ids, '{}'::uuid[])) AS requested(id)
  CROSS JOIN LATERAL jsonb_populate_record(NULL::public.accommodation_listings,
    public.get_accommodation_listing_detail(requested.id)) AS a
  CROSS JOIN LATERAL (SELECT public.current_accommodation_plan(a.seller_id) AS plan) p
  CROSS JOIN LATERAL (SELECT CASE p.plan WHEN 'accommodation_premium' THEN 30
    WHEN 'accommodation_featured' THEN 12 ELSE 3 END AS photos) caps
  WHERE a.id IS NOT NULL AND p.plan IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.can_interact_with_event(uuid),
  public.accommodation_university_limit(uuid), public.effective_accommodation_universities(uuid),
  public.select_accommodation_universities(uuid, text[]),
  public.get_accommodation_plan_display(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_interact_with_event(uuid),
  public.select_accommodation_universities(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accommodation_university_limit(uuid),
  public.effective_accommodation_universities(uuid), public.get_accommodation_plan_display(uuid[])
  TO anon, authenticated;
COMMIT;
