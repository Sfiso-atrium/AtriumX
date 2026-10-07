-- Record the value and period purchased, including transferred unused value.
ALTER TABLE public.payments
 ADD COLUMN pricing_version integer NOT NULL DEFAULT 0,
 ADD COLUMN list_price numeric(12,2),
 ADD COLUMN minimum_topup numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_topup>=0),
 ADD COLUMN credit_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
 ADD COLUMN credit_sources uuid[] NOT NULL DEFAULT '{}',
 ADD COLUMN credit_plan text,
 ADD COLUMN credit_expiry timestamptz,
 ADD COLUMN quote_expires_at timestamptz,
 ADD COLUMN checkout_started_at timestamptz,
 ADD COLUMN entitlement_start timestamptz,
 ADD COLUMN entitlement_end timestamptz,
 ADD COLUMN bonus_seconds integer NOT NULL DEFAULT 0 CHECK (bonus_seconds >= 0),
 ADD COLUMN credit_used_by uuid REFERENCES public.payments(id),
 ADD COLUMN review_reason text;
ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending','complete','failed','cancelled','review_required'));
CREATE INDEX payments_credit_history ON public.payments(user_id,completed_at) WHERE status='complete';

-- Reconstruct legacy periods using the existing activation rule. A change of
-- plan replaces, rather than extends, the old period. No balances are invented.
DO $$
DECLARE r record; prev_user uuid; prev_audience boolean; prev_plan text; prev_end timestamptz; starts timestamptz;
BEGIN
 FOR r IN SELECT * FROM public.payments WHERE status='complete' AND completed_at IS NOT NULL ORDER BY user_id,(plan_key LIKE 'accommodation_%'),completed_at,id LOOP
  IF prev_user=r.user_id AND prev_audience=(r.plan_key LIKE 'accommodation_%') AND prev_plan=r.plan_key AND prev_end>r.completed_at THEN starts:=prev_end;
  ELSE
   starts:=r.completed_at;
   IF prev_user=r.user_id AND prev_audience=(r.plan_key LIKE 'accommodation_%') THEN
    UPDATE public.payments SET entitlement_end=LEAST(entitlement_end,r.completed_at) WHERE user_id=r.user_id AND (plan_key LIKE 'accommodation_%')=prev_audience AND entitlement_end>r.completed_at;
   END IF;
  END IF;
  prev_end:=starts+make_interval(days=>r.plan_days);
  UPDATE public.payments SET entitlement_start=starts,entitlement_end=prev_end,list_price=amount WHERE id=r.id;
  prev_user:=r.user_id;prev_audience:=(r.plan_key LIKE 'accommodation_%');prev_plan:=r.plan_key;
 END LOOP;
END $$;

CREATE FUNCTION public.plan_payment_quote(p_user uuid,p_plan text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE price numeric; days integer; audience text; rank integer; current_rank integer; current_plan text; expiry timestamptz; actor text; accommodation boolean; credit numeric:=0; sources uuid[]:='{}'; latest public.payments%ROWTYPE; intent text:='purchase'; bonus integer:=0; due numeric; topup numeric:=0;
BEGIN
 SELECT v.price,v.days,v.audience,v.rank INTO price,days,audience,rank FROM (VALUES
 ('visible',29,7,'student',1),('loud',79,14,'student',2),('unmissable',149,30,'student',3),
 ('featured',199,30,'business',1),('campus_partner',349,30,'business',2),
 ('accommodation_featured',199,30,'accommodation',1),('accommodation_premium',399,30,'accommodation',2)
 ) v(key,price,days,audience,rank) WHERE key=p_plan;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown paid plan.'; END IF;
 SELECT account_type,plan,plan_expires_at INTO actor,current_plan,expiry FROM profiles WHERE id=p_user AND NOT COALESCE(is_blocked,false);
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable.'; END IF;
 SELECT is_accommodation INTO accommodation FROM business_profiles WHERE id=p_user;
 IF accommodation THEN
  actor:='accommodation';
  SELECT accommodation_plan,accommodation_plan_expires_at INTO current_plan,expiry FROM business_profiles WHERE id=p_user;
 END IF;
 IF actor IS DISTINCT FROM audience THEN RAISE EXCEPTION 'This plan is not available for your account.'; END IF;
 current_rank:=CASE current_plan WHEN 'visible' THEN 1 WHEN 'loud' THEN 2 WHEN 'unmissable' THEN 3 WHEN 'featured' THEN 1 WHEN 'campus_partner' THEN 2 WHEN 'accommodation_featured' THEN 1 WHEN 'accommodation_premium' THEN 2 ELSE 0 END;
 IF expiry>now() AND current_rank>0 THEN
  IF rank<current_rank THEN RAISE EXCEPTION 'Choose a lower plan after your current paid period ends.'; END IF;
  IF current_plan=p_plan THEN intent:='renewal';
  ELSE
   intent:='upgrade';
   SELECT * INTO latest FROM payments WHERE user_id=p_user AND status='complete' AND plan_key=current_plan AND abs(extract(epoch FROM entitlement_end-expiry))<1 ORDER BY entitlement_end DESC,completed_at DESC,id DESC LIMIT 1;
   -- Only verified periods matching the live entitlement may produce credit.
   IF latest.plan_key=current_plan AND abs(extract(epoch FROM latest.entitlement_end-expiry))<1 THEN
    SELECT COALESCE(round(sum((amount+credit_amount)*greatest(0,extract(epoch FROM entitlement_end-greatest(now(),entitlement_start)))/(plan_days*86400+bonus_seconds)),2),0),COALESCE(array_agg(id),'{}') INTO credit,sources
    FROM payments WHERE user_id=p_user AND status='complete' AND plan_key=current_plan AND credit_used_by IS NULL AND entitlement_end>now() AND entitlement_end<=expiry+interval '1 second';
   END IF;
  END IF;
 END IF;
 -- Extra prepaid renewal value becomes extra time rather than disappearing.
 due:=greatest(0,price-credit);
 IF due>0 AND due<5 THEN topup:=5-due; due:=5; END IF;
 IF credit+due>price THEN bonus:=floor((credit+due-price)/price*days*86400); END IF;
 RETURN jsonb_build_object('plan_key',p_plan,'list_price',price,'plan_days',days,'credit_amount',credit,'amount',due,'minimum_topup',topup,'credit_sources',sources,'credit_plan',current_plan,'credit_expiry',expiry,'intent',intent,'bonus_seconds',bonus);
END $$;
REVOKE ALL ON FUNCTION public.plan_payment_quote(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.plan_payment_quote(uuid,text) TO service_role;

CREATE FUNCTION public.prepare_plan_payment(p_user uuid,p_plan text,p_listing uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q jsonb; existing public.payments%ROWTYPE; result public.payments%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('plan-payment:'||p_user::text,0));
 IF p_listing IS NOT NULL AND NOT EXISTS(SELECT 1 FROM listings WHERE id=p_listing AND seller_id=p_user AND status NOT IN ('sold','suspended')) THEN RAISE EXCEPTION 'This listing cannot be renewed.'; END IF;
 q:=plan_payment_quote(p_user,p_plan);
 SELECT * INTO existing FROM payments WHERE user_id=p_user AND pricing_version=1 AND status='pending' AND quote_expires_at>now() AND (plan_key LIKE 'accommodation_%')=(p_plan LIKE 'accommodation_%') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF existing.plan_key<>p_plan OR existing.listing_id IS DISTINCT FROM p_listing THEN RAISE EXCEPTION 'An unfinished checkout is reserved for another plan. Complete it, or try again after 15 minutes.'; END IF;
  RETURN to_jsonb(existing);
 END IF;
 INSERT INTO payments(user_id,m_payment_id,plan_key,plan_days,amount,intent,listing_id,pricing_version,list_price,credit_amount,credit_sources,credit_plan,credit_expiry,quote_expires_at,bonus_seconds,minimum_topup)
 VALUES(p_user,'plan-'||gen_random_uuid()::text,p_plan,(q->>'plan_days')::int,(q->>'amount')::numeric,q->>'intent',p_listing,1,(q->>'list_price')::numeric,(q->>'credit_amount')::numeric,ARRAY(SELECT jsonb_array_elements_text(q->'credit_sources')::uuid),q->>'credit_plan',(q->>'credit_expiry')::timestamptz,now()+interval '15 minutes',(q->>'bonus_seconds')::int,(q->>'minimum_topup')::numeric)
 RETURNING * INTO result;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.prepare_plan_payment(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_plan_payment(uuid,text,uuid) TO service_role;

-- Keep the proven listing/plan activation code intact behind a serialized wrapper.
ALTER FUNCTION public.activate_verified_plan_payment(uuid,text,jsonb) RENAME TO activate_verified_plan_payment_base;
REVOKE ALL ON FUNCTION public.activate_verified_plan_payment_base(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.activate_verified_plan_payment(p_payment_id uuid,p_pf_payment_id text,p_itn_payload jsonb)
RETURNS TABLE(activated_plan text,activated_until timestamptz,payment_intent text,renewed_listing_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.payments%ROWTYPE; actor uuid; current_plan text; expiry timestamptz; result record; reason text; count_sources integer;
BEGIN
 SELECT user_id INTO actor FROM payments WHERE id=p_payment_id;
 IF actor IS NULL THEN RAISE EXCEPTION 'Payment record not found.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('plan-payment:'||actor::text,0));
 SELECT * INTO p FROM payments WHERE id=p_payment_id FOR UPDATE;
 IF p.status='review_required' THEN RETURN; END IF;
 IF p.status='complete' THEN
  RETURN QUERY SELECT p.plan_key,p.entitlement_end,p.intent,p.listing_id; RETURN;
 END IF;
 IF p.pricing_version=1 THEN
  IF p.status<>'pending' THEN reason:='This checkout is no longer pending.'; END IF;
  IF p.quote_expires_at<now() AND p.credit_amount>0 THEN reason:='The credited checkout expired before payment confirmation.'; END IF;
  IF p.plan_key LIKE 'accommodation_%' THEN
   SELECT accommodation_plan,accommodation_plan_expires_at INTO current_plan,expiry FROM business_profiles WHERE id=actor FOR UPDATE;
  ELSE SELECT plan,plan_expires_at INTO current_plan,expiry FROM profiles WHERE id=actor FOR UPDATE; END IF;
  IF p.credit_amount>0 THEN
   IF current_plan IS DISTINCT FROM p.credit_plan OR expiry IS DISTINCT FROM p.credit_expiry THEN reason:='The account plan changed while checkout was open.'; END IF;
   SELECT count(*) INTO count_sources FROM payments WHERE id=ANY(p.credit_sources) AND user_id=actor AND status='complete' AND credit_used_by IS NULL;
   IF count_sources<>cardinality(p.credit_sources) OR count_sources=0 THEN reason:='The quoted credit has already been used or is unavailable.'; END IF;
  END IF;
  IF reason IS NOT NULL THEN
   UPDATE payments SET status='review_required',pf_payment_id=p_pf_payment_id,itn_payload=p_itn_payload,review_reason=reason WHERE id=p.id;
   BEGIN
    INSERT INTO notifications(user_id,type,message) SELECT id,'payment_review','A confirmed payment needs review: '||p.m_payment_id||'. '||reason FROM profiles WHERE is_admin AND NOT COALESCE(is_blocked,false);
   EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Payment review notification failed for %',p.id; END;
   RETURN;
  END IF;
 END IF;
 SELECT * INTO result FROM activate_verified_plan_payment_base(p_payment_id,p_pf_payment_id,p_itn_payload);
 IF p.bonus_seconds>0 THEN
  result.activated_until:=result.activated_until+make_interval(secs=>p.bonus_seconds);
  IF p.plan_key LIKE 'accommodation_%' THEN UPDATE business_profiles SET accommodation_plan_expires_at=result.activated_until WHERE id=actor;
  ELSE
   UPDATE profiles SET plan_expires_at=result.activated_until WHERE id=actor;
   UPDATE listings SET expires_at=result.activated_until WHERE seller_id=actor AND status IN ('active','pending');
  END IF;
 END IF;
 UPDATE payments SET entitlement_start=result.activated_until-make_interval(days=>p.plan_days,secs=>p.bonus_seconds),entitlement_end=result.activated_until,list_price=COALESCE(list_price,amount) WHERE id=p.id;
 UPDATE payments SET credit_used_by=p.id WHERE id=ANY(p.credit_sources);
 RETURN QUERY SELECT result.activated_plan,result.activated_until,result.payment_intent,result.renewed_listing_id;
END $$;
REVOKE ALL ON FUNCTION public.activate_verified_plan_payment(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_verified_plan_payment(uuid,text,jsonb) TO service_role;
