-- Study group unread tracking: a per-membership "last read" cursor, same
-- idea as the 1-on-1 chat's `read` flag on messages, but as a cursor
-- instead of a per-message flag — a group has many members, so a
-- per-message-per-user read table would multiply rows for no benefit here.
-- Unread count for a member = messages in that group, not sent by them,
-- with sent_at after their own last_read_at.

ALTER TABLE study_group_members ADD COLUMN last_read_at timestamptz NOT NULL DEFAULT now();

-- Migration 027 only defined select/insert/delete on this table — a
-- member had no way to update their own row at all. Needed now so a
-- member can advance their own read cursor.
CREATE POLICY "study_group_members_update_self" ON study_group_members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
