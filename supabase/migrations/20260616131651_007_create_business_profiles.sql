
-- BUSINESS PROFILES
CREATE TABLE business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  business_type text NOT NULL,
  custom_business_type text,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  selected_package text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (public insert)
CREATE POLICY "business_profiles_insert_public" ON business_profiles FOR INSERT WITH CHECK (true);
-- Only admins can read/update/delete
CREATE POLICY "business_profiles_select_admin" ON business_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "business_profiles_update_admin" ON business_profiles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "business_profiles_delete_admin" ON business_profiles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
