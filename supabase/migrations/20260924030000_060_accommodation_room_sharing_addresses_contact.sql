-- Accommodation batch 5:
--   1. Room types are set by how many students share. 'single' is one
--      student, 'shared_N' is N students (any N of 2 or more). Existing rows
--      ('single', 'shared_2', 'shared_3') are already valid and are left
--      untouched. The old limit of 3 room types per listing is removed.
--   2. Optional address for each additional building (Featured and Premium).
--      Stored as a JSON array of text: index 0 is building 2, index 1 is
--      building 3, and so on. A blank entry means no address was given.
--   3. Business accounts can edit their own physical address and website
--      through an RPC (direct updates to business_profiles are admin-only
--      since migration 050).
-- Run after 056-059.

-- 1. Building addresses column ------------------------------------------------

ALTER TABLE accommodation_listings
  ADD COLUMN IF NOT EXISTS building_addresses jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE accommodation_listings
  DROP CONSTRAINT IF EXISTS accommodation_listings_building_addresses_array_check;

ALTER TABLE accommodation_listings
  ADD CONSTRAINT accommodation_listings_building_addresses_array_check
  CHECK (jsonb_typeof(building_addresses) = 'array');

-- 2. Guardrail trigger function (replaces the 058 version) --------------------

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

  IF NEW.building_addresses IS NULL
     OR jsonb_typeof(NEW.building_addresses) <> 'array' THEN
    RAISE EXCEPTION 'Building addresses must be a JSON array.';
  END IF;

  -- Only checked on insert so a plan that later expires never blocks an
  -- unrelated update (for example an admin suspending the listing).
  IF TG_OP = 'INSERT'
     AND v_plan = 'accommodation_free'
     AND jsonb_array_length(NEW.building_addresses) > 0 THEN
    RAISE EXCEPTION 'Adding an address for each building requires the Featured or Premium accommodation plan.';
  END IF;

  IF jsonb_array_length(NEW.building_addresses) > greatest(NEW.building_count - 1, 0) THEN
    RAISE EXCEPTION 'You can only add an address for each additional building.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.building_addresses) AS addr
    WHERE jsonb_typeof(addr) <> 'string'
  ) THEN
    RAISE EXCEPTION 'Building addresses must be text.';
  END IF;

  IF NEW.monthly_rent IS NOT NULL AND NEW.monthly_rent <= 0 THEN
    RAISE EXCEPTION 'Monthly rent must be greater than zero when supplied.';
  END IF;

  IF NEW.room_pricing IS NULL
     OR jsonb_typeof(NEW.room_pricing) <> 'array' THEN
    RAISE EXCEPTION 'Room pricing must be a JSON array.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.room_pricing) AS room
    WHERE coalesce(room->>'room_type', '') !~ '^(single|shared_([2-9]|[1-9][0-9]+))$'
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

-- 3. create_accommodation_listing (replaces the 057 version) -------------------

DROP FUNCTION IF EXISTS create_accommodation_listing(uuid, text, integer, text, text, text[], text[], text[], text, jsonb, text);

CREATE OR REPLACE FUNCTION create_accommodation_listing(
  p_seller_id uuid,
  p_title text,
  p_building_count integer,
  p_address text,
  p_description text,
  p_amenities text[],
  p_image_urls text[],
  p_universities text[],
  p_plan_tier text,
  p_room_pricing jsonb,
  p_video_url text DEFAULT NULL,
  p_building_addresses jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile business_profiles%ROWTYPE;
  v_max_universities integer;
  v_max_photos integer;
  v_existing_count integer;
  v_starting_rent numeric;
  v_id uuid;
  v_video_url text := NULLIF(trim(coalesce(p_video_url, '')), '');
BEGIN
  IF auth.uid() IS DISTINCT FROM p_seller_id THEN
    RAISE EXCEPTION 'Not authorised.';
  END IF;

  SELECT * INTO v_profile
  FROM business_profiles
  WHERE id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND OR v_profile.is_accommodation IS NOT TRUE THEN
    RAISE EXCEPTION 'Accommodation account required.';
  END IF;

  IF v_profile.accommodation_plan_expires_at IS NOT NULL
     AND v_profile.accommodation_plan_expires_at < now() THEN
    v_profile.accommodation_plan := 'accommodation_free';
  END IF;

  IF p_plan_tier IS DISTINCT FROM v_profile.accommodation_plan THEN
    RAISE EXCEPTION 'Your accommodation plan has changed. Refresh and try again.';
  END IF;

  CASE v_profile.accommodation_plan
    WHEN 'accommodation_free' THEN
      v_max_universities := 1;
      v_max_photos := 3;
    WHEN 'accommodation_featured' THEN
      v_max_universities := 2;
      v_max_photos := 12;
    WHEN 'accommodation_premium' THEN
      v_max_universities := 3;
      v_max_photos := 30;
    ELSE
      RAISE EXCEPTION 'Invalid accommodation plan.';
  END CASE;

  IF v_video_url IS NOT NULL AND v_profile.accommodation_plan <> 'accommodation_premium' THEN
    RAISE EXCEPTION 'Video uploads require the Premium accommodation plan.';
  END IF;

  SELECT count(*)
  INTO v_existing_count
  FROM accommodation_listings
  WHERE seller_id = p_seller_id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Your accommodation account already has a listing. Add all buildings and room pricing to that listing.';
  END IF;

  IF coalesce(p_building_count, 0) < 1 THEN
    RAISE EXCEPTION 'Enter at least 1 building.';
  END IF;

  IF coalesce(array_length(p_image_urls, 1), 0) > v_max_photos THEN
    RAISE EXCEPTION 'Your plan allows up to % photos.', v_max_photos;
  END IF;

  IF coalesce(array_length(p_universities, 1), 0) < 1
     OR array_length(p_universities, 1) > v_max_universities THEN
    RAISE EXCEPTION 'Choose between 1 and % universities.', v_max_universities;
  END IF;

  IF p_room_pricing IS NULL OR jsonb_typeof(p_room_pricing) <> 'array' THEN
    RAISE EXCEPTION 'Room pricing must be a JSON array.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_room_pricing) AS room
    WHERE coalesce(room->>'room_type', '') !~ '^(single|shared_([2-9]|[1-9][0-9]+))$'
  ) THEN
    RAISE EXCEPTION 'Invalid room type.';
  END IF;

  IF (
    SELECT count(DISTINCT room->>'room_type')
    FROM jsonb_array_elements(p_room_pricing) AS room
  ) <> jsonb_array_length(p_room_pricing) THEN
    RAISE EXCEPTION 'A room type can only be added once.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_room_pricing) AS room
    CROSS JOIN LATERAL jsonb_each(room - 'room_type') AS funding
    WHERE funding.key NOT IN ('bursary', 'nsfas', 'self_funded')
      OR jsonb_typeof(funding.value) NOT IN ('number', 'null')
      OR (jsonb_typeof(funding.value) = 'number' AND (funding.value #>> '{}')::numeric <= 0)
  ) THEN
    RAISE EXCEPTION 'Room pricing must contain only positive numeric amounts or null values.';
  END IF;

  SELECT min(CASE WHEN jsonb_typeof(funding.value) = 'number' THEN (funding.value #>> '{}')::numeric END)
  INTO v_starting_rent
  FROM jsonb_array_elements(p_room_pricing) AS room
  CROSS JOIN LATERAL jsonb_each(room - 'room_type') AS funding;

  INSERT INTO accommodation_listings(
    seller_id,
    title,
    monthly_rent,
    address,
    description,
    amenities,
    image_urls,
    video_url,
    universities,
    plan_tier,
    status,
    building_count,
    building_addresses,
    room_pricing
  )
  VALUES(
    p_seller_id,
    trim(p_title),
    v_starting_rent,
    trim(p_address),
    trim(p_description),
    coalesce(p_amenities, '{}'),
    coalesce(p_image_urls, '{}'),
    v_video_url,
    p_universities,
    p_plan_tier,
    'active',
    p_building_count,
    coalesce(p_building_addresses, '[]'::jsonb),
    p_room_pricing
  )
  RETURNING id INTO v_id;

  UPDATE business_profiles
  SET universities = p_universities
  WHERE id = p_seller_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION create_accommodation_listing(uuid, text, integer, text, text, text[], text[], text[], text, jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_accommodation_listing(uuid, text, integer, text, text, text[], text[], text[], text, jsonb, text, jsonb) TO authenticated;

-- 4. Business accounts editing their own address and website -------------------

CREATE OR REPLACE FUNCTION update_business_contact(
  p_address text,
  p_website text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address text := NULLIF(trim(coalesce(p_address, '')), '');
  v_website text := NULLIF(trim(coalesce(p_website, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorised.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Business account required.';
  END IF;

  IF v_address IS NULL AND v_website IS NULL THEN
    RAISE EXCEPTION 'Add a physical address or a website — at least one.';
  END IF;

  UPDATE business_profiles
  SET physical_address = v_address,
      website = v_website
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION update_business_contact(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_business_contact(text, text) TO authenticated;
