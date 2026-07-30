
-- Listing expiry function (callable manually or via pg_cron if available)
CREATE OR REPLACE FUNCTION expire_listings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listings
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$;

-- Rating request: when conversation resolved, notify buyer to rate seller
CREATE OR REPLACE FUNCTION notify_rating_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_title text;
BEGIN
  IF NEW.is_resolved = true AND OLD.is_resolved = false THEN
    SELECT title INTO v_listing_title FROM listings WHERE id = NEW.listing_id;

    -- Only insert if no rating request already exists for this conversation
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = NEW.buyer_id
        AND conversation_id = NEW.id
        AND type = 'rating_request'
    ) THEN
      INSERT INTO notifications (user_id, type, message, listing_id, conversation_id)
      VALUES (
        NEW.buyer_id, 'rating_request',
        'How was your experience? Rate the seller for "' || v_listing_title || '".',
        NEW.listing_id, NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_rating_request
  AFTER UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION notify_rating_request();
