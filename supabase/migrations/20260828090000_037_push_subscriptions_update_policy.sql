-- 037_push_subscriptions_update_policy.sql
-- push_subscriptions (migration 026) shipped with SELECT/INSERT/DELETE
-- policies but no UPDATE policy. Since `endpoint` is UNIQUE per device
-- (not per user), the client's upsert(..., {onConflict:'endpoint'}) call
-- in subscribeToPush() becomes an UPDATE whenever that device already has
-- a row - e.g. a second account logging in on the same browser/device
-- that a first account already enabled push on. With no UPDATE policy,
-- RLS silently blocks that reassignment, so the row keeps pointing at
-- whichever account first claimed that device - which is how a
-- recipient's push ends up delivered to the sender's own device.
--
-- USING (true) lets any authenticated user's upsert target an existing
-- row for their device's endpoint, regardless of who currently owns it.
-- WITH CHECK (auth.uid() = user_id) still guarantees the row can only
-- ever end up owned by the user performing the upsert - the same trust
-- boundary already relied on by the existing insert policy.
CREATE POLICY "push_subs_update_own" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = user_id);
