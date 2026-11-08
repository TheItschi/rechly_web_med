# Rechly Termine — Architecture

Single shared multi-tenant booking platform inside the Rechly Next.js app, backed by
self-hosted Appwrite 1.8.1 (`rechly-db`). No separate Appwrite project per business;
tenancy is `userId` (= business owner) on every row, mirroring invoices/clients.

## Module map (`src/lib/termine/`)

| File | Responsibility |
|---|---|
| `types.ts` | Domain models (settings, slug, service, staff, hours, appointment, customer link, token, outbox, audit) |
| `slug.ts` | Normalization, validation, reserved names |
| `time.ts` | TZ-safe helpers (dayjs utc/timezone): wall↔UTC, DST-gap handling, minute arithmetic |
| `availability.ts` | Pure slot engine: hours × eligibility × bookings × buffers × policies → slots |
| `store.ts` | Appwrite access: `atomic()` transaction wrapper (mirrors `workspace/store.ts`), deterministic IDs |
| `booking.ts` | Server booking ops: create / reschedule / cancel, state machine, idempotency, tokens |
| `customers.ts` | Email-scoped customer match-or-create inside tenant (never cross-business) |
| `invoices.ts` | Draft-invoice adapter reusing `currencyUtils` + existing invoice document shape |
| `notify.ts` | Outbox writer, Resend HTTP sender, ICS builder, retry bookkeeping |
| `policy.ts` | Rate limits, origin checks, request caps |

## Data (`scripts/migrate-termine.mjs`, all additive/idempotent)

Tables in `rechly-db`, document security, per-row owner permissions:

- `termine_settings` — one row per business (`$id = settings:<userId>`): slug ref, tz, policies, branding, publish state
- `termine_slugs` — `$id = <normalized-slug>`: atomic slug registry (409 = taken), owner userId
- `termine_services`, `termine_staff`, `termine_hours` (weekly + overrides in one table via `kind`), `termine_blocks`
- `termine_appointments` — UTC instants, snapshots (service name/price), status, `linkedInvoiceId`
- `termine_reservations` — `$id = sha256([business, staff, startUtc])`: deterministic slot locks, deleted on cancel
- `termine_customers` — booking-side contact records, email-scoped, tenant-isolated
- `termine_tokens` — sha256(token) → appointment link, purpose, expiry
- `termine_outbox` — notification jobs with idempotency keys, attempts, status
- `termine_audit` — lifecycle events

Indexes: owner+date composites for calendar queries, slug lookup, token hash, outbox pending scan, reservation collision (implicit via `$id`).

## Concurrency

Booking = one Appwrite transaction: re-read overlapping active appointments for the
staff interval → abort 409 on overlap → create appointment + reservation rows (+ outbox,
audit) → commit. Desktop `appwrite-compat` implements the same transaction semantics,
so concurrency tests run locally against SQLite. Deterministic reservation `$id`s give
a second layer: duplicate commits fail on ID conflict.

## Routing

- Dashboard: `/dashboard/termine/*` (behind `NEXT_PUBLIC_RECHLY_TERMINE_ENABLED=1`).
- Public: `/buchen/[slug]/*` path routes always work; `src/middleware.ts` rewrites
  `<slug>.rechly.de` → `/buchen/[slug]` (host allowlist, proxy-trusted headers only).
- Manage links: `/buchen/verwalten/[token]` (token never in logs/analytics).

## Notifications

Booking mutations write outbox rows in the same transaction. Delivery: best-effort
inline send after commit + `POST /api/cron/termine-notifications` (guarded by
`CLEANUP_API_SECRET`, same pattern as guest cleanup) retries pending jobs with
bounded attempts. Sender: Resend HTTP API (`RESEND_API_KEY`, server-only) with `.ics`
attachments; no key → jobs stay queued and visible, booking itself never fails on mail.

## Invoice drafts

Completed appointment → match-or-create tenant client by email → generate `RE-YYYYMM-###`
number (scan-then-claim, same scheme as the invoice form) → create draft invoice + one
line item from the price snapshot → set `linkedInvoiceId` in the same transaction.
Re-running is a no-op when `linkedInvoiceId` is set (idempotent).

## Flags & rollout

- `NEXT_PUBLIC_RECHLY_TERMINE_ENABLED=1` (build + runtime) gates nav + public pages.
- Per-business `settings.enabled/published` gates booking independently of the flag.
- Disabling never deletes history; appointments keep snapshots so later service edits
  cannot rewrite the past.
