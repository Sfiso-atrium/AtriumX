-- Migration 074 dropped the automatic notify_rating_request trigger in
-- favor of the explicit send_rating_invite() RPC only, citing a real bug
-- (a NULL listing title produced a NULL notification message). Product
-- decision: keep the automatic trigger -- it's lower-friction than
-- requiring the seller to press "Invite a rating" -- but fix the actual
-- bug rather than removing the mechanism entirely.
--
-- Two fixes versus the original (migration 010) version:
-- 1. Only fire for real listing-based conversations. Wanted posts and
--    accommodation both use this same conversations table with their own
--    subject columns (wanted_post_id, accommodation_listing_id) instead
--    of listing_id, and both are established as "no rating" concepts
--    elsewhere in this schema. NEW.listing_id IS NULL for both, which is
--    exactly the case that produced the NULL-message bug in the first
--    place -- guarding on it fixes the bug AND respects "no rating for
--    wanted/accommodation" in one condition.
-- 2. Fall back to a generic phrase instead of crashing/nulling out if a
--    listing's title is ever missing for some other reason (deleted
--    concurrently, etc).
--
-- send_rating_invite() (migration 074) is left as-is: its own
-- "IF EXISTS ... RETURN" guard already no-ops if a notification for this
-- conversation already exists, so having both the automatic trigger and
-- the explicit invite button active at once is safe, not a duplicate --
-- whichever fires second is a no-op.

CREATE OR REPLACE FUNCTION notify_rating_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_title text;
BEGIN
  IF NEW.is_resolved = true AND OLD.is_resolved = false AND NEW.listing_id IS NOT NULL THEN
    SELECT title INTO v_listing_title FROM listings WHERE id = NEW.listing_id;

    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = NEW.buyer_id
        AND conversation_id = NEW.id
        AND type = 'rating_request'
    ) THEN
      INSERT INTO notifications (user_id, type, message, listing_id, conversation_id)
      VALUES (
        NEW.buyer_id, 'rating_request',
        'How was your experience? Rate the seller for "' || coalesce(nullif(trim(v_listing_title), ''), 'this listing') || '".',
        NEW.listing_id, NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_rating_request ON conversations;
CREATE TRIGGER notify_rating_request
  AFTER UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION notify_rating_request();
