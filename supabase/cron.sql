-- supabase/cron.sql
-- Run expire_listings() every hour to mark expired listings
-- Requires pg_cron extension to be enabled in the Supabase dashboard
-- Enable via: Dashboard > Database > Extensions > pg_cron

-- Example cron job (run in SQL editor after enabling pg_cron):
-- SELECT cron.schedule('expire-listings', '0 * * * *', $$SELECT expire_listings();$$);

-- Manual trigger (safe to run anytime):
-- SELECT expire_listings();
