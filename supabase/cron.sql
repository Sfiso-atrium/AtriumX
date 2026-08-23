-- supabase/cron.sql
-- Run expire_listings() every hour to mark expired listings
-- Requires pg_cron extension to be enabled in the Supabase dashboard
-- Enable via: Dashboard > Database > Extensions > pg_cron

-- Example cron job (run in SQL editor after enabling pg_cron):
-- SELECT cron.schedule('expire-listings', '0 * * * *', $$SELECT expire_listings();$$);

-- Manual trigger (safe to run anytime):
-- SELECT expire_listings();

-- Run send_deadline_reminders() every hour to notify users of deadlines due
-- within 24 hours (see migration 023_personal_space.sql).

-- Example cron job (run in SQL editor after enabling pg_cron):
-- SELECT cron.schedule('deadline-reminders', '0 * * * *', $$SELECT send_deadline_reminders();$$);

-- Manual trigger (safe to run anytime):
-- SELECT send_deadline_reminders();
-- Send study-time push reminders (2hr/1hr/30min before each session).
-- Requires: pg_cron AND pg_net extensions enabled (Dashboard > Database >
-- Extensions), and a CRON_SECRET set as an Edge Function secret. Fill in
-- both placeholders below when you run this manually in the SQL editor —
-- don't commit the actual secret value into this file.

-- SELECT cron.schedule(
--   'study-reminders',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<your-project-ref>.supabase.co/functions/v1/send-study-reminders',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET value>'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Send group-deadline push reminders (2 days / 1 day / 10hr / 1hr before
-- due_at, per member — see migration 031_group_deadline_reminders.sql and
-- supabase/functions/send-group-deadline-reminders). Same requirements as
-- study-reminders above: pg_cron + pg_net enabled, CRON_SECRET set as an
-- Edge Function secret, plus VAPID_PRIVATE_KEY and VAPID_SUBJECT.

-- SELECT cron.schedule(
--   'group-deadline-reminders',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<your-project-ref>.supabase.co/functions/v1/send-group-deadline-reminders',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET value>'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

APPEND:

-- Run expire_old_study_logs() once a day to delete study_log rows older
-- than yesterday — only today's and yesterday's minutes are ever shown to
-- a user, so anything older is permanently irrelevant (see migration 032).

-- Example cron job (run in SQL editor after enabling pg_cron):
-- SELECT cron.schedule('expire-old-study-logs', '0 3 * * *', $$SELECT expire_old_study_logs();$$);

-- Manual trigger (safe to run anytime):
-- SELECT expire_old_study_logs();
