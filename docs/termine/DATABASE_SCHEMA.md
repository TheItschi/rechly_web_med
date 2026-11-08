# Termine — Database Schema

All tables live in `rechly-db`, document security, per-row owner permissions.
Created by `scripts/migrate-termine.mjs` (additive, idempotent, preflight checks).

| Table | Purpose | Key fields |
|---|---|---|
| `termine_settings` | One row per business (`$id` random, lookup by `userId`) | slug, displayName, timezone, language, slotIntervalMinutes, minNoticeMinutes, maxHorizonDays, cancel/ rescheduleNoticeMinutes, confirmationMode, allowAnyStaff, showPrices, currency, contact fields, enabled, published |
| `termine_slugs` | Atomic slug registry; `$id` = normalized slug | userId |
| `termine_services` | Bookable services | name, durationMinutes, priceCents (integer minor units), currency, prep/cleanupMinutes, active, publicVisible, staffIds[], sortOrder |
| `termine_staff` | Bookable people (no login required) | name, active, bookable, serviceIds[], color |
| `termine_hours` | Week template (`kind=week`, `day` 0–6) + date overrides (`kind=override`, `date`); deterministic `$id` = hash(user, `week:3`) for idempotent setup | closed, periods JSON, breaks JSON |
| `termine_blocks` | Time off / closures | staffId (null = whole business), startUtc, endUtc, reason |
| `termine_appointments` | Bookings; snapshots service name/price at creation | serviceId, staffId, customerName/Email/Phone/Note, customerId (linked Rechly client, nullable), startUtc, endUtc (UTC ISO), businessTimezone, durationMinutes, bufferMinutes, status, serviceNameSnapshot, servicePriceCents, currency, source, internalNote, linkedInvoiceId, idempotencyKey, cancelledAt, completedAt |
| `termine_reservations` | Slot locks; `$id` = sha256(business, staff, startUtc) | staffId, startUtc, appointmentId |
| `termine_customers` | Booking contacts, tenant-scoped by (userId, email) | name, customerEmail, phone |
| `termine_tokens` | Manage links; only sha256 hashes stored | appointmentId, purpose, tokenHash, expiresAt (90d) |
| `termine_outbox` | Notification jobs | kind, appointmentId, payload JSON, status, attempts, nextAttemptAt, lastError |
| `termine_audit` | Lifecycle events | appointmentId, action, detail |

Indexes: `termine_appt_owner` (userId, startUtc), `termine_appt_status` (userId, status), `termine_res_owner` (userId, staffId), `termine_hours_kind` (userId, kind), `termine_blocks_staff` (userId, staffId), `termine_outbox_pending` (status, nextAttemptAt), `termine_customer_email` (userId, customerEmail), `termine_audit_appt` (appointmentId), `termine_service_sort` (userId, sortOrder).

Money is always integer cents (`priceCents`); conversion to display happens in UI/API only.
