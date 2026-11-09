# Booking reliability and experience review

## Reference workflows

Reviewed the public implementation/tests and documentation of established open-source booking systems:

- [Cal.com repository booking-page tests](https://github.com/calcom/cal.com/blob/2eb48eccd8aca8a0c0ffabf28cf92e298b33ecee/apps/web/playwright/booking-pages.e2e.ts): month navigation and rescheduling. The repository now points community users to Cal.diy.
- [Availability tests](https://github.com/calcom/cal.com/blob/2eb48eccd8aca8a0c0ffabf28cf92e298b33ecee/apps/web/playwright/availability.e2e.ts): time zones and date overrides.
- [Confirmation/rejection tests](https://github.com/calcom/cal.com/blob/2eb48eccd8aca8a0c0ffabf28cf92e298b33ecee/apps/web/playwright/booking-confirm-reject.e2e.ts): pending requests differ from confirmed appointments.
- [Easy!Appointments FAQ](https://github.com/alextselegidis/easyappointments/blob/main/docs/faq.md): available time must accommodate a continuous service within working hours and breaks.
- [Easy!Appointments CalDAV documentation](https://github.com/alextselegidis/easyappointments/blob/main/docs/caldav-calendar-sync.md): calendar synchronization is a distinct integration with time-zone configuration.

Vendor marketing sites were unavailable through this environment's network policy. This review used these public sources, not a claimed hands-on assessment of Calendly or every paid product. No reference implementation was copied.

## Changes delivered

| Area | Previous defect or gap | Result |
|---|---|---|
| Concurrency | Only identical start times shared a reservation ID | Atomic per-staff/day guards serialize overlapping interval writes, including different starts and buffers |
| Availability | Closed weekday periods could remain available; prep was omitted from existing busy intervals | Closed flags respected; prep and cleanup must fit inside working windows and avoid bookings/breaks |
| Staff/service configuration | Staff-side service restrictions were ignored; referenced records could be deleted | Both optional assignment restrictions are respected; existing booking references require deactivation instead of deletion; edits validate durations, buffers and tenant ownership |
| Any-staff selection | Booking chose the first staff member even if another supplied the available slot | Commit uses the actual eligible, available staff member |
| Retry recovery | A lost successful response left the customer without a management link | Same idempotency key and request recover the original booking and link; changed requests fail |
| Time zones | UTC date grouping and a fixed first month hid valid times | Navigable monthly calendar, customer time-zone selection, correct neighbouring-day queries, deterministic DST fold handling |
| Self-service | Rescheduling API lacked a complete customer flow | Private management page offers available replacement slots, policy deadlines, cancellation confirmation and calendar download |
| Booking changes | Rescheduling could adopt a newly edited service duration | Original duration and buffer snapshots are retained; destination notice and staff eligibility are checked |
| Approval | Status change and notification were not atomic | Confirmation, audit and outbox are committed together; illegal transitions and premature completion/no-show are rejected |
| Notifications | Wrong cancellation template, broken URLs, duplicate inline/cron sends | Event-specific messages, durable private links, leased delivery and stable provider idempotency keys; obsolete jobs suppressed |
| Calendar export | Cleanup appeared as customer meeting time; text escaping was fragile | Actual service duration, stable UID/update sequence, cancellation status and standards-based text serialization |
| Public presentation | Inconsistent progress, stale async results, hidden prices exposed in page props | Three-step responsive booking, service search, summary/policies, retry states and accurate email-delivery wording |
| Operations | Mail misconfiguration/failures were invisible | Owner settings show readiness and pending/failed counts; failed jobs can be requeued in bounded batches |
| Privacy/input | Weak token ownership/purpose checks, invalid dates/settings accepted | Tenant/purpose/expiry checks, origin checks, capped JSON on public writes, IANA validation, private-page headers and booking analytics exclusion |

Advanced options remain optional. Customers only need their name and email; no account, extra setup, payment, or external calendar is required. Existing business publication settings are preserved.

## Operational requirements and boundaries

- No database schema additions are required by this change. The existing Termine migration and transaction-capable Appwrite deployment are still prerequisites.
- Interval guards reuse `termine_reservations`; guard rows persist as concurrency metadata. They are not appointments and must not be deleted as if they were abandoned slot reservations.
- Configure `RESEND_API_KEY`, a verified `TERMINE_FROM_EMAIL` (or `RESEND_FROM_EMAIL`), and the correct `NEXT_PUBLIC_APP_URL`. Schedule authenticated **POST** requests to `/api/cron/termine-notifications` approximately every minute using `CLEANUP_API_SECRET`. Missing credentials leave messages queued, while bookings still succeed.
- Retry delivery uses a five-minute lease and a provider idempotency key. This reduces duplicates; it is not an unlimited exactly-once guarantee beyond the provider's idempotency retention. Provider acceptance also does not prove inbox delivery.
- A private bearer link is retained in the owner-scoped outbox to support delivery and response-loss recovery; the token lookup collection stores its hash. Protect outbox backups and redact `/buchen/verwalten/*` and `/api/termine/manage/*` in reverse-proxy/access logs. The application excludes booking routes from analytics; infrastructure logging requires operator configuration.
- Guard conflict tests run against the real SQLite compatibility adapter. Live multi-instance Appwrite contention, real Resend delivery and cron scheduling require staging verification with operator credentials; this environment has none. No customer emails were sent during tests. Local verification passed: 107 automated tests, the Chromium browser workflow, ESLint on changed TypeScript files, and a production web build with type checking.
- Business configuration edits do not cancel existing appointments or share the booking interval guard. Review existing bookings when changing hours/staff/services. The current model uses business-wide working hours plus staff-specific blocks, not independent weekly rosters per staff member.
- Public booking copy is German; the existing notification language setting supports German/English emails. Email reminders, SMS, payments/deposits, video-conference creation, recurring/group bookings, and external calendar conflict synchronization are not included. Downloadable `.ics` files do not provide two-way synchronization or guaranteed remote event cancellation.
- Existing in-memory rate limits apply per server process. A multi-instance public deployment should use a shared limiter at the application edge.

See [Testing](TESTING.md) for repeatable checks and [Deployment](DEPLOYMENT.md) for environment requirements.
