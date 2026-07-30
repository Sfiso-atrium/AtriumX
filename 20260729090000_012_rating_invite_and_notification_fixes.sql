-- ============================================================================
-- 012_rating_invite_and_notification_fixes.sql
--
-- Fixes three bugs found in the existing build:
--   1. get_recent_buyers() was called from the frontend but never created.
--   2. notifications RLS only allowed auth.uid() = user_id, which silently
--      broke every cross-user notification insert (admin approving/rejecting
--      a listing, a seller inviting a buyer to rate them).
--   3. Migration 009 created triggers that auto-inserted notifications with
--      types ('approved','rejected','interest','message') that do not match
--      the fixed notification type list (listing_approved, listing_rejected,
--      rating_request). They also duplicated the app-level inserts.
--
-- Fix strategy: move every cross-user notification write into a SECURITY
-- DEFINER RPC that checks the caller's authorization internally and inserts
-- with the correct, fixed type. RLS on notifications stays locked down to
-- "own row only" for any direct client access; all cross-user writes go
-- through these RPCs instead, which bypass RLS by design (SECURITY DEFINER)
-- but only after verifying the caller is allowed to perform the action.
-- ============================================================================

-- 1. Remove the buggy auto-notification triggers from migration 009.
DROP TRIGGER IF EXISTS notify_on_message ON public.messages;
DROP FUNCTION IF EXISTS public.notify_on_message();

DROP TRIGGER IF EXISTS notify_on_conversation ON public.conversations;
DROP FUNCTION IF EXISTS public.notify_on_conversation();

DROP TRIGGER IF EXISTS notify_on_listing_status ON public.listings;
DROP FUNCTION IF EXISTS public.notify_on_listing_status();

-- 2. Remove the auto-fire-on-resolve rating trigger from migration 010.
--    Rating invites are now always an explicit opt-in action by the seller
--    (from the "Mark as Sold" flow, or from the chat "Resolve" flow), never
--    an automatic side effect. Keeping both the trigger AND the manual call
--    caused duplicate rating_request notifications for the same buyer.
DROP TRIGGER IF EXISTS notify_rating_request ON public.conversations;
DROP FUNCTION IF EXISTS public.notify_rating_request();

-- 3. get_recent_buyers — used by the "Mark as Sold" popup to list everyone
--    who chatted with the seller about this specific listing, so the seller
--    can choose who to invite to leave a rating.
--    Excludes buyers who have already rated this listing (nothing to invite).
CREATE OR REPLACE FUNCTION public.get_recent_buyers(
  p_seller_id uuid,
  p_listing_id uuid
)
RETURNS TABLE (
  buyer_id uuid,
  full_name text,
  avatar_initials text,
  avatar_color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the listing's own seller may pull this list.
  IF auth.uid() IS DISTINCT FROM p_seller_id THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN QUERY
    SELECT DISTINCT p.id, p.full_name, p.avatar_initials, p.avatar_color
    FROM public.conversations c
    JOIN public.profiles p ON p.id = c.buyer_id
    WHERE c.listing_id = p_listing_id
      AND c.seller_id = p_seller_id
      AND NOT EXISTS (
        SELECT 1 FROM public.ratings r
        WHERE r.listing_id = p_listing_id AND r.buyer_id = c.buyer_id
      )
    ORDER BY p.full_name;
END;
$$;

-- 4. send_rating_invite — replaces the old client-side direct insert into
--    notifications (which failed RLS). Verifies the caller really is the
--    seller on this conversation/listing before writing the notification.
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
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND listing_id = p_listing_id
      AND seller_id = p_seller_id
      AND buyer_id = p_buyer_id
  ) THEN
    RAISE EXCEPTION 'Conversation does not match seller/listing/buyer.';
  END IF;

  -- Never send a second invite for the same conversation.
  IF EXISTS (
    SELECT 1 FROM public.notifications
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
    p_seller_name || ' would like you to rate your experience with them. Tap to rate or dismiss.',
    p_listing_id,
    p_conversation_id
  );
END;
$$;

-- 5. approve_listing / reject_listing — replace the client-side
--    update-then-insert pattern in dataService.ts (the insert half was
--    silently failing RLS for the admin). Checks caller is_admin internally.
CREATE OR REPLACE FUNCTION public.approve_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  UPDATE public.listings SET status = 'active' WHERE id = p_listing_id
  RETURNING seller_id INTO v_seller_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, listing_id)
  VALUES (v_seller_id, 'listing_approved', 'Your listing has been approved and is now live on the feed.', p_listing_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  UPDATE public.listings SET status = 'suspended' WHERE id = p_listing_id
  RETURNING seller_id INTO v_seller_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, listing_id)
  VALUES (v_seller_id, 'listing_rejected', 'Your listing was reviewed and could not be approved.', p_listing_id);
END;
$$;

-- 6. suspend_listing — used by AdminPanel's "Suspend" action on an already
--    active listing. Per spec 4.10, no notification is sent on suspend
--    (distinct from reject, which does notify) — this just needs the admin
--    check, since the existing direct-update path has no notification to
--    fail on, but we route it through an RPC too for a single consistent
--    admin-authorization path.
CREATE OR REPLACE FUNCTION public.suspend_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  UPDATE public.listings SET status = 'suspended' WHERE id = p_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_buyers(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_rating_invite(uuid, text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_listing(uuid) TO authenticated;
