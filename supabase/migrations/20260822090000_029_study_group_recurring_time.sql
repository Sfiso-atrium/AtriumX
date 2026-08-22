-- study_groups: replace the one-off "study_time" timestamp with a
-- recurring weekly slot — a set of weekdays plus one shared hour/minute,
-- e.g. "every Mon/Wed/Fri at 18:30". This is collected at group-creation
-- time as a fallback only: it exists so notifications have *something* to
-- go on for groups that never build out a real Timetable. Whenever a
-- group has entries in study_group_timetable_courses, that data is the
-- absolute source of truth for when to notify — this recurring slot is
-- only used when a group has no Timetable entries at all.

ALTER TABLE study_groups
  ADD COLUMN IF NOT EXISTS study_weekdays smallint[]
    CHECK (study_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]),
  ADD COLUMN IF NOT EXISTS study_hour smallint
    CHECK (study_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS study_minute smallint
    CHECK (study_minute BETWEEN 0 AND 59);

-- Backfill from the existing one-off study_time so no group loses its
-- current reminder info. Interpreted in Africa/Johannesburg (the app's
-- home timezone, no DST, so this is a stable conversion).
UPDATE study_groups
SET
  study_weekdays = ARRAY[extract(dow from (study_time at time zone 'Africa/Johannesburg'))::smallint],
  study_hour = extract(hour from (study_time at time zone 'Africa/Johannesburg'))::smallint,
  study_minute = extract(minute from (study_time at time zone 'Africa/Johannesburg'))::smallint
WHERE study_time IS NOT NULL AND study_weekdays IS NULL;

ALTER TABLE study_groups DROP COLUMN IF EXISTS study_time;
