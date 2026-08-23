-- Study group avatar: adds the column, plus a PRIVATE storage bucket for
-- the image itself. Path convention: {group_id}/{random-filename} — a new
-- random filename on every edit (not an overwritten fixed name) so that
-- devices with the old avatar already cached (see imageCache.ts, keyed by
-- path) automatically fetch the new one instead of showing a stale image.
--
-- Unlike study-group-images (any member may upload), only the group's
-- creator may write here — this is the group's shared identity, not
-- per-member content. Table UPDATE is already creator-only via the
-- existing "study_groups_update_creator" policy (migration 027).

ALTER TABLE study_groups ADD COLUMN avatar_url text;

CREATE OR REPLACE FUNCTION is_study_group_creator(p_group_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_groups
    WHERE id = p_group_id AND created_by = auth.uid()
  );
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('study-group-avatars', 'study-group-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Read: any current member of the group.
CREATE POLICY "study_group_avatars_member_read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'study-group-avatars'
    AND is_study_group_member((storage.foldername(name))[1]::uuid)
  );

-- Write (new avatar): only the group's creator.
CREATE POLICY "study_group_avatars_creator_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'study-group-avatars'
    AND is_study_group_creator((storage.foldername(name))[1]::uuid)
  );

-- Delete (cleaning up the previous avatar file on edit): creator only.
CREATE POLICY "study_group_avatars_creator_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'study-group-avatars'
    AND is_study_group_creator((storage.foldername(name))[1]::uuid)
  );
