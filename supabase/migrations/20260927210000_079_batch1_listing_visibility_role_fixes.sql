-- Batch 1: listing visibility, role routing support and removal of listing approval.

-- ---------------------------------------------------------------------------
-- 1) Business plan/university scope helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.effective_business_plan(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.account_type <> 'business' THEN NULL
    WHEN p.plan = 'featured'
         AND p.plan_expires_at IS NOT NULL
         AND p.plan_expires_at > now() THEN 'featured'
    WHEN p.plan = 'campus_partner'
         AND p.plan_expires_at IS NOT NULL
         AND p.plan_expires_at > now() THEN 'campus_partner'
    ELSE 'noticeboard'
  END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.effective_business_universities(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT u
      FROM unnest(COALESCE(bp.universities, '{}')) WITH ORDINALITY AS x(u, ord)
      WHERE ord <= public.business_university_limit(public.effective_business_plan(p_user_id))
      ORDER BY ord
    ),
    '{}'
  )
  FROM public.business_profiles bp
  JOIN public.profiles p ON p.id = bp.id
  WHERE bp.id = p_user_id
    AND p.account_type = 'business'
    AND COALESCE(bp.is_accommodation, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.set_business_university_access(p_universities text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_max integer;
  v_selected text[];
  v_existing text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.business_profiles bp ON bp.id = p.id
    WHERE p.id = auth.uid()
      AND p.account_type = 'business'
      AND COALESCE(bp.is_accommodation, false) = false
  ) THEN
    RAISE EXCEPTION 'Only normal business accounts can change business university access.';
  END IF;

  v_plan := public.effective_business_plan(auth.uid());
  v_max := public.business_university_limit(v_plan);
  v_selected := ARRAY(
    SELECT DISTINCT trim(value)
    FROM unnest(COALESCE(p_universities, '{}')) AS value
    WHERE trim(value) <> ''
    ORDER BY trim(value)
  );

  IF COALESCE(array_length(v_selected, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choose at least one university.';
  END IF;

  IF array_length(v_selected, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities.', v_max;
  END IF;

  SELECT COALESCE(universities, '{}')
  INTO v_existing
  FROM public.business_profiles
  WHERE id = auth.uid();

  IF COALESCE(array_length(v_existing, 1), 0) <= v_max THEN
    RAISE EXCEPTION 'Your university access is already within the current plan limit.';
  END IF;

  IF NOT (v_selected <@ v_existing) THEN
    RAISE EXCEPTION 'Choose which of your existing universities you want to keep.';
  END IF;

  UPDATE public.business_profiles
  SET universities = v_selected
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_business_university_access(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_business_university_access(text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Normal marketplace visibility must follow role + current university scope
-- ---------------------------------------------------------------------------

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
  v_is_accommodation boolean := false;
  v_allowed text[] := '{}';
  v_seller_university text;
BEGIN
  SELECT account_type, university
  INTO v_viewer_type, v_viewer_university
  FROM public.profiles
  WHERE id = p_viewer_id;

  IF v_viewer_type IS NULL THEN
    RETURN false;
  END IF;

  IF v_viewer_type = 'student' THEN
    IF COALESCE(array_length(p_listing_universities, 1), 0) > 0 THEN
      RETURN v_viewer_university IS NOT NULL
        AND v_viewer_university = ANY(p_listing_universities);
    END IF;

    SELECT university INTO v_seller_university
    FROM public.profiles
    WHERE id = p_seller_id;

    RETURN v_viewer_university IS NOT NULL
      AND v_seller_university = v_viewer_university;
  END IF;

  IF v_viewer_type = 'business' THEN
    SELECT COALESCE(is_accommodation, false)
    INTO v_is_accommodation
    FROM public.business_profiles
    WHERE id = p_viewer_id;

    IF v_is_accommodation THEN
      RETURN false;
    END IF;

    v_allowed := public.effective_business_universities(p_viewer_id);

    IF COALESCE(array_length(p_listing_universities, 1), 0) > 0 THEN
      RETURN p_listing_universities && v_allowed;
    END IF;

    SELECT university INTO v_seller_university
    FROM public.profiles
    WHERE id = p_seller_id;

    RETURN v_seller_university IS NOT NULL
      AND v_seller_university = ANY(v_allowed);
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "listings_select_active" ON public.listings;
CREATE POLICY "listings_select_active" ON public.listings
FOR SELECT USING (
  status = 'active'
  AND (
    auth.uid() IS NULL
    OR public.can_view_listing_scope(auth.uid(), seller_id, universities)
  )
);

-- ---------------------------------------------------------------------------
-- 3) Accommodation providers can browse other active accommodation again
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "accommodation_listings_select_student_or_owner" ON public.accommodation_listings;
CREATE POLICY "accommodation_listings_select_student_or_owner" ON public.accommodation_listings
FOR SELECT USING (
  seller_id = auth.uid()
  OR (
    status = 'active'
    AND (report_edit_deadline_at IS NULL OR report_edit_deadline_at > now())
    AND (
      auth.uid() IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.account_type = 'student'
          AND me.university IS NOT NULL
          AND me.university = ANY(public.accommodation_listings.universities)
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles me
        JOIN public.business_profiles bp ON bp.id = me.id
        WHERE me.id = auth.uid()
          AND me.account_type = 'business'
          AND bp.is_accommodation = true
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 4) Restore the role boundary that migration 078 removed
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
CREATE POLICY "listings_insert_own" ON public.listings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
CREATE POLICY "listings_update_own" ON public.listings
FOR UPDATE TO authenticated
USING (
  auth.uid() = seller_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
)
WITH CHECK (
  auth.uid() = seller_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;
CREATE POLICY "listings_delete_own" ON public.listings
FOR DELETE TO authenticated
USING (
  auth.uid() = seller_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

CREATE OR REPLACE FUNCTION public.block_accommodation_normal_listing_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.business_profiles bp ON bp.id = p.id
    WHERE p.id = NEW.seller_id
      AND p.account_type = 'business'
      AND bp.is_accommodation = true
  ) THEN
    RAISE EXCEPTION 'Accommodation providers must use the accommodation listing flow.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_accommodation_normal_listing_flow_trigger ON public.listings;
CREATE TRIGGER block_accommodation_normal_listing_flow_trigger
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.block_accommodation_normal_listing_flow();

DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own" ON public.events
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = host_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

DROP POLICY IF EXISTS "events_update_own" ON public.events;
CREATE POLICY "events_update_own" ON public.events
FOR UPDATE TO authenticated
USING (
  auth.uid() = host_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
)
WITH CHECK (
  auth.uid() = host_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

DROP POLICY IF EXISTS "events_delete_own" ON public.events;
CREATE POLICY "events_delete_own" ON public.events
FOR DELETE TO authenticated
USING (
  auth.uid() = host_id
  AND NOT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

CREATE OR REPLACE FUNCTION public.block_accommodation_event_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.business_profiles bp ON bp.id = p.id
    WHERE p.id = NEW.host_id
      AND p.account_type = 'business'
      AND bp.is_accommodation = true
  ) THEN
    RAISE EXCEPTION 'Accommodation providers cannot create normal business events.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_accommodation_event_flow_trigger ON public.events;
CREATE TRIGGER block_accommodation_event_flow_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.block_accommodation_event_flow();

-- ---------------------------------------------------------------------------
-- 5) Business listing creation/editing can safely reduce university access
--    after a plan expires instead of trapping the account.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_business_listing(
  p_seller_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_category text,
  p_custom_category text,
  p_image_urls text[],
  p_video_url text,
  p_residence text,
  p_listing_type text,
  p_is_negotiable boolean,
  p_variants jsonb,
  p_universities text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_expires_at timestamptz;
  v_max integer;
  v_existing text[];
  v_selected text[];
  v_union text[];
  v_listing_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_seller_id THEN
    RAISE EXCEPTION 'Not authorised to create this listing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.business_profiles bp ON bp.id = p.id
    WHERE p.id = p_seller_id
      AND p.account_type = 'business'
      AND COALESCE(bp.is_accommodation, false) = false
  ) THEN
    RAISE EXCEPTION 'Only normal business accounts can use the business listing flow.';
  END IF;

  v_plan := public.effective_business_plan(p_seller_id);
  v_max := public.business_university_limit(v_plan);
  v_selected := ARRAY(
    SELECT DISTINCT trim(value)
    FROM unnest(COALESCE(p_universities, '{}')) AS value
    WHERE trim(value) <> ''
    ORDER BY trim(value)
  );

  IF COALESCE(array_length(v_selected, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one university.';
  END IF;
  IF array_length(v_selected, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities.', v_max;
  END IF;

  SELECT COALESCE(universities, '{}')
  INTO v_existing
  FROM public.business_profiles
  WHERE id = p_seller_id;

  IF COALESCE(array_length(v_existing, 1), 0) > v_max THEN
    IF NOT (v_selected <@ v_existing) THEN
      RAISE EXCEPTION 'Choose which of your existing universities you want to keep under the current plan.';
    END IF;
    v_union := v_selected;
  ELSE
    v_union := ARRAY(
      SELECT DISTINCT value
      FROM unnest(COALESCE(v_existing, '{}') || v_selected) AS value
      WHERE trim(value) <> ''
      ORDER BY value
    );
    IF array_length(v_union, 1) > v_max THEN
      RAISE EXCEPTION 'Your current plan allows up to % universities. Upgrade to reach another university.', v_max;
    END IF;
  END IF;

  UPDATE public.business_profiles
  SET universities = v_union
  WHERE id = p_seller_id;

  v_expires_at := now() + CASE v_plan
    WHEN 'featured' THEN interval '14 days'
    WHEN 'campus_partner' THEN interval '30 days'
    ELSE interval '7 days'
  END;

  INSERT INTO public.listings (
    seller_id, title, description, price, category, custom_category,
    image_urls, video_url, residence, listing_type, is_negotiable,
    plan_tier, status, variants, expires_at, universities
  ) VALUES (
    p_seller_id, p_title, p_description, p_price, p_category,
    p_custom_category, COALESCE(p_image_urls, '{}'), p_video_url,
    COALESCE(p_residence, ''), p_listing_type, p_is_negotiable,
    v_plan, 'active', COALESCE(p_variants, '[]'::jsonb), v_expires_at,
    v_selected
  )
  RETURNING id INTO v_listing_id;

  RETURN v_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_listing(
  p_listing_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_category text,
  p_custom_category text,
  p_image_urls text[],
  p_video_url text,
  p_residence text,
  p_listing_type text,
  p_is_negotiable boolean,
  p_variants jsonb,
  p_universities text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_plan text;
  v_max integer;
  v_existing text[];
  v_selected text[];
  v_union text[];
BEGIN
  SELECT seller_id INTO v_seller_id
  FROM public.listings
  WHERE id = p_listing_id;

  IF v_seller_id IS NULL OR auth.uid() IS DISTINCT FROM v_seller_id THEN
    RAISE EXCEPTION 'Not authorised to edit this listing.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = v_seller_id AND bp.is_accommodation = true
  ) THEN
    RAISE EXCEPTION 'Accommodation providers must use the accommodation listing flow.';
  END IF;

  v_plan := public.effective_business_plan(v_seller_id);
  v_max := public.business_university_limit(v_plan);
  v_selected := ARRAY(
    SELECT DISTINCT trim(value)
    FROM unnest(COALESCE(p_universities, '{}')) AS value
    WHERE trim(value) <> ''
    ORDER BY trim(value)
  );

  IF COALESCE(array_length(v_selected, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one university.';
  END IF;
  IF array_length(v_selected, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities.', v_max;
  END IF;

  SELECT COALESCE(universities, '{}') INTO v_existing
  FROM public.business_profiles
  WHERE id = v_seller_id;

  IF COALESCE(array_length(v_existing, 1), 0) > v_max THEN
    IF NOT (v_selected <@ v_existing) THEN
      RAISE EXCEPTION 'Choose which of your existing universities you want to keep under the current plan.';
    END IF;
    v_union := v_selected;
  ELSE
    v_union := ARRAY(
      SELECT DISTINCT value
      FROM unnest(COALESCE(v_existing, '{}') || v_selected) AS value
      WHERE trim(value) <> ''
      ORDER BY value
    );
    IF array_length(v_union, 1) > v_max THEN
      RAISE EXCEPTION 'Your current plan allows up to % universities. Upgrade to reach another university.', v_max;
    END IF;
  END IF;

  UPDATE public.business_profiles
  SET universities = v_union
  WHERE id = v_seller_id;

  UPDATE public.listings
  SET title = p_title,
      description = p_description,
      price = p_price,
      category = p_category,
      custom_category = p_custom_category,
      image_urls = COALESCE(p_image_urls, '{}'),
      video_url = p_video_url,
      residence = COALESCE(p_residence, ''),
      listing_type = p_listing_type,
      is_negotiable = p_is_negotiable,
      variants = COALESCE(p_variants, '[]'::jsonb),
      universities = v_selected,
      plan_tier = v_plan,
      has_pending_edit = true,
      edited_at = now()
  WHERE id = p_listing_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Events use the same current business university scope.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_event_target_universities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host_account_type text;
  host_university text;
  allowed_universities text[];
  cleaned_targets text[];
BEGIN
  SELECT p.account_type, p.university
  INTO host_account_type, host_university
  FROM public.profiles p
  WHERE p.id = NEW.host_id;

  SELECT COALESCE(
    array_agg(DISTINCT trim(u) ORDER BY trim(u)),
    '{}'
  )
  INTO cleaned_targets
  FROM unnest(COALESCE(NEW.target_universities, '{}')) AS value(u)
  WHERE trim(u) <> '';

  IF host_account_type = 'business' THEN
    allowed_universities := public.effective_business_universities(NEW.host_id);
    IF COALESCE(array_length(cleaned_targets, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Choose at least one university for this business event.';
    END IF;
    IF NOT (cleaned_targets <@ allowed_universities) THEN
      RAISE EXCEPTION 'Event universities must be within the business account university access.';
    END IF;
  ELSE
    IF host_university IS NULL
       OR COALESCE(array_length(cleaned_targets, 1), 0) <> 1
       OR cleaned_targets[1] <> host_university THEN
      RAISE EXCEPTION 'Events must target the host account university.';
    END IF;
  END IF;

  NEW.target_universities := cleaned_targets;
  NEW.university := cleaned_targets[1];
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_event_scope(p_viewer_id uuid, p_targets text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_university text;
  v_is_accommodation boolean := false;
  v_allowed text[] := '{}';
BEGIN
  SELECT account_type, university INTO v_type, v_university
  FROM public.profiles WHERE id = p_viewer_id;

  IF v_type = 'student' THEN
    RETURN v_university IS NOT NULL AND v_university = ANY(COALESCE(p_targets, '{}'));
  END IF;

  IF v_type = 'business' THEN
    SELECT COALESCE(is_accommodation, false)
    INTO v_is_accommodation
    FROM public.business_profiles
    WHERE id = p_viewer_id;

    IF v_is_accommodation THEN RETURN false; END IF;
    v_allowed := public.effective_business_universities(p_viewer_id);
    RETURN COALESCE(p_targets, '{}') && v_allowed;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "events_select_same_university" ON public.events;
CREATE POLICY "events_select_same_university" ON public.events
FOR SELECT TO authenticated
USING (
  public.can_view_event_scope(
    auth.uid(),
    CASE
      WHEN COALESCE(array_length(target_universities, 1), 0) = 0 AND university IS NOT NULL
        THEN ARRAY[university]
      ELSE target_universities
    END
  )
);

-- ---------------------------------------------------------------------------
-- 7) Remove listing admin approval. New listings are live immediately.
--    Existing pending listings get a fresh full visibility window.
-- ---------------------------------------------------------------------------

ALTER TABLE public.listings ALTER COLUMN status SET DEFAULT 'active';

DROP FUNCTION IF EXISTS public.approve_listing(uuid);
DROP FUNCTION IF EXISTS public.reject_listing(uuid);

CREATE OR REPLACE FUNCTION public.notify_on_listing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'suspended' AND OLD.status IN ('pending','active') THEN
    INSERT INTO public.notifications (user_id, type, message, listing_id)
    VALUES (NEW.seller_id, 'rejected', 'Your listing "' || NEW.title || '" was suspended.', NEW.id);
  ELSIF NEW.status = 'expired' AND OLD.status = 'active' THEN
    INSERT INTO public.notifications (user_id, type, message, listing_id)
    VALUES (NEW.seller_id, 'expired', 'Your listing "' || NEW.title || '" has expired.', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.listings
SET status = 'active',
    expires_at = now() + CASE plan_tier
      WHEN 'visible' THEN interval '7 days'
      WHEN 'loud' THEN interval '14 days'
      WHEN 'unmissable' THEN interval '30 days'
      WHEN 'featured' THEN interval '14 days'
      WHEN 'campus_partner' THEN interval '30 days'
      WHEN 'noticeboard' THEN interval '7 days'
      ELSE interval '3 days'
    END
WHERE status = 'pending';

GRANT EXECUTE ON FUNCTION public.create_business_listing(uuid,text,text,numeric,text,text,text[],text,text,text,boolean,jsonb,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_listing(uuid,text,text,numeric,text,text,text[],text,text,text,boolean,jsonb,text[]) TO authenticated;
