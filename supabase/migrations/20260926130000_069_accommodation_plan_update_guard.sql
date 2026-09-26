-- Launch-audit hardening: accommodation plan tier and university reach must remain
-- derived from the account's current accommodation plan on every listing update.

CREATE OR REPLACE FUNCTION public.enforce_accommodation_plan_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_max_universities integer;
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

  v_max_universities := CASE v_plan
    WHEN 'accommodation_free' THEN 1
    WHEN 'accommodation_featured' THEN 2
    WHEN 'accommodation_premium' THEN 3
    ELSE 0
  END;

  -- The stored listing tier is a capability, not user-controlled state.
  NEW.plan_tier := v_plan;

  IF coalesce(array_length(NEW.universities, 1), 0) < 1
     OR array_length(NEW.universities, 1) > v_max_universities THEN
    RAISE EXCEPTION 'Your plan allows access to % universities.', v_max_universities;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_accommodation_plan_update ON public.accommodation_listings;
CREATE TRIGGER enforce_accommodation_plan_update
BEFORE INSERT OR UPDATE ON public.accommodation_listings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_accommodation_plan_update();


CREATE OR REPLACE FUNCTION public.enforce_accommodation_image_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(NEW.image_urls, '{}'::text[])) AS image_url
    WHERE image_url IS NOT NULL
      AND trim(image_url) <> ''
      AND position(
        '/storage/v1/object/public/listing-images/accommodation/' || NEW.seller_id::text || '/'
        IN image_url
      ) = 0
  ) THEN
    RAISE EXCEPTION 'Accommodation photos must use the platform upload pipeline.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_accommodation_image_sources ON public.accommodation_listings;
CREATE TRIGGER enforce_accommodation_image_sources
BEFORE INSERT OR UPDATE ON public.accommodation_listings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_accommodation_image_sources();
