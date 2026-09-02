-- Migration 040 dropped notify_on_group_message (and notify_on_message,
-- for trade messages) to stop ALL message notifications at once. This
-- re-attaches only the group one: study group messages should notify
-- every other group member again, both as an in-app bell notification and
-- as a real push. Trade-message notifications (notify_on_message on
-- `messages`) are intentionally left dropped/untouched.
--
-- The function itself (notify_on_group_message, last defined in migration
-- 038) was never touched by 040 — only the trigger was dropped — so it's
-- already correct as-is: it skips 'system' rows (join announcements), and
-- its notification body already includes both the sender's name and the
-- group's name ("<sender> sent a message in <group>."), which is used for
-- both the bell notification and the push payload's body.

CREATE TRIGGER notify_on_group_message
  AFTER INSERT ON study_group_messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_group_message();
