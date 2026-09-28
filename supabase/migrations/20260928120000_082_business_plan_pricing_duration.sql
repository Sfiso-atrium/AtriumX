-- Business plan pricing/duration alignment.
-- Targeted changes only:
--   Featured: R199, 30 days
--   Campus Partner: R349, 30 days
-- The actual PayFast amounts/durations live in the Edge Function; this
-- migration keeps database-side listing duration and referral earnings in sync.

-- New Featured listings (and existing listings upgraded to Featured through
-- the normal payment flow) receive the full 30-day visibility period.
CREATE OR REPLACE FUNCTION public.enforce_featured_listing_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.plan_tier = 'featured' THEN
      NEW.expires_at := now() + interval '30 days';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.plan_tier = 'featured'
       AND OLD.plan_tier IS DISTINCT FROM NEW.plan_tier THEN
      NEW.expires_at := now() + interval '30 days';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_featured_listing_duration_trigger ON public.listings;
CREATE TRIGGER enforce_featured_listing_duration_trigger
BEFORE INSERT OR UPDATE OF plan_tier ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_featured_listing_duration();

-- Referral earnings are 5% of the real plan price. Keep the existing
-- referral behaviour unchanged; only the two business prices are updated.
CREATE OR REPLACE FUNCTION public.notify_referral_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_seller_name text;
  v_plan_price numeric(10,2);
  v_amount numeric(10,2);
BEGIN
  SELECT partner_id
  INTO v_partner_id
  FROM referrals
  WHERE referred_user_id = NEW.seller_id;

  IF v_partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_plan_price := CASE NEW.plan_tier
    WHEN 'visible' THEN 29
    WHEN 'loud' THEN 79
    WHEN 'unmissable' THEN 149
    WHEN 'featured' THEN 199
    WHEN 'campus_partner' THEN 349
    ELSE 0
  END;

  v_amount := round(v_plan_price * 0.05, 2);

  SELECT full_name
  INTO v_seller_name
  FROM profiles
  WHERE id = NEW.seller_id;

  INSERT INTO referral_events (
    partner_id,
    referred_user_id,
    listing_id,
    plan_tier,
    amount
  ) VALUES (
    v_partner_id,
    NEW.seller_id,
    NEW.id,
    NEW.plan_tier,
    v_amount
  );

  INSERT INTO notifications (user_id, type, message, listing_id)
  VALUES (
    v_partner_id,
    'referral_listing',
    COALESCE(v_seller_name, 'Someone you referred') ||
      ' made a listing on the ' || NEW.plan_tier || ' plan.',
    NEW.id
  );

  RETURN NEW;
END;
$$;
