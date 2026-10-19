# Free bus travel directory

Public link: `https://atriumx.co.za/#/travel`

Admin link: `https://atriumx.co.za/#/admin?tab=travel`

The existing side menu has **Travel · Buses** with a bus icon for guests and signed-in visitors. The travel route has no login, university or plan gate. Only administrators can create and edit listings; the database enforces that restriction.

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
