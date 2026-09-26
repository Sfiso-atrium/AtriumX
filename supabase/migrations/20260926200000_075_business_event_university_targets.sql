-- 075_business_event_university_targets.sql
-- Allow business events to reach one or more universities already authorised
-- on the business account. Students remain restricted to their own university.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS target_universities text[] NOT NULL DEFAULT '{}';

UPDATE events
SET target_universities = ARRAY[university]
WHERE COALESCE(array_length(target_universities, 1), 0) = 0
  AND university IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_target_universities_gin_idx
  ON events USING gin (target_universities);

CREATE OR REPLACE FUNCTION set_event_target_universities()
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
  FROM profiles p
  WHERE p.id = NEW.host_id;

  SELECT COALESCE(bp.universities, '{}')
  INTO allowed_universities
  FROM business_profiles bp
  WHERE bp.id = NEW.host_id;

  SELECT COALESCE(
    array_agg(DISTINCT trim(u) ORDER BY trim(u)),
    '{}'
  )
  INTO cleaned_targets
  FROM unnest(COALESCE(NEW.target_universities, '{}')) AS value(u)
  WHERE trim(u) <> '';

  IF host_account_type = 'business' THEN
    IF COALESCE(array_length(cleaned_targets, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Choose at least one university for this business event.';
    END IF;

    IF NOT (cleaned_targets <@ allowed_universities) THEN
      RAISE EXCEPTION 'Event universities must be within the business account university access.';
    END IF;
  ELSE
    IF host_university IS NULL OR COALESCE(array_length(cleaned_targets, 1), 0) <> 1
       OR cleaned_targets[1] <> host_university THEN
      RAISE EXCEPTION 'Events must target the host account university.';
    END IF;
  END IF;

  NEW.target_universities := cleaned_targets;
  NEW.university := cleaned_targets[1];
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_event_university_trigger ON events;
DROP TRIGGER IF EXISTS set_event_target_universities_trigger ON events;
CREATE TRIGGER set_event_target_universities_trigger
  BEFORE INSERT OR UPDATE OF host_id, target_universities ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_target_universities();

DROP POLICY IF EXISTS "events_select_same_university" ON events;
CREATE POLICY "events_select_same_university" ON events
  FOR SELECT TO authenticated
  USING (
    target_universities = '{}'
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          (
            p.account_type = 'business'
            AND EXISTS (
              SELECT 1
              FROM business_profiles bp
              WHERE bp.id = p.id
                AND target_universities && COALESCE(bp.universities, '{}')
            )
          )
          OR
          (
            p.account_type <> 'business'
            AND p.university = ANY(target_universities)
          )
        )
    )
  );

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);
