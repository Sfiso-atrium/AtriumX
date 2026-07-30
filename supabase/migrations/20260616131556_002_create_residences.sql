
-- RESIDENCES
CREATE TABLE residences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE residences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "residences_select_all" ON residences FOR SELECT USING (true);
CREATE POLICY "residences_insert_admin" ON residences FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "residences_update_admin" ON residences FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "residences_delete_admin" ON residences FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

INSERT INTO residences (name) VALUES
  ('Dalrymple House'),
  ('Jubilee Hall'),
  ('International House'),
  ('Knockando Hall'),
  ('Alan Paton Hall');
