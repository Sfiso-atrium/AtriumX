-- Visit telemetry contains no form values, passwords, contact details, full URLs or IPs.
CREATE TABLE public.admin_visit_sessions (
 id uuid PRIMARY KEY, token uuid NOT NULL, user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 started_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(),
 entry_path text NOT NULL, last_path text NOT NULL, source text NOT NULL DEFAULT '', campaign text NOT NULL DEFAULT '',
 device text NOT NULL DEFAULT 'unknown', pages jsonb NOT NULL DEFAULT '[]',
 active_seconds integer NOT NULL DEFAULT 0, form_seconds integer NOT NULL DEFAULT 0,
 form_opened boolean NOT NULL DEFAULT false, form_started boolean NOT NULL DEFAULT false,
 last_sequence integer NOT NULL DEFAULT 0, left_at timestamptz, alerted_at timestamptz, exit_alerted_at timestamptz,
 CHECK(active_seconds BETWEEN 0 AND 86400), CHECK(form_seconds BETWEEN 0 AND active_seconds)
);
CREATE INDEX admin_visit_sessions_seen ON public.admin_visit_sessions(last_seen);
CREATE INDEX admin_visit_sessions_started ON public.admin_visit_sessions(started_at);
CREATE TABLE public.admin_visit_conversions (
 kind text NOT NULL CHECK(kind IN ('listing','accommodation','submission')),
 listing_id uuid NOT NULL, visit_id uuid NOT NULL REFERENCES public.admin_visit_sessions(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind,listing_id)
);
CREATE INDEX admin_visit_conversions_visit ON public.admin_visit_conversions(visit_id);
CREATE TABLE public.admin_visit_settings (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_visit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_visit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_visit_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_visit_sessions,public.admin_visit_conversions,public.admin_visit_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_visit_sessions,public.admin_visit_conversions TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.admin_visit_settings TO authenticated;
CREATE POLICY admin_visit_read ON public.admin_visit_sessions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked));
CREATE POLICY admin_conversion_read ON public.admin_visit_conversions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked));
CREATE POLICY admin_monitor_settings ON public.admin_visit_settings FOR ALL TO authenticated USING(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked)) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked));

-- Private implementation functions are not browser-callable.
CREATE FUNCTION public.admin_visit_alert(p_body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recipients jsonb; secret text; base text;
BEGIN
 SELECT jsonb_agg(p.id) INTO recipients FROM profiles p JOIN admin_visit_settings s ON s.user_id=p.id
 WHERE p.is_admin AND NOT p.is_blocked AND s.enabled;
 IF recipients IS NULL THEN RETURN; END IF;
 -- Bound notification amplification; counts still include the other sessions.
 PERFORM pg_advisory_xact_lock(hashtextextended('admin-visit-alert',0));
 IF (SELECT count(*) FROM notifications WHERE type='admin_visit' AND created_at>now()-interval '1 minute')>=30 THEN RETURN; END IF;
 INSERT INTO notifications(user_id,type,message) SELECT value::text::uuid,'admin_visit',left(p_body,500) FROM jsonb_array_elements_text(recipients);
 secret:=public.get_vault_secret('cron_secret'); base:=public.get_vault_secret('functions_base_url');
 IF secret IS NOT NULL AND base IS NOT NULL THEN
 PERFORM net.http_post(url:=base||'/send-message-push',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:=jsonb_build_object('recipient_ids',recipients,'title','AtriumX admin monitor','body',left(p_body,500),'url','/#/admin?tab=monitor'));
 END IF;
EXCEPTION WHEN OTHERS THEN
 -- Analytics must never interrupt a listing or page visit. Dashboard data survives.
 RAISE WARNING 'Admin visit alert could not be queued';
END $$;
REVOKE ALL ON FUNCTION public.admin_visit_alert(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.record_admin_visit(p_id uuid,p_token uuid,p_path text,p_source text DEFAULT '',p_campaign text DEFAULT '',p_device text DEFAULT 'unknown',p_active integer DEFAULT 0,p_form integer DEFAULT 0,p_started boolean DEFAULT false,p_left boolean DEFAULT false,p_sequence integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.admin_visit_sessions%ROWTYPE; elapsed integer; is_form boolean;
BEGIN
 IF p_id IS NULL OR p_token IS NULL THEN RAISE EXCEPTION 'Missing visit reference'; END IF;
 IF EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND (is_admin OR is_blocked)) THEN RETURN; END IF;
 -- Only public browsing and listing forms; never record chat, profile or payment URLs.
 IF p_path NOT IN ('/','/retailer','/accommodations','/accommodations/review','/accommodation/post','/business/post','/post','/feed','/events')
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
REVOKE ALL ON FUNCTION public.record_admin_visit(uuid,uuid,text,text,text,text,integer,integer,boolean,boolean,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_admin_visit(uuid,uuid,text,text,text,text,integer,integer,boolean,boolean,integer) TO anon,authenticated;

CREATE FUNCTION public.record_admin_visit_conversion(p_id uuid,p_token uuid,p_kind text,p_listing_id uuid,p_receipt text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.admin_visit_sessions%ROWTYPE; valid boolean:=false; added integer;
BEGIN
 IF EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND (is_admin OR is_blocked)) THEN RETURN; END IF;
 SELECT * INTO s FROM admin_visit_sessions WHERE id=p_id AND token=p_token FOR UPDATE;
 IF NOT FOUND OR s.started_at<now()-interval '24 hours' THEN RAISE EXCEPTION 'Invalid visit reference'; END IF;
 IF p_kind='listing' THEN SELECT EXISTS(SELECT 1 FROM listings WHERE id=p_listing_id AND seller_id=auth.uid() AND created_at>=s.started_at-interval '1 minute') INTO valid;
 ELSIF p_kind='accommodation' THEN SELECT EXISTS(SELECT 1 FROM accommodation_listings WHERE id=p_listing_id AND seller_id=auth.uid() AND created_at>=s.started_at-interval '1 minute') INTO valid;
 ELSIF p_kind='submission' AND p_receipt ~ '^[a-f0-9]{64}$' THEN
 SELECT EXISTS(SELECT 1 FROM accommodation_submissions WHERE id=p_listing_id AND status IN ('pending','approved','claimed') AND receipt_hash=encode(extensions.digest(p_receipt,'sha256'),'hex') AND created_at>=s.started_at-interval '1 minute') INTO valid;
 END IF;
 IF NOT valid THEN RAISE EXCEPTION 'Submission could not be verified'; END IF;
 INSERT INTO admin_visit_conversions(kind,listing_id,visit_id) VALUES(p_kind,p_listing_id,p_id) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS added=ROW_COUNT;
 IF added>0 THEN
  UPDATE admin_visit_sessions SET user_id=coalesce(user_id,auth.uid()),last_seen=now(),left_at=NULL WHERE id=p_id;
  PERFORM public.admin_visit_alert('Listing submitted: '||p_kind||' · form active time about '||s.form_seconds||' seconds · '||s.entry_path);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_admin_visit_conversion(uuid,uuid,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_admin_visit_conversion(uuid,uuid,text,uuid,text) TO anon,authenticated;

CREATE FUNCTION public.finalize_admin_visits() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.admin_visit_sessions%ROWTYPE;
BEGIN
 FOR s IN SELECT * FROM admin_visit_sessions v WHERE last_seen<now()-interval '3 minutes' AND started_at>now()-interval '1 day' AND alerted_at IS NOT NULL AND exit_alerted_at IS NULL AND NOT EXISTS(SELECT 1 FROM admin_visit_conversions c WHERE c.visit_id=v.id) FOR UPDATE SKIP LOCKED LOOP
  UPDATE admin_visit_sessions SET exit_alerted_at=now() WHERE id=s.id;
  PERFORM public.admin_visit_alert('No submission recorded: '||s.entry_path||' · inactive for 3 minutes · form active time about '||s.form_seconds||' seconds. They may return.');
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.finalize_admin_visits() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('atrium-admin-visit-finalize','* * * * *','SELECT public.finalize_admin_visits()');

CREATE FUNCTION public.get_admin_visit_report(p_days integer DEFAULT 30,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; since_at timestamptz:=now()-make_interval(days=>least(greatest(coalesce(p_days,30),1),3650));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked) THEN RAISE EXCEPTION 'Admin only'; END IF;
 SELECT jsonb_build_object('visits',count(*),'forms_opened',count(*) FILTER(WHERE form_opened),'forms_started',count(*) FILTER(WHERE form_started),
 'submitted_visits',count(*) FILTER(WHERE EXISTS(SELECT 1 FROM admin_visit_conversions c WHERE c.visit_id=v.id)),
 'inactive_without_submission',count(*) FILTER(WHERE last_seen<now()-interval '3 minutes' AND NOT EXISTS(SELECT 1 FROM admin_visit_conversions c WHERE c.visit_id=v.id)),
 'active',count(*) FILTER(WHERE last_seen>=now()-interval '3 minutes'),
 'average_form_seconds',coalesce(round(avg(form_seconds) FILTER(WHERE form_opened)),0)) INTO result FROM admin_visit_sessions v WHERE started_at>=since_at;
 result:=result||jsonb_build_object('listings',(SELECT count(*) FROM admin_visit_conversions WHERE created_at>=since_at));
 RETURN result||jsonb_build_object('rows',coalesce((SELECT jsonb_agg(row_to_json(r)) FROM (
 SELECT v.id,v.started_at,v.last_seen,v.entry_path,v.last_path,v.source,v.campaign,v.device,v.pages,v.active_seconds,v.form_seconds,v.form_opened,v.form_started,
 CASE WHEN EXISTS(SELECT 1 FROM admin_visit_conversions c WHERE c.visit_id=v.id) THEN 'Submitted' WHEN v.last_seen<now()-interval '3 minutes' THEN 'Inactive — no submission recorded' WHEN v.left_at IS NOT NULL THEN 'Page hidden/left — waiting' ELSE 'Active / recently seen' END AS outcome,
 coalesce(p.full_name,'Anonymous visitor') AS visitor,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.kind,'id',c.listing_id,'at',c.created_at)),'[]') FROM admin_visit_conversions c WHERE c.visit_id=v.id) AS submissions
 FROM admin_visit_sessions v LEFT JOIN profiles p ON p.id=v.user_id WHERE v.started_at>=since_at ORDER BY v.started_at DESC LIMIT 50 OFFSET least(greatest(coalesce(p_offset,0),0),100000)
 )r),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_admin_visit_report(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_visit_report(integer,integer) TO authenticated;

CREATE FUNCTION public.test_admin_visit_push() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE secret text; base text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND is_admin AND NOT is_blocked) THEN RAISE EXCEPTION 'Admin only'; END IF;
 secret:=public.get_vault_secret('cron_secret');base:=public.get_vault_secret('functions_base_url');
 IF secret IS NULL OR base IS NULL THEN RAISE EXCEPTION 'Push sender is not configured'; END IF;
 PERFORM net.http_post(url:=base||'/send-message-push',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:=jsonb_build_object('recipient_ids',jsonb_build_array(auth.uid()),'title','AtriumX admin monitor','body','Test alert: visit monitoring is connected to this admin account.','url','/#/admin?tab=monitor'));
END $$;
REVOKE ALL ON FUNCTION public.test_admin_visit_push() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.test_admin_visit_push() TO authenticated;
