# Termine — Deployment & Rollback

## Prerequisites (all read-only verifiable)

1. Self-hosted Appwrite reachable and healthy (`GET /v1/health/version`).
2. `NEXT_PUBLIC_RECHLY_TERMINE_ENABLED=1` set for the web app (build-time).
3. DNS: wildcard `*.rechly.de → <server>` (approval required; verify with `dig`).
4. Traefik: `HostRegexp(`{sub:[a-z0-9-]+}.rechly.de`)` router → Appwrite is **not** needed (booking pages are served by Next.js, not Appwrite); only ensure `api.rechly.de` keeps working and no rule swallows subdomains. No proxy change expected.
5. SMTP: `RESEND_API_KEY` set on the server runtime for notification delivery.

## Schema migration (approval required — touches shared database)

```bash
APPWRITE_API_ENDPOINT=https://api.rechly.de/v1 \
APPWRITE_PROJECT_ID=<project-id> \
APPWRITE_API_KEY=<scoped schema key> \
node scripts/migrate-termine.mjs
```

Additive only: creates the 12 `termine_*` tables + indexes, verifies document security, and fails closed if transactions are unsupported. Safe to rerun. Verify with the migration's own output plus `scripts/verify-migration.mjs` extended for the new tables.

## Rollback

- Feature flag off (`NEXT_PUBLIC_RECHLY_TERMINE_ENABLED=0` + redeploy) disables all UI and public pages instantly; data stays intact.
- Business-level off switch (`enabled=false`) stops bookings per business without touching history.
- Schema rollback: tables are additive and isolated — leave them (harmless) or drop `termine_*` tables after exporting their rows. Never drop shared tables.
- DNS rollback: remove the wildcard record; path-based `/buchen/[slug]` keeps working for existing links.

## Monitoring

- Appwrite health + container restarts (existing Uptime Kuma).
- Application: 409-rate on booking creation (spikes = real contention or abuse), outbox `pending` age and `failed` count, cron heartbeat (`/api/cron/termine-notifications?dry=1` should return 200).
- Set an alert on outbox jobs with `attempts >= 5` — usually SMTP/Resend misconfiguration.
