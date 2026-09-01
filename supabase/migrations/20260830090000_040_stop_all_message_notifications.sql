-- Stops all notifications (push AND in-app bell) triggered by a message
-- being sent — for both 1:1 trade messages and study group messages.
-- Dropping the triggers themselves (rather than editing the functions
-- again) means message inserts no longer run any notification logic at
-- all, regardless of what either function currently does or might be
-- changed to do later. The functions themselves are left in place,
-- unused, in case this ever needs to be turned back on.

DROP TRIGGER IF EXISTS notify_on_message ON messages;
DROP TRIGGER IF EXISTS notify_on_group_message ON study_group_messages;
