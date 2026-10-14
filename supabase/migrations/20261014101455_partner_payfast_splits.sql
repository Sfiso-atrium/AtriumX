-- PayFast is the custodian of the partner balance. AtriumX stores no bank
-- details, merchant keys or partner passphrases. Activation is explicit.
CREATE SCHEMA IF NOT EXISTS atriumx_private;
REVOKE ALL ON SCHEMA atriumx_private FROM PUBLIC;
GRANT USAGE ON SCHEMA atriumx_private TO authenticated,service_role;

CREATE TABLE public.partner_payfast_accounts (
 partner_id uuid PRIMARY KEY REFERENCES public.partners(user_id) ON DELETE CASCADE,
 merchant_id text NOT NULL CHECK(merchant_id ~ '^[1-9][0-9]{7}$'),
 account_name text NOT NULL CHECK(length(trim(account_name)) BETWEEN 2 AND 160),
 environment text NOT NULL CHECK(environment IN ('live','sandbox')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','paused')),
 revision integer NOT NULL DEFAULT 1,
 review_reference text,
 reviewed_by uuid REFERENCES public.profiles(id),
 reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(environment,merchant_id),
 CHECK(status<>'ready' OR (reviewed_by IS NOT NULL AND review_reference IS NOT NULL AND length(trim(review_reference))>0))
);
CREATE TABLE public.payfast_split_settings (
 environment text PRIMARY KEY CHECK(environment IN ('live','sandbox')),
 primary_merchant_id text NOT NULL CHECK(primary_merchant_id ~ '^[1-9][0-9]{7}$'),
 enabled boolean NOT NULL DEFAULT false,
 verification_reference text NOT NULL CHECK(length(trim(verification_reference)) BETWEEN 1 AND 500),
 updated_by uuid NOT NULL REFERENCES public.profiles(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payment_partner_splits (
 payment_id uuid PRIMARY KEY REFERENCES public.payments(id),
 partner_id uuid NOT NULL REFERENCES public.profiles(id),
 merchant_id text NOT NULL,
 primary_merchant_id text NOT NULL,
 environment text NOT NULL CHECK(environment IN ('live','sandbox')),
 cash_amount numeric(10,2) NOT NULL CHECK(cash_amount>0),
 amount_cents integer NOT NULL CHECK(amount_cents>0),
 rate numeric(5,4) NOT NULL CHECK(rate>0 AND rate<1),
 agreement_reference text NOT NULL,
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','submitted','customer_paid','confirmed','review_required','reversed')),
 gateway_uuid text,
 pf_payment_id text,
 reconciliation_reference text,
 reconciled_by uuid REFERENCES public.profiles(id),
 reconciled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(amount_cents < cash_amount*100)
);
CREATE INDEX payment_partner_splits_partner_time ON public.payment_partner_splits(partner_id,created_at DESC);
ALTER TABLE public.partner_payfast_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payfast_split_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_partner_splits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_payfast_accounts,public.payfast_split_settings,public.payment_partner_splits FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.partner_payfast_accounts,public.payfast_split_settings,public.payment_partner_splits TO authenticated;
GRANT ALL ON public.partner_payfast_accounts,public.payfast_split_settings,public.payment_partner_splits TO service_role;
CREATE POLICY partner_payfast_read ON public.partner_payfast_accounts FOR SELECT TO authenticated
 USING(partner_id=(SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));
CREATE POLICY split_settings_admin_read ON public.payfast_split_settings FOR SELECT TO authenticated
 USING(public.is_admin((SELECT auth.uid())));
CREATE POLICY payment_splits_read ON public.payment_partner_splits FOR SELECT TO authenticated
 USING(partner_id=(SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));

CREATE FUNCTION atriumx_private.require_partner_admin() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked)
 THEN RAISE EXCEPTION 'Admin access required.'; END IF;
END $$;

CREATE FUNCTION atriumx_private.save_partner_payfast(p_merchant_id text,p_account_name text,p_environment text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.partners p JOIN public.profiles u ON u.id=p.user_id WHERE p.user_id=auth.uid() AND NOT u.is_blocked)
 THEN RAISE EXCEPTION 'Partner access required.'; END IF;
 INSERT INTO public.partner_payfast_accounts(partner_id,merchant_id,account_name,environment)
 VALUES(auth.uid(),trim(p_merchant_id),trim(p_account_name),p_environment)
 ON CONFLICT(partner_id) DO UPDATE SET merchant_id=excluded.merchant_id,account_name=excluded.account_name,
 environment=excluded.environment,status='pending',revision=partner_payfast_accounts.revision+1,
 review_reference=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=now()
 WHERE (partner_payfast_accounts.merchant_id,partner_payfast_accounts.account_name,partner_payfast_accounts.environment)
 IS DISTINCT FROM (excluded.merchant_id,excluded.account_name,excluded.environment);
END $$;
CREATE FUNCTION public.save_partner_payfast(p_merchant_id text,p_account_name text,p_environment text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.save_partner_payfast(p_merchant_id,p_account_name,p_environment) $$;

CREATE FUNCTION atriumx_private.configure_partner_payfast(p_partner uuid,p_revision integer,p_status text,p_reference text,p_rate numeric,p_starts timestamptz,p_ends timestamptz,p_agreement text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE account public.partner_payfast_accounts;
BEGIN
 PERFORM atriumx_private.require_partner_admin();
 SELECT * INTO account FROM public.partner_payfast_accounts WHERE partner_id=p_partner FOR UPDATE;
 IF account.partner_id IS NULL OR account.revision<>p_revision THEN RAISE EXCEPTION 'Account changed. Refresh before reviewing.'; END IF;
 IF p_status NOT IN ('ready','paused') OR length(trim(coalesce(p_reference,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'A review reference and valid status are required.'; END IF;
 IF p_status='ready' THEN
  IF p_rate IS NULL OR p_rate<=0 OR p_rate>=1 OR p_starts IS NULL OR p_ends IS NULL OR p_ends<=p_starts OR length(trim(coalesce(p_agreement,''))) NOT BETWEEN 1 AND 500
  THEN RAISE EXCEPTION 'Enter the agreed rate, dates and agreement reference.'; END IF;
  IF EXISTS(SELECT 1 FROM public.payfast_split_settings WHERE environment=account.environment AND primary_merchant_id=account.merchant_id)
  THEN RAISE EXCEPTION 'The partner must use a different PayFast account from AtriumX.'; END IF;
  INSERT INTO public.partner_commission_terms VALUES(p_partner,p_rate,p_starts,p_ends,trim(p_agreement))
  ON CONFLICT(partner_id) DO UPDATE SET rate=excluded.rate,starts_at=excluded.starts_at,ends_at=excluded.ends_at,agreement_reference=excluded.agreement_reference;
 END IF;
 UPDATE public.partner_payfast_accounts SET status=p_status,review_reference=trim(p_reference),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now(),revision=revision+1 WHERE partner_id=p_partner;
END $$;
CREATE FUNCTION public.configure_partner_payfast(p_partner uuid,p_revision integer,p_status text,p_reference text,p_rate numeric,p_starts timestamptz,p_ends timestamptz,p_agreement text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.configure_partner_payfast(p_partner,p_revision,p_status,p_reference,p_rate,p_starts,p_ends,p_agreement) $$;

CREATE FUNCTION atriumx_private.configure_payfast_splits(p_environment text,p_merchant_id text,p_enabled boolean,p_reference text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM atriumx_private.require_partner_admin();
 INSERT INTO public.payfast_split_settings(environment,primary_merchant_id,enabled,verification_reference,updated_by)
 VALUES(p_environment,trim(p_merchant_id),p_enabled,trim(p_reference),auth.uid())
 ON CONFLICT(environment) DO UPDATE SET primary_merchant_id=excluded.primary_merchant_id,enabled=excluded.enabled,verification_reference=excluded.verification_reference,updated_by=auth.uid(),updated_at=now();
END $$;
CREATE FUNCTION public.configure_payfast_splits(p_environment text,p_merchant_id text,p_enabled boolean,p_reference text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.configure_payfast_splits(p_environment,p_merchant_id,p_enabled,p_reference) $$;

-- Trusted checkout only. Snapshot the beneficiary and the exact cash commission
-- before contacting PayFast. Never derive a beneficiary from client fields.
CREATE FUNCTION public.reserve_partner_split(p_payment uuid,p_primary_merchant text,p_environment text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE pay public.payments; beneficiary uuid; terms public.partner_commission_terms;
 account public.partner_payfast_accounts; split public.payment_partner_splits; cents integer;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.id IS NULL OR pay.status<>'pending' OR pay.quote_expires_at<=now() THEN RAISE EXCEPTION 'This checkout is no longer available.'; END IF;
 SELECT * INTO split FROM public.payment_partner_splits WHERE payment_id=pay.id;
 IF FOUND THEN
  IF split.environment<>p_environment OR split.primary_merchant_id<>p_primary_merchant THEN RAISE EXCEPTION 'Checkout environment changed.'; END IF;
  IF split.gateway_uuid IS NOT NULL THEN RETURN to_jsonb(split); END IF;
  RAISE EXCEPTION 'This checkout is already being prepared. Wait for the quote to expire before trying again.';
 END IF;
 -- Preserve retries of ordinary hosted checkouts, including quotes started
 -- before this migration. Their original no-split decision stays unchanged.
 IF pay.checkout_started_at IS NOT NULL THEN RETURN NULL; END IF;
 SELECT r.partner_id INTO beneficiary FROM public.referrals r JOIN public.partners p ON p.user_id=r.partner_id
 JOIN public.profiles u ON u.id=p.user_id AND NOT u.is_blocked
 WHERE r.referred_user_id=pay.user_id AND r.partner_id<>pay.user_id AND r.created_at<=pay.created_at;
 SELECT * INTO terms FROM public.partner_commission_terms WHERE partner_id=beneficiary AND starts_at<=pay.created_at AND ends_at>pay.created_at;
 IF terms.partner_id IS NOT NULL AND pay.amount>0 THEN
  SELECT * INTO account FROM public.partner_payfast_accounts WHERE partner_id=beneficiary;
  IF account.partner_id IS NULL OR account.status<>'ready' OR account.environment<>p_environment OR account.merchant_id=p_primary_merchant
    OR NOT EXISTS(SELECT 1 FROM public.payfast_split_settings WHERE environment=p_environment AND enabled AND primary_merchant_id=p_primary_merchant)
  THEN RAISE EXCEPTION 'Referral payment setup is awaiting verification. Please contact AtriumX before paying.'; END IF;
  cents:=round(pay.amount*terms.rate,2)*100;
  IF cents<=0 OR cents>=pay.amount*100 THEN RAISE EXCEPTION 'Commission configuration needs review.'; END IF;
  INSERT INTO public.payment_partner_splits(payment_id,partner_id,merchant_id,primary_merchant_id,environment,cash_amount,amount_cents,rate,agreement_reference)
  VALUES(pay.id,beneficiary,account.merchant_id,p_primary_merchant,p_environment,pay.amount,cents,terms.rate,terms.agreement_reference) RETURNING * INTO split;
 END IF;
 UPDATE public.payments SET checkout_started_at=now() WHERE id=pay.id;
 RETURN CASE WHEN split.payment_id IS NULL THEN NULL ELSE to_jsonb(split) END;
END $$;

-- Preserve legacy records; new split entries distinguish payment confirmation
-- from receipt in the partner wallet. A customer ITN does not prove bank payout.
CREATE OR REPLACE FUNCTION public.accrue_partner_commission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE split public.payment_partner_splits;
BEGIN
 IF NEW.status IN ('complete','review_required') AND OLD.status IS DISTINCT FROM NEW.status AND NEW.amount>0
 AND NULLIF(NEW.pf_payment_id,'') IS NOT NULL AND NEW.itn_payload->>'payment_status'='COMPLETE' THEN
  SELECT * INTO split FROM public.payment_partner_splits WHERE payment_id=NEW.id FOR UPDATE;
  IF FOUND THEN
   UPDATE public.payment_partner_splits SET status=CASE WHEN NEW.status='review_required' OR gateway_uuid IS NULL THEN 'review_required' ELSE 'customer_paid' END,pf_payment_id=NEW.pf_payment_id
   WHERE payment_id=NEW.id AND status IN ('prepared','submitted');
   IF NEW.status='complete' THEN
    INSERT INTO public.partner_commissions(partner_id,payment_id,cash_amount,rate,amount,agreement_reference)
    VALUES(split.partner_id,NEW.id,split.cash_amount,split.rate,split.amount_cents/100.0,split.agreement_reference) ON CONFLICT(payment_id) DO NOTHING;
   END IF;
  ELSIF NEW.status='complete' THEN
   INSERT INTO public.partner_commissions(partner_id,payment_id,cash_amount,rate,amount,agreement_reference)
   SELECT r.partner_id,NEW.id,NEW.amount,t.rate,round(NEW.amount*t.rate,2),t.agreement_reference
   FROM public.referrals r JOIN public.partner_commission_terms t ON t.partner_id=r.partner_id
   JOIN public.profiles p ON p.id=r.partner_id AND NOT p.is_blocked
   WHERE r.referred_user_id=NEW.user_id AND r.partner_id<>NEW.user_id AND r.created_at<=NEW.created_at
   AND t.starts_at<=NEW.created_at AND t.ends_at>NEW.created_at ON CONFLICT(payment_id) DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION atriumx_private.reconcile_partner_split(p_payment uuid,p_reference text,p_reverse boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE split public.payment_partner_splits;
BEGIN
 PERFORM atriumx_private.require_partner_admin();
 IF length(trim(coalesce(p_reference,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'PayFast evidence reference required.'; END IF;
 SELECT * INTO split FROM public.payment_partner_splits WHERE payment_id=p_payment FOR UPDATE;
 IF split.payment_id IS NULL OR split.status NOT IN ('customer_paid','confirmed','review_required') OR split.pf_payment_id IS NULL
 THEN RAISE EXCEPTION 'A verified customer payment is required first.'; END IF;
 IF NOT p_reverse AND (split.gateway_uuid IS NULL OR NOT EXISTS(SELECT 1 FROM public.payments WHERE id=p_payment AND status='complete'))
 THEN RAISE EXCEPTION 'Resolve the payment review first.'; END IF;
 UPDATE public.payment_partner_splits SET status=CASE WHEN p_reverse THEN 'reversed' ELSE 'confirmed' END,
 reconciliation_reference=trim(p_reference),reconciled_by=auth.uid(),reconciled_at=now() WHERE payment_id=p_payment;
 UPDATE public.partner_commissions SET status=CASE WHEN p_reverse THEN 'reversed' ELSE 'paid' END,payout_reference=trim(p_reference) WHERE payment_id=p_payment;
END $$;
CREATE FUNCTION public.reconcile_partner_split(p_payment uuid,p_reference text,p_reverse boolean) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.reconcile_partner_split(p_payment,p_reference,p_reverse) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA atriumx_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION atriumx_private.save_partner_payfast(text,text,text),atriumx_private.configure_partner_payfast(uuid,integer,text,text,numeric,timestamptz,timestamptz,text),atriumx_private.configure_payfast_splits(text,text,boolean,text),atriumx_private.reconcile_partner_split(uuid,text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.save_partner_payfast(text,text,text),public.configure_partner_payfast(uuid,integer,text,text,numeric,timestamptz,timestamptz,text),public.configure_payfast_splits(text,text,boolean,text),public.reconcile_partner_split(uuid,text,boolean),public.reserve_partner_split(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_partner_payfast(text,text,text),public.configure_partner_payfast(uuid,integer,text,text,numeric,timestamptz,timestamptz,text),public.configure_payfast_splits(text,text,boolean,text),public.reconcile_partner_split(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_partner_split(uuid,text,text) TO service_role;

CREATE FUNCTION atriumx_private.get_partner_payfast_state() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.partners p JOIN public.profiles u ON u.id=p.user_id WHERE p.user_id=auth.uid() AND NOT u.is_blocked)
 THEN RAISE EXCEPTION 'Partner access required.'; END IF;
 RETURN jsonb_build_object('account',(SELECT to_jsonb(a)-'review_reference'-'reviewed_by' FROM public.partner_payfast_accounts a WHERE partner_id=auth.uid()),
 'platformEnabled',EXISTS(SELECT 1 FROM public.partner_payfast_accounts a JOIN public.payfast_split_settings s ON s.environment=a.environment AND s.enabled AND s.primary_merchant_id<>a.merchant_id WHERE a.partner_id=auth.uid()),
 'splits',coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT payment_id,amount_cents,environment,status,pf_payment_id,created_at FROM public.payment_partner_splits WHERE partner_id=auth.uid() ORDER BY created_at DESC LIMIT 100) s),'[]'::jsonb));
END $$;
CREATE FUNCTION public.get_partner_payfast_state() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.get_partner_payfast_state() $$;
REVOKE ALL ON FUNCTION public.get_partner_payfast_state(),atriumx_private.get_partner_payfast_state() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_partner_payfast_state(),atriumx_private.get_partner_payfast_state() TO authenticated;
