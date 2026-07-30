-- supabase/storage_policies.sql
-- Storage policies for listing-images bucket
-- These are already applied via migration 008_create_storage_bucket
-- Kept here as reference

-- Public read:
-- CREATE POLICY "listing_images_public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'listing-images');

-- Authenticated upload:
-- CREATE POLICY "listing_images_auth_insert" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images');

-- Owner delete (path format: listings/{user_id}/{filename}):
-- CREATE POLICY "listing_images_owner_delete" ON storage.objects
--   FOR DELETE TO authenticated USING (
--     bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[2]
--   );
