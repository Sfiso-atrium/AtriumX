-- Messages should notify the user's device only (push), not also clutter
-- the in-app notification bell. Both triggers below previously did both;
-- this drops just the `INSERT INTO notifications` half of each and keeps
-- the push (net.http_post) half completely untouched.

-- ── 1:1 trade messages ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv conversations%ROWTYPE;
  v_recipient_id uuid;
  v_sender_name text;
  v_secret text;
  v_base_url text;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = NEW.conversation_id;

  IF v_conv.buyer_id = NEW.sender_id THEN
    v_recipient_id := v_conv.seller_id;
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;

  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  v_secret := get_vault_secret('cron_secret');
  v_base_url := get_vault_secret('functions_base_url');
  IF v_secret IS NOT NULL AND v_base_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_base_url || '/send-message-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object(
        'recipient_ids', jsonb_build_array(v_recipient_id),
        'title', 'AtriumX',
        'body', coalesce(v_sender_name, 'Someone') || ' sent you a trade message.',
        'url', '/#/chat/' || NEW.conversation_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── Study group messages ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_group_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group_name text;
  v_sender_name text;
  v_recipient_ids uuid[];
  v_secret text;
  v_base_url text;
BEGIN
  SELECT name INTO v_group_name FROM study_groups WHERE id = NEW.group_id;
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  SELECT array_agg(user_id) INTO v_recipient_ids
  FROM study_group_members
  WHERE group_id = NEW.group_id AND user_id != NEW.sender_id;

  IF v_recipient_ids IS NULL THEN
    RETURN NEW;
  END IF;

  v_secret := get_vault_secret('cron_secret');
  v_base_url := get_vault_secret('functions_base_url');
  IF v_secret IS NOT NULL AND v_base_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_base_url || '/send-message-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object(
        'recipient_ids', to_jsonb(v_recipient_ids),
        'title', 'AtriumX',
        'body', coalesce(v_sender_name, 'Someone') || ' sent a message in ' || v_group_name || '.',
        'url', '/#/group/' || NEW.group_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
