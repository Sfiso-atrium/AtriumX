# Owner homepages

Business and accommodation accounts now open `/home` after normal sign-in. `/space` and the existing root redirect also resolve business accounts to this dashboard. Student MySpace and the existing business/accommodation marketplace routes are preserved. Submission claiming and explicit post-login return destinations remain intact.

The shared navbar adds only a Home icon for business accounts. The dashboard does not have a Business MySpace banner. Its responsive layout provides listing status, existing all-time business views, inbox conversation/unread counts, editing links, recent conversations, reviews, and account actions. Accommodation views are not shown because the existing schema has no equivalent field. Counts are labelled by their actual scope and are not unique-person analytics.

Business reviews appear in the owner dashboard and on business profiles that have reviews. Existing review creation stays in place. Shared owner-only Reply / Edit reply controls are visible on all plans; free or ineligible plans open a native modal with the applicable upgrade path. Existing server enforcement remains in force. No database migration or payment changes are included.

## Validation

- TypeScript no-emit check and production build.
- Twelve isolated React component checks using temporary react-test-renderer 18.3.1: signed-out return path, student routing, missing business profile, business/accommodation empty state creation links, listing edit payload and real view totals, loading failure, free business/accommodation reply modals, permitted reply save, backend reply rejection, and no reply controls for non-owners.
- Navbar diff inspected: Home import and owner Home button only.
- Local browser visual inspection was blocked by the cloud browser's localhost access restriction. Full signed-in production visual confirmation remains a user-device check.

## Approved next phase

The user chose unused-time credit for paid-plan upgrades, after these homepages. The deployed payment creator currently charges full new-plan price even for upgrade intent. Payment changes must calculate credit on the server from verified payment and entitlement records, show the credit/amount due before checkout, prevent duplicate credit use, and preserve the verified PayFast callback. Do not assume frontend plan prices establish entitlement or credit.
