-- Ordinary business events remain independent of paid listing plans.
-- Accommodation is a separate role and must not access events.
CREATE OR REPLACE FUNCTION public.can_view_event_scope(p_viewer_id uuid,p_targets text[])
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type text; v_university text; v_allowed text[];
BEGIN
  SELECT account_type,university INTO v_type,v_university FROM profiles WHERE id=p_viewer_id AND NOT is_blocked;
  IF v_type='student' THEN RETURN v_university IS NOT NULL AND v_university=ANY(COALESCE(p_targets,'{}'));
  ELSIF v_type='business' THEN
    SELECT universities INTO v_allowed FROM business_profiles WHERE id=p_viewer_id AND NOT is_accommodation;
    RETURN COALESCE(p_targets,'{}') && COALESCE(v_allowed,'{}');
  END IF;
  RETURN false;
END;
$$;
DROP TRIGGER IF EXISTS block_accommodation_event_flow_trigger ON public.events;
CREATE TRIGGER block_accommodation_event_flow_trigger BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.block_accommodation_event_flow();
