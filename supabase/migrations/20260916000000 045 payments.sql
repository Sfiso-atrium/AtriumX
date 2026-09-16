-- 045_payments.sql
--
-- PayFast payment records. Until now plans were granted for free at
-- listing-creation time (see createListing in dataService.ts) -- anyone
-- could pick Unmissable and get it. This table is the ledger that makes
-- a paid plan actually depend on a payment having cleared.
--
-- Writes here are service-role only, on purpose. The browser never
-- inserts or updates a payment row: payfast-create-payment writes the
-- pending row, and payfast-itn is the ONLY thing that ever marks one
-- complete. If the client could touch these rows it could grant itself
-- a plan for free, which is the whole thing we're fixing.

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Our own reference, sent to PayFast as m_payment_id and echoed back
  -- on the ITN. This is how we match a callback to the row that started it.
  m_payment_id text NOT NULL UNIQUE,

  -- PayFast's own id for the transaction, only known once they call back.
  pf_payment_id text,

  plan_key text NOT NULL,
  plan_days integer NOT NULL,

  -- The amount we asked for, in rands. The ITN handler compares PayFast's
  -- reported amount_gross against this and refuses to activate on a
  -- mismatch -- that check is what stops a tampered payment form.
  amount numeric(10,2) NOT NULL,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'complete', 'failed', 'cancelled')),

  -- Raw ITN payload, kept for dispute/debugging. PayFast retries a failed
  -- ITN for up to 48h, so having the exact payload that was acted on
  -- matters when reconciling.
  itn_payload jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_m_payment_id_idx ON payments(m_payment_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Read-only for the person who made the payment. No INSERT/UPDATE/DELETE
-- policy exists for authenticated users at all, which means the client
-- genuinely cannot write here -- service role bypasses RLS and is the
-- only path in.
DROP POLICY IF EXISTS "Users read own payments" ON payments;
CREATE POLICY "Users read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);
