# Admin visit monitor — 6 October 2026

## What is ready

Built against AtriumX main commit 4bf3d21. The database migration `20261006131505_admin_visit_monitor.sql` has already been applied to project oljpgpgeqfwrqposrups. Do not run it again on that project. The website implementation is included in this repository change for deployment through the existing Cloudflare integration.

## Turn it on

1. Merge this change into main.
2. Confirm the normal Cloudflare/GitHub deployment finishes.
3. On the phone that should receive alerts, sign in to the admin account, open Admin Panel, then **Visit monitor**.
4. Tap **Enable phone alerts** and allow notifications. Tap **Send test notification** and check the phone notification tray. “Test queued” is not proof of delivery.
5. Use a different, non-admin browser/device to open a link, start a listing form, and then leave. Verify a visit alert immediately, and an inactivity alert about 3–4 minutes after the last update. Submit a genuine listing to check the verified-submission alert.

Android: allow notifications for the site/browser. iPhone/iPad: add AtriumX to the Home Screen, open that app and enable notifications there. Notification delivery can depend on browser support, device settings, connectivity and power-saving settings. These are Web Push notifications, not SMS or WhatsApp messages. The existing sender and VAPID configuration are reused; no new messaging subscription is needed.

Only administrators can access reports or enable monitor alerts. An administrator must opt in to these alerts; existing push subscriptions alone do not opt them in. “Pause visit alerts” affects only monitor alerts and keeps data collection running. The account may have multiple subscribed devices, so its enabled monitor alerts can reach all of those devices.

## Information recorded

- Visit start and last-seen times, displayed in South African time.
- Initial and latest public page plus a path history of up to 50 transitions per session.
- Optional utm_source and utm_campaign labels, and broad device type.
- Whether a listing form was opened and whether a field was interacted with.
- Approximate active time across the visit and listing forms.
- Verified accommodation, guest accommodation or marketplace/business listing submissions, with IDs and timestamps.
- Signed-in account name when available; otherwise “Anonymous visitor”.

Counts: visits, forms opened/started, submissions, visits that converted, inactive visits with no recorded submission, recently seen visits and average active form time. The panel refreshes every 30 seconds and supports 24-hour, 7-day, 30-day and history views. Historical counts remain in the database; there is no automatic deletion in this release.

No passwords, typed form values, payment details, chat contents, full query strings, email addresses, precise locations or browser fingerprints are collected by this monitor. The privacy page includes an explanation. Admin browsing is excluded.

## Links

Existing links work after deployment, but a plain link cannot identify which outreach message it came from. For future campaigns use non-personal tags:

`https://atriumx.co.za/#/accommodation/post?utm_source=email&utm_campaign=rhodes-october`

`https://atriumx.co.za/#/business/post?utm_source=whatsapp&utm_campaign=rhodes-october`

Use campaign codes rather than names, addresses or email addresses. These links preserve the existing listing flows. A repeated page visit within the same browser-tab session updates the visit rather than adding a new person. A session resumes for up to 30 minutes of inactivity, with a maximum lifetime of 24 hours. New tabs can count separately; this is not a unique-person counter.

## Accuracy and limits

This records JavaScript page arrivals, not clicks that never load the website and not email opens. Supported pages are home, retailer landing, accommodation browse/review/detail, residence detail, marketplace feed/listing detail, events browse and the three listing forms. Private chat, account and payment paths are excluded. Visits before deployment cannot be recovered. Bots that execute JavaScript can still appear in counts.

Time is estimated from foreground activity. A 15-second heartbeat and a final best-effort update record progress. Active time pauses when the page is hidden or there has been no interaction for 60 seconds. Mobile browsers can close without sending the last update. “Inactive — no submission recorded” means no update for three minutes and no linked successful submission; it does not prove abandonment. A later successful submission changes the dashboard outcome, although an earlier phone alert cannot be recalled.

A submission counts only after the database confirms it belongs to the signed-in seller, or verifies the guest's saved receipt. Pending moderation counts as a submission, not as a published property. Successful conversions are idempotent. Failed analytics never prevents a listing from being submitted; retries are attempted while the browser session is available. If the browser is killed/offline before conversion attribution reaches the server, an existing listing can be undercounted in this monitor. The listing itself is retained independently.

An abuse guard caps new monitor sessions at 300/minute globally (excess telemetry is rejected; the website still works). Push amplification is capped at 30 admin notification records/minute; excess alerts are omitted while accepted visit counts remain. This is a lightweight operational monitor, not fraud-proof analytics.

## Validation completed

- TypeScript check: passed.
- Production build: passed.
- 17 isolated database tests: passed (admin-only reads/settings, anonymous recording, token protection, private-route exclusion, admin exclusion, bounded duration, verified/idempotent conversion, guest receipt checking, admin-only alerts, once-only inactivity alerts and out-of-order heartbeat protection).
- Live transactional anonymous visit test: passed and rolled back; no test visits retained.
- Live inactivity scheduler: active. Anonymous direct table SELECT: denied.
- Security advisors: no new missing-RLS or mutable-search-path findings. The explicit SECURITY DEFINER RPC warnings are expected for the narrowly validated telemetry and admin APIs. See https://supabase.com/docs/guides/database/database-linter for the advisor explanation.
- Physical phone delivery must be verified using the device's test button after publication and permission consent.

One existing TypeScript comparison in BusinessListingFirst.tsx was widened with Number(maxPhotos) so type checking passes without changing its runtime behavior.

## Files and rollback

The migration creates three tables and six functions, plus the scheduled inactivity job. It does not alter existing listing tables or the push sender. To stop monitor phone alerts, pause them in the monitor. To remove client recording, remove VisitMonitor from App.tsx and the conversion hooks; historical counts remain. Do not drop tables as a routine rollback.

The deployment includes the existing push sender unchanged. No secrets or credentials are in this package. On a separate project, install the supplied migration once after the existing schema, pg_cron, pg_net and pgcrypto are present, and configure the existing Vault push sender first.
