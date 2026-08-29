-- Sessions-completed counter for study_log, alongside the existing
-- minutes column. Focus Mode's "Sessions Today" stat needs a real,
-- persisted, ever-increasing count (not a hardcoded "3/4") — this adds
-- the column plus an atomic increment RPC using the same
-- INSERT ... ON CONFLICT DO UPDATE pattern as increment_study_minutes,
-- for the same lost-update-race reasons documented there.

ALTER TABLE study_log ADD COLUMN sessions integer NOT NULL DEFAULT 0 CHECK (sessions >= 0);

CREATE OR REPLACE FUNCTION increment_study_sessions(p_log_date date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_total integer;
BEGIN
  INSERT INTO study_log (user_id, log_date, sessions)
  VALUES (auth.uid(), p_log_date, 1)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET sessions = study_log.sessions + 1
  RETURNING sessions INTO new_total;

  RETURN new_total;
END;
$$;
