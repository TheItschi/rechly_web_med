# Termine — API

Base: same Next.js Appwrite proxy pattern as the rest of Rechly (session cookie or Bearer JWT → `createSessionClient`; admin client with explicit `userId` tenant filter). Public routes use the admin client with no user session and return only whitelisted public DTOs (never `userId`, permissions, or internal notes).

## Public (rate-limited per IP; see `ratelimit.ts`)

| Method & path | Purpose |
|---|---|
| `GET /api/termine/public/:slug` | Business profile, bookable services, bookable staff |
| `GET /api/termine/public/:slug/availability?serviceId&staffId?&from&days` | Slots grouped by day `{ [YYYY-MM-DD]: [{startUtc, staffId}] }` |
| `POST /api/termine/public/:slug/appointments` | Create booking (201). Body: serviceId, startUtc, customerName/Email, optional staffId/phone/note/idempotencyKey. Returns `{ appointmentId, status, manageToken }` |
| `GET /api/termine/manage/:token` | Safe booking summary for the customer |
| `POST /api/termine/manage/:token/cancel` | Customer cancellation (policy window enforced) |
| `POST /api/termine/manage/:token/reschedule` | Customer reschedule `{ newStartUtc }` (policy window + availability re-check) |

Error shape is always `{ error: string }` with HTTP 400 (validation), 403 (disabled/unpublished), 404 (unknown slug/token), 409 (slot taken or illegal transition), 410 (service gone) or 429 (rate limit, `Retry-After` header).

## Business (session auth, tenant-scoped)

- `GET/PATCH /api/termine/settings`, `GET /api/termine/slug?slug=` (availability check), `POST /api/termine/slug` (activate: atomic slug reservation + settings)
- Services: `GET/POST /api/termine/services`, `GET/PATCH/DELETE /api/termine/services/[id]`
- Staff: same shape under `/api/termine/staff`
- `GET/POST /api/termine/hours` (week/override upsert by deterministic id), `GET/POST /api/termine/blocks`, `DELETE /api/termine/blocks/[id]`
- Appointments: `GET` (filters `from,to,status,staffId`), `POST` (manual booking), `GET/PATCH /api/termine/appointments/[id]` (status machine + internalNote), `POST .../reschedule`, `POST .../cancel`, `POST .../invoice-draft` (idempotent, 200 if draft already exists)

## Cron

- `POST /api/cron/termine-notifications` — `Authorization: Bearer <CLEANUP_API_SECRET>` (same secret/pattern as guest cleanup). Optional `?dry=1`. Bounded batch, idempotent sends, exponential-backoff retries (max 8 attempts), then `failed`.
