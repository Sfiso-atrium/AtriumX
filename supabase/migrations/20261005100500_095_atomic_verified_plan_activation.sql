-- Make verified PayFast activation atomic.
-- The Edge Function validates PayFast. This RPC performs the resulting
-- account/listing/payment changes in one database transaction so a retry
-- can never extend the plan twice after a partial failure.

CREATE OR REPLACE FUNCTION public.activate_verified_plan_payment(
  p_payment_id uuid,
  p_pf_payment_id text,
  p_itn_payload jsonb
)
RETURNS TABLE (
  activated_plan text,
  activated_until timestamptz,
  payment_intent text,
  renewed_listing_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_now timestamptz := now();
  v_base timestamptz;
  v_expires timestamptz;
  v_current_plan text;
  v_current_expiry timestamptz;
  v_account_type text;
  v_is_accommodation boolean := false;
  v_listing_status text;
  v_listing_limit integer;
  v_enabled_count integer;
  v_enable_renewed_listing boolean := false;
BEGIN
  SELECT *
    INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found.';
  END IF;

  IF v_payment.status = 'complete' THEN
    IF v_payment.plan_key LIKE 'accommodation_%' THEN
      SELECT accommodation_plan_expires_at
        INTO v_expires
      FROM public.business_profiles
      WHERE id = v_payment.user_id;
    ELSE
      SELECT plan_expires_at
        INTO v_expires
      FROM public.profiles
      WHERE id = v_payment.user_id;
    END IF;

    RETURN QUERY SELECT v_payment.plan_key, v_expires, v_payment.intent, v_payment.listing_id;
    RETURN;
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment is not pending.';
  END IF;

  IF v_payment.plan_key LIKE 'accommodation_%' THEN
    SELECT bp.accommodation_plan, bp.accommodation_plan_expires_at, bp.is_accommodation
      INTO v_current_plan, v_current_expiry, v_is_accommodation
    FROM public.business_profiles bp
    WHERE bp.id = v_payment.user_id
    FOR UPDATE;

    IF NOT COALESCE(v_is_accommodation, false) THEN
      RAISE EXCEPTION 'Accommodation account required.';
    END IF;

    IF v_payment.plan_key NOT IN ('accommodation_featured', 'accommodation_premium') THEN
      RAISE EXCEPTION 'Invalid accommodation plan.';
    END IF;

    v_base := CASE
      WHEN v_current_plan = v_payment.plan_key
       AND v_current_expiry IS NOT NULL
       AND v_current_expiry > v_now
      THEN v_current_expiry
      ELSE v_now
    END;
    v_expires := v_base + make_interval(days => v_payment.plan_days);

    UPDATE public.business_profiles
    SET accommodation_plan = v_payment.plan_key,
        accommodation_plan_expires_at = v_expires
    WHERE id = v_payment.user_id;
  ELSE
    SELECT p.plan, p.plan_expires_at, p.account_type
      INTO v_current_plan, v_current_expiry, v_account_type
    FROM public.profiles p
    WHERE p.id = v_payment.user_id
    FOR UPDATE;

    IF v_account_type = 'student'
       AND v_payment.plan_key NOT IN ('visible', 'loud', 'unmissable') THEN
      RAISE EXCEPTION 'Invalid student plan.';
    END IF;

    IF v_account_type = 'business' THEN
      SELECT COALESCE(bp.is_accommodation, false)
        INTO v_is_accommodation
      FROM public.business_profiles bp
      WHERE bp.id = v_payment.user_id;

      IF v_is_accommodation
         OR v_payment.plan_key NOT IN ('featured', 'campus_partner') THEN
        RAISE EXCEPTION 'Invalid business plan.';
      END IF;
    ELSIF v_account_type IS DISTINCT FROM 'student' THEN
      RAISE EXCEPTION 'Unsupported account type.';
    END IF;

    v_base := CASE
      WHEN v_current_plan = v_payment.plan_key
       AND v_current_expiry IS NOT NULL
       AND v_current_expiry > v_now
      THEN v_current_expiry
      ELSE v_now
    END;
    v_expires := v_base + make_interval(days => v_payment.plan_days);

    UPDATE public.profiles
    SET plan = v_payment.plan_key,
        plan_expires_at = v_expires
    WHERE id = v_payment.user_id;

    UPDATE public.listings
    SET plan_tier = v_payment.plan_key,
        expires_at = v_expires
    WHERE seller_id = v_payment.user_id
      AND status IN ('active', 'pending');

    IF v_payment.listing_id IS NOT NULL THEN
      SELECT status
        INTO v_listing_status
      FROM public.listings
      WHERE id = v_payment.listing_id
        AND seller_id = v_payment.user_id
      FOR UPDATE;

      IF v_listing_status = 'expired' THEN
        v_listing_limit := public.normal_listing_limit_for_account(v_payment.user_id);

        SELECT count(*)
          INTO v_enabled_count
        FROM public.listings
        WHERE seller_id = v_payment.user_id
          AND id <> v_payment.listing_id
          AND plan_enabled
          AND status IN ('active', 'pending')
          AND expires_at > v_now;

        v_enable_renewed_listing := COALESCE(v_enabled_count, 0) < COALESCE(v_listing_limit, 0);

        UPDATE public.listings
        SET status = 'active',
            plan_enabled = v_enable_renewed_listing,
            plan_tier = v_payment.plan_key,
            expires_at = v_expires
        WHERE id = v_payment.listing_id
          AND seller_id = v_payment.user_id;
      END IF;
    END IF;
  END IF;

  UPDATE public.payments
  SET status = 'complete',
      pf_payment_id = p_pf_payment_id,
      itn_payload = p_itn_payload,
      completed_at = v_now
  WHERE id = v_payment.id;

  RETURN QUERY SELECT v_payment.plan_key, v_expires, v_payment.intent, v_payment.listing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_verified_plan_payment(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_verified_plan_payment(uuid, text, jsonb)
  TO service_role;
