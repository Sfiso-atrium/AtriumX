
-- Notification triggers for key events

-- 1. Message sent → notify recipient
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv conversations%ROWTYPE;
  v_recipient_id uuid;
  v_sender_name text;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = NEW.conversation_id;

  IF v_conv.buyer_id = NEW.sender_id THEN
    v_recipient_id := v_conv.seller_id;
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;

  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, message, conversation_id)
  VALUES (v_recipient_id, 'message', v_sender_name || ' sent you a message.', NEW.conversation_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();

-- 2. Conversation started → notify seller
CREATE OR REPLACE FUNCTION notify_on_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_title text;
  v_buyer_name text;
BEGIN
  SELECT title INTO v_listing_title FROM listings WHERE id = NEW.listing_id;
  SELECT full_name INTO v_buyer_name FROM profiles WHERE id = NEW.buyer_id;

  INSERT INTO notifications (user_id, type, message, listing_id, conversation_id)
  VALUES (
    NEW.seller_id, 'interest',
    v_buyer_name || ' is interested in "' || v_listing_title || '".',
    NEW.listing_id, NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_conversation
  AFTER INSERT ON conversations
  FOR EACH ROW EXECUTE FUNCTION notify_on_conversation();

-- 3. Listing approved → notify seller
CREATE OR REPLACE FUNCTION notify_on_listing_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, message, listing_id)
    VALUES (NEW.seller_id, 'approved', 'Your listing "' || NEW.title || '" has been approved and is now live.', NEW.id);
  ELSIF NEW.status = 'suspended' AND OLD.status IN ('pending','active') THEN
    INSERT INTO notifications (user_id, type, message, listing_id)
    VALUES (NEW.seller_id, 'rejected', 'Your listing "' || NEW.title || '" was rejected or suspended.', NEW.id);
  ELSIF NEW.status = 'expired' AND OLD.status = 'active' THEN
    INSERT INTO notifications (user_id, type, message, listing_id)
    VALUES (NEW.seller_id, 'expired', 'Your listing "' || NEW.title || '" has expired.', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_listing_status
  AFTER UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION notify_on_listing_status();
