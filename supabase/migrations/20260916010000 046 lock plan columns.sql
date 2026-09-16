-- 046_lock_plan_columns.sql
--
-- THE hole in paid plans. Migration 001 created:
--
--   CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
--     TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
--
-- RLS policies gate WHICH ROWS you may update, never WHICH COLUMNS. So any
-- signed-in person could open devtools and run
--
--   supabase.from('profiles')
--     .update({ plan: 'unmissable', plan_expires_at: '2030-01-01' })
--     .eq('id', <their own id>)
--
-- and hand themselves the top tier, forever, for nothing. PayFast can be
-- wired perfectly and it would still be bypassable in one line, because
-- the money was never what the app actually checked.
--
-- A trigger is the right tool here: it sees the old and new row and can
-- reject a change to specific columns while leaving the rest of the
-- profile freely editable (name, residence, avatar and so on all still
-- work exactly as before).
--
-- Edge functions connect with the service role, which this deliberately
-- lets through — payfast-itn is meant to set these columns. Everyone else
-- is refused.

CREATE OR REPLACE FUNCTION guard_plan_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Service role (edge functions) and the postgres superuser may do as
  -- they like. current_setting with `true` returns NULL instead of
  -- raising when the GUC isn't present, which is what happens on a plain
  -- SQL-editor connection.
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR current_user = 'postgres'
     OR current_user = 'supabase_admin'
  THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
  THEN
    RAISE EXCEPTION 'Plan changes are not permitted from the client. Plans are set by verified payment only.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_plan_columns_trigger ON profiles;
CREATE TRIGGER guard_plan_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_plan_columns();

-- Same story one table over. `listings.plan_tier` decides which badge and
-- limits a listing gets, and listings are client-writable by their owner,
-- so a tampered insert/update could claim a Featured tier the account
-- never paid for. Force it to match whatever the seller's profile
-- actually holds rather than trusting what was sent.
CREATE OR REPLACE FUNCTION enforce_listing_plan_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seller_plan text;
  seller_expiry timestamptz;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT plan, plan_expires_at INTO seller_plan, seller_expiry
  FROM profiles WHERE id = NEW.seller_id;

  -- Lapsed or missing paid plan falls back to the free tier for whichever
  -- account type this is.
  IF seller_plan IS NULL
     OR (seller_plan NOT IN ('ghost', 'noticeboard')
         AND (seller_expiry IS NULL OR seller_expiry <= now()))
  THEN
    seller_plan := CASE
      WHEN (SELECT account_type FROM profiles WHERE id = NEW.seller_id) = 'business'
      THEN 'noticeboard' ELSE 'ghost' END;
  END IF;

  NEW.plan_tier := seller_plan;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_listing_plan_tier_trigger ON listings;
CREATE TRIGGER enforce_listing_plan_tier_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_listing_plan_tier();
