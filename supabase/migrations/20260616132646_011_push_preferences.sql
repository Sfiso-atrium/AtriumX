
-- push_preferences: stores per-user notification permission state
CREATE TABLE push_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_prefs_select_own" ON push_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_prefs_insert_own" ON push_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_prefs_update_own" ON push_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_prefs_delete_own" ON push_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);
