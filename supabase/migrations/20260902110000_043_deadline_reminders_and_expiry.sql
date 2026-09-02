-- Two things for the deadline-reminders feature:
--
-- 1. study_notification_log (migration 030, extended in 032) gets a new
--    target_type so personal deadlines (supabase/functions/send-deadline-
--    reminders) can use the same dedupe mechanism group deadlines already
--    use. For 'personal_deadline' rows, target_id = deadlines.id.
--
-- 2. expire_old_deadlines(): deletes any deadline (personal or group)
--    whose due_at was more than 24 hours ago, so finished deadlines don't
--    sit in Supabase forever. Meant to be run on a schedule via pg_cron,
--    same pattern as expire_listings() / expire_old_study_logs() in
--    supabase/cron.sql — nothing runs automatically until that's set up.
--
--    study_group_deadline_status rows are cleaned up for free via the
--    existing ON DELETE CASCADE on deadline_id (migration 032). The
--    dedupe log has no such FK (it's a generic table shared across
--    several features — migration 030), so matching log rows are deleted
--    explicitly here first, before the deadlines themselves go, otherwise
--    they'd be orphaned forever with nothing to ever clean them up.

ALTER TABLE study_notification_log DROP CONSTRAINT IF EXISTS study_notification_log_target_type_check;
ALTER TABLE study_notification_log ADD CONSTRAINT study_notification_log_target_type_check
  CHECK (target_type IN ('schedule', 'group_fallback', 'group_deadline_member', 'personal_deadline'));

CREATE OR REPLACE FUNCTION expire_old_deadlines()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Personal deadlines: drop their dedupe-log rows, then the deadlines.
  DELETE FROM study_notification_log
  WHERE target_type = 'personal_deadline'
    AND target_id IN (SELECT id FROM deadlines WHERE due_at <= now() - interval '24 hours');

  DELETE FROM deadlines WHERE due_at <= now() - interval '24 hours';

  -- Group deadlines: same, via the per-member status rows' ids.
  DELETE FROM study_notification_log
  WHERE target_type = 'group_deadline_member'
    AND target_id IN (
      SELECT s.id FROM study_group_deadline_status s
      JOIN study_group_deadlines d ON d.id = s.deadline_id
      WHERE d.due_at <= now() - interval '24 hours'
    );

  DELETE FROM study_group_deadlines WHERE due_at <= now() - interval '24 hours';
END;
$$;
