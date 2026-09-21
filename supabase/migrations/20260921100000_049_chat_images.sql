-- 049_chat_images.sql
--
-- One-time-view photos in 1:1 trade chats.
--
-- Lifecycle of a photo:
--   1. Sender picks a photo. The send-chat-image Edge Function checks it
--      with Sightengine (same gate as study-group images), stores it in
--      the private `chat-images` bucket and inserts the chat message with
--      image_path pointing at it.
--   2. The photo stays in Storage while it is unseen.
--   3. When the person it was sent TO actually has it on screen, their
--      browser calls mark_chat_image_seen(). That sets image_seen_at, and
--      the trigger below immediately asks the delete-chat-image Edge
--      Function to remove the file from Storage and clear image_path
--      (image_deleted_at records when).
--
-- The sender cannot mark their own photo as seen, and nobody can edit
-- these columns directly, so a photo can't be kept alive or deleted
-- early by tampering with the row.
--
-- Uses the same trusted-Postgres -> Edge Function pattern as
-- notify_on_message (migration 037): net.http_post() with the vault
-- secrets `cron_secret` and `functions_base_url`, which are already set
-- up for push notifications. Nothing new to configure there.

-- ── 1. Columns ─────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_path       text,
  ADD COLUMN IF NOT EXISTS image_seen_at    timestamptz,
  ADD COLUMN IF NOT EXISTS image_deleted_at timestamptz;

-- ── 2. Private bucket ──────────────────────────────────────────────────
-- 5 MB cap and JPEG only: the app compresses every photo to JPEG (max
-- 1600px) before sending, so this is a backstop, not the normal path.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage policies ────────────────────────────────────────────────
-- Objects live at {conversation_id}/{sender_id}/{random}.jpg.
--
-- Only SELECT is granted to signed-in users (the two people in the
-- conversation, plus admins reviewing a reported chat). There is
-- deliberately NO insert, update or delete policy: browsers can't upload
-- straight to this bucket (which would skip the moderation check), and
-- only the Edge Functions - using the service role - ever write or
-- remove files here.
CREATE POLICY "chat_images_select_participant" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      )
      OR public.is_admin(auth.uid())
    )
  );

-- ── 4. Guard the image columns ─────────────────────────────────────────
-- messages_update_participant lets either person in a chat UPDATE any
-- message in it, so RLS alone can't protect these columns. This trigger
-- does: on INSERT the image must sit in the sender's own folder for this
-- conversation and can't start out "seen"; on UPDATE the three image
-- columns can only change from a privileged role - which is what the
-- SECURITY DEFINER function below and the service-role Edge Function
-- run as. Browsers connect as `authenticated` and are refused.
CREATE OR REPLACE FUNCTION public.guard_message_image_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.image_seen_at IS NOT NULL OR NEW.image_deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'A new message cannot start out seen or deleted';
    END IF;
    IF NEW.image_path IS NOT NULL
       AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
       AND (   split_part(NEW.image_path, '/', 1) <> NEW.conversation_id::text
            OR split_part(NEW.image_path, '/', 2) <> NEW.sender_id::text) THEN
      RAISE EXCEPTION 'Image must be stored in the sender''s own folder for this conversation';
    END IF;
    RETURN NEW;
  END IF;

  IF (   NEW.image_path       IS DISTINCT FROM OLD.image_path
      OR NEW.image_seen_at    IS DISTINCT FROM OLD.image_seen_at
      OR NEW.image_deleted_at IS DISTINCT FROM OLD.image_deleted_at)
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Chat image state can only be changed by mark_chat_image_seen()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_message_image_columns ON public.messages;
CREATE TRIGGER guard_message_image_columns
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_image_columns();

-- ── 5. "Seen" ──────────────────────────────────────────────────────────
-- Called by the recipient's browser once the photo is actually visible.
-- Only the person the photo was sent TO counts - the sender calling this
-- for their own photo does nothing. Calling it again for a photo whose
-- file is still there (e.g. the delete request didn't get through) just
-- re-sends the delete request, so a hiccup can't leave it stranded.
CREATE OR REPLACE FUNCTION public.mark_chat_image_seen(p_message_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_msg  messages%ROWTYPE;
  v_conv conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  SELECT * INTO v_conv FROM conversations WHERE id = v_msg.conversation_id;
  IF auth.uid() IS NULL OR auth.uid() NOT IN (v_conv.buyer_id, v_conv.seller_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- The sender doesn't "see" their own photo, and a message with no
  -- file left (already deleted, or never had one) has nothing to do.
  IF v_msg.sender_id = auth.uid() OR v_msg.image_path IS NULL THEN
    RETURN;
  END IF;

  UPDATE messages SET image_seen_at = now() WHERE id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_chat_image_seen(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_image_seen(uuid) TO authenticated;

-- ── 6. Delete once seen ────────────────────────────────────────────────
-- Fires the moment image_seen_at is set. net.http_post() is async and
-- fire-and-forget, so a slow or failing Edge Function can never hold up
-- or fail the recipient's request. If the vault secrets aren't set the
-- call is skipped and the photo simply stays until a later "seen" retries.
CREATE OR REPLACE FUNCTION public.delete_chat_image_after_seen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_secret   text;
  v_base_url text;
BEGIN
  v_secret   := get_vault_secret('cron_secret');
  v_base_url := get_vault_secret('functions_base_url');
  IF v_secret IS NOT NULL AND v_base_url IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_base_url || '/delete-chat-image',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body    := jsonb_build_object('message_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delete_chat_image_after_seen ON public.messages;
CREATE TRIGGER delete_chat_image_after_seen
  AFTER UPDATE OF image_seen_at ON public.messages
  FOR EACH ROW
  WHEN (NEW.image_seen_at IS NOT NULL
        AND NEW.image_path IS NOT NULL
        AND OLD.image_seen_at IS DISTINCT FROM NEW.image_seen_at)
  EXECUTE FUNCTION public.delete_chat_image_after_seen();
