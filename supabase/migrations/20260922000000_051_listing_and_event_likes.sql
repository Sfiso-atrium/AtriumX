-- 051_listing_and_event_likes.sql
--
-- Adds a persisted like counter to listings and events, following the same
-- shape as the existing contact_count/report_count counters on listings
-- (plain integer column + SECURITY DEFINER increment RPC, no per-user
-- like-tracking table). The "have I liked this" state stays client-side
-- (localStorage) exactly as it already works for listings; this migration
-- only makes the count itself real and shared.

-- ── LISTINGS ───────────────────────────────────────────────────────────────

ALTER TABLE listings ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_listing_likes(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listings SET like_count = like_count + 1 WHERE id = listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_listing_likes(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listings SET like_count = GREATEST(like_count - 1, 0) WHERE id = listing_id;
END;
$$;

-- ── EVENTS ─────────────────────────────────────────────────────────────────

ALTER TABLE events ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_event_likes(event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE events SET like_count = like_count + 1 WHERE id = event_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_event_likes(event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE events SET like_count = GREATEST(like_count - 1, 0) WHERE id = event_id;
END;
$$;
