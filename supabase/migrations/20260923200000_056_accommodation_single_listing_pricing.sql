-- Accommodation batch 1: one listing per provider, building count,
-- room-level pricing, funding options, and revised image limits.
-- Existing accommodation rows remain intact. The new RPC prevents creating
-- additional listing rows for the same provider.

ALTER TABLE accommodation_listings
  ADD COLUMN IF NOT EXISTS building_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_pricing jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE accommodation_listings
  DROP CONSTRAINT IF EXISTS accommodation_listings_building_count_check;

ALTER TABLE accommodation_listings
  ADD CONSTRAINT accommodation_listings_building_count_check
  CHECK (building_count > 0);

ALTER TABLE accommodation_listings
  DROP CONSTRAINT IF EXISTS accommodation_listings_monthly_rent_check;

ALTER TABLE accommodation_listings
  ALTER COLUMN monthly_rent DROP NOT NULL;

ALTER TABLE accommodation_listings
  ADD CONSTRAINT accommodation_listings_monthly_rent_check
  CHECK (monthly_rent IS NULL OR monthly_rent > 0);

ALTER TABLE accommodation_listings
  DROP CONSTRAINT IF EXISTS accommodation_listings_room_pricing_array_check;

ALTER TABLE accommodation_listings
  ADD CONSTRAINT accommodation_listings_room_pricing_array_check
  CHECK (jsonb_typeof(room_pricing) = 'array');

DROP FUNCTION IF EXISTS create_accommodation_listing(uuid, text, numeric, text, text, text[], text[], text[], text);

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
  p_room_pricing jsonb
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

  IF jsonb_array_length(p_room_pricing) > 3 THEN
    RAISE EXCEPTION 'You can add up to 3 room types.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_room_pricing) AS room
    WHERE coalesce(room->>'room_type', '') NOT IN ('single', 'shared_2', 'shared_3')
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
    universities,
    plan_tier,
    status,
    building_count,
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
    p_universities,
    p_plan_tier,
    'active',
    p_building_count,
    p_room_pricing
  )
  RETURNING id INTO v_id;

  UPDATE business_profiles
  SET universities = p_universities
  WHERE id = p_seller_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION create_accommodation_listing(uuid, text, integer, text, text, text[], text[], text[], text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_accommodation_listing(uuid, text, integer, text, text, text[], text[], text[], text, jsonb) TO authenticated;
