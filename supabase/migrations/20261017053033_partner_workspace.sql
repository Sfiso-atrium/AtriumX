-- Partner membership is open; paid agreements and student privileges are separate.
ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check CHECK(account_type IN ('student','business','partner'));
ALTER TABLE public.notifications ADD COLUMN partner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX notifications_partner_idx ON public.notifications(partner_id) WHERE partner_id IS NOT NULL;

CREATE TABLE public.partner_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid REFERENCES public.partners(user_id) ON DELETE SET NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 160),
 kind text NOT NULL CHECK(kind IN ('accommodation','tutor','business','student')),
 email text CHECK(email IS NULL OR (length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 phone text CHECK(phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$'),
 universities text[] NOT NULL DEFAULT '{}',
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(email IS NOT NULL OR phone IS NOT NULL),
 CHECK(cardinality(universities) BETWEEN 1 AND 26)
);
CREATE UNIQUE INDEX partner_contacts_email_unique ON public.partner_contacts(lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX partner_contacts_phone_unique ON public.partner_contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX partner_contacts_partner_idx ON public.partner_contacts(partner_id);
CREATE TABLE public.partner_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.partners(user_id) ON DELETE CASCADE,
 contact_id uuid REFERENCES public.partner_contacts(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),
 steps jsonb NOT NULL CHECK(jsonb_typeof(steps)='array' AND jsonb_array_length(steps) BETWEEN 1 AND 12),
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_tasks_partner_idx ON public.partner_tasks(partner_id,created_at DESC);
CREATE INDEX partner_tasks_contact_idx ON public.partner_tasks(contact_id);
CREATE TABLE public.partner_progress_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 task_id uuid REFERENCES public.partner_tasks(id) ON DELETE SET NULL,
 task_title text NOT NULL, step_label text NOT NULL, checked boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_progress_partner_idx ON public.partner_progress_events(partner_id,created_at DESC);
CREATE INDEX partner_progress_task_idx ON public.partner_progress_events(task_id);
-- Raw support records are deliberately not readable through PostgREST:
-- only the sanitized RPC below exposes messages, with every admin called Admin.
CREATE TABLE public.partner_support_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 partner_id uuid NOT NULL REFERENCES public.partners(user_id) ON DELETE CASCADE,
 sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 from_admin boolean NOT NULL,
 content text NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 4000),
 request_id uuid NOT NULL,
 sent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(sender_id,request_id)
);
CREATE INDEX partner_support_thread_idx ON public.partner_support_messages(partner_id,id DESC);
CREATE TABLE public.partner_support_reads (
 partner_id uuid NOT NULL REFERENCES public.partners(user_id) ON DELETE CASCADE,
 reader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 last_id bigint NOT NULL DEFAULT 0,
 PRIMARY KEY(partner_id,reader_id)
);
CREATE INDEX partner_support_reads_reader_idx ON public.partner_support_reads(reader_id);

CREATE OR REPLACE FUNCTION atriumx_private.workspace_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin AND NOT is_blocked)
$$;
CREATE OR REPLACE FUNCTION atriumx_private.workspace_member(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.partners r JOIN public.profiles p ON p.id=r.user_id WHERE p.id=p_id AND NOT p.is_blocked)
$$;
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_support_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_contacts,public.partner_tasks,public.partner_progress_events,public.partner_support_messages,public.partner_support_reads FROM anon,authenticated;
GRANT SELECT ON public.partner_contacts,public.partner_tasks,public.partner_progress_events TO authenticated;
CREATE POLICY contacts_read ON public.partner_contacts FOR SELECT TO authenticated USING ((SELECT atriumx_private.workspace_admin()) OR atriumx_private.workspace_member(partner_id));
CREATE POLICY tasks_read ON public.partner_tasks FOR SELECT TO authenticated USING ((SELECT atriumx_private.workspace_admin()) OR atriumx_private.workspace_member(partner_id));
CREATE POLICY progress_admin_read ON public.partner_progress_events FOR SELECT TO authenticated USING ((SELECT atriumx_private.workspace_admin()));

CREATE FUNCTION atriumx_private.join_partner() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT is_blocked) THEN RAISE EXCEPTION 'Sign in to join'; END IF;
 INSERT INTO public.partners(user_id,referral_code) VALUES(auth.uid(),'ax-'||replace(gen_random_uuid()::text,'-','')) ON CONFLICT(user_id) DO NOTHING;
END $$;
CREATE FUNCTION public.join_partner() RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.join_partner() $$;

-- Retain the established student/business signup fields and add a separate partner type.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_type text; v_name text;
BEGIN
 v_type:=CASE WHEN NEW.raw_user_meta_data->>'account_type' IN ('business','partner') THEN NEW.raw_user_meta_data->>'account_type' ELSE 'student' END;
 v_name:=coalesce(nullif(trim(NEW.raw_user_meta_data->>'full_name'),''),split_part(NEW.email,'@',1));
 INSERT INTO public.profiles(id,email,full_name,residence,university,avatar_initials,avatar_color,plan,account_type,watched_residences)
 VALUES(NEW.id,NEW.email,v_name,NEW.raw_user_meta_data->>'residence',
 CASE WHEN v_type='partner' THEN NULL ELSE coalesce(NEW.raw_user_meta_data->>'university','University of the Witwatersrand') END,
 coalesce(NEW.raw_user_meta_data->>'avatar_initials',upper(left(v_name,2))),coalesce(NEW.raw_user_meta_data->>'avatar_color','#1A5F7A'),
 CASE WHEN v_type='business' THEN 'noticeboard' ELSE 'ghost' END,v_type,ARRAY[coalesce(NEW.raw_user_meta_data->>'residence','')]) ON CONFLICT(id) DO NOTHING;
 IF v_type='partner' THEN
  INSERT INTO public.partners(user_id,referral_code) VALUES(NEW.id,'ax-'||replace(gen_random_uuid()::text,'-','')) ON CONFLICT(user_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION atriumx_private.partner_workspace_action(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.partner_contacts; t public.partner_tasks; v_id uuid; v_partner uuid; v_steps jsonb; v_step integer; v_checked boolean; v_label text; v_name text; v_universities text[];
BEGIN
 IF p_action='tick' THEN
  SELECT * INTO t FROM public.partner_tasks WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  IF t.id IS NULL OR NOT atriumx_private.workspace_member(t.partner_id) THEN RAISE EXCEPTION 'Assigned partner access required'; END IF;
  IF t.revision IS DISTINCT FROM (p_data->>'revision')::integer THEN RAISE EXCEPTION 'Task changed. Refresh and try again.'; END IF;
  v_step:=(p_data->>'step')::integer; v_checked:=(p_data->>'checked')::boolean;
  IF v_step IS NULL OR v_step<0 OR v_step>=jsonb_array_length(t.steps) OR v_checked IS NULL THEN RAISE EXCEPTION 'Invalid checklist item'; END IF;
  IF (t.steps->v_step->>'done')::boolean=v_checked THEN RETURN to_jsonb(t); END IF;
  v_label:=t.steps->v_step->>'label';
  UPDATE public.partner_tasks SET steps=jsonb_set(steps,ARRAY[v_step::text,'done'],to_jsonb(v_checked)),revision=revision+1 WHERE id=t.id RETURNING * INTO t;
  INSERT INTO public.partner_progress_events(partner_id,task_id,task_title,step_label,checked) VALUES(auth.uid(),t.id,t.title,v_label,v_checked);
  SELECT full_name INTO v_name FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.notifications(user_id,type,message,partner_id)
   SELECT id,'partner_progress',v_name||CASE WHEN v_checked THEN ' completed: ' ELSE ' reopened: ' END||v_label,auth.uid() FROM public.profiles WHERE is_admin AND NOT is_blocked;
  RETURN to_jsonb(t);
 END IF;
 IF NOT atriumx_private.workspace_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 v_partner:=nullif(p_data->>'partner_id','')::uuid;
 IF v_partner IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.partners r JOIN public.profiles p ON p.id=r.user_id WHERE p.id=v_partner AND NOT p.is_blocked) THEN RAISE EXCEPTION 'Choose an active partner'; END IF;
 IF p_action='contact' THEN
  SELECT coalesce(array_agg(DISTINCT trim(value)),'{}') INTO v_universities FROM jsonb_array_elements_text(p_data->'universities');
  IF EXISTS(SELECT 1 FROM unnest(v_universities) u WHERE length(u) NOT BETWEEN 2 AND 160) THEN RAISE EXCEPTION 'Invalid university'; END IF;
  v_id:=nullif(p_data->>'id','')::uuid;
  IF v_id IS NOT NULL THEN
   SELECT * INTO c FROM public.partner_contacts WHERE id=v_id FOR UPDATE;
   IF c.id IS NULL OR c.revision IS DISTINCT FROM (p_data->>'revision')::integer THEN RAISE EXCEPTION 'Contact changed. Refresh and try again.'; END IF;
   IF c.partner_id IS DISTINCT FROM v_partner THEN
    -- Historic progress remains with its author; active checklists start fresh.
    IF v_partner IS NULL THEN DELETE FROM public.partner_tasks WHERE contact_id=c.id;
    ELSE UPDATE public.partner_tasks SET partner_id=v_partner,steps=(SELECT jsonb_agg(jsonb_set(x,'{done}','false')) FROM jsonb_array_elements(steps) x),revision=revision+1 WHERE contact_id=c.id; END IF;
   END IF;
   UPDATE public.partner_contacts SET partner_id=v_partner,name=trim(p_data->>'name'),kind=p_data->>'kind',email=nullif(lower(trim(p_data->>'email')),''),phone=nullif(trim(p_data->>'phone'),''),universities=v_universities,revision=revision+1 WHERE id=c.id RETURNING * INTO c;
  ELSE
   INSERT INTO public.partner_contacts(partner_id,name,kind,email,phone,universities) VALUES(v_partner,trim(p_data->>'name'),p_data->>'kind',nullif(lower(trim(p_data->>'email')),''),nullif(trim(p_data->>'phone'),''),v_universities) RETURNING * INTO c;
  END IF;
  IF v_partner IS NOT NULL THEN INSERT INTO public.notifications(user_id,type,message,partner_id) VALUES(v_partner,'partner_task','Your assigned contacts have been updated.',v_partner); END IF;
  RETURN to_jsonb(c);
 ELSIF p_action='task' THEN
  IF v_partner IS NULL THEN RAISE EXCEPTION 'Choose a partner'; END IF;
  v_id:=nullif(p_data->>'contact_id','')::uuid;
  IF v_id IS NOT NULL THEN
   SELECT * INTO c FROM public.partner_contacts WHERE id=v_id FOR UPDATE;
   IF c.id IS NULL OR c.partner_id IS DISTINCT FROM v_partner THEN RAISE EXCEPTION 'Contact belongs to another partner'; END IF;
  END IF;
  SELECT jsonb_agg(jsonb_build_object('label',trim(value),'done',false)) INTO v_steps FROM jsonb_array_elements_text(p_data->'steps');
  IF v_steps IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_steps) x WHERE length(x->>'label') NOT BETWEEN 1 AND 240) THEN RAISE EXCEPTION 'Add checklist items (up to 240 characters each)'; END IF;
  INSERT INTO public.partner_tasks(partner_id,contact_id,title,steps) VALUES(v_partner,v_id,trim(p_data->>'title'),v_steps) RETURNING * INTO t;
  INSERT INTO public.notifications(user_id,type,message,partner_id) VALUES(v_partner,'partner_task','New task: '||t.title,v_partner);
  RETURN to_jsonb(t);
 END IF;
 RAISE EXCEPTION 'Unknown action';
END $$;
CREATE FUNCTION public.partner_workspace_action(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.partner_workspace_action(p_action,p_data) $$;

CREATE FUNCTION atriumx_private.partner_support(p_action text,p_partner uuid DEFAULT NULL,p_content text DEFAULT NULL,p_request uuid DEFAULT NULL,p_before bigint DEFAULT NULL,p_read_id bigint DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_admin boolean; v_me uuid:=auth.uid(); v_result jsonb; v_id bigint; v_name text;
BEGIN
 v_admin:=atriumx_private.workspace_admin();
 IF NOT v_admin AND NOT atriumx_private.workspace_member(v_me) THEN
  IF p_action='unread' THEN RETURN '0'; END IF;
  RAISE EXCEPTION 'Partner access required';
 END IF;
 IF p_action='inbox' OR p_action='unread' THEN
  SELECT coalesce(jsonb_agg(x ORDER BY x.last_at DESC NULLS LAST),'[]') INTO v_result FROM (
   SELECT r.user_id partner_id,CASE WHEN v_admin THEN p.full_name ELSE 'Admin' END name,
   (SELECT content FROM public.partner_support_messages m WHERE m.partner_id=r.user_id ORDER BY id DESC LIMIT 1) preview,
   (SELECT max(sent_at) FROM public.partner_support_messages m WHERE m.partner_id=r.user_id) last_at,
   (SELECT count(*) FROM public.partner_support_messages m WHERE m.partner_id=r.user_id AND m.from_admin<>v_admin AND m.id>coalesce((SELECT last_id FROM public.partner_support_reads WHERE partner_id=r.user_id AND reader_id=v_me),0)) unread
   FROM public.partners r JOIN public.profiles p ON p.id=r.user_id WHERE NOT p.is_blocked AND (v_admin OR r.user_id=v_me)
  ) x;
  IF p_action='unread' THEN RETURN (SELECT to_jsonb(coalesce(sum((x->>'unread')::integer),0)) FROM jsonb_array_elements(v_result) x); END IF;
  RETURN v_result;
 END IF;
 IF NOT v_admin THEN p_partner:=coalesce(p_partner,v_me); END IF;
 IF p_partner IS NULL OR (NOT v_admin AND p_partner<>v_me) OR NOT EXISTS(SELECT 1 FROM public.partners r JOIN public.profiles p ON p.id=r.user_id WHERE p.id=p_partner AND NOT p.is_blocked) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 IF p_action='send' THEN
  IF p_request IS NULL OR length(trim(p_content)) NOT BETWEEN 1 AND 4000 OR p_content IS NULL THEN RAISE EXCEPTION 'Enter a message (up to 4000 characters)'; END IF;
  -- Retries reuse a request ID and never duplicate messages/notifications.
  INSERT INTO public.partner_support_messages(partner_id,sender_id,from_admin,content,request_id) VALUES(p_partner,v_me,v_admin,trim(p_content),p_request) ON CONFLICT(sender_id,request_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
   IF v_admin THEN INSERT INTO public.notifications(user_id,type,message,partner_id) VALUES(p_partner,'partner_message','Admin sent you a message.',p_partner);
   ELSE
    SELECT full_name INTO v_name FROM public.profiles WHERE id=v_me;
    INSERT INTO public.notifications(user_id,type,message,partner_id) SELECT id,'partner_message',v_name||' sent a partner message.',p_partner FROM public.profiles WHERE is_admin AND NOT is_blocked;
   END IF;
  END IF;
  RETURN jsonb_build_object('sent',true);
 ELSIF p_action='read' THEN
  IF p_read_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.partner_support_messages WHERE partner_id=p_partner AND id=p_read_id) THEN RETURN 'null'; END IF;
  INSERT INTO public.partner_support_reads(partner_id,reader_id,last_id) VALUES(p_partner,v_me,p_read_id) ON CONFLICT(partner_id,reader_id) DO UPDATE SET last_id=greatest(public.partner_support_reads.last_id,excluded.last_id);
  RETURN 'null';
 ELSIF p_action='messages' THEN
  SELECT coalesce(jsonb_agg(x ORDER BY x.id),'[]') INTO v_result FROM (
   SELECT m.id,m.content,m.sent_at,m.from_admin,CASE WHEN m.from_admin THEN 'Admin' ELSE p.full_name END sender_name
   FROM public.partner_support_messages m JOIN public.profiles p ON p.id=m.partner_id
   WHERE m.partner_id=p_partner AND (p_before IS NULL OR m.id<p_before) ORDER BY m.id DESC LIMIT 50
  ) x;
  RETURN v_result;
 END IF;
 RAISE EXCEPTION 'Unknown action';
END $$;
CREATE FUNCTION public.partner_support(p_action text,p_partner uuid DEFAULT NULL,p_content text DEFAULT NULL,p_request uuid DEFAULT NULL,p_before bigint DEFAULT NULL,p_read_id bigint DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT atriumx_private.partner_support(p_action,p_partner,p_content,p_request,p_before,p_read_id) $$;
REVOKE ALL ON FUNCTION atriumx_private.workspace_admin(),atriumx_private.workspace_member(uuid),atriumx_private.join_partner(),public.join_partner(),atriumx_private.partner_workspace_action(text,jsonb),public.partner_workspace_action(text,jsonb),atriumx_private.partner_support(text,uuid,text,uuid,bigint,bigint),public.partner_support(text,uuid,text,uuid,bigint,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION atriumx_private.workspace_admin(),atriumx_private.workspace_member(uuid),atriumx_private.join_partner(),public.join_partner(),atriumx_private.partner_workspace_action(text,jsonb),public.partner_workspace_action(text,jsonb),atriumx_private.partner_support(text,uuid,text,uuid,bigint,bigint),public.partner_support(text,uuid,text,uuid,bigint,bigint) TO authenticated;
