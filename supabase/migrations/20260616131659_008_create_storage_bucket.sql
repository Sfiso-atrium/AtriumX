
-- Storage bucket for listing images (idempotent via DO block)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "listing_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

CREATE POLICY "listing_images_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "listing_images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[2]
  );
