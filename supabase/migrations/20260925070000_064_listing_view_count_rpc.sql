-- Count a listing view without granting viewers permission to update listings.
CREATE OR REPLACE FUNCTION increment_listing_view_count(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE listings
  SET view_count = view_count + 1
  WHERE id = listing_id
    AND seller_id <> auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION increment_listing_view_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_listing_view_count(uuid) TO authenticated;
