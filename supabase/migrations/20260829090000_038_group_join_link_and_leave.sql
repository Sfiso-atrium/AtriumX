-- Three things for the group join-link / leave feature:
--
-- 1. study_group_messages gets a `type` column so a join announcement can
--    be a real row in the same chronological stream (so it shows up "in
--    the middle" of the conversation, in the right place) while still
--    being distinguishable from a real chat message for rendering and for
--    the notification trigger.
--
-- 2. The SELECT policy on study_group_messages is tightened so a member
--    can only ever see messages sent at or after their own joined_at —
--    this is enforced at the database level, not just filtered in the
--    frontend query, so it actually holds even if someone queries the
--    table directly. Leaving and rejoining later (a fresh join_at) means
--    losing access to everything before that point again, by design —
--    that's what "only have access to texts added when you joined" means
--    applied literally to a rejoin.
--
-- 3. notify_on_group_message skips system-type rows entirely — a join
--    announcement shouldn't trigger a "so-and-so sent a message" push to
--    everyone else in the group.

ALTER TABLE study_group_messages
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'system'));

DROP POLICY IF EXISTS "study_group_messages_select_member" ON study_group_messages;
CREATE POLICY "study_group_messages_select_since_joined" ON study_group_messages FOR SELECT TO authenticated
  USING (
    is_study_group_member(group_id)
    AND sent_at >= (
      SELECT joined_at FROM study_group_members
      WHERE group_id = study_group_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION add_group_join_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  SELECT full_name INTO v_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO study_group_messages (group_id, sender_id, content, type)
  VALUES (NEW.group_id, NEW.user_id, coalesce(v_name, 'Someone') || ' joined the group.', 'system');
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER add_group_join_message AFTER INSERT ON study_group_members FOR EACH ROW EXECUTE FUNCTION add_group_join_message();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION notify_on_group_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group_name text;
  v_sender_name text;
  v_recipient_ids uuid[];
  v_secret text;
  v_base_url text;
BEGIN
  IF NEW.type = 'system' THEN
    RETURN NEW;
  END IF;

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
