-- Batch 2: keep student-only areas student-only and enforce normal listing
-- limits in the database, not only in the page UI.

-- ---------------------------------------------------------------------------
-- 1) Resolve the current student plan from stored account state.
--    Expired paid plans fall back to Ghost.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.effective_student_plan(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.account_type <> 'student' THEN NULL
    WHEN p.plan = 'visible'
         AND p.plan_expires_at IS NOT NULL
         AND p.plan_expires_at > now() THEN 'visible'
    WHEN p.plan = 'loud'
         AND p.plan_expires_at IS NOT NULL
         AND p.plan_expires_at > now() THEN 'loud'
    WHEN p.plan = 'unmissable'
         AND p.plan_expires_at IS NOT NULL
         AND p.plan_expires_at > now() THEN 'unmissable'
    ELSE 'ghost'
  END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.normal_listing_limit_for_account(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_plan text;
  v_is_accommodation boolean := false;
BEGIN
  SELECT account_type
  INTO v_type
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_type = 'student' THEN
    v_plan := public.effective_student_plan(p_user_id);
    RETURN CASE v_plan
      WHEN 'loud' THEN 2
      WHEN 'unmissable' THEN 3
      ELSE 1
    END;
  END IF;

  IF v_type = 'business' THEN
    SELECT COALESCE(is_accommodation, false)
    INTO v_is_accommodation
    FROM public.business_profiles
    WHERE id = p_user_id;

    IF NOT FOUND OR v_is_accommodation THEN
      RETURN 0;
    END IF;

    v_plan := public.effective_business_plan(p_user_id);
    RETURN CASE v_plan
      WHEN 'featured' THEN 2
      WHEN 'campus_partner' THEN 3
      ELSE 1
    END;
  END IF;

  RETURN 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Enforce the active-listing limit at the database boundary.
--    Editing an existing listing is unaffected because this runs on INSERT.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_normal_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_current integer;
  v_type text;
  v_is_accommodation boolean := false;
BEGIN
  SELECT account_type
  INTO v_type
  FROM public.profiles
  WHERE id = NEW.seller_id;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'A valid seller account is required.';
  END IF;

  IF v_type = 'business' THEN
    SELECT COALESCE(is_accommodation, false)
    INTO v_is_accommodation
    FROM public.business_profiles
    WHERE id = NEW.seller_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A valid business profile is required.';
    END IF;

    IF v_is_accommodation THEN
      RAISE EXCEPTION 'Accommodation providers must use the accommodation listing flow.';
    END IF;
  ELSIF v_type <> 'student' THEN
    RAISE EXCEPTION 'This account cannot create normal marketplace listings.';
  END IF;

  v_limit := public.normal_listing_limit_for_account(NEW.seller_id);

  -- Serialize new listings for the same seller so two simultaneous posts
  -- cannot both pass the count check and exceed the plan limit.
  PERFORM 1
  FROM public.profiles
  WHERE id = NEW.seller_id
  FOR UPDATE;

  SELECT count(*)::integer
  INTO v_current
  FROM public.listings l
  WHERE l.seller_id = NEW.seller_id
    AND l.status IN ('active', 'pending');

  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'Your current plan allows up to % active listing%.',
      v_limit,
      CASE WHEN v_limit = 1 THEN '' ELSE 's' END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_normal_listing_limit_trigger ON public.listings;
CREATE TRIGGER enforce_normal_listing_limit_trigger
BEFORE INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_normal_listing_limit();

REVOKE ALL ON FUNCTION public.effective_student_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normal_listing_limit_for_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_student_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normal_listing_limit_for_account(uuid) TO authenticated;
