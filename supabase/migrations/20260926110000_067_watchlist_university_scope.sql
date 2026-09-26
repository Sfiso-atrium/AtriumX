-- Watchlist matches must respect the same university boundary used by the
-- marketplace. Existing listing/watchlist matching rules remain unchanged.
CREATE OR REPLACE FUNCTION notify_on_watchlist_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match RECORD;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  FOR v_match IN
    SELECT * FROM watchlists w
    WHERE w.user_id <> NEW.seller_id
      AND (w.category IS NULL OR w.category = NEW.category)
      AND (w.max_price IS NULL OR NEW.price <= w.max_price)
      AND (w.keyword IS NULL OR NEW.title ILIKE '%' || w.keyword || '%')
      AND EXISTS (
        SELECT 1
        FROM profiles watcher
        WHERE watcher.id = w.user_id
          AND (
            (COALESCE(array_length(NEW.universities, 1), 0) > 0
             AND watcher.university = ANY(NEW.universities))
            OR
            (COALESCE(array_length(NEW.universities, 1), 0) = 0
             AND watcher.university = (SELECT seller.university FROM profiles seller WHERE seller.id = NEW.seller_id))
          )
      )
  LOOP
    INSERT INTO notifications (user_id, type, message, listing_id)
    VALUES (
      v_match.user_id, 'watchlist_match',
      '"' || NEW.title || '" just matched your watchlist.',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;
