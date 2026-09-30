CREATE OR REPLACE FUNCTION get_conversation_message_limit(p_conversation_id uuid)
RETURNS TABLE (max_messages integer, seller_locked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_plan text;
  v_account_type text;
BEGIN
  SELECT seller_id
    INTO v_seller_id
  FROM conversations
  WHERE id = p_conversation_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid());

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Conversation access denied.';
  END IF;

  -- Accommodation messaging is independent of the ordinary business plan.
  IF EXISTS (SELECT 1 FROM conversations c JOIN business_profiles b ON b.id=c.seller_id
    WHERE c.id=p_conversation_id AND c.accommodation_listing_id IS NOT NULL AND b.is_accommodation) THEN
    max_messages := 999; seller_locked := false; RETURN NEXT; RETURN;
  END IF;

  SELECT plan, account_type
    INTO v_plan, v_account_type
  FROM profiles
  WHERE id = v_seller_id;

  max_messages := CASE v_plan
    WHEN 'ghost' THEN 3
    WHEN 'visible' THEN 10
    WHEN 'loud' THEN 999
    WHEN 'unmissable' THEN 999
    WHEN 'noticeboard' THEN 0
    WHEN 'featured' THEN 999
    WHEN 'campus_partner' THEN 999
    ELSE 999
  END;

  seller_locked := (v_account_type = 'business' AND v_plan = 'noticeboard');
  RETURN NEXT;
END;
$$;

