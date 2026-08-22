
-- Server-side "have they seen this onboarding moment" flags. Deliberately
-- not stored in localStorage: PWAs and their browser-tab counterpart can
-- have genuinely separate storage partitions on some platforms (notably
-- iOS installed-to-homescreen apps vs. Safari tabs on the same site), so a
-- client-only flag can end up showing a "first time" message more than
-- once depending on which context someone opens the app from. A small
-- per-user row here means "seen it" is true everywhere, on any device.
--
-- One boolean per onboarding moment, not a single generic flag, so future
-- ones (e.g. a first-time Group chat intro) can be added as a new column
-- without disturbing this one.
CREATE TABLE user_flags (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  seen_myspace_intro boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_flags_select_own" ON user_flags FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_flags_insert_own" ON user_flags FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_flags_update_own" ON user_flags FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
