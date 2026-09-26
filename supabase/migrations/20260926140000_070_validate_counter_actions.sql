-- 070_validate_counter_actions.sql
-- Harden shared counters without changing the existing UI flows.
-- Contact/report counts are derived from the records that already represent
-- those actions. Listing/event likes gain server-side per-user rows so a
-- browser cannot repeatedly inflate or decrement a shared counter directly.

-- ── CONTACT COUNT ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_contact_count(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.listing_id = increment_contact_count.listing_id
      AND (conversations.buyer_id = actor OR conversations.seller_id = actor)
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this listing contact count';
  END IF;

  UPDATE listings
  SET contact_count = (
    SELECT count(*)::integer
    FROM conversations
    WHERE conversations.listing_id = increment_contact_count.listing_id
  )
  WHERE listings.id = increment_contact_count.listing_id;
END;
$$;

-- ── REPORT COUNT ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_report_count(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM reports
    WHERE reports.listing_id = increment_report_count.listing_id
      AND reports.reporter_id = actor
  ) THEN
    RAISE EXCEPTION 'No report exists for this listing from the current user';
  END IF;

  UPDATE listings
  SET report_count = (
    SELECT count(*)::integer
    FROM reports
    WHERE reports.listing_id = increment_report_count.listing_id
  )
  WHERE listings.id = increment_report_count.listing_id;
END;
$$;

-- ── LISTING LIKES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_likes (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id)
);

ALTER TABLE listing_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_likes_select_own" ON listing_likes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_listing_likes(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  inserted_count integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO listing_likes(listing_id, user_id)
  VALUES (increment_listing_likes.listing_id, actor)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    UPDATE listings
    SET like_count = like_count + 1
    WHERE id = increment_listing_likes.listing_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_listing_likes(listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  deleted_count integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM listing_likes
  WHERE listing_likes.listing_id = decrement_listing_likes.listing_id
    AND listing_likes.user_id = actor;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 1 THEN
    UPDATE listings
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = decrement_listing_likes.listing_id;
  END IF;
END;
$$;

-- ── EVENT LIKES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_likes (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_likes_select_own" ON event_likes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_event_likes(event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  inserted_count integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO event_likes(event_id, user_id)
  VALUES (increment_event_likes.event_id, actor)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    UPDATE events
    SET like_count = like_count + 1
    WHERE id = increment_event_likes.event_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_event_likes(event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  deleted_count integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM event_likes
  WHERE event_likes.event_id = decrement_event_likes.event_id
    AND event_likes.user_id = actor;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 1 THEN
    UPDATE events
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = decrement_event_likes.event_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_contact_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_report_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_likes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_listing_likes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_event_likes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_event_likes(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.increment_contact_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_report_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_listing_likes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_listing_likes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_event_likes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_event_likes(uuid) TO authenticated, service_role;
