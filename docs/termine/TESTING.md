# Termine — Testing

Run `npm test` for the full suite, or `npx tsx --test tests/termine-*.test.ts` for booking tests. Run `npx tsc --noEmit` and `npm run build` for type and production build checks.

The booking tests cover concurrent identical/different-start bookings, buffers and closed periods, any-staff selection, response-loss recovery, tenant isolation, cancellation, failed-reschedule rollback, snapshot duration, notice rules, state transitions, invoice-draft idempotency, notification leases/retries/stale messages, ICS parsing/escaping, real-date and IANA-zone validation, DST gaps/folds, and availability across customer/business date boundaries.

## Automated browser test

Requires `playwright-core` and Chromium. The test refuses to run unless `RECHLY_DATA_DIR` is exactly the disposable directory below and the server reports SQLite. It reseeds only Termine tables in that isolated database. Do not set mail-provider credentials for these tests.

Start the server in one terminal:

```sh
RECHLY_DESKTOP=1 NEXT_PUBLIC_RECHLY_DESKTOP=1 \
NEXT_PUBLIC_RECHLY_TERMINE_ENABLED=1 NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED=1 \
RECHLY_DATA_DIR=/tmp/rechly-booking-test \
npm run dev -- --hostname 127.0.0.1 --port 3106
```

Run in another:

```sh
RECHLY_DATA_DIR=/tmp/rechly-booking-test node tests/termine.browser.cjs
```

Optional environment variables: `RECHLY_CHROMIUM` (default `/usr/bin/chromium`), `RECHLY_PLAYWRIGHT_PATH` (default `playwright-core`).

The browser covers public booking, next-month navigation, deliberately dropped successful HTTP response and retry without duplicates, private management, rescheduling, cancellation, ICS download, manual approval, mobile overflow, invalid availability queries and cross-origin rejection, private-page headers, owner notification status, invalid service edits and deletion protection. Screenshots are written to `/tmp/rechly-booking-*.png`.

## Staging checks still required

Use a dedicated Appwrite staging tenant to exercise concurrent HTTP booking requests across multiple application instances and verify transaction conflicts. Configure a test Resend sender/inbox and scheduled authenticated notification worker; verify pending, approved, moved and cancelled messages, retries and owner notifications. No production accounts or email deliveries are used by the automated local tests.
