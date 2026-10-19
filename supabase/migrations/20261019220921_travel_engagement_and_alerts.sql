-- Add Travel to the existing monitor without changing the other visit rules.
CREATE OR REPLACE FUNCTION public.record_admin_visit(p_id uuid,p_token uuid,p_path text,p_source text DEFAULT '',p_campaign text DEFAULT '',p_device text DEFAULT 'unknown',p_active integer DEFAULT 0,p_form integer DEFAULT 0,p_started boolean DEFAULT false,p_left boolean DEFAULT false,p_sequence integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.admin_visit_sessions%ROWTYPE; elapsed integer; is_form boolean;
BEGIN
 IF p_id IS NULL OR p_token IS NULL THEN RAISE EXCEPTION 'Missing visit reference'; END IF;
 IF EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND (is_admin OR is_blocked)) THEN RETURN; END IF;
 -- Only public browsing and listing forms; never record chat, profile or payment URLs.
 IF p_path NOT IN ('/','/retailer','/accommodations','/accommodations/review','/accommodation/post','/business/post','/post','/feed','/events','/travel')
 AND p_path !~ '^/(listing|accommodation|accommodations/residence)/[0-9a-f-]{36}$' THEN RETURN; END IF;
 is_form:=p_path IN ('/accommodation/post','/business/post','/post');
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT * INTO s FROM admin_visit_sessions WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('admin-visit-start',0));
  IF (SELECT count(*) FROM admin_visit_sessions WHERE started_at>now()-interval '1 minute')>=300 THEN RAISE EXCEPTION 'Visit recording temporarily limited'; END IF;
  INSERT INTO admin_visit_sessions(id,token,user_id,entry_path,last_path,source,campaign,device,pages,form_opened)
  VALUES(p_id,p_token,auth.uid(),p_path,p_path,left(regexp_replace(coalesce(p_source,''),'[^a-zA-Z0-9 _.-]','','g'),80),left(regexp_replace(coalesce(p_campaign,''),'[^a-zA-Z0-9 _.-]','','g'),80),CASE WHEN p_device IN ('phone','tablet','desktop') THEN p_device ELSE 'unknown' END,jsonb_build_array(jsonb_build_object('path',p_path,'at',now())),is_form) RETURNING * INTO s;
 ELSE
  IF s.token<>p_token THEN RAISE EXCEPTION 'Invalid visit reference'; END IF;
  IF s.started_at<now()-interval '24 hours' OR coalesce(p_sequence,0)<s.last_sequence THEN RETURN; END IF;
 END IF;
 elapsed:=greatest(0,floor(extract(epoch FROM now()-s.started_at))::integer);
 UPDATE admin_visit_sessions SET last_seen=now(),last_sequence=coalesce(p_sequence,0), user_id=coalesce(s.user_id,auth.uid()),last_path=p_path,
 active_seconds=greatest(s.active_seconds,least(greatest(coalesce(p_active,0),0),elapsed,86400)),
 form_seconds=greatest(s.form_seconds,least(greatest(coalesce(p_form,0),0),greatest(s.active_seconds,least(greatest(coalesce(p_active,0),0),elapsed,86400)))),
 form_opened=s.form_opened OR is_form,form_started=s.form_started OR (is_form AND coalesce(p_started,false)),
 left_at=CASE WHEN p_left THEN now() ELSE NULL END,
 pages=CASE WHEN s.last_path<>p_path AND jsonb_array_length(s.pages)<50 THEN s.pages||jsonb_build_array(jsonb_build_object('path',p_path,'at',now())) ELSE s.pages END
 WHERE id=p_id;
 -- JS page arrivals, rather than email-open pixels or raw HTTP preview fetches.
 IF s.alerted_at IS NULL THEN
  UPDATE admin_visit_sessions SET alerted_at=now() WHERE id=p_id;
  PERFORM public.admin_visit_alert('Visit opened: '||s.entry_path||CASE WHEN s.source<>'' THEN ' · '||s.source ELSE '' END||CASE WHEN s.campaign<>'' THEN ' · '||s.campaign ELSE '' END);
 END IF;
END $$;

CREATE TABLE atriumx_private.travel_events (
 id uuid PRIMARY KEY, visit_id uuid NOT NULL REFERENCES public.admin_visit_sessions(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('route_search','share_whatsapp','share_copy','company_click','feature_sell','feature_accommodation','alert_request')),
 listing_id uuid REFERENCES public.bus_listings(id) ON DELETE SET NULL,
 result_count integer CHECK(result_count BETWEEN 0 AND 100000), from_place text, to_place text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX travel_events_date ON atriumx_private.travel_events(created_at);
CREATE INDEX travel_events_visit ON atriumx_private.travel_events(visit_id);
CREATE INDEX travel_events_listing ON atriumx_private.travel_events(listing_id) WHERE listing_id IS NOT NULL;
ALTER TABLE atriumx_private.travel_events ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION atriumx_private.record_travel_event(p_id uuid,p_visit_id uuid,p_token uuid,p_kind text,p_listing_id uuid,p_result_count integer,p_from text,p_to text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND (is_admin OR is_blocked)) THEN RETURN; END IF;
 IF p_kind NOT IN ('route_search','share_whatsapp','share_copy','company_click','feature_sell','feature_accommodation','alert_request') OR p_kind IS NULL THEN RAISE EXCEPTION 'Invalid travel activity'; END IF;
 PERFORM public.record_admin_visit(p_id=>p_visit_id,p_token=>p_token,p_path=>'/travel');
 IF NOT EXISTS(SELECT 1 FROM public.admin_visit_sessions WHERE id=p_visit_id AND token=p_token AND started_at>now()-interval '24 hours') THEN RAISE EXCEPTION 'Invalid visit reference'; END IF;
 IF p_listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.bus_listings WHERE id=p_listing_id) THEN RAISE EXCEPTION 'Unknown bus listing'; END IF;
 IF p_kind='company_click' AND p_listing_id IS NULL THEN RAISE EXCEPTION 'Missing bus listing'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('travel-event-'||p_visit_id::text,0));
 IF (SELECT count(*) FROM atriumx_private.travel_events WHERE visit_id=p_visit_id)>=500 THEN RETURN; END IF;
 -- Only known public place names enter analytics, never raw input or email addresses.
 INSERT INTO atriumx_private.travel_events(id,visit_id,kind,listing_id,result_count,from_place,to_place)
 VALUES(p_id,p_visit_id,p_kind,p_listing_id,least(greatest(p_result_count,0),100000),
 CASE WHEN EXISTS(SELECT 1 FROM public.bus_listings b WHERE p_from=b.origin OR p_from=ANY(b.origin_aliases||b.boarding_points)) THEN left(p_from,160) END,
 CASE WHEN EXISTS(SELECT 1 FROM public.bus_listings b WHERE p_to=b.destination OR p_to=ANY(b.destination_aliases||b.dropoff_points)) THEN left(p_to,160) END)
 ON CONFLICT(id) DO NOTHING;
END $$;
CREATE FUNCTION public.record_travel_event(p_id uuid,p_visit_id uuid,p_token uuid,p_kind text,p_listing_id uuid DEFAULT NULL,p_result_count integer DEFAULT NULL,p_from text DEFAULT NULL,p_to text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT atriumx_private.record_travel_event(p_id,p_visit_id,p_token,p_kind,p_listing_id,p_result_count,p_from,p_to)$$;

CREATE TABLE atriumx_private.travel_alert_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL,
 from_place text NOT NULL, to_place text NOT NULL, travel_date date,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','unsubscribed')),
 confirmation_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), unsubscribe_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 requested_visit uuid REFERENCES public.admin_visit_sessions(id) ON DELETE SET NULL,
 requested_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz, unsubscribed_at timestamptz,
 consent_version text NOT NULL DEFAULT 'travel-route-updates-2026-10', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(char_length(email)<=254), CHECK(char_length(from_place) BETWEEN 1 AND 120), CHECK(char_length(to_place) BETWEEN 1 AND 120)
);
CREATE UNIQUE INDEX travel_alert_route_email ON atriumx_private.travel_alert_subscriptions(email,lower(from_place),lower(to_place),coalesce(travel_date,'0001-01-01'::date));
CREATE INDEX travel_alert_requested_visit ON atriumx_private.travel_alert_subscriptions(requested_visit);
ALTER TABLE atriumx_private.travel_alert_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE atriumx_private.travel_mail_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id uuid NOT NULL REFERENCES atriumx_private.travel_alert_subscriptions(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('confirmation','update')), dedupe_key text NOT NULL UNIQUE,
 payload jsonb NOT NULL DEFAULT '{}', state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(), locked_at timestamptz, lock_token uuid,
 accepted_at timestamptz, provider_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX travel_mail_pending ON atriumx_private.travel_mail_jobs(next_attempt) WHERE state IN ('pending','processing');
CREATE INDEX travel_mail_subscription ON atriumx_private.travel_mail_jobs(subscription_id);
ALTER TABLE atriumx_private.travel_mail_jobs ENABLE ROW LEVEL SECURITY;
CREATE TABLE atriumx_private.travel_mail_status (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), ready boolean NOT NULL DEFAULT false,
 last_run timestamptz, last_error text
);
INSERT INTO atriumx_private.travel_mail_status(singleton) VALUES(true);
ALTER TABLE atriumx_private.travel_mail_status ENABLE ROW LEVEL SECURITY;

-- Same small-typo and transposed-letter matching used by the directory, with no paid geocoder.
CREATE FUNCTION atriumx_private.travel_distance(a text,b text) RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE d integer[]; i integer; j integer; n integer:=char_length(a); m integer:=char_length(b);
BEGIN
 IF n>256 OR m>256 OR abs(n-m)>2 THEN RETURN greatest(n,m); END IF;
 d:=array_fill(0,ARRAY[n+1,m+1],ARRAY[0,0]);
 FOR i IN 0..n LOOP d[i][0]:=i; END LOOP; FOR j IN 0..m LOOP d[0][j]:=j; END LOOP;
 FOR i IN 1..n LOOP FOR j IN 1..m LOOP
  d[i][j]:=least(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+CASE WHEN substr(a,i,1)=substr(b,j,1) THEN 0 ELSE 1 END);
  IF i>1 AND j>1 AND substr(a,i,1)=substr(b,j-1,1) AND substr(a,i-1,1)=substr(b,j,1) THEN d[i][j]:=least(d[i][j],d[i-2][j-2]+1); END IF;
 END LOOP; END LOOP;
 RETURN d[n][m];
END $$;
CREATE FUNCTION atriumx_private.travel_normalise(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT btrim(regexp_replace(translate(lower(coalesce(p,'')),'áàâäãåéèêëíìîïóòôöõúùûüçñýÿ','aaaaaaeeeeiiiiooooouuuucnyy'),'[^a-z0-9]+',' ','g'))
$$;
CREATE FUNCTION atriumx_private.travel_place_matches(q text,places text[]) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE place text; token text; word text; words text[]; found boolean; all_found boolean; tolerance integer;
BEGIN
 q:=atriumx_private.travel_normalise(q); IF q='' THEN RETURN false; END IF;
 FOREACH place IN ARRAY places LOOP
  words:=string_to_array(atriumx_private.travel_normalise(place),' '); all_found:=true;
  FOREACH token IN ARRAY string_to_array(q,' ') LOOP
   found:=false; tolerance:=CASE WHEN char_length(token)>=8 THEN 2 WHEN char_length(token)>=4 THEN 1 ELSE 0 END;
   FOREACH word IN ARRAY words LOOP
    IF token=word OR (char_length(token)>=2 AND left(word,char_length(token))=token)
     OR (tolerance>0 AND abs(char_length(token)-char_length(word))<=tolerance AND atriumx_private.travel_distance(token,word)<=tolerance) THEN found:=true; EXIT; END IF;
   END LOOP;
   IF NOT found THEN all_found:=false; EXIT; END IF;
  END LOOP;
  IF all_found THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;

CREATE FUNCTION atriumx_private.queue_travel_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE today date:=(now() AT TIME ZONE 'Africa/Johannesburg')::date;
BEGIN
 IF (SELECT auth.uid()) IS NOT NULL AND NOT atriumx_private.workspace_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'updated_at'-'created_at')=(to_jsonb(OLD)-'updated_at'-'created_at') THEN RETURN NEW; END IF;
 IF NEW.is_outdated OR NEW.valid_until<today OR NEW.travel_date<today THEN
  UPDATE atriumx_private.travel_mail_jobs SET state='cancelled' WHERE kind='update' AND payload->>'id'=NEW.id::text AND state IN ('pending','processing');
  RETURN NEW;
 END IF;
 INSERT INTO atriumx_private.travel_mail_jobs(subscription_id,kind,dedupe_key,payload)
 SELECT s.id,'update','update:'||s.id::text||':'||NEW.id::text||':'||today::text,to_jsonb(NEW)
 FROM atriumx_private.travel_alert_subscriptions s WHERE s.status='active'
 AND (s.travel_date IS NULL OR s.travel_date>=today)
 AND (s.travel_date IS NULL OR NEW.travel_date IS NULL OR s.travel_date=NEW.travel_date)
 AND (s.travel_date IS NULL OR NEW.travel_date IS NOT NULL OR cardinality(NEW.operating_days)=0 OR extract(dow FROM s.travel_date)::integer=ANY(NEW.operating_days))
 AND atriumx_private.travel_place_matches(s.from_place,ARRAY[coalesce(NEW.origin,'')]||NEW.origin_aliases||NEW.boarding_points)
 AND atriumx_private.travel_place_matches(s.to_place,ARRAY[coalesce(NEW.destination,'')]||NEW.destination_aliases||NEW.dropoff_points)
 ON CONFLICT(dedupe_key) DO UPDATE SET payload=EXCLUDED.payload,state='pending',attempts=CASE WHEN travel_mail_jobs.state='pending' THEN travel_mail_jobs.attempts ELSE 0 END,next_attempt=now(),locked_at=NULL,lock_token=NULL
 WHERE travel_mail_jobs.state IN ('pending','cancelled','failed');
 RETURN NEW;
END $$;
CREATE TRIGGER bus_route_update_alerts AFTER INSERT OR UPDATE ON public.bus_listings FOR EACH ROW EXECUTE FUNCTION atriumx_private.queue_travel_update();

CREATE FUNCTION atriumx_private.request_travel_alert(p_visit_id uuid,p_token uuid,p_email text,p_from text,p_to text,p_date date,p_consent boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s atriumx_private.travel_alert_subscriptions%ROWTYPE; ready boolean; today date:=(now() AT TIME ZONE 'Africa/Johannesburg')::date;
BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_blocked) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF NOT coalesce(p_consent,false) THEN RAISE EXCEPTION 'Please agree to receive route updates'; END IF;
 p_email:=lower(btrim(p_email)); p_from:=btrim(p_from); p_to:=btrim(p_to);
 IF p_email IS NULL OR char_length(p_email)>254 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
 IF coalesce(char_length(p_from),0) NOT BETWEEN 1 AND 120 OR coalesce(char_length(p_to),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Enter departure and destination places'; END IF;
 IF p_date<today THEN RAISE EXCEPTION 'Choose today or a future travel date'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_visit_sessions WHERE id=p_visit_id AND token=p_token AND started_at>now()-interval '24 hours') THEN RAISE EXCEPTION 'Refresh the page and try again'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('travel-alert-request',0));
 SELECT * INTO s FROM atriumx_private.travel_alert_subscriptions WHERE email=p_email AND lower(from_place)=lower(p_from) AND lower(to_place)=lower(p_to) AND travel_date IS NOT DISTINCT FROM p_date FOR UPDATE;
 IF s.id IS NOT NULL AND (s.status='active' OR s.requested_at>now()-interval '24 hours') THEN
  RETURN jsonb_build_object('delivery_ready',(SELECT m.ready FROM atriumx_private.travel_mail_status m WHERE singleton));
 END IF;
 IF (SELECT count(*) FROM atriumx_private.travel_alert_subscriptions WHERE requested_visit=p_visit_id AND requested_at>now()-interval '1 hour')>=3
 OR (SELECT count(*) FROM atriumx_private.travel_mail_jobs WHERE kind='confirmation' AND created_at>now()-interval '24 hours')>=500 THEN RAISE EXCEPTION 'Too many requests. Please try again later'; END IF;
 IF s.id IS NULL THEN
  INSERT INTO atriumx_private.travel_alert_subscriptions(email,from_place,to_place,travel_date,requested_visit) VALUES(p_email,p_from,p_to,p_date,p_visit_id) RETURNING * INTO s;
 ELSE
  UPDATE atriumx_private.travel_alert_subscriptions SET status='pending',requested_at=now(),requested_visit=p_visit_id,confirmation_token=gen_random_uuid(),unsubscribe_token=gen_random_uuid(),confirmed_at=NULL,unsubscribed_at=NULL WHERE id=s.id RETURNING * INTO s;
  UPDATE atriumx_private.travel_mail_jobs SET state='cancelled' WHERE subscription_id=s.id AND state IN ('pending','processing','failed');
 END IF;
 INSERT INTO atriumx_private.travel_mail_jobs(subscription_id,kind,dedupe_key) VALUES(s.id,'confirmation','confirm:'||s.id::text||':'||s.confirmation_token::text);
 SELECT m.ready INTO ready FROM atriumx_private.travel_mail_status m WHERE singleton;
 RETURN jsonb_build_object('delivery_ready',coalesce(ready,false));
END $$;
CREATE FUNCTION public.request_travel_alert(p_visit_id uuid,p_token uuid,p_email text,p_from text,p_to text,p_date date DEFAULT NULL,p_consent boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT atriumx_private.request_travel_alert(p_visit_id,p_token,p_email,p_from,p_to,p_date,p_consent)$$;

CREATE FUNCTION atriumx_private.manage_travel_alert(p_action text,p_token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sub uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_blocked) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF p_action='confirm' THEN
  SELECT id INTO sub FROM atriumx_private.travel_alert_subscriptions WHERE confirmation_token=p_token AND status IN ('pending','active') AND requested_at>now()-interval '7 days' FOR UPDATE;
  IF sub IS NULL THEN RAISE EXCEPTION 'Confirmation link invalid or expired'; END IF;
  UPDATE atriumx_private.travel_alert_subscriptions SET status='active',confirmed_at=coalesce(confirmed_at,now()) WHERE id=sub;
 ELSIF p_action='unsubscribe' THEN
  SELECT id INTO sub FROM atriumx_private.travel_alert_subscriptions WHERE unsubscribe_token=p_token FOR UPDATE;
  IF sub IS NULL THEN RAISE EXCEPTION 'Unsubscribe link invalid'; END IF;
  UPDATE atriumx_private.travel_alert_subscriptions SET status='unsubscribed',unsubscribed_at=now() WHERE id=sub;
  UPDATE atriumx_private.travel_mail_jobs SET state='cancelled' WHERE subscription_id=sub AND state IN ('pending','processing','failed');
 ELSE RAISE EXCEPTION 'Unknown alert action'; END IF;
END $$;
CREATE FUNCTION public.manage_travel_alert(p_action text,p_token uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT atriumx_private.manage_travel_alert(p_action,p_token)$$;

CREATE FUNCTION atriumx_private.get_travel_engagement_report(p_days integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE since_at timestamptz:=now()-make_interval(days=>least(greatest(coalesce(p_days,30),1),3650)); result jsonb;
BEGIN
 IF NOT atriumx_private.workspace_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT jsonb_build_object('visits',count(*),'active_seconds',coalesce(sum(active_seconds),0)) INTO result FROM public.admin_visit_sessions v WHERE started_at>=since_at AND (entry_path='/travel' OR EXISTS(SELECT 1 FROM jsonb_array_elements(v.pages) p WHERE p->>'path'='/travel'));
 RETURN result||jsonb_build_object(
 'counts',(SELECT coalesce(jsonb_object_agg(kind,n),'{}') FROM (SELECT kind,count(*) n FROM atriumx_private.travel_events WHERE created_at>=since_at GROUP BY kind)r),
 'companies',(SELECT coalesce(jsonb_agg(row_to_json(r)),'[]') FROM (SELECT coalesce(b.company_name,'Removed listing') company,count(*) clicks FROM atriumx_private.travel_events e LEFT JOIN public.bus_listings b ON b.id=e.listing_id WHERE e.kind='company_click' AND e.created_at>=since_at GROUP BY b.company_name ORDER BY count(*) DESC LIMIT 20)r),
 'routes',(SELECT coalesce(jsonb_agg(row_to_json(r)),'[]') FROM (SELECT from_place "from",to_place "to",count(*) searches FROM atriumx_private.travel_events WHERE kind='route_search' AND created_at>=since_at GROUP BY from_place,to_place ORDER BY count(*) DESC LIMIT 10)r),
 'subscriptions',(SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='pending'),'active',count(*) FILTER(WHERE status='active'),'unsubscribed',count(*) FILTER(WHERE status='unsubscribed')) FROM atriumx_private.travel_alert_subscriptions),
 'requests',(SELECT coalesce(jsonb_agg(row_to_json(r)),'[]') FROM (SELECT id,email,from_place,to_place,travel_date,status,created_at FROM atriumx_private.travel_alert_subscriptions ORDER BY requested_at DESC LIMIT 50)r),
 'delivery',(SELECT jsonb_build_object('ready',m.ready,'last_run',m.last_run,'sent',(SELECT count(*) FROM atriumx_private.travel_mail_jobs WHERE state='sent'),'pending',(SELECT count(*) FROM atriumx_private.travel_mail_jobs WHERE state IN ('pending','processing')),'failed',(SELECT count(*) FROM atriumx_private.travel_mail_jobs WHERE state='failed')) FROM atriumx_private.travel_mail_status m WHERE singleton)
 );
END $$;
CREATE FUNCTION public.get_travel_engagement_report(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT atriumx_private.get_travel_engagement_report(p_days)$$;

-- Only the service role can claim/complete mail jobs. Public callers cannot see emails or tokens.
CREATE FUNCTION public.travel_alert_worker(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE allowance integer; result jsonb;
BEGIN
 IF p_action='health' THEN
  UPDATE atriumx_private.travel_mail_status SET ready=coalesce((p_data->>'ready')::boolean,false),last_run=now(),last_error=left(p_data->>'error',80) WHERE singleton;
  RETURN '{}'::jsonb;
 ELSIF p_action='claim' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('travel-mail-daily-cap',0));
  UPDATE atriumx_private.travel_mail_jobs j SET state='cancelled' WHERE j.kind='update' AND j.state IN ('pending','processing') AND NOT EXISTS(SELECT 1 FROM public.bus_listings b WHERE b.id=(j.payload->>'id')::uuid AND NOT b.is_outdated AND (b.valid_until IS NULL OR b.valid_until>=(now() AT TIME ZONE 'Africa/Johannesburg')::date) AND (b.travel_date IS NULL OR b.travel_date>=(now() AT TIME ZONE 'Africa/Johannesburg')::date));
  UPDATE atriumx_private.travel_mail_jobs j SET state='cancelled' FROM atriumx_private.travel_alert_subscriptions s WHERE s.id=j.subscription_id AND j.state IN ('pending','processing') AND (s.status='unsubscribed' OR (j.kind='confirmation' AND (s.status<>'pending' OR s.requested_at<now()-interval '7 days')) OR (j.kind='update' AND (s.status<>'active' OR s.travel_date<(now() AT TIME ZONE 'Africa/Johannesburg')::date)));
  -- A fixed safety budget of at most 50 accepted messages in any 24 hours.
  SELECT greatest(0,50-count(*))::integer INTO allowance FROM atriumx_private.travel_mail_jobs WHERE accepted_at>now()-interval '24 hours' OR (state='processing' AND locked_at>now()-interval '15 minutes');
  WITH candidates AS (SELECT id FROM atriumx_private.travel_mail_jobs WHERE (state='pending' OR (state='processing' AND locked_at<now()-interval '15 minutes')) AND next_attempt<=now() AND attempts<5 ORDER BY created_at LIMIT least(allowance,5) FOR UPDATE SKIP LOCKED),
  claimed AS (UPDATE atriumx_private.travel_mail_jobs j SET state='processing',locked_at=now(),lock_token=gen_random_uuid(),attempts=attempts+1 FROM candidates c WHERE c.id=j.id RETURNING j.*)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',j.id,'lock_token',j.lock_token,'kind',j.kind,'payload',j.payload,'email',s.email,'from_place',s.from_place,'to_place',s.to_place,'confirmation_token',s.confirmation_token,'unsubscribe_token',s.unsubscribe_token)),'[]') INTO result FROM claimed j JOIN atriumx_private.travel_alert_subscriptions s ON s.id=j.subscription_id;
  RETURN result;
 ELSIF p_action='check' THEN
  RETURN jsonb_build_object('allowed',EXISTS(SELECT 1 FROM atriumx_private.travel_mail_jobs j JOIN atriumx_private.travel_alert_subscriptions s ON s.id=j.subscription_id WHERE j.id=(p_data->>'id')::uuid AND j.lock_token=(p_data->>'lock_token')::uuid AND j.state='processing' AND ((j.kind='confirmation' AND s.status='pending') OR (j.kind='update' AND s.status='active' AND EXISTS(SELECT 1 FROM public.bus_listings b WHERE b.id=(j.payload->>'id')::uuid AND NOT b.is_outdated AND (b.valid_until IS NULL OR b.valid_until>=(now() AT TIME ZONE 'Africa/Johannesburg')::date) AND (b.travel_date IS NULL OR b.travel_date>=(now() AT TIME ZONE 'Africa/Johannesburg')::date))))));
 ELSIF p_action='complete' THEN
  UPDATE atriumx_private.travel_mail_jobs SET state=CASE WHEN p_data->>'outcome'='sent' THEN 'sent' WHEN p_data->>'outcome'='cancelled' THEN 'cancelled' WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,
  accepted_at=CASE WHEN p_data->>'outcome'='sent' THEN now() ELSE NULL END,provider_id=left(p_data->>'provider_id',160),last_error=left(p_data->>'error',80),locked_at=NULL,lock_token=NULL,next_attempt=now()+interval '15 minutes'
  WHERE id=(p_data->>'id')::uuid AND lock_token=(p_data->>'lock_token')::uuid AND state='processing';
  RETURN '{}'::jsonb;
 ELSE RAISE EXCEPTION 'Unknown worker action'; END IF;
END $$;

REVOKE ALL ON atriumx_private.travel_events,atriumx_private.travel_alert_subscriptions,atriumx_private.travel_mail_jobs,atriumx_private.travel_mail_status FROM PUBLIC,anon,authenticated;
GRANT ALL ON atriumx_private.travel_events,atriumx_private.travel_alert_subscriptions,atriumx_private.travel_mail_jobs,atriumx_private.travel_mail_status TO service_role;
GRANT USAGE ON SCHEMA atriumx_private TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION atriumx_private.record_travel_event(uuid,uuid,uuid,text,uuid,integer,text,text),public.record_travel_event(uuid,uuid,uuid,text,uuid,integer,text,text),atriumx_private.request_travel_alert(uuid,uuid,text,text,text,date,boolean),public.request_travel_alert(uuid,uuid,text,text,text,date,boolean),atriumx_private.manage_travel_alert(text,uuid),public.manage_travel_alert(text,uuid),atriumx_private.get_travel_engagement_report(integer),public.get_travel_engagement_report(integer),public.travel_alert_worker(text,jsonb),atriumx_private.travel_distance(text,text),atriumx_private.travel_normalise(text),atriumx_private.travel_place_matches(text,text[]),atriumx_private.queue_travel_update() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION atriumx_private.record_travel_event(uuid,uuid,uuid,text,uuid,integer,text,text),public.record_travel_event(uuid,uuid,uuid,text,uuid,integer,text,text),atriumx_private.request_travel_alert(uuid,uuid,text,text,text,date,boolean),public.request_travel_alert(uuid,uuid,text,text,text,date,boolean),atriumx_private.manage_travel_alert(text,uuid),public.manage_travel_alert(text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION atriumx_private.get_travel_engagement_report(integer),public.get_travel_engagement_report(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_alert_worker(text,jsonb) TO service_role;

CREATE FUNCTION atriumx_private.run_travel_mail() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE base text:=public.get_vault_secret('functions_base_url'); secret text:=public.get_vault_secret('cron_secret');
BEGIN
 IF base IS NULL OR secret IS NULL THEN RETURN; END IF;
 PERFORM net.http_post(url:=base||'/travel-alerts',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:='{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION atriumx_private.run_travel_mail() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('atrium-travel-alert-mail','*/15 * * * *','SELECT atriumx_private.run_travel_mail()');


-- A travel visit does not require a listing submission to be successful.
CREATE OR REPLACE FUNCTION public.finalize_admin_visits() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.admin_visit_sessions%ROWTYPE;
BEGIN
 FOR s IN SELECT * FROM admin_visit_sessions v WHERE NOT (v.entry_path='/travel' AND NOT v.form_opened) AND last_seen<now()-interval '3 minutes' AND started_at>now()-interval '1 day' AND alerted_at IS NOT NULL AND exit_alerted_at IS NULL AND NOT EXISTS(SELECT 1 FROM admin_visit_conversions c WHERE c.visit_id=v.id) FOR UPDATE SKIP LOCKED LOOP
  UPDATE admin_visit_sessions SET exit_alerted_at=now() WHERE id=s.id;
  PERFORM public.admin_visit_alert('No submission recorded: '||s.entry_path||' · inactive for 3 minutes · form active time about '||s.form_seconds||' seconds. They may return.');
 END LOOP;
END $$;
