# Partner referrals and payment-based earnings

## What this change allows

- A partner copies separate links to the business, accommodation, student marketplace, wanted and event forms, plus student/business account creation.
- First referral is retained in the browser for 30 days; signup metadata is read by an independent profile trigger. Existing unpaid accounts can attach one referral on sign-in or before a listing/payment request. Attribution cannot overwrite an existing partner.
- Guest accommodation intake saves its partner privately on the server, then carries it into the verified owner's account when claimed. Intake and its claimed listing do not count twice.
- Dashboard shows referred accounts, listing/submission activity and separate pending, approved and paid commissions. It refreshes on request and every minute while visible.
- Admin partner totals use the commission ledger, not legacy estimated listing amounts.

## What this change does not allow

- Listing creation, free registrations, zero-cash upgrades, failed/unverified payments and duplicate callbacks cannot earn commission.
- Self-referrals, blocked accounts and reassignment of existing paying customers are excluded.
- Partners cannot set a rate, forge commission records, approve earnings or mark a payout as paid.
- No rate or payout policy is activated by the migration. No money is sent. No PayFast split-payment fields are added.

## Commission policy still to agree

A trusted service configures `partner_commission_terms` only after the partner has accepted written terms: rate, start/end dates and agreement reference. The current implementation applies the configured rate to each eligible cash payment whose checkout was created during that contract period. It is a partner-wide contract window, not a rolling window for each referred customer. Credit already paid is excluded because `payments.amount` is the new cash charged. This is the amount before gateway fees; tax treatment and fees must be addressed in the agreement before activation.

Commission starts pending. Settlement/refund checks and payouts remain manual. A trusted operator may approve or reverse entries and must provide a payout reference when recording paid status. Refunds/chargebacks are not automatically synchronised: reconcile them before approval. Legacy `referral_events.amount` entries are retained for reconciliation but no longer displayed as earnings or converted into payable balances.

Suggested starting commercial terms for discussion: 20% of eligible cash payments during an initial 90-day partner agreement; monthly payout after funds clear and refunds are reviewed. This is a proposal only. Free student activity can help produce future paid referrals but is not itself a cash bounty. No salary, funded airtime, joining fee or income guarantee.

## Deployment order

1. Apply only `20261012195026_partner_referral_tracking.sql` to the existing database. Do not replay legacy migrations with duplicate/malformed names.
2. Deploy `accommodation-intake` with its existing validation module and existing JWT setting (public submissions; claim action verifies authenticated user).
3. Release the frontend from this branch.
4. Keep commission terms empty until approved. Reconcile old estimates separately; never silently treat them as money owed.

The customer-facing PayFast checkout, signatures and verified activation RPC are preserved. The new database trigger observes verified completion. Use PayFast Split Payments only as a later, separate integration after merchant onboarding and refund handling are agreed.

## Verification

- Partner referral database/storage tests cover all five forms, signup, existing attribution, guest claim, duplicate callbacks, zero-cash and unverified payments, access isolation and forbidden writes.
- Portal UI tests cover delayed membership lookup and clipboard success/failure.
- Existing unused-time credit and PayFast ITN tests remain part of the targeted checks.
- TypeScript checking and production build.

## Limitations

Browser attribution cannot follow an anonymous person across devices or private sessions. A stored referral is a marketing attribution signal, not proof that a contractor performed work; pending commissions require review. No live payment or payout was initiated to test this work.
