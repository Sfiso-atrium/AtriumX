-- Only today's and yesterday's study_log rows are ever read by the app
-- (getTodayStudyMinutes / getYesterdayStudyMinutes) — anything older is
-- permanently irrelevant. This mirrors expire_listings() (migration 010):
-- a plain function, safe to call manually, meant to be run on a schedule
-- via pg_cron (see supabase/cron.sql).

CREATE OR REPLACE FUNCTION expire_old_study_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM study_log
  WHERE log_date < (current_date - interval '1 day');
END;
$$;
