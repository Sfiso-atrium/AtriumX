
-- RATINGS
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, listing_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select_all" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_buyer" ON ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "ratings_update_buyer" ON ratings FOR UPDATE TO authenticated USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "ratings_delete_buyer" ON ratings FOR DELETE TO authenticated USING (auth.uid() = buyer_id);

-- Trigger: recalculate seller avg_rating and total_ratings after insert/update/delete on ratings
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_seller_id := OLD.seller_id;
  ELSE
    v_seller_id := NEW.seller_id;
  END IF;

  UPDATE profiles
  SET
    avg_rating = COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings WHERE seller_id = v_seller_id), 0),
    total_ratings = (SELECT COUNT(*) FROM ratings WHERE seller_id = v_seller_id)
  WHERE id = v_seller_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_seller_rating
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_seller_rating();
