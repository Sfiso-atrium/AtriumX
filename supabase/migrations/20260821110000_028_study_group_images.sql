-- Study group image sharing: a PRIVATE storage bucket (unlike listing-images,
-- which is public) — only current members of a group may read or write its
-- images. Path convention every policy relies on:
--   {group_id}/{uploader_user_id}/{random-filename}
-- so storage.foldername(name) gives us [group_id, user_id] to check against.

INSERT INTO storage.buckets (id, name, public)
VALUES ('study-group-images', 'study-group-images', false)
ON CONFLICT (id) DO NOTHING;

-- Read: any current member of the group the image belongs to.
CREATE POLICY "study_group_images_member_read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'study-group-images'
    AND is_study_group_member((storage.foldername(name))[1]::uuid)
  );

-- Upload: must be a current member AND uploading into their own user-id
-- subfolder (mirrors the listing-images owner-delete path check).
CREATE POLICY "study_group_images_member_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'study-group-images'
    AND is_study_group_member((storage.foldername(name))[1]::uuid)
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Delete: only the person who uploaded it.
CREATE POLICY "study_group_images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'study-group-images'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
