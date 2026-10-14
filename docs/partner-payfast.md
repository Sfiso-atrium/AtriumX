# Partner PayFast Split Payments

## What is implemented

- Partner portal: saves a PayFast Merchant ID, account name and live/sandbox environment for review. No bank details, Merchant Keys, passwords or passphrases are collected.
- Admin > Partners: platform activation, account review, explicit commission agreements and PayFast receipt/reversal reconciliation.
- Only an authorised, unblocked admin can approve an account or configure terms. Account edits invalidate approval. A stale admin form cannot approve a subsequently changed account.
- Checkout snapshots the attributed partner, recipient, cash amount, agreed rate and commission in cents. Existing upgrade credit is not commissioned again. Signed-out/client-provided recipient IDs and rates are ignored.
- Split instructions go from the Edge Function directly to PayFast `/onsite/process`. The browser gets an opaque UUID and opens PayFast's official onsite engine. This is necessary because PayFast excludes `setup` from the signature.
- Equal `min` and `max` constrain the split to the snapshotted amount. Verify the exact credit in both test merchant accounts before enabling live routing; PayFast's documentation has inconsistent wording in its calculation examples.
- An eligible referral with incomplete setup is blocked before payment. There is no fallback to an unsplit charge. Other payments retain the existing hosted flow.
- Customer ITNs verify signature, primary Merchant ID, transaction ID, amount and server confirmation. They create commission once. They do not claim a bank withdrawal or prove receipt in the secondary account.
- Admin records a confirmed secondary-account receipt using PayFast evidence; this updates the ledger. Reversal records require PayFast evidence too. These are accounting actions, not transfers or refunds.
- Withdraw through PayFast opens the partner's PayFast dashboard. PayFast manages available funds, fees, bank verification and scheduled withdrawals.

## Activation checklist

1. AtriumX signs in to https://my.payfast.io and enables Split Payments in Settings > Payment methods. Confirm no global split is configured that would route unrelated transactions. Configure the permitted secondary merchant accounts as required by PayFast.
2. Each partner completes PayFast's verification and bank setup, then submits their Merchant ID and account name from AtriumX > Partner portal > Connect your PayFast account.
3. Verify ownership and PayFast split eligibility using evidence from the account holder/PayFast. Enter that evidence reference in Admin > Partners. Saving an ID alone is not account verification.
4. Agree a commission rate and fixed agreement start/end dates with the partner. Enter the real terms and agreement reference. No default percentage or duration is activated by this change. The window applies to the partner, not a rolling window per referred customer.
5. Test with owned sandbox primary and secondary accounts and matching sandbox credentials in a separate test deployment. Do not change the live project's PAYFAST_SANDBOX setting for a test. Enable sandbox configuration for test routing, then complete a payment, verify both PayFast balances, the notification and receipt reconciliation. Confirm cancellation, rejected setup, duplicate notification and refund/reversal handling.
6. In Admin > Partners configure the live primary Merchant ID exactly as in the live checkout configuration. After account setup and controlled split verification, enable live routing. No actual live payment is made by this implementation task.

## Deployment and limitations

Apply `20261014101455_partner_payfast_splits.sql`, then deploy `payfast-create-payment` with JWT verification on and `payfast-itn` with JWT verification off (its custom PayFast verification is mandatory). Publish the frontend before enabling any live split configuration.

The migration activates no payment routing and creates no commission agreements. PayFast account-side switches cannot be enabled by a database migration. Test fixtures use invented account IDs and agreements only in an in-memory PostgreSQL database.

Existing reservations keep their original routing; changing an account or agreement affects newly reserved payments. A reserved gateway request that failed ambiguously is not recreated; wait for the 15-minute quote to expire. Previous ledger entries are not transferred retroactively.

PayFast bank payout status and secondary-account receipt are not exposed by the standard primary ITN used here. Receipt/reversal reconciliation remains an explicit admin step based on PayFast evidence; actual splitting and bank withdrawals stay with PayFast. Sandbox history is labelled and must not be presented as real earnings. Use a separate deployment/database for sandbox end-to-end payment testing.

## Sources

- https://developers.payfast.co.za/docs#splitpayments
- https://developers.payfast.co.za/docs#onsite_payments
- https://support.payfast.help/portal/en/kb/articles/how-do-i-enable-split-payments-20-9-2022
- https://support.payfast.help/portal/en/kb/articles/how-do-i-request-a-payout-20-9-2022
