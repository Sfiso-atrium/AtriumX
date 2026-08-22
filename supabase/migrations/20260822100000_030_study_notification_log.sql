-- Dedupe log for study-time push notifications. The Edge Function that
-- sends these runs on a 5-minute cron tick, so it needs a way to know
-- "have I already sent the 1hr reminder for this session this week?" —
-- the UNIQUE constraint below is what actually enforces that, via
-- INSERT ... ON CONFLICT DO NOTHING in the function.
--
-- Service-role only, by design: RLS is enabled with zero policies for
-- authenticated/anon, so no client can ever read or write this table.
-- Only the Edge Function (using the service role key, which bypasses RLS
-- entirely) touches it.

CREATE TABLE study_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('schedule', 'group_fallback')),
  target_id uuid NOT NULL, -- study_group_schedule_entries.id OR study_groups.id
  offset_minutes smallint NOT NULL CHECK (offset_minutes IN (120, 60, 30)),
  notify_date date NOT NULL, -- the SAST calendar date this occurrence falls on
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, offset_minutes, notify_date)
);

ALTER TABLE study_notification_log ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies — see comment above.
