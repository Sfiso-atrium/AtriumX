# Free bus travel directory

Public link: `https://atriumx.co.za/#/travel`

Admin link: `https://atriumx.co.za/#/admin?tab=travel`

The logged-out homepage has a visible holiday travel banner and a desktop Buses link. The existing side menu has **Travel · Buses** for guests and signed-in visitors. The travel route has no login, university or plan gate. Only administrators can create and edit listings; the database enforces that restriction.

## Entering company information

Open **Admin Panel → Bus travel → Add bus listing**. Only the company name and a complete company website address are required. Enter separate listings for different supplied routes, fares or dated departures. Leave unknown information blank rather than guessing.

Optional sections support:

- Origin and destination towns; confirmed boarding/drop-off points and alternative place names, one per line.
- Listed or starting fares in rand, one-way/return fare basis, direct/connecting service and connection details.
- Departure and arrival times, supplied duration in minutes, operating days or a specific travel date.
- Student discount terms, baggage allowance and additional conditions.
- Information date, validity start/end and a manual outdated marker.

Expired information remains public. A past validity end date, past specific travel date or manual outdated marker displays a notice linking to the company website. Editing a record updates its edit timestamp; it does not change its information date or automatically clear an outdated marker.

## Searching

From/To support typed searches and keyboard-accessible place dropdowns. Matching ignores case, punctuation and accents and allows small misspellings and transposed letters. Confirmed aliases and boarding/drop-off points are searchable. The page identifies matching places rather than silently replacing input. It does not invent reverse routes, transfer combinations or live seat availability.

Optional filters cover company, maximum listed fare, date, departure period, fare basis, service type and supplied student discounts. Routes without dates remain discoverable when filtering by date; the cards ask visitors to confirm with the company. Other selected detail filters match supplied values. Missing fields never prevent publishing a listing.

Sorts: lowest/highest price, shortest supplied duration, earliest departure and recently edited. Missing price/duration/time values sort after known values. Starting fares and fare basis remain visible; fares are not live quotations.

## Validation

Run `node tests/bus-travel.test.mjs` for matching, filtering and database policy checks, and `node tests/bus-travel-ui.test.mjs` for rendered interactions, admin editing, navigation and API paging. Run `npx tsc --noEmit` and `npm run build` before release.

The migration is `supabase/migrations/20261019205719_free_bus_directory.sql`. It adds only the travel table, its policies, index and timestamp trigger and reuses the existing private admin helper. No sample companies or fares are seeded.

## Sharing and related student pages

WhatsApp and copy buttons share either the current filters or a particular bus listing. The shared URL reopens the filters and scrolls to the specified card while retaining the selected price sort. Copy failures display a selectable URL and never claim success. Shared links exclude campaign labels and email-management tokens.

Below results, the student marketplace and accommodation invitations link to the existing pages. They do not interrupt travel searches or redirect visitors automatically.

## Travel activity

**Admin → Bus travel → Travel activity and email update requests** shows travel visits, route searches, WhatsApp opens, successful copies, bus website clicks, related-page clicks and update requests. Company click totals are referrals, not verified bookings. Guest visits are included and admin visits excluded. Activity contains only known supplied place names; raw typed searches and emails are not recorded in analytics events.

General visit monitoring now includes `/travel`. The email confirmation/unsubscribe route is excluded from monitoring. Travel-only visits do not generate the existing idle-without-listing-submission phone alert.

## Optional email updates

Route update requests need only a route, email address and explicit consent; a travel date is optional. No account is created. Requests remain pending until the recipient follows a confirmation email and deliberately confirms on the website. Confirmation links expire after seven days. Every email includes a public unsubscribe link, and visiting that page alone does not unsubscribe the recipient. Unsubscribing cancels queued messages.

The server queues matching new/updated listings using typo-tolerant matching. Outdated listings do not trigger email updates. Pending changes for the same recipient, listing and day are coalesced. The worker uses exclusive claims, provider idempotency keys, bounded retries and a hard cap of 50 accepted messages per 24 hours.

**Delivery setup is required:** set `TRAVEL_RESEND_API_KEY` and `TRAVEL_MAIL_FROM` as server-only Supabase Edge Function secrets using an existing suitable sender account and verified sending address. No email-provider account or paid plan is created by this release. Until configured, the public form honestly says requests are saved while delivery is being set up; the admin panel reports that status. The deployment does not send outreach messages.

The `travel-alerts` Edge Function reuses the existing `CRON_SECRET`; the database scheduler invokes it every 15 minutes using the existing vault configuration. It does not accept browser calls or expose credentials. Emails, consent records and management tokens are stored in private tables; only the admin report and server worker can read the necessary fields. The admin report never returns confirmation or unsubscribe tokens.

Additional checks: `node tests/travel-engagement.test.mjs`, `node tests/travel-growth-ui.test.mjs`, and `node tests/travel-mail-worker.test.mjs`. The engagement migration is named `travel_engagement_and_alerts`; its filename matches the applied server migration version.
