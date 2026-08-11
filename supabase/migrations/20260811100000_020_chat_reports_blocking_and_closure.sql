-- 020_chat_reports_blocking_and_closure.sql
-- Adds everything needed for: reporting a conversation (reusing the
-- existing reports table), admins blocking/unblocking accounts, and
-- admins closing a conversation.

-- 1. Let a report point at a conversation instead of (or alongside) a
-- listing. Chat reports still carry listing_id too (pulled from the
-- conversation), so admin queries that group by listing keep working.
ALTER TABLE reports ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE reports ADD COLUMN status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed'));

-- 2. The old UNIQUE (listing_id, reporter_id) would block a student from
-- filing a chat report on a listing they already reported directly (or
-- vice versa). Replace it with two partial uniques: one dedupes listing
-- reports (conversation_id IS NULL), the other dedupes chat reports
-- (conversation_id IS NOT NULL) — each type still only allows one report
-- per reporter, they just no longer collide with each other.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_listing_id_reporter_id_key;
CREATE UNIQUE INDEX reports_listing_reporter_unique ON reports (listing_id, reporter_id) WHERE conversation_id IS NULL;
CREATE UNIQUE INDEX reports_conversation_reporter_unique ON reports (conversation_id, reporter_id) WHERE conversation_id IS NOT NULL;

-- 3. Blocking. Checked at login (and on session restore) in dataService.ts.
ALTER TABLE profiles ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 4. Admin-initiated conversation closure.
ALTER TABLE conversations ADD COLUMN is_closed_by_admin boolean NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN closed_at timestamptz;

CREATE POLICY "conversations_update_admin" ON conversations FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 5. A closed conversation must actually stop accepting messages at the
-- database level, not just hide the input box in the UI.
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      AND c.is_closed_by_admin = false
    )
  );

-- 6. Admins need to read any conversation/message thread for the "Read
-- Chat" review action — participant-only policies don't cover that.
CREATE POLICY "conversations_select_admin" ON conversations FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "messages_select_admin" ON messages FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
