# Outreach repair — 30 September 2026

Source: live GitHub main at d281c6ae6a71d3f11fc3a31d617984d6298f8506. The latest full ZIP matched this commit; the six small TypeScript fixes were reviewed against it.

## Product rules

- Accommodation providers can open `/accommodation/post` publicly and submit a free property without an account or payment. One university and up to three photos. Contact email stays private; phone and optional website are public after approval.
- Guest submissions wait for administrator approval. The success dialog offers optional account creation. Linking an approved submission requires the saved browser receipt and a verified matching accommodation-account email.
- Accommodation accounts cannot view, post, or interact with events. Ordinary business event scope uses the saved university selection, independently of paid listing plans.
- Clients cannot grant themselves admin privileges, paid plans, verification or another account role. Verified server payment processing retains plan-update access.
- Chat participants and sent message contents cannot be rewritten by clients. Recipients can mark messages read. Accommodation chat does not inherit the ordinary Noticeboard chat lock.

## Applied database changes

These five new migration files match the versions recorded in production. The intake Edge Function is deployed with JWT verification enabled.

| Version | Purpose |
| --- | --- |
| 20260929160720 | Account, business capability, conversation and message integrity |
| 20260930033145 | Restrict Vault helper to trusted server role |
| 20260930040948 | Moderated public accommodation submissions and verified claims |
| 20260930041006 | Separate accommodation from event access |
| 20260930041324 | Preserve accommodation chat access |

**Do not run a blanket `supabase db push` against production.** Older schema changes were installed outside recorded migration history. Preserve them; reconcile historical migration state separately before adopting automatic deployment. Only the five versions above are recorded as applied at this repair checkpoint.

## Validation

TypeScript check, production Vite/PWA build and whitespace checks pass. Isolated Postgres tests: 21 account/chat checks and 10 submission/event checks. Intake validation: 7 checks. Production read/rollback checks confirmed student campus separation and rejected protected account edits. UP login, My Space and profile were checked in the live browser before frontend deployment.

Isolated tests do not substitute for a full live provider/admin journey. Guest submission approval, claim, both student account sessions, and mobile layout should be checked on the deployed frontend. No payment behavior was changed; successful payment testing is user-reported.

## Corrections to the earlier audit

- Listing and accommodation plan/reach SELECT policies are restrictive. The earlier permissive-policy bypass allegation was incorrect.
- Ordinary business event scope is intentionally independent of paid listing tiers, per the clarified product rule.
- The protected-profile UPDATE guards were security-definer functions whose trusted-role bypass was always true. They now run as the invoking role.

## Remaining operational concern

The Vault lookup helper previously allowed public execution. That access is now revoked. Secret values were not retrieved. Rotate the cron secret in Vault and matching Edge Function configuration; there is no evidence here establishing whether it was accessed previously.
