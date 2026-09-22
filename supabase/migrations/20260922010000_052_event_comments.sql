-- 052_event_comments.sql
--
-- Event comments ("reviews" placeholder on EventDetails.tsx). Plain text
-- comments about an event, one row per comment — no star rating, since
-- that's already the shape of the `ratings` table for sellers and this is
-- a different concept (commenting on an event, not rating a seller).
-- Mirrors the RLS shape of `ratings`: anyone can read, only the
-- authenticated author can write/edit/delete their own comment.

CREATE TABLE IF NOT EXISTS event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_comments_event_idx ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS event_comments_author_idx ON event_comments(author_id);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_comments_select_all" ON event_comments FOR SELECT USING (true);
CREATE POLICY "event_comments_insert_own" ON event_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "event_comments_update_own" ON event_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "event_comments_delete_own" ON event_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);
