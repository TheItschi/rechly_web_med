# Web / desktop feature comparison

Audited standalone `myaxyo/rechly_desktop` through `36a5940` (v1.5.0) on
2026-11-08. This repository's `desktop/` directory is a development wrapper,
not the standalone application.

## Desktop workflows now available on web

| Desktop source / workflow | Web implementation |
| --- | --- |
| `ui/business.js`: cockpit | Business overview, active projects, open/overdue tasks, recent documents, shortcuts |
| `src/business.ts`, `ui/business.js`: projects | Customer links, budgets, dates, status, completion and direct task creation |
| Same: tasks | Three-column board, inline status changes, card view, priorities, dates, assignee labels |
| Same: documents | Letter/minutes/note templates, searchable plain text, project links, PDF and UTF-8 export |
| `src/worklog.ts`, `ui/worklog.js`: time | Manual entries, persistent account timer, reviewed stop, billable/internal time and cost rates |
| Same: billing | Select up to 40 entries from one project, create an invoice draft, lock billed time; draft deletion releases it atomically |
| Same: export | UTF-8 CSV with spreadsheet formula protection |
| Same: project controlling | Time, billable/unbilled value, labor, expenses, invoiced/paid net revenue, estimated contribution and budget remaining |
| Same: project expenses | Create a real expense or assign an existing one; unassigning keeps the receipt |
| `src/calendar.ts`, `ui/calendar.js`: calendar | Month/week/day/agenda, categories, search, all-day/multiday events, location and notes |
| Same: recurrence | Daily/weekly/monthly/yearly intervals, optional end date, edit series, delete series or single occurrence |
| Same: interoperability | ICS preview, UID deduplication, resumable batches, export including recurrence, exclusions and reminders |
| Same: deadlines/reminders | Task/invoice deadline links; opt-in in-app/browser reminders while the dashboard is open |
| Native vault workspace data | Authenticated JSON export of all workspace kinds and customer-ID/name mapping |

The web uses Ant Design, German/English labels and responsive layouts. Its
week/day views group events by day; desktop's hour-positioned timeline is not
reproduced. Native vault encryption/recovery, OS updates, executable installation
and Ollama model installation remain desktop capabilities. Web AI settings
already support Ollama, but a hosted website cannot install local models.

The previous cross-platform change added desktop GiroCode generation and XML
corrections. This change does not modify those exporters or establish new
KoSIT/PDF-A certification. Live bank connections and automatic web–desktop
synchronization are not implemented.

## Enable the web workspace

The module is disabled by default and adds no required invoicing fields.
Deployment must complete these steps before users see the new features:

1. Use an Appwrite version supporting `Databases.createTransaction` /
   `updateTransaction` and transactional document operations. The server key
   needs document and transaction access. Older servers fail explicitly;
   billing never falls back to non-atomic writes.
2. With an operator key able to create/check attributes and indexes, run
   `node --env-file=.env.local scripts/migrate-workspace.mjs`.
   It creates/checks only `rechly-db/workspace_records` and its owner index,
   then creates and rolls back an empty transaction. Rerun it even if the earlier
   workspace migration has already been applied.
3. Set `NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED=1` at **build and runtime** and
   rebuild/deploy. The dashboard gains one optional Workspace submenu.
4. Check a staging account's projects, timer, billing/draft deletion, expenses,
   recurring events and ICS round trip before enabling production.

No live Appwrite credentials were supplied. Production migration and live
Appwrite transaction behavior have **not** been verified here. Automated tests
use disposable SQLite data through the development adapter.

Records have document security, no collection permissions and owner-read
document permissions. Authenticated, origin-checked APIs validate ownership and
fields for writes; lists paginate. Account erasure and guest expiry include all
workspace kinds, even after the module is disabled. Failed guest cleanup retains
the identity for retry.

## Workflow boundaries

- Time billing commits invoices, items, numbering and entry locks together.
  A separate `ZEIT-YYYY-0001` series and 40-entry cap keep transactions below
  100 writes. Review drafts before issue; small-business settings force zero VAT.
  Issued/paid time invoices cannot be deleted to release billed entries.
- Timers survive navigation, reloads and sessions. Stop asks users to review date
  and duration; a stale tab cannot stop a newer timer.
- Reports distinguish planned value, actual invoices and payments. Contribution
  is an estimate, not a tax report. Small-business expense estimates use gross
  costs; other estimates use net costs.
- Projects archive as Done. Tasks/documents delete after confirmation. Assignees
  are labels, not invitations. Business records and unbilled time use last
  successful save; calendar edits detect stale versions.
- Calendar wall times follow the viewing device's zone. Single UTC ICS events
  convert into the importing device's zone. Unsupported TZID rules, recurring UTC,
  COUNT/BYDAY and recurrence overrides are rejected before writes.
- ICS accepts up to 5 MB / 2,000 events, previews first and commits at most 40
  events per request. The UI continues batches automatically. Interrupted imports
  can be retried; committed UIDs are skipped. This is not external calendar sync.
- Reminders require explicit opt-in per browser; system notifications require
  browser permission too. Closed/suspended browsers cannot reliably deliver
  reminders. There is no server push or reminder email service.
- Workspace JSON contains projects, tasks, documents, times, timer, billing and
  expense associations, calendar and counters. Download it separately from the
  accounting backup. Restore/merge, customer-ID remapping and automatic sync are
  not implemented; the accounting migration wizard cannot restore this export.

## Verification

Run `npm test`, `npx tsc --noEmit`, targeted ESLint and a production build.
Regression tests cover concurrent billing and rollback, timer conflicts,
ownership, billed locks/draft release, costs, calendar dates/DST/recurrence,
stale edits, bounded ICS retries and all-record cleanup.

Start a disposable server for the Chromium workflow test:

```bash
RECHLY_DESKTOP=1 NEXT_PUBLIC_RECHLY_DESKTOP=1 NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED=1 RECHLY_DATA_DIR=/tmp/rechly-parity-web-test npm run dev -- --hostname 127.0.0.1 --port 3104
```

In another terminal:

```bash
RECHLY_DATA_DIR=/tmp/rechly-parity-web-test node tests/workspace-parity.browser.cjs
```

It exercises manual time, persistent timers, billing, locked entries, costs,
recurrence, calendar views, ICS export/deduplication, mobile layout, overview,
language switching and workspace export. Requires Playwright Core (or
`RECHLY_PLAYWRIGHT_PATH`) and Chromium (`RECHLY_CHROMIUM`, defaults to
`/usr/bin/chromium`). Never use production data.

The earlier project/task/document browser test uses the same server command with
`RECHLY_DATA_DIR=/tmp/rechly-workspace-test` and `tests/workspace.browser.cjs`.
Stop one server before starting the other. Live Appwrite deployment remains a
separate release check.
