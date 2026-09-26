-- Migration 076 added two things at once: (1) locking down which profile
-- fields a user can edit themselves, and (2) blocking accommodation
-- providers from ever using the normal business listing/event flow. (1)
-- was correct and is left untouched. (2) was a real product-policy call
-- nobody had actually asked for -- product decision: accommodation
-- providers should still be able to post an ordinary listing or event
-- like any other business account, alongside their accommodation
-- listings. This migration reverts only that part.

-- ---------------------------------------------------------------------------
-- NORMAL BUSINESS LISTINGS -- restore to the plain pre-076 policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "listings_insert_own" ON listings;
CREATE POLICY "listings_insert_own" ON listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own" ON listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "listings_delete_own" ON listings;
CREATE POLICY "listings_delete_own" ON listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

DROP TRIGGER IF EXISTS block_accommodation_normal_listing_flow_trigger ON listings;
DROP FUNCTION IF EXISTS block_accommodation_normal_listing_flow();

-- ---------------------------------------------------------------------------
-- EVENTS -- restore to the plain pre-076 policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = host_id);

DROP TRIGGER IF EXISTS block_accommodation_event_flow_trigger ON events;
DROP FUNCTION IF EXISTS block_accommodation_event_flow();

-- Note: migration 076's profile-field lock-down (guard_profile_security_columns
-- trigger, and the tightened profiles_select_own/profiles_select_public
-- policies) is intentionally left in place -- only the accommodation
-- listing/event block is being reverted here.
