-- Accommodation listing reports.
-- This keeps accommodation reports separate from the existing reports table,
-- whose schema is shared by ordinary listing and chat reports.

CREATE TABLE IF NOT EXISTS accommodation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_listing_id uuid NOT NULL REFERENCES accommodation_listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (trim(reason) <> ''),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (accommodation_listing_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS accommodation_reports_listing_idx
  ON accommodation_reports(accommodation_listing_id);

CREATE INDEX IF NOT EXISTS accommodation_reports_created_idx
  ON accommodation_reports(created_at DESC);

ALTER TABLE accommodation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accommodation_reports_select_admin"
ON accommodation_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  )
);

CREATE POLICY "accommodation_reports_insert_authenticated"
ON accommodation_reports
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "accommodation_reports_update_admin"
ON accommodation_reports
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  )
);

CREATE POLICY "accommodation_reports_delete_admin"
ON accommodation_reports
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  )
);

-- The accommodation listing itself is not directly visible to admin accounts
-- through the existing marketplace SELECT policy. This admin-only RPC returns
-- only the report/listing information needed by the existing Reported tab.
CREATE OR REPLACE FUNCTION public.get_accommodation_reports_admin()
RETURNS TABLE (
  id uuid,
  accommodation_listing_id uuid,
  reporter_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  reporter_name text,
  seller_id uuid,
  seller_name text,
  listing_title text,
  listing_image_urls text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.accommodation_listing_id,
    r.reporter_id,
    r.reason,
    r.status,
    r.created_at,
    reporter.full_name,
    a.seller_id,
    seller.full_name,
    a.title,
    a.image_urls
  FROM accommodation_reports r
  JOIN accommodation_listings a
    ON a.id = r.accommodation_listing_id
  LEFT JOIN profiles reporter
    ON reporter.id = r.reporter_id
  LEFT JOIN profiles seller
    ON seller.id = a.seller_id
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accommodation_reports_admin() TO authenticated;
