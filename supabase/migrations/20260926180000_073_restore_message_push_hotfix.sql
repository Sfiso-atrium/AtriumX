-- Launch-audit migration parity fix.
-- Migration 054 recreated notify_on_message() with the older in-app-bell
-- behavior after migration 037 had intentionally changed message handling to
-- push-only. This migration reapplies the production push-only behavior so a
-- fresh migration replay ends in the same message-notification state.

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.conversations%ROWTYPE;
  v_recipient_id uuid;
  v_sender_name text;
  v_secret text;
  v_base_url text;
BEGIN
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_conv.buyer_id = NEW.sender_id THEN
    v_recipient_id := v_conv.seller_id;
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;

  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  v_secret := public.get_vault_secret('cron_secret');
  v_base_url := public.get_vault_secret('functions_base_url');

  IF v_secret IS NOT NULL AND v_base_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_base_url || '/send-message-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
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

DROP TRIGGER IF EXISTS notify_on_message ON public.messages;
CREATE TRIGGER notify_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();
