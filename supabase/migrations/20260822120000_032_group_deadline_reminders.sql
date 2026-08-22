-- Group deadline reminders + per-member status. Two things this adds:
--
-- 1. study_group_deadline_status: one row per (deadline, member). This is
--    what study_group_deadlines was missing — it only ever had a single
--    shared `reminded` flag for the whole group, so there was no way for
--    one member to be "done" while reminders kept firing for everyone
--    else. Every group deadline now provisions a `pending` row for each
--    current member (and backfills for anyone who joins later); reminders
--    only ever target rows still `pending`.
--
-- 2. study_notification_log gets a new target_type so the same, already-
--    working dedupe mechanism used by the live study-time reminders
--    (UNIQUE + ON CONFLICT DO NOTHING, service-role only) also covers the
--    four deadline reminder tiers, instead of inventing a parallel one.

-- ── NOTIFICATIONS: add a way to link back to a group ────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES study_groups(id) ON DELETE SET NULL;

-- ── PER-MEMBER DEADLINE STATUS ───────────────────────────────────────────
CREATE TABLE study_group_deadline_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id uuid NOT NULL REFERENCES study_group_deadlines(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_affected')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deadline_id, user_id)
);

ALTER TABLE study_group_deadline_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_deadline_status_select_member" ON study_group_deadline_status FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
-- Only the person themselves can change their own status — done/not-
-- affected is a self-report, not something another member can set for you.
CREATE POLICY "group_deadline_status_update_self" ON study_group_deadline_status FOR UPDATE TO authenticated
  USING (is_study_group_member(group_id) AND auth.uid() = user_id)
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = user_id);
-- No INSERT policy for authenticated/anon: rows are only ever created by
-- the two SECURITY DEFINER triggers below, same trust boundary as
-- referrals/referral_events in migration 025.

-- Provision a pending row for every current member the moment a group
-- deadline is created.
CREATE OR REPLACE FUNCTION provision_group_deadline_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO study_group_deadline_status (deadline_id, group_id, user_id)
  SELECT NEW.id, NEW.group_id, m.user_id
  FROM study_group_members m
  WHERE m.group_id = NEW.group_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER provision_group_deadline_status
  AFTER INSERT ON study_group_deadlines
  FOR EACH ROW EXECUTE FUNCTION provision_group_deadline_status();

-- Backfill a pending row for every existing deadline in a group the moment
-- someone new joins, so they get reminders too, not just people who were
-- already in the group when the deadline was posted.
CREATE OR REPLACE FUNCTION backfill_group_deadline_status_for_new_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO study_group_deadline_status (deadline_id, group_id, user_id)
  SELECT d.id, d.group_id, NEW.user_id
  FROM study_group_deadlines d
  WHERE d.group_id = NEW.group_id
  ON CONFLICT (deadline_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER backfill_group_deadline_status_for_new_member
  AFTER INSERT ON study_group_members
  FOR EACH ROW EXECUTE FUNCTION backfill_group_deadline_status_for_new_member();

-- The cascade: fires every time someone moves off 'pending'. Notifies
-- every member still pending on that same deadline — deliberately every
-- time, not debounced, per product decision.
CREATE OR REPLACE FUNCTION notify_remaining_on_group_deadline_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_responder_name text;
  v_title text;
  v_total int;
  v_remaining int;
  v_action text;
  v_message text;
BEGIN
  IF OLD.status <> 'pending' OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_responder_name FROM profiles WHERE id = NEW.user_id;
  SELECT title INTO v_title FROM study_group_deadlines WHERE id = NEW.deadline_id;
  SELECT count(*) INTO v_total FROM study_group_deadline_status WHERE deadline_id = NEW.deadline_id;
  SELECT count(*) INTO v_remaining FROM study_group_deadline_status WHERE deadline_id = NEW.deadline_id AND status = 'pending';

  v_action := CASE WHEN NEW.status = 'done'
    THEN COALESCE(v_responder_name, 'Someone') || ' just wrapped up "' || v_title || '."'
    ELSE COALESCE(v_responder_name, 'Someone') || ' marked "' || v_title || '" as not affecting them.'
  END;

  v_message := CASE
    WHEN v_remaining = 0 THEN NULL
    WHEN v_remaining = 1 THEN v_action || ' You''re the last one left — need a hand? Ask in the group chat, that''s what it''s there for.'
    ELSE v_action || ' ' || v_remaining || ' of ' || v_total || ' still to go — shout in the group chat if you''re stuck.'
  END;

  IF v_message IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, message, group_id)
    SELECT s.user_id, 'group_deadline_update', v_message, NEW.group_id
    FROM study_group_deadline_status s
    WHERE s.deadline_id = NEW.deadline_id AND s.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_remaining_on_group_deadline_response
  AFTER UPDATE OF status ON study_group_deadline_status
  FOR EACH ROW EXECUTE FUNCTION notify_remaining_on_group_deadline_response();

-- ── Extend the existing dedupe log to cover the four deadline tiers ─────
ALTER TABLE study_notification_log DROP CONSTRAINT IF EXISTS study_notification_log_target_type_check;
ALTER TABLE study_notification_log ADD CONSTRAINT study_notification_log_target_type_check
  CHECK (target_type IN ('schedule', 'group_fallback', 'group_deadline_member'));

ALTER TABLE study_notification_log DROP CONSTRAINT IF EXISTS study_notification_log_offset_minutes_check;
ALTER TABLE study_notification_log ADD CONSTRAINT study_notification_log_offset_minutes_check
  CHECK (offset_minutes IN (120, 60, 30, 2880, 1440, 600));
-- 2880 = 2 days, 1440 = 1 day, 600 = 10 hours, 60 = 1 hour (shared with the
-- existing study-time 1hr tier — same meaning, no need for a second value).
-- For 'group_deadline_member' rows, target_id = study_group_deadline_status.id
-- and notify_date = that deadline's due_at::date (deadlines don't recur
-- weekly like schedule entries do, but reusing the same UNIQUE shape keeps
-- one dedupe mechanism instead of two).
