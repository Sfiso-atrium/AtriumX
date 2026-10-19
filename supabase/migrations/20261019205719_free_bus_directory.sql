-- Public company-supplied travel information; no account, university or plan gate.
-- Keep expired records so visitors can follow the company website for current data.
CREATE TABLE public.bus_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL CHECK (char_length(btrim(company_name)) BETWEEN 1 AND 160),
  website_url text NOT NULL CHECK (
    char_length(website_url) <= 2048 AND website_url ~ '^https?://[^[:space:]@/?#]+([/?#][^[:space:]]*)?$'
  ),
  origin text CHECK (char_length(origin) <= 160),
  destination text CHECK (char_length(destination) <= 160),
  origin_aliases text[] NOT NULL DEFAULT '{}',
  destination_aliases text[] NOT NULL DEFAULT '{}',
  boarding_points text[] NOT NULL DEFAULT '{}',
  dropoff_points text[] NOT NULL DEFAULT '{}',
  price numeric(12,2) CHECK (price >= 0),
  price_type text NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed','from')),
  journey_type text NOT NULL DEFAULT 'unknown' CHECK (journey_type IN ('unknown','one_way','return')),
  connection_type text NOT NULL DEFAULT 'unknown' CHECK (connection_type IN ('unknown','direct','connecting')),
  connection_details text CHECK (char_length(connection_details) <= 4000),
  departure_time time,
  arrival_time time,
  duration_minutes integer CHECK (duration_minutes >= 0),
  operating_days integer[] NOT NULL DEFAULT '{}' CHECK (operating_days <@ ARRAY[0,1,2,3,4,5,6] AND array_position(operating_days, NULL) IS NULL),
  travel_date date,
  valid_from date,
  valid_until date,
  information_date date,
  student_discount text CHECK (char_length(student_discount) <= 4000),
  baggage_allowance text CHECK (char_length(baggage_allowance) <= 4000),
  notes text CHECK (char_length(notes) <= 4000),
  is_outdated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bus_information_validity CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
  CONSTRAINT bus_place_arrays CHECK (
    cardinality(origin_aliases) <= 100 AND cardinality(destination_aliases) <= 100
    AND cardinality(boarding_points) <= 100 AND cardinality(dropoff_points) <= 100
    AND array_position(origin_aliases, NULL) IS NULL AND array_position(destination_aliases, NULL) IS NULL
    AND array_position(boarding_points, NULL) IS NULL AND array_position(dropoff_points, NULL) IS NULL
  )
);

CREATE INDEX bus_listings_created_id_idx ON public.bus_listings (created_at DESC, id);
ALTER TABLE public.bus_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bus_listings FROM anon, authenticated;
GRANT SELECT ON public.bus_listings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.bus_listings TO authenticated;
GRANT ALL ON public.bus_listings TO service_role;

CREATE POLICY bus_public_read ON public.bus_listings FOR SELECT TO anon, authenticated USING (true);
-- Reuse the existing private admin helper, including its blocked-account check.
CREATE POLICY bus_admin_insert ON public.bus_listings FOR INSERT TO authenticated
  WITH CHECK ((SELECT atriumx_private.workspace_admin()));
CREATE POLICY bus_admin_update ON public.bus_listings FOR UPDATE TO authenticated
  USING ((SELECT atriumx_private.workspace_admin())) WITH CHECK ((SELECT atriumx_private.workspace_admin()));

CREATE FUNCTION atriumx_private.touch_bus_listing() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION atriumx_private.touch_bus_listing() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bus_listing_updated BEFORE UPDATE ON public.bus_listings
  FOR EACH ROW EXECUTE FUNCTION atriumx_private.touch_bus_listing();
