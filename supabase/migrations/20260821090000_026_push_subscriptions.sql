-- 026_push_subscriptions.sql
-- push_preferences (migration 011) only ever stored a true/false flag - it
-- was never actually connected to anything capable of sending a push. This
-- adds the real subscription object the Web Push API requires (an endpoint
-- URL plus two encryption keys) so a notification can actually be sent to
-- a specific device. One row per device, since a student might install
-- this on their phone and their laptop, each needing its own delivery target.
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_select_own" ON push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_subs_insert_own" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_subs_delete_own" ON push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
