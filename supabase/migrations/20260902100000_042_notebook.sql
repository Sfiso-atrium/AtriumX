-- Notebook: private, end-to-end encrypted notes + attachments. Every
-- byte of note text and file content is encrypted client-side (AES-GCM,
-- via the Web Crypto API) BEFORE it ever reaches Supabase, using a key
-- derived from a passcode the student sets that is never sent to the
-- server in any form. What lands in these tables and in the
-- notebook-files bucket is unreadable ciphertext - nobody with database
-- or storage access, including us, can read note content or file
-- contents without the student's own passcode. There is no "forgot
-- passcode" recovery: losing it means losing access to everything
-- encrypted with it, by design (see resetNotebook in
-- src/services/notebook.ts for the only way forward from that, which is
-- wiping everything and starting over).
--
-- Filenames and MIME types are the one piece of metadata NOT encrypted
-- (stored in the clear on notebook_attachments) - only the file's actual
-- byte content is. Worth knowing if a filename itself could be sensitive.

-- One row per user: the salt used to re-derive their key on any device
-- from their passcode (PBKDF2), plus a small "check" value used to
-- confirm a passcode is correct BEFORE trusting it against real notes -
-- without this, a mistyped passcode on an empty notebook would silently
-- "succeed" and later produce entries unreadable by the correct passcode.
CREATE TABLE notebook_key_setup (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  salt text NOT NULL,
  check_ciphertext text NOT NULL,
  check_iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notebook_key_setup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_key_setup_select_own" ON notebook_key_setup
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notebook_key_setup_insert_own" ON notebook_key_setup
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notebook_key_setup_delete_own" ON notebook_key_setup
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- No UPDATE policy: a passcode "change" is a reset (delete + insert
-- fresh), never an in-place update, since the salt and check value are
-- meaningless without re-encrypting every existing entry with a new key.

CREATE TABLE notebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ciphertext text NOT NULL, -- base64 AES-GCM ciphertext of {title, body} JSON
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_entries_select_own" ON notebook_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notebook_entries_insert_own" ON notebook_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notebook_entries_update_own" ON notebook_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notebook_entries_delete_own" ON notebook_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE notebook_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES notebook_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL, -- plaintext label only (see note above) - never the content
  mime_type text NOT NULL,
  iv text NOT NULL, -- IV for the encrypted file bytes in storage
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notebook_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_attachments_select_own" ON notebook_attachments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notebook_attachments_insert_own" ON notebook_attachments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notebook_attachments_delete_own" ON notebook_attachments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Private bucket, owner-only - path convention {user_id}/{random-filename},
-- one level shallower than study-group-images since there's no group to
-- scope by here, just the owning student.
INSERT INTO storage.buckets (id, name, public)
VALUES ('notebook-files', 'notebook-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "notebook_files_owner_read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'notebook-files' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "notebook_files_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'notebook-files' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "notebook_files_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'notebook-files' AND auth.uid()::text = (storage.foldername(name))[1]
  );
