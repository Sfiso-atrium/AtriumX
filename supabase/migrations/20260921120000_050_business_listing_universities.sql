-- 050_business_listing_universities.sql
-- Business university reach is attached to the business account and each
-- listing records the universities that listing is intended to reach.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS universities text[] NOT NULL DEFAULT '{}';

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS universities text[] NOT NULL DEFAULT '{}';

-- Existing business listings predate the university selector. Preserve their
-- visibility by assigning the business account's current university set.
UPDATE listings l
SET universities = bp.universities
FROM business_profiles bp
JOIN profiles p ON p.id = bp.id
WHERE l.seller_id = bp.id
  AND p.account_type = 'business'
  AND COALESCE(array_length(l.universities, 1), 0) = 0;

CREATE OR REPLACE FUNCTION business_university_limit(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'featured' THEN 2
    WHEN 'campus_partner' THEN 3
    ELSE 1
  END;
$$;

-- The account row is no longer client-editable directly. University changes
-- happen through the listing RPCs below, which enforce the plan ceiling.
DROP POLICY IF EXISTS "business_profiles_update_own_or_admin" ON business_profiles;
CREATE POLICY "business_profiles_update_admin" ON business_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE OR REPLACE FUNCTION create_business_listing(
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
    SELECT 1 FROM profiles
    WHERE id = p_seller_id AND account_type = 'business'
  ) THEN
    RAISE EXCEPTION 'Only business accounts can use the business listing flow.';
  END IF;

  SELECT
    CASE
      WHEN plan = 'noticeboard' THEN 'noticeboard'
      WHEN plan IN ('featured', 'campus_partner')
           AND plan_expires_at IS NOT NULL
           AND plan_expires_at > now() THEN plan
      ELSE 'noticeboard'
    END,
    plan_expires_at
  INTO v_plan, v_expires_at
  FROM profiles
  WHERE id = p_seller_id;

  v_max := business_university_limit(v_plan);
  v_selected := ARRAY(
    SELECT DISTINCT trim(value)
    FROM unnest(COALESCE(p_universities, '{}')) AS value
    WHERE trim(value) <> ''
  );

  IF COALESCE(array_length(v_selected, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one university.';
  END IF;

  IF array_length(v_selected, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities.', v_max;
  END IF;

  SELECT COALESCE(universities, '{}') INTO v_existing
  FROM business_profiles
  WHERE id = p_seller_id;

  v_union := ARRAY(
    SELECT DISTINCT value
    FROM unnest(COALESCE(v_existing, '{}') || v_selected) AS value
    WHERE trim(value) <> ''
    ORDER BY value
  );

  IF array_length(v_union, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities. Upgrade to reach another university.', v_max;
  END IF;

  v_expires_at := now() + CASE v_plan
    WHEN 'featured' THEN interval '14 days'
    WHEN 'campus_partner' THEN interval '30 days'
    ELSE interval '7 days'
  END;

  UPDATE business_profiles
  SET universities = v_union
  WHERE id = p_seller_id;

  INSERT INTO listings (
    seller_id, title, description, price, category, custom_category,
    image_urls, video_url, residence, listing_type, is_negotiable,
    plan_tier, status, variants, expires_at, universities
  ) VALUES (
    p_seller_id, p_title, p_description, p_price, p_category,
    p_custom_category, COALESCE(p_image_urls, '{}'), p_video_url,
    COALESCE(p_residence, ''), p_listing_type, p_is_negotiable,
    v_plan, 'pending', COALESCE(p_variants, '[]'::jsonb), v_expires_at,
    v_selected
  )
  RETURNING id INTO v_listing_id;

  RETURN v_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_business_listing(
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
  FROM listings
  WHERE id = p_listing_id;

  IF v_seller_id IS NULL OR auth.uid() IS DISTINCT FROM v_seller_id THEN
    RAISE EXCEPTION 'Not authorised to edit this listing.';
  END IF;

  SELECT
    CASE
      WHEN plan = 'noticeboard' THEN 'noticeboard'
      WHEN plan IN ('featured', 'campus_partner')
           AND plan_expires_at IS NOT NULL
           AND plan_expires_at > now() THEN plan
      ELSE 'noticeboard'
    END
  INTO v_plan
  FROM profiles
  WHERE id = v_seller_id AND account_type = 'business';

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Only business listings can use this edit flow.';
  END IF;

  v_max := business_university_limit(v_plan);
  v_selected := ARRAY(
    SELECT DISTINCT trim(value)
    FROM unnest(COALESCE(p_universities, '{}')) AS value
    WHERE trim(value) <> ''
  );

  IF COALESCE(array_length(v_selected, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one university.';
  END IF;

  SELECT COALESCE(universities, '{}') INTO v_existing
  FROM business_profiles
  WHERE id = v_seller_id;

  v_union := ARRAY(
    SELECT DISTINCT value
    FROM unnest(COALESCE(v_existing, '{}') || v_selected) AS value
    WHERE trim(value) <> ''
    ORDER BY value
  );

  IF array_length(v_union, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities. Upgrade to reach another university.', v_max;
  END IF;

  UPDATE business_profiles
  SET universities = v_union
  WHERE id = v_seller_id;

  UPDATE listings
  SET
    title = p_title,
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
    has_pending_edit = true,
    edited_at = now()
  WHERE id = p_listing_id;
END;
$$;

-- Defense in depth for any direct listing write path that survives outside
-- the new RPCs.
CREATE OR REPLACE FUNCTION enforce_listing_universities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_plan text;
  v_max integer;
  v_allowed text[];
  v_selected text[];
BEGIN
  SELECT account_type,
    CASE
      WHEN plan = 'noticeboard' THEN 'noticeboard'
      WHEN plan IN ('featured', 'campus_partner')
           AND plan_expires_at IS NOT NULL
           AND plan_expires_at > now() THEN plan
      ELSE 'noticeboard'
    END
  INTO v_account_type, v_plan
  FROM profiles
  WHERE id = NEW.seller_id;

  IF v_account_type <> 'business' THEN
    NEW.universities := '{}';
    RETURN NEW;
  END IF;

  v_max := business_university_limit(v_plan);
  v_selected := ARRAY(
    SELECT DISTINCT trim(value)
    FROM unnest(COALESCE(NEW.universities, '{}')) AS value
    WHERE trim(value) <> ''
  );

  IF COALESCE(array_length(v_selected, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Business listings must target at least one university.';
  END IF;

  IF array_length(v_selected, 1) > v_max THEN
    RAISE EXCEPTION 'Your current plan allows up to % universities.', v_max;
  END IF;

  SELECT COALESCE(universities, '{}') INTO v_allowed
  FROM business_profiles
  WHERE id = NEW.seller_id;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_selected) AS chosen
    WHERE NOT (chosen = ANY(COALESCE(v_allowed, '{}')))
  ) THEN
    RAISE EXCEPTION 'This listing can only use universities available to the business account.';
  END IF;

  NEW.universities := v_selected;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_listing_universities_trigger ON listings;
CREATE TRIGGER enforce_listing_universities_trigger
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION enforce_listing_universities();

GRANT EXECUTE ON FUNCTION create_business_listing(uuid,text,text,numeric,text,text,text[],text,text,text,boolean,jsonb,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_business_listing(uuid,text,text,numeric,text,text,text[],text,text,text,boolean,jsonb,text[]) TO authenticated;
