# Partner workspace

## Behaviour

- `/#/partner/join` accepts any email. New users receive the separate `partner` account type and an immediate partner membership. The current Auth configuration auto-confirms email; the UI also supports confirmation if that configuration changes.
- Existing student and business accounts can join without changing their original account type. Membership does not grant student review permissions, administrator rights, a paid plan or a commission agreement.
- `/#/partner` opens tasks and contacts. Horizontally scrolling tabs expose the approach guide and existing referral/PayFast tools. Registration opens a dismissible welcome.
- `/#/admin?tab=partners` lets every active administrator create contacts, select multiple universities, assign one partner, and create checklist tasks. Normalized email and international phone identifiers prevent duplicate contact assignments.
- Reassigning a contact transfers its active tasks and resets their checklist. Unassigning removes those active tasks. Historical progress retains the original partner and task description.
- Partners tick their own tasks. Saved changes are visible to all admins and create an admin notification. Revision checks reject conflicting edits instead of overwriting newer data.
- `/#/chat?support=1` is part of Messages. Partners have one shared Admin conversation; every active admin can initiate or continue it. Personal administrator names and identifiers are never returned to partners.
- Support conversations use separate records and do not inherit paid marketplace-chat limits. Existing marketplace chat is retained. Read position is per administrator; another admin reading a message does not clear your unread count.
- Support messages refresh while the page is visible. Older messages can be loaded in batches. A request ID makes retrying a send idempotent. The mobile composer follows viewport resizing.

## Access controls

All new public tables have RLS. Contacts and tasks have only scoped SELECT grants; writes go through checked RPCs. Progress history is admin-only. Raw support messages/read records have no client table grants. Public RPCs are invoker wrappers around private functions that check the current authenticated, unblocked profile and current membership/admin role. No authority comes from editable user metadata.

## Validation

- `node tests/partner-workspace.test.mjs`: self-registration, isolation, duplicate contacts, reassignment, progress notifications, shared admin chat, hidden admin identities, retries, read cursors and revoked/blocked access.
- `node tests/partner-portal-ui.test.mjs`: restored membership and referral copy behaviour.
- `node tests/partner-payfast.test.mjs` and `node tests/partner-referrals.test.mjs`: existing payment and attribution regression checks.
- `tsc --noEmit` and `npm run build`.
- `tests/partner-workspace-browser.mjs`: intercepted local API fixtures, personal-email signup, checklists, support sends, desktop/360px layouts and reduced viewport composer. Optional `playwright-core` and `@sparticuz/chromium` packages are needed; `PARTNER_UI_BROWSER_MODULES` can point to their node_modules directory. This test starts its own preview server with dummy backend configuration and never writes production data.

## Deliberately unchanged

No new commission rate or live PayFast activation. No outreach messages are sent by this change. Follow-up dates, outcome notes and do-not-contact controls remain outside this requested batch.

## Deployment

Migration `20261017053033_partner_workspace.sql` matches the version recorded by the hosted migration service. Support tables intentionally have no client policies or grants; their read/write surface is the checked RPC. The security advisor reports these deny-by-default tables as informational. Existing public profile/business projection view advisories are outside this change.
