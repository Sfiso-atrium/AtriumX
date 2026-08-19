
-- Personal Space: deadlines, weekly schedule, budget tracker, study log, watchlists.
-- All five tables are strictly per-user (owner-only RLS), same shape as push_preferences.

-- DEADLINES
CREATE TABLE deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  notes text,
  reminded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deadlines_select_own" ON deadlines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deadlines_insert_own" ON deadlines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deadlines_update_own" ON deadlines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deadlines_delete_own" ON deadlines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SCHEDULE (weekly recurring entries — day_of_week: 0=Sunday .. 6=Saturday)
CREATE TABLE schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  module text NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_select_own" ON schedule_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "schedule_insert_own" ON schedule_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedule_update_own" ON schedule_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedule_delete_own" ON schedule_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BUDGET ENTRIES (direction: 'in' or 'out')
CREATE TABLE budget_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_select_own" ON budget_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "budget_insert_own" ON budget_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_update_own" ON budget_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_delete_own" ON budget_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STUDY LOG (one optional row per user per day, for the Pomodoro streak)
CREATE TABLE study_log (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  minutes integer NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  PRIMARY KEY (user_id, log_date)
);

ALTER TABLE study_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_log_select_own" ON study_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "study_log_insert_own" ON study_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_log_update_own" ON study_log FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_log_delete_own" ON study_log FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WATCHLISTS (keyword/category/max_price — any combination; nulls mean "don't filter on this")
CREATE TABLE watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword text,
  category text,
  max_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlists_select_own" ON watchlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watchlists_insert_own" ON watchlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlists_update_own" ON watchlists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlists_delete_own" ON watchlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Watchlist matching: fires when a listing goes live, same pattern as
-- notify_on_conversation / notify_on_message in migration 009. Checks every
-- watchlist for a match and drops a row into the existing notifications
-- table, which the navbar bell already renders in real time.
CREATE OR REPLACE FUNCTION notify_on_watchlist_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match RECORD;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  FOR v_match IN
    SELECT * FROM watchlists w
    WHERE w.user_id <> NEW.seller_id
      AND (w.category IS NULL OR w.category = NEW.category)
      AND (w.max_price IS NULL OR NEW.price <= w.max_price)
      AND (w.keyword IS NULL OR NEW.title ILIKE '%' || w.keyword || '%')
  LOOP
    INSERT INTO notifications (user_id, type, message, listing_id)
    VALUES (
      v_match.user_id, 'watchlist_match',
      '"' || NEW.title || '" just matched your watchlist.',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_watchlist_match
  AFTER INSERT OR UPDATE OF status ON listings
  FOR EACH ROW EXECUTE FUNCTION notify_on_watchlist_match();

-- Deadline reminders: no insert-time trigger to hang this off (it's purely
-- time-based), so it's a function meant to be run on a schedule via pg_cron,
-- the same way expire_listings() is scheduled in supabase/cron.sql. Flags
-- anything due within 24 hours that hasn't been reminded about yet.
CREATE OR REPLACE FUNCTION send_deadline_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, type, message)
  SELECT user_id, 'deadline_reminder', '"' || title || '" is due soon.'
  FROM deadlines
  WHERE reminded = false
    AND due_at <= now() + interval '24 hours'
    AND due_at > now();

  UPDATE deadlines
  SET reminded = true
  WHERE reminded = false
    AND due_at <= now() + interval '24 hours'
    AND due_at > now();
END;
$$;
