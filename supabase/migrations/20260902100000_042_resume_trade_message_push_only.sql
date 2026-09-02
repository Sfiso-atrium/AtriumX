-- Migration 040 dropped notify_on_message (trade/DM messages) along with
-- notify_on_group_message to stop ALL message notifications at once.
-- Migration 041 re-attached only the group one. This re-attaches the
-- trade-message one too, but intentionally does NOT restore the bell.
--
-- notify_on_message was last redefined in migration 037, which already
-- removed the `INSERT INTO notifications` (bell) half and kept only the
-- net.http_post() push half untouched. That function body was never
-- reverted by migration 040 (only the trigger was dropped) or by 041
-- (which only touched the group trigger), so it's already correct as-is:
-- re-attaching this trigger sends a push notification for every new
-- trade message and does NOT create a bell notification.

CREATE TRIGGER notify_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();
