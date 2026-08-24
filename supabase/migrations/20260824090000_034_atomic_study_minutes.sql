-- Atomic increment for study_log, replacing the client-side
-- read-current-total-then-write-it-back pattern addStudyMinutes used
-- before. That pattern has a lost-update race: two concurrent calls
-- (e.g. two tabs open, or Focus Mode crediting a minute right as a
-- group Pomodoro session also credits one) can both read the same
-- starting total and each write back their own +N, silently dropping
-- whichever write lands second. Now that study minutes are credited
-- once per elapsed minute instead of once per full session, calls are
-- far more frequent, so the odds of hitting this went up.
--
-- INSERT ... ON CONFLICT DO UPDATE is a single statement, so Postgres
-- takes the row lock and does the read-modify-write itself — two
-- concurrent calls now serialize correctly instead of racing.
--
-- No p_user_id parameter on purpose: this is SECURITY DEFINER, which
-- bypasses the study_log RLS policies, so the function has to enforce
-- "only your own row" itself rather than trusting a caller-supplied id
-- the way a plain RLS-checked insert would. Using auth.uid() directly
-- makes it impossible to credit (or vandalize) another user's total
-- even if someone calls the RPC directly with an arbitrary payload.
CREATE OR REPLACE FUNCTION increment_study_minutes(p_log_date date, p_minutes integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_total integer;
BEGIN
  IF p_minutes <= 0 THEN
    RAISE EXCEPTION 'p_minutes must be positive';
  END IF;

  INSERT INTO study_log (user_id, log_date, minutes)
  VALUES (auth.uid(), p_log_date, p_minutes)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET minutes = study_log.minutes + excluded.minutes
  RETURNING minutes INTO new_total;

  RETURN new_total;
END;
$$;
