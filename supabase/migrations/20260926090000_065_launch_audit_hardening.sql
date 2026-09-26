-- Launch-audit hardening: targeted fixes only.

-- A sold listing is historical and must not be renewed back to active.
-- Other existing status transitions remain unchanged.
CREATE OR REPLACE FUNCTION prevent_sold_listing_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'sold' AND NEW.status = 'active' THEN
    IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sold listings cannot be renewed. Create a new listing instead.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_sold_listing_reactivation_trigger ON listings;
CREATE TRIGGER prevent_sold_listing_reactivation_trigger
BEFORE UPDATE OF status ON listings
FOR EACH ROW
EXECUTE FUNCTION prevent_sold_listing_reactivation();

-- Users may only upload into their own namespace in the shared listing-images bucket.
-- Preserve all existing application upload prefixes while preventing cross-user writes.
DROP POLICY IF EXISTS "listing_images_auth_insert" ON storage.objects;
CREATE POLICY "listing_images_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] IN ('listings', 'events', 'accommodation', 'accommodation-videos')
);

-- A chat report may only reference a conversation in which the reporter is a participant.
DROP POLICY IF EXISTS "reports_insert_authenticated" ON reports;
CREATE POLICY "reports_insert_authenticated" ON reports
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND (
    conversation_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = reports.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  )
);
