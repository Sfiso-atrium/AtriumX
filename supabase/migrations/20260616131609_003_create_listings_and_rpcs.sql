
-- LISTINGS
CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL,
  custom_category text,
  image_urls text[] NOT NULL DEFAULT '{}',
  video_url text,
  residence text NOT NULL DEFAULT '',
  listing_type text NOT NULL DEFAULT 'single' CHECK (listing_type IN ('single','ongoing')),
  is_negotiable boolean NOT NULL DEFAULT false,
  plan_tier text NOT NULL DEFAULT 'ghost',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','sold','expired','suspended')),
  report_count integer NOT NULL DEFAULT 0,
  contact_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  variants jsonb NOT NULL DEFAULT '[]',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public can read active listings
CREATE POLICY "listings_select_active" ON listings FOR SELECT USING (status = 'active');
-- Seller can read own listings regardless of status
CREATE POLICY "listings_select_own" ON listings FOR SELECT TO authenticated USING (auth.uid() = seller_id);
-- Admin can read all
CREATE POLICY "listings_select_admin" ON listings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "listings_insert_own" ON listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "listings_update_own" ON listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "listings_update_admin" ON listings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "listings_delete_own" ON listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- Increment view_count: allow authenticated updates to view_count only
-- (handled via direct update in dataService, no RPC needed)

-- RPC: increment contact_count
CREATE OR REPLACE FUNCTION increment_contact_count(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listings SET contact_count = contact_count + 1 WHERE id = listing_id;
END;
$$;

-- RPC: increment report_count
CREATE OR REPLACE FUNCTION increment_report_count(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listings SET report_count = report_count + 1 WHERE id = listing_id;
END;
$$;
