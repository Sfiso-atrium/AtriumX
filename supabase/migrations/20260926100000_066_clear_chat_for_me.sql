-- Per-user chat history cutoff. Clearing a chat hides only messages that
-- existed when the caller cleared it; the other participant keeps their copy.
CREATE TABLE IF NOT EXISTS conversation_user_state (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cleared_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_user_state_select_own" ON conversation_user_state;
CREATE POLICY "conversation_user_state_select_own"
  ON conversation_user_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION clear_chat_for_me(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = p_conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'You are not a participant in this conversation.';
  END IF;

  INSERT INTO conversation_user_state (conversation_id, user_id, cleared_at)
  VALUES (p_conversation_id, auth.uid(), clock_timestamp())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET cleared_at = EXCLUDED.cleared_at;
END;
$$;

REVOKE ALL ON FUNCTION clear_chat_for_me(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION clear_chat_for_me(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION clear_chat_for_me(uuid) TO authenticated;
