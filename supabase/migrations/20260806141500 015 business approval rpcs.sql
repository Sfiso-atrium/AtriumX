-- 015_business_approval_rpcs.sql
-- Same reasoning as approve_listing/reject_listing (migration 012): a plain
-- update from the client works for the status change itself under RLS, but
-- the notification insert that should go with it silently fails unless it's
-- wrapped in a SECURITY DEFINER function. Routing both through one RPC
-- keeps them atomic and guarantees the business actually gets told.

CREATE OR REPLACE FUNCTION approve_business(p_business_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can approve businesses.';
  END IF;

  UPDATE business_profiles SET status = 'approved' WHERE id = p_business_id;

  INSERT INTO notifications (user_id, type, message)
  VALUES (p_business_id, 'business_approved', 'Your business account has been approved. You can now post listings.');
END;
$$;

CREATE OR REPLACE FUNCTION reject_business(p_business_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can reject businesses.';
  END IF;

  UPDATE business_profiles SET status = 'rejected' WHERE id = p_business_id;

  INSERT INTO notifications (user_id, type, message)
  VALUES (p_business_id, 'business_rejected', 'Your business application was not approved. Contact us for details.');
END;
$$;
