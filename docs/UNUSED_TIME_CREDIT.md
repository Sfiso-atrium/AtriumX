# Unused paid-time credit

Upgrade checkout now presents an authoritative server quote before the PayFast handoff. Credit equals the unused fraction of verified paid periods (including prepaid renewals), rounded to cents. Expired periods, free plans, and unsupported/unverified entitlements do not create credit. Same-plan renewal continues to charge full price and extend the existing expiry. Downgrades wait until the current period ends.

Example: R199 purchased for 30 days with 15 days left produces R99.50 credit. A R349 plan then costs R249.50 and starts a new 30-day period after confirmation. When prepaid value exceeds the new plan price, checkout charges zero and converts the surplus into additional time. Existing verified value, never a browser-supplied amount, funds that activation.

The quote is fixed for 15 minutes. A dismissed unsigned quote is cancelled; repeated requests for the same pending checkout reuse its reference. Different pending checkouts in the same account audience are serialized. Source periods are consumed only during successful activation. A per-account transaction lock and the existing atomic activation routine prevent repeated callbacks or competing checkouts from granting the same credit twice.

An expired credited quote or changed/consumed source after money is confirmed is recorded as `review_required`, with the payment reference retained and an admin bell notification. The customer is told not to pay again. This requires admin reconciliation; no automatic refunds are claimed. Full-price legacy checkouts and existing payment validation remain supported. Invalid or unverifiable notifications no longer overwrite a pending payment as failed; transient provider verification errors can retry.

## Changes

- Adds accounting columns to existing RLS-protected payments; reconstructs historical paid periods using the prior activation rule.
- Service-role-only quote/preparation functions; legacy activation implementation kept private behind a serialized wrapper.
- PayFast creator signs the stored amount due. Frontend never supplies an authoritative amount.
- Shared accessible checkout dialog for student, business and accommodation paid plans.
- Payment result tracks the specific quote ID and handles admin-review status.

## Verification

15 database checks using PGlite: proportional credit, renewal extension, quote reuse, atomic source consumption, duplicate callback, expired/unverified plans, audience validation, stale/expired quote review, prepaid renewals, excess credit, accommodation credit, and client RPC denial.
6 edge-function checks: quote-only response, authoritative signed amount, unknown/expired quote rejection, zero-cash activation, and no activation during preview.
5 callback checks: signed discounted amount, forged notification immunity, non-finite amount rejection, temporary verification retry, and review-status idempotency.
TypeScript and full production build checked with placeholder public environment values. No real payment was made during testing.

PayFast requires at least R5 for a nonzero charge (https://developers.payfast.co.za/). Any smaller remainder receives a separately displayed minimum adjustment, with its value converted to extra plan time. This is included in the server quote, not silently added by the browser.
