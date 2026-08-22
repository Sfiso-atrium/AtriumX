-- Group Pomodoro: one row per session. Deliberately no "is this running"
-- boolean anywhere — every client derives remaining time from
-- started_at + duration_minutes vs now(), which is what makes the timer
-- correct the instant anyone opens the chat, whether they had the tab
-- open the whole time, closed it, or never opened it until now.
-- ended_at lets any current member stop a session early.

CREATE TABLE study_group_pomodoro_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  started_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes smallint NOT NULL CHECK (duration_minutes BETWEEN 1 AND 180),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_group_pomodoro_sessions_group ON study_group_pomodoro_sessions(group_id, started_at DESC);

ALTER TABLE study_group_pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Same shape as the other group-space tables (027): any current member
-- can read, start, or stop a session — this is shared/collaborative
-- state, not owned by whoever started it.
CREATE POLICY "study_group_pomodoro_select_member" ON study_group_pomodoro_sessions FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
CREATE POLICY "study_group_pomodoro_insert_member" ON study_group_pomodoro_sessions FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = started_by);
CREATE POLICY "study_group_pomodoro_update_member" ON study_group_pomodoro_sessions FOR UPDATE TO authenticated
  USING (is_study_group_member(group_id)) WITH CHECK (is_study_group_member(group_id));

-- NOTE: after running this, enable Realtime for this table the same way
-- study_group_messages was enabled — Dashboard > Database > Replication >
-- toggle "study_group_pomodoro_sessions" on. No other migration in this
-- project turns realtime on via SQL, so this stays consistent with that.
