-- Referral links track activity, not earnings. No commission rate is enabled here.
-- An agreed, dated contract must be configured by the trusted service before accrual.
CREATE FUNCTION public.attach_partner_referral(p_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); partner uuid;
BEGIN
 IF actor IS NULL THEN RETURN 'signed_out'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=actor AND NOT is_blocked FOR UPDATE;
 IF NOT FOUND THEN RETURN 'ineligible'; END IF;
 IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_user_id=actor) THEN RETURN 'already_attributed'; END IF;
 SELECT p.user_id INTO partner FROM public.partners p JOIN public.profiles u ON u.id=p.user_id
 WHERE p.referral_code=p_code AND NOT u.is_blocked;
 IF partner IS NULL OR partner=actor THEN RETURN 'invalid'; END IF;
 -- Existing paying customers cannot be reassigned by clicking another person's link.
 IF EXISTS(SELECT 1 FROM public.payments WHERE user_id=actor AND status='complete') THEN RETURN 'existing_customer'; END IF;
 INSERT INTO public.referrals(partner_id,referred_user_id) VALUES(partner,actor)
 ON CONFLICT(referred_user_id) DO NOTHING;
 RETURN 'attributed';
END $$;
REVOKE ALL ON FUNCTION public.attach_partner_referral(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.attach_partner_referral(text) TO authenticated;

-- Independent of handle_new_user, so later profile/auth changes cannot erase capture.
CREATE FUNCTION public.capture_signup_partner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE partner uuid;
BEGIN
 SELECT p.user_id INTO partner FROM auth.users u JOIN public.partners p
 ON p.referral_code=u.raw_user_meta_data->>'ref_code'
 JOIN public.profiles owner ON owner.id=p.user_id AND NOT owner.is_blocked
 WHERE u.id=NEW.id AND p.user_id<>NEW.id;
 IF partner IS NOT NULL THEN
  INSERT INTO public.referrals(partner_id,referred_user_id) VALUES(partner,NEW.id)
  ON CONFLICT(referred_user_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_signup_partner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_signup_partner AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.capture_signup_partner();

CREATE TABLE public.partner_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('listing','accommodation','event','wanted','accommodation_submission')),
 object_id uuid NOT NULL,
 title text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,object_id)
);
CREATE INDEX partner_activity_partner_time ON public.partner_activity(partner_id,created_at DESC);
ALTER TABLE public.partner_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_activity FROM anon,authenticated;
GRANT SELECT ON public.partner_activity TO authenticated;
GRANT ALL ON public.partner_activity TO service_role;
CREATE POLICY partner_activity_read ON public.partner_activity FOR SELECT TO authenticated
USING (partner_id=(SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));

CREATE FUNCTION public.record_partner_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; partner uuid; activity_kind text;
BEGIN
 activity_kind:=TG_ARGV[0];
 actor := (to_jsonb(NEW)->>TG_ARGV[1])::uuid;
 SELECT r.partner_id INTO partner FROM public.referrals r JOIN public.partners p ON p.user_id=r.partner_id WHERE r.referred_user_id=actor;
 IF partner IS NOT NULL THEN
  INSERT INTO public.partner_activity(partner_id,kind,object_id,title)
  VALUES(partner,activity_kind,NEW.id,NEW.title) ON CONFLICT(kind,object_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_partner_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_partner_listing AFTER INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION public.record_partner_activity('listing','seller_id');
CREATE TRIGGER record_partner_accommodation AFTER INSERT ON public.accommodation_listings FOR EACH ROW EXECUTE FUNCTION public.record_partner_activity('accommodation','seller_id');
CREATE TRIGGER record_partner_event AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.record_partner_activity('event','host_id');
CREATE TRIGGER record_partner_wanted AFTER INSERT ON public.wanted_posts FOR EACH ROW EXECUTE FUNCTION public.record_partner_activity('wanted','seeker_id');

-- Preserve legacy rows for reconciliation, but stop producing fictitious money.
CREATE OR REPLACE FUNCTION public.notify_referral_listing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE partner uuid;
BEGIN
 SELECT r.partner_id INTO partner FROM public.referrals r JOIN public.partners p ON p.user_id=r.partner_id WHERE r.referred_user_id=NEW.seller_id;
 IF partner IS NOT NULL THEN
  INSERT INTO public.referral_events(partner_id,referred_user_id,listing_id,plan_tier,amount)
  VALUES(partner,NEW.seller_id,NEW.id,NEW.plan_tier,0);
  INSERT INTO public.notifications(user_id,type,message,listing_id)
  VALUES(partner,'referral_listing','Someone you referred created a listing. Listing activity is not commission.',NEW.id);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_referral_listing() FROM PUBLIC,anon,authenticated;
INSERT INTO public.partner_activity(partner_id,kind,object_id,title,created_at)
SELECT e.partner_id,'listing',e.listing_id,l.title,e.created_at FROM public.referral_events e JOIN public.listings l ON l.id=e.listing_id
ON CONFLICT(kind,object_id) DO NOTHING;

-- Preserve the partner on the server even before an accommodation owner registers.
ALTER TABLE public.accommodation_submissions ADD COLUMN referral_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.reserve_accommodation_submission(p_receipt_hash text,p_ip_hash text,p_email text,p_phone text,p_website text,p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid; partner uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash,0));
 SELECT id INTO v_id FROM accommodation_submissions WHERE receipt_hash=p_receipt_hash;
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 IF (SELECT count(*) FROM accommodation_submissions WHERE ip_hash=p_ip_hash AND created_at>now()-interval '1 hour') >= 10
 OR (SELECT count(*) FROM accommodation_submissions WHERE email=lower(trim(p_email)) AND created_at>now()-interval '1 day') >= 3 THEN
  RAISE EXCEPTION 'Too many submissions. Please try again later.';
 END IF;
 SELECT p.user_id INTO partner FROM partners p JOIN profiles u ON u.id=p.user_id AND NOT u.is_blocked WHERE p.referral_code=p_payload->>'_ref_code';
 INSERT INTO accommodation_submissions(receipt_hash,ip_hash,email,contact_number,website,payload,referral_partner_id)
 VALUES(p_receipt_hash,p_ip_hash,lower(trim(p_email)),p_phone,p_website,p_payload-'_ref_code',partner) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.record_partner_guest_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.referral_partner_id IS NOT NULL AND NEW.status='pending' AND OLD.status='draft' THEN
  INSERT INTO public.partner_activity(partner_id,kind,object_id,title)
  VALUES(NEW.referral_partner_id,'accommodation_submission',NEW.id,NEW.payload->>'title')
  ON CONFLICT(kind,object_id) DO NOTHING;
 END IF;
 IF NEW.status='claimed' AND OLD.status<>'claimed' THEN
  -- The published accommodation replaces its intake entry, avoiding double counting.
  DELETE FROM public.partner_activity WHERE kind='accommodation_submission' AND object_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_partner_guest_submission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_partner_guest_submission AFTER UPDATE OF status ON public.accommodation_submissions FOR EACH ROW EXECUTE FUNCTION public.record_partner_guest_submission();

ALTER FUNCTION public.claim_accommodation_submission(uuid,text,text[]) RENAME TO claim_accommodation_submission_without_referral;
REVOKE ALL ON FUNCTION public.claim_accommodation_submission_without_referral(uuid,text,text[]) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.claim_accommodation_submission(p_id uuid,p_receipt_hash text,p_image_urls text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE partner uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
 SELECT s.referral_partner_id INTO partner FROM public.accommodation_submissions s
 JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=s.email AND u.email_confirmed_at IS NOT NULL
 JOIN public.partners p ON p.user_id=s.referral_partner_id
 WHERE s.id=p_id AND s.receipt_hash=p_receipt_hash AND s.status='approved';
 IF partner IS NOT NULL AND partner<>auth.uid() AND NOT EXISTS(SELECT 1 FROM public.payments WHERE user_id=auth.uid() AND status='complete') THEN
  INSERT INTO public.referrals(partner_id,referred_user_id) VALUES(partner,auth.uid()) ON CONFLICT(referred_user_id) DO NOTHING;
 END IF;
 RETURN public.claim_accommodation_submission_without_referral(p_id,p_receipt_hash,p_image_urls);
END $$;
REVOKE ALL ON FUNCTION public.claim_accommodation_submission(uuid,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_accommodation_submission(uuid,text,text[]) TO authenticated;

CREATE TABLE public.partner_commission_terms (
 partner_id uuid PRIMARY KEY REFERENCES public.partners(user_id) ON DELETE CASCADE,
 rate numeric(5,4) NOT NULL CHECK(rate>0 AND rate<=1),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 agreement_reference text NOT NULL CHECK(length(trim(agreement_reference))>0),
 CHECK(ends_at>starts_at)
);
CREATE TABLE public.partner_commissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.profiles(id),
 payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id),
 cash_amount numeric(10,2) NOT NULL CHECK(cash_amount>0),
 rate numeric(5,4) NOT NULL CHECK(rate>0 AND rate<=1),
 amount numeric(10,2) NOT NULL CHECK(amount>=0),
 agreement_reference text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','reversed')),
 payout_reference text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'paid' OR (payout_reference IS NOT NULL AND length(trim(payout_reference))>0))
);
CREATE INDEX partner_commissions_partner_time ON public.partner_commissions(partner_id,created_at DESC);
ALTER TABLE public.partner_commission_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_commission_terms,public.partner_commissions FROM anon,authenticated;
GRANT SELECT ON public.partner_commission_terms,public.partner_commissions TO authenticated;
GRANT ALL ON public.partner_commission_terms,public.partner_commissions TO service_role;
CREATE POLICY partner_terms_read ON public.partner_commission_terms FOR SELECT TO authenticated USING(partner_id=(SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));
CREATE POLICY partner_commissions_read ON public.partner_commissions FOR SELECT TO authenticated USING(partner_id=(SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));

CREATE FUNCTION public.accrue_partner_commission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.status='complete' AND OLD.status IS DISTINCT FROM 'complete' AND NEW.amount>0
 AND NULLIF(NEW.pf_payment_id,'') IS NOT NULL AND NEW.itn_payload->>'payment_status'='COMPLETE' THEN
  INSERT INTO public.partner_commissions(partner_id,payment_id,cash_amount,rate,amount,agreement_reference)
  SELECT r.partner_id,NEW.id,NEW.amount,t.rate,round(NEW.amount*t.rate,2),t.agreement_reference
  FROM public.referrals r JOIN public.partner_commission_terms t ON t.partner_id=r.partner_id
  JOIN public.profiles p ON p.id=r.partner_id AND NOT p.is_blocked
  WHERE r.referred_user_id=NEW.user_id AND r.partner_id<>NEW.user_id
    AND r.created_at<=NEW.created_at AND t.starts_at<=NEW.created_at AND t.ends_at>NEW.created_at
  ON CONFLICT(payment_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.accrue_partner_commission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER accrue_partner_commission AFTER UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.accrue_partner_commission();

CREATE FUNCTION public.get_partner_overview() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.partners p JOIN public.profiles u ON u.id=p.user_id WHERE p.user_id=actor AND NOT u.is_blocked) THEN RAISE EXCEPTION 'Partner access required.'; END IF;
 RETURN jsonb_build_object(
  'referredCount',(SELECT count(*) FROM public.referrals WHERE partner_id=actor),
  'activityCount',(SELECT count(*) FROM public.partner_activity WHERE partner_id=actor),
  'totals',(SELECT jsonb_build_object('pending',coalesce(sum(amount) FILTER(WHERE status='pending'),0),'approved',coalesce(sum(amount) FILTER(WHERE status='approved'),0),'paid',coalesce(sum(amount) FILTER(WHERE status='paid'),0)) FROM public.partner_commissions WHERE partner_id=actor),
  'activities',coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT id,kind,title,created_at FROM public.partner_activity WHERE partner_id=actor ORDER BY created_at DESC LIMIT 100) a),'[]'::jsonb),
  'commissions',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT id,amount,cash_amount,rate,status,created_at FROM public.partner_commissions WHERE partner_id=actor ORDER BY created_at DESC LIMIT 100) c),'[]'::jsonb),
  'terms',(SELECT to_jsonb(t)-'partner_id' FROM public.partner_commission_terms t WHERE partner_id=actor AND starts_at<=now() AND ends_at>now())
 );
END $$;
REVOKE ALL ON FUNCTION public.get_partner_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_partner_overview() TO authenticated;
