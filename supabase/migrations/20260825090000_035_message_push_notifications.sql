-- Wires real Web Push into the two message paths that had none: 1:1 trade
-- conversations (messages) and study group chat (study_group_messages).
-- Neither message content nor the sender's own words ever leave this
-- function — only who it's from and whether it's a trade or a study
-- group, matching the existing "X sent you a message." wording already
-- used for the in-app bell notification.
--
-- ONE-TIME MANUAL SETUP REQUIRED before this actually sends anything:
--   1. Enable the pg_net extension (Dashboard > Database > Extensions) —
--      same requirement already noted for the cron-based reminders in
--      supabase/cron.sql.
--   2. Store two values in Supabase Vault via the SQL editor (never
--      commit the real values anywhere):
--        select vault.create_secret('<same value as your CRON_SECRET
--          Edge Function secret>', 'cron_secret');
--        select vault.create_secret('https://<your-project-ref>
--          .supabase.co/functions/v1', 'functions_base_url');
--   3. Deploy the send-message-push Edge Function (uses the same
--      VAPID_PRIVATE_KEY and CRON_SECRET secrets send-group-deadline-
--      reminders already has configured — nothing new to set there).
--
-- Until step 2 is done, get_vault_secret() returns null and both
-- triggers below silently skip the push (the in-app bell notification
-- still fires either way — that part has no dependency on any of this).
-- net.http_post() is fire-and-forget/async by design, so even a wrong
-- URL or an Edge Function outage can't fail the message insert itself.

CREATE OR REPLACE FUNCTION get_vault_secret(secret_name text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name;
$$;

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

  INSERT INTO notifications (user_id, type, message, conversation_id)
  VALUES (v_recipient_id, 'message', v_sender_name || ' sent you a message.', NEW.conversation_id);

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

-- ── Study group messages (no notification of any kind existed for these
-- before — in-app bell included) ────────────────────────────────────────
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

  INSERT INTO notifications (user_id, type, message, group_id)
  SELECT uid, 'group_message',
    coalesce(v_sender_name, 'Someone') || ' sent a message in ' || v_group_name || '.',
    NEW.group_id
  FROM unnest(v_recipient_ids) AS uid;

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

CREATE TRIGGER notify_on_group_message
  AFTER INSERT ON study_group_messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_group_message();
