-- Accommodation batch 4: enforce the accommodation rules at the Supabase
-- database boundary as well as in the client/RPC.
-- Run after the accommodation columns/functions from batches 1 and 2.

CREATE OR REPLACE FUNCTION enforce_accommodation_listing_guardrails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_existing_count integer;
  v_max_photos integer;
  v_video_allowed boolean;
BEGIN
  SELECT
    CASE
      WHEN accommodation_plan_expires_at IS NOT NULL
           AND accommodation_plan_expires_at < now()
        THEN 'accommodation_free'
      ELSE accommodation_plan
    END
  INTO v_plan
  FROM business_profiles
  WHERE id = NEW.seller_id
    AND is_accommodation = true;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Accommodation account required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = NEW.seller_id
      AND account_type = 'business'
  ) THEN
    RAISE EXCEPTION 'Accommodation seller must be a business account.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- One accommodation listing represents the provider as a whole.
    -- Lock this seller's transaction so concurrent inserts cannot create two.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.seller_id::text, 0));

    SELECT count(*)
    INTO v_existing_count
    FROM accommodation_listings
    WHERE seller_id = NEW.seller_id;

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'Your accommodation account already has a listing. Add all buildings and room pricing to that listing.';
    END IF;
  END IF;

  v_max_photos := CASE v_plan
    WHEN 'accommodation_free' THEN 3
    WHEN 'accommodation_featured' THEN 12
    WHEN 'accommodation_premium' THEN 30
    ELSE 0
  END;

  v_video_allowed := v_plan = 'accommodation_premium';

  IF coalesce(array_length(NEW.image_urls, 1), 0) > v_max_photos THEN
    RAISE EXCEPTION 'Your plan allows up to % photos.', v_max_photos;
  END IF;

  IF NULLIF(trim(coalesce(NEW.video_url, '')), '') IS NOT NULL
     AND NOT v_video_allowed THEN
    RAISE EXCEPTION 'Video uploads require the Premium accommodation plan.';
  END IF;

  IF coalesce(NEW.building_count, 0) < 1 THEN
    RAISE EXCEPTION 'Enter at least 1 building.';
  END IF;

  IF NEW.monthly_rent IS NOT NULL AND NEW.monthly_rent <= 0 THEN
    RAISE EXCEPTION 'Monthly rent must be greater than zero when supplied.';
  END IF;

  IF NEW.room_pricing IS NULL
     OR jsonb_typeof(NEW.room_pricing) <> 'array' THEN
    RAISE EXCEPTION 'Room pricing must be a JSON array.';
  END IF;

  IF jsonb_array_length(NEW.room_pricing) > 3 THEN
    RAISE EXCEPTION 'You can add up to 3 room types.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.room_pricing) AS room
    WHERE coalesce(room->>'room_type', '') NOT IN ('single', 'shared_2', 'shared_3')
  ) THEN
    RAISE EXCEPTION 'Invalid room type.';
  END IF;

  IF (
    SELECT count(DISTINCT room->>'room_type')
    FROM jsonb_array_elements(NEW.room_pricing) AS room
  ) <> jsonb_array_length(NEW.room_pricing) THEN
    RAISE EXCEPTION 'A room type can only be added once.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.room_pricing) AS room
    CROSS JOIN LATERAL jsonb_each(room - 'room_type') AS funding
    WHERE funding.key NOT IN ('bursary', 'nsfas', 'self_funded')
       OR jsonb_typeof(funding.value) NOT IN ('number', 'null')
       OR (
         jsonb_typeof(funding.value) = 'number'
         AND (funding.value #>> '{}')::numeric <= 0
       )
  ) THEN
    RAISE EXCEPTION 'Room pricing must contain only positive numeric amounts or null values.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_accommodation_listing_guardrails
ON accommodation_listings;

CREATE TRIGGER enforce_accommodation_listing_guardrails
BEFORE INSERT OR UPDATE ON accommodation_listings
FOR EACH ROW
EXECUTE FUNCTION enforce_accommodation_listing_guardrails();

-- Keep the ownership RLS policy, but explicitly restrict direct inserts to
-- business accommodation accounts. The trigger above applies the plan and
-- one-listing limits even when a client writes to the table without using
-- create_accommodation_listing().
DROP POLICY IF EXISTS "accommodation_listings_insert_owner" ON accommodation_listings;

CREATE POLICY "accommodation_listings_insert_owner"
ON accommodation_listings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.account_type = 'business'
  )
  AND EXISTS (
    SELECT 1
    FROM business_profiles bp
    WHERE bp.id = auth.uid()
      AND bp.is_accommodation = true
  )
);
