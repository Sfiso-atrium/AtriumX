-- Paid-plan renewal hardening.
-- A browser must never be able to extend or reactivate an expired paid listing.
-- Paid renewal/upgrade state is recorded on the payment and only the PayFast
-- service-role callback may extend the account/listing expiry.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS intent text NOT NULL DEFAULT 'purchase'
    CHECK (intent IN ('purchase', 'upgrade', 'renewal')),
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_listing_id_idx ON public.payments(listing_id);

CREATE OR REPLACE FUNCTION public.guard_listing_expiry_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Listing expiry can only be extended after a verified plan payment.';
END;
$$;

DROP TRIGGER IF EXISTS guard_listing_expiry_update_trigger ON public.listings;
CREATE TRIGGER guard_listing_expiry_update_trigger
BEFORE UPDATE OF expires_at ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_expiry_update();

CREATE OR REPLACE FUNCTION public.prevent_closed_listing_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('sold', 'expired')
     AND NEW.status IN ('active', 'pending') THEN
    IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Expired or sold listings can only be reactivated through an allowed server flow.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_sold_listing_reactivation_trigger ON public.listings;
DROP TRIGGER IF EXISTS prevent_closed_listing_reactivation_trigger ON public.listings;
CREATE TRIGGER prevent_closed_listing_reactivation_trigger
BEFORE UPDATE OF status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_listing_reactivation();

CREATE OR REPLACE FUNCTION public.normal_listing_plan_visible(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT
      l.plan_enabled
      AND l.status IN ('active', 'pending')
      AND l.expires_at > now()
      AND public.normal_listing_limit_for_account(l.seller_id) > 0
      AND EXISTS (
        SELECT 1
        FROM public.profiles seller
        WHERE seller.id = l.seller_id
          AND (
            seller.account_type = 'student'
            OR (
              seller.account_type = 'business'
              AND l.universities && public.effective_business_universities(l.seller_id)
            )
          )
      )
      AND (
        SELECT count(*)
        FROM public.listings other
        WHERE other.seller_id = l.seller_id
          AND other.plan_enabled
          AND other.status IN ('active', 'pending')
          AND other.expires_at > now()
      ) <= public.normal_listing_limit_for_account(l.seller_id)
    FROM public.listings l
    WHERE l.id = p_listing_id
  ), false);
$$;

REVOKE ALL ON FUNCTION public.guard_listing_expiry_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_closed_listing_reactivation() FROM PUBLIC, anon, authenticated;
