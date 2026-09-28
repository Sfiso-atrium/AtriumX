-- Event permissions use account university access, independent of paid
-- business listing reach. Students use their profile university; business
-- and accommodation accounts use business_profiles.universities.

CREATE OR REPLACE FUNCTION public.set_event_target_universities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host_account_type text;
  host_university text;
  allowed_universities text[];
  cleaned_targets text[];
BEGIN
  SELECT p.account_type, p.university
  INTO host_account_type, host_university
  FROM public.profiles p
  WHERE p.id = NEW.host_id;

  SELECT COALESCE(array_agg(DISTINCT trim(u) ORDER BY trim(u)), '{}')
  INTO cleaned_targets
  FROM unnest(COALESCE(NEW.target_universities, '{}')) AS value(u)
  WHERE trim(u) <> '';

  IF host_account_type = 'business' THEN
    SELECT COALESCE(bp.universities, '{}') INTO allowed_universities
    FROM public.business_profiles bp WHERE bp.id = NEW.host_id;
    IF COALESCE(array_length(cleaned_targets, 1), 0) = 0
       OR NOT (cleaned_targets <@ COALESCE(allowed_universities, '{}')) THEN
      RAISE EXCEPTION 'Choose event universities from your business account access.';
    END IF;
  ELSIF host_account_type = 'student' THEN
    IF host_university IS NULL
       OR COALESCE(array_length(cleaned_targets, 1), 0) <> 1
       OR cleaned_targets[1] <> host_university THEN
      RAISE EXCEPTION 'Events must target the host account university.';
    END IF;
  ELSE
    RAISE EXCEPTION 'This account cannot post events.';
  END IF;

  NEW.target_universities := cleaned_targets;
  NEW.university := cleaned_targets[1];
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_event_scope(p_viewer_id uuid, p_targets text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_university text;
  v_allowed text[] := '{}';
BEGIN
  SELECT account_type, university INTO v_type, v_university
  FROM public.profiles WHERE id = p_viewer_id;

  IF v_type = 'student' THEN
    RETURN v_university IS NOT NULL AND v_university = ANY(COALESCE(p_targets, '{}'));
  ELSIF v_type = 'business' THEN
    SELECT COALESCE(bp.universities, '{}') INTO v_allowed
    FROM public.business_profiles bp WHERE bp.id = p_viewer_id;
    RETURN COALESCE(p_targets, '{}') && COALESCE(v_allowed, '{}');
  END IF;
  RETURN false;
END;
$$;

DROP TRIGGER IF EXISTS block_accommodation_event_flow_trigger ON public.events;

DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own" ON public.events
FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_update_own" ON public.events;
CREATE POLICY "events_update_own" ON public.events
FOR UPDATE TO authenticated USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_delete_own" ON public.events;
CREATE POLICY "events_delete_own" ON public.events
FOR DELETE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_select_same_university" ON public.events;
CREATE POLICY "events_select_same_university" ON public.events
FOR SELECT TO authenticated
USING (public.can_view_event_scope(
  auth.uid(),
  CASE
    WHEN COALESCE(array_length(target_universities, 1), 0) = 0 AND university IS NOT NULL
      THEN ARRAY[university]
    ELSE target_universities
  END
));
