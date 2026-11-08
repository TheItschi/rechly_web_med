# Termine — Security

## Tenant isolation

- Every business row carries `userId` = owner. Business APIs always query with `Query.equal("userId", <session user>)` and `own()` re-checks after `getDocument` (404 on mismatch — no oracle distinguishing "missing" from "foreign").
- Child/related reads (services, staff, appointments) go through the same store; no endpoint trusts a client-supplied `userId` — it always comes from the session.
- Public endpoints never return `userId`, permissions, internal notes, tokens, or full customer records. Manage-token endpoints return a minimal summary after hashing the presented token and checking expiry.
- Manage tokens are 32 random bytes; only sha256 hashes are stored; links expire after 90 days; tokens are never logged.

## Booking integrity

- Availability is advisory; the commit path re-validates everything inside a transaction and collides deterministically on reservation `$id`. Race losers get 409, never silent overwrites.
- Idempotency keys dedupe double submits (deterministic appointment `$id`).
- Reschedule cannot lose a booking: old reservation is restored if the new claim fails.
- Completed/cancelled appointments are terminal; transitions are enforced by `canTransition` server-side.

## Abuse controls

- Per-IP sliding-window rate limits on availability (60/min), booking creation (10/min) and manage endpoints (30/min), with `Retry-After`.
- 220 KB JSON body cap on public writes; strict field whitelists on every PATCH/POST (unknown fields ignored, never written).
- No CAPTCHA yet: recommended next step if spam appears is Cloudflare Turnstile on the booking form (server secret stays server-side). Rate limits + email validation + confirmation-mode manual review are the current mitigations.
- CORS: public API is intentionally cross-origin callable (booking widgets); no credentials/cookies are read on public routes.

## Secrets & scopes

- Browser bundle contains only `NEXT_PUBLIC_*` endpoint/project + feature flag.
- Server keys (`APPWRITE_API_KEY`, `RESEND_API_KEY`, `CLEANUP_API_SECRET`) are server-env only; Resend calls happen exclusively in API routes/cron.
- A minimal-scope Appwrite key (databases + the 12 `termine_*` tables) is sufficient for the app; schema migration needs a separate scoped operator key, used once and revocable.

## Appwrite permission model

Tables use document security with row-level `Role.user(owner)` permissions (verified by the migration preflight, same as `workspace_records`). Public reads bypass row ACLs via the admin client — which is why public DTOs are explicitly whitelisted field-by-field and raw documents are never serialized.
