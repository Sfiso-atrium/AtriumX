-- Launch-audit migration parity fix.
-- The current AtriumX rating flow uses an explicit seller-initiated
-- send_rating_invite() RPC. The old conversation trigger depended on the
-- listing title and could produce a null notification message when a title
-- was unavailable. Keep the old trigger/function retired and reassert the
-- existing null-safe, explicit-invite flow for fresh database replays.

DROP TRIGGER IF EXISTS notify_rating_request ON public.conversations;
DROP FUNCTION IF EXISTS public.notify_rating_request();

CREATE OR REPLACE FUNCTION public.send_rating_invite(
  p_seller_id uuid,
  p_seller_name text,
  p_buyer_id uuid,
  p_listing_id uuid,
  p_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_seller_id THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE id = p_conversation_id
      AND listing_id = p_listing_id
      AND seller_id = p_seller_id
      AND buyer_id = p_buyer_id
  ) THEN
    RAISE EXCEPTION 'Conversation does not match seller/listing/buyer.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE conversation_id = p_conversation_id
      AND user_id = p_buyer_id
      AND type = 'rating_request'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, listing_id, conversation_id)
  VALUES (
    p_buyer_id,
    'rating_request',
    coalesce(nullif(trim(p_seller_name), ''), 'The seller')
      || ' would like you to rate your experience with them. Tap to rate or dismiss.',
    p_listing_id,
    p_conversation_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_rating_invite(uuid, text, uuid, uuid, uuid) TO authenticated;
