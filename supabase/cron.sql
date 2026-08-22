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
