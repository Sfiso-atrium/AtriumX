-- Guard functions must see the invoking database role, not their owner's role.
-- Existing trusted payment/admin RPCs continue to execute as their server owner.
ALTER FUNCTION public.guard_plan_columns() SECURITY INVOKER;
ALTER FUNCTION public.guard_profile_security_columns() SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.guard_profile_creation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  -- Keep the student's existing signup recovery insert, with safe defaults only.
  IF NEW.id IS DISTINCT FROM auth.uid()
     OR NEW.email IS DISTINCT FROM (auth.jwt()->>'email')
     OR NEW.account_type <> 'student' OR NEW.plan <> 'ghost'
     OR NEW.plan_expires_at IS NOT NULL OR NEW.is_admin OR NEW.is_verified OR NEW.is_blocked
     OR NEW.avg_rating <> 0 OR NEW.total_ratings <> 0 OR NEW.total_listings <> 0 THEN
    RAISE EXCEPTION 'Protected profile fields cannot be supplied by the client.';
  END IF;
  NEW.created_at := now(); NEW.joined_date := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_profile_creation BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_creation();
-- Deleting only the profile leaves Auth alive and enables replacement/cascades.
-- Account removal must go through the server-side Auth account lifecycle.
REVOKE DELETE ON public.profiles FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.guard_business_profile_capabilities()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_type = 'business' AND NOT p.is_blocked
    ) THEN RAISE EXCEPTION 'A business account is required.'; END IF;
    IF NEW.accommodation_plan <> 'accommodation_free' OR NEW.accommodation_plan_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Paid accommodation plans require a verified payment.';
    END IF;
    IF cardinality(NEW.universities) <> 1 THEN RAISE EXCEPTION 'Choose one university for your free account.'; END IF;
    NEW.created_at := now();
  ELSE
    IF NEW.accommodation_plan IS DISTINCT FROM OLD.accommodation_plan
       OR NEW.accommodation_plan_expires_at IS DISTINCT FROM OLD.accommodation_plan_expires_at THEN
      RAISE EXCEPTION 'Paid accommodation plans require a verified payment.';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.is_accommodation IS DISTINCT FROM OLD.is_accommodation THEN
      RAISE EXCEPTION 'Account identity and type cannot be changed from the client.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_business_profile_capabilities BEFORE INSERT OR UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_business_profile_capabilities();

CREATE OR REPLACE FUNCTION public.guard_message_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Message sender must be the signed-in user.'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.conversations c JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = NEW.conversation_id AND auth.uid() IN (c.buyer_id, c.seller_id)
        AND NOT c.is_closed_by_admin AND NOT p.is_blocked
    ) THEN RAISE EXCEPTION 'This conversation is not available for messaging.'; END IF;
    NEW.read := false; NEW.sent_at := now();
  ELSE
    IF (to_jsonb(NEW) - 'read') IS DISTINCT FROM (to_jsonb(OLD) - 'read') THEN
      RAISE EXCEPTION 'Sent messages cannot be rewritten.';
    END IF;
    IF NEW.read IS DISTINCT FROM OLD.read AND (NEW.read IS NOT TRUE OR OLD.sender_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the recipient can mark a message as read.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_message_integrity BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_integrity();

CREATE OR REPLACE FUNCTION public.guard_conversation_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.buyer_id IS DISTINCT FROM auth.uid() OR NEW.buyer_id = NEW.seller_id
       OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND NOT p.is_blocked) THEN
      RAISE EXCEPTION 'Invalid conversation participants.';
    END IF;
    IF NEW.listing_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.listings l WHERE l.id = NEW.listing_id AND l.seller_id = NEW.seller_id
      AND l.status = 'active' AND l.expires_at > now()
    ) THEN RAISE EXCEPTION 'This listing is not available to contact.'; END IF;
    IF NEW.wanted_post_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.wanted_posts w WHERE w.id = NEW.wanted_post_id AND w.seeker_id = NEW.seller_id AND w.status = 'active'
    ) THEN RAISE EXCEPTION 'This wanted post is not available to contact.'; END IF;
    IF NEW.accommodation_listing_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accommodation_listings a WHERE a.id = NEW.accommodation_listing_id
      AND a.seller_id = NEW.seller_id AND a.status = 'active'
    ) THEN RAISE EXCEPTION 'This accommodation is not available to contact.'; END IF;
    NEW.is_closed_by_admin := false; NEW.closed_at := NULL; NEW.is_resolved := false; NEW.created_at := now();
  ELSE
    IF (to_jsonb(NEW) - ARRAY['is_resolved','is_closed_by_admin','closed_at']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['is_resolved','is_closed_by_admin','closed_at']) THEN
      RAISE EXCEPTION 'Conversation identity cannot be changed.';
    END IF;
    IF (NEW.is_closed_by_admin IS DISTINCT FROM OLD.is_closed_by_admin OR NEW.closed_at IS DISTINCT FROM OLD.closed_at)
       AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only an administrator may close or reopen a conversation.';
    END IF;
    IF OLD.is_closed_by_admin AND NEW.is_resolved IS DISTINCT FROM OLD.is_resolved AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'This conversation was closed by an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_conversation_integrity BEFORE INSERT OR UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_integrity();

ALTER POLICY wanted_posts_insert_own ON public.wanted_posts WITH CHECK (
  auth.uid() = seeker_id AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_type = 'student' AND NOT p.is_blocked
  )
);

REVOKE EXECUTE ON FUNCTION public.guard_profile_creation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_business_profile_capabilities() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_message_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_conversation_integrity() FROM PUBLIC, anon, authenticated;
