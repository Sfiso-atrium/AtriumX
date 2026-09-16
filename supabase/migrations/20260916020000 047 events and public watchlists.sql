-- 047_events_and_public_watchlists.sql
--
-- Two additions: campus events, and making watchlists visible to other
-- students at the same university so the "Looking For" board can exist.

-- ── EVENTS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',

  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text NOT NULL,

  -- Null price means free entry. Kept separate from a 0 so "Free" is an
  -- explicit choice rather than something inferred from an empty field.
  price numeric(10,2),

  image_url text,

  -- Denormalised from the host's profile at creation time. The feed is
  -- university-scoped and joining through profiles for every row just to
  -- filter would be wasteful; this also means an event stays attached to
  -- the campus it was posted for even if the host later changes theirs.
  university text,

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled')),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events(starts_at);
CREATE INDEX IF NOT EXISTS events_university_idx ON events(university);
CREATE INDEX IF NOT EXISTS events_host_idx ON events(host_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_same_university" ON events;
CREATE POLICY "events_select_same_university" ON events
  FOR SELECT TO authenticated
  USING (
    university IS NULL
    OR university = (SELECT university FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- Stamp the host's university automatically so the client can't post an
-- event onto another campus's board.
CREATE OR REPLACE FUNCTION set_event_university()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT university INTO NEW.university FROM profiles WHERE id = NEW.host_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_event_university_trigger ON events;
CREATE TRIGGER set_event_university_trigger
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_university();

-- ── WATCHLIST VISIBILITY ───────────────────────────────────────────────────
--
-- PRIVACY CHANGE, worth being explicit about: watchlists were private
-- (watchlists_select_own, migration 023). People created them expecting a
-- silent alert, not a public "wanted" post. This adds a second SELECT
-- policy so others at the same university can see them — which is what
-- makes a Looking For board possible, but it does mean existing
-- watchlists become visible to classmates without those people having
-- opted in.
--
-- `is_public` defaults to true so the board isn't empty on day one. If
-- you'd rather not surface anything retroactively, change the default to
-- false and run:
--   UPDATE watchlists SET is_public = false;
-- before anyone can see the tab.
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "watchlists_select_same_university" ON watchlists;
CREATE POLICY "watchlists_select_same_university" ON watchlists
  FOR SELECT TO authenticated
  USING (
    is_public = true
    AND (SELECT university FROM profiles WHERE id = watchlists.user_id)
        = (SELECT university FROM profiles WHERE id = auth.uid())
  );
