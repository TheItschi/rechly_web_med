# Web / desktop feature comparison and implementation

Compared `myaxyo/rechly_web` main (`69d6784`) with the separate
`myaxyo/rechly_desktop` repository (`e45e071`) on 2026-11-07. The `desktop/` directory in
this web repository is a development wrapper, not the standalone desktop app.

## Implemented in this change

- **Desktop → web:** optional projects, tasks and plain-text business documents.
  Projects link to existing customers and have estimated budgets, dates, status
  and task completion. Tasks have project links, status, priority, dates and
  assignee labels. Documents have letter/minutes/note templates, project links,
  searchable content and PDF/UTF-8 text export. German and English UI, mobile
  layout, explicit save, discard confirmation and recoverable save errors.
- **Web → desktop:** optional local GiroCode generation on unpaid invoice
  previews and PDFs, for all three templates. Disabled by default; no API,
  internet, bank connection or external image service is involved.
- **Both:** consistent payment QR validation for IBAN checksums, BIC format,
  amounts, control characters, field limits and EPC's 331-byte payload limit.
- **Desktop invoice corrections:** discounted net prices in CII XML, explicit
  0% VAT, separate header tax groups for mixed rates, a small-business exemption
  reason, untruncated quantities, discounted preview amounts and visible line
  tax rates. These regression tests do not establish full KoSIT/PDF-A compliance
  for the desktop exporter.

## Enable the web workspace

The module is disabled by default. Existing invoice screens and customer forms
gain no mandatory fields. To enable it on a deployed Appwrite-backed website:

1. With a scoped operator key, run
   `node --env-file=.env.local scripts/migrate-workspace.mjs`.
   It creates only `rechly-db/workspace_records` and its attributes/index;
   rerunning checks compatibility. It does not alter existing collections.
2. Set `NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED=1` for the build **and runtime**,
   then rebuild/deploy. The dashboard gets one optional **Workspace** entry.
3. Verify a staging user's create/edit/export/delete flow before production.
   No live Appwrite credentials were available for this implementation session;
   the cloud schema migration has not been run.

The collection has document security, no collection permissions and only
owner-read permissions on individual records. All writes go through the
authenticated Next API, which validates customer/project ownership and fields.
Queries traverse all pages. The existing account-erasure workflow also removes
workspace records, even if the module has subsequently been disabled.
The existing guest-expiry job also removes all workspace pages before deleting
a guest identity and retains the identity if that cleanup fails.

Projects are archived by setting status to Done; the API does not delete them,
so a concurrent task save cannot link to a deleted project. Documents and tasks
can be deleted after confirmation. Assignees are labels, not user accounts or
notifications. Budgets are plans, not accounting revenue. Concurrent edits to
the same record use last successful save; this is not collaborative editing.

**Data portability:** the module's JSON export contains its projects, tasks and
documents only. Download it separately from the existing accounting migration
backup. Its record shape follows desktop's business data, but importing or
merging it, remapping customer IDs, and automatic synchronization are not yet
implemented. The existing migration wizard must not be treated as a workspace
restore tool. Desktop's encrypted vault backups already cover its workspace
and the new payment setting.

## Remaining differences

| Workflow | Web | Standalone desktop |
| --- | --- | --- |
| Customers, products, invoices, offers, expenses | Available | Available offline |
| Projects, tasks, business documents | Optional module added here | Available offline |
| Payment QR on invoices | Available; validation strengthened | Optional setting added here |
| Time tracking, time-to-invoice, project cost reporting | Not ported | Available |
| Calendar, recurring events, ICS, device reminders | Not ported | Available offline |
| Recurring invoice scheduling, dunning workflow, bank CSV matching | Available | Not ported as equivalent workflows |
| Hybrid PDF/A-3 + embedded XML invoice export | Existing validated sample fixtures | Not ported; ordinary PDF and CII XML remain separate |
| Cloud accounts and multiple devices | Appwrite-backed | Single local vault |
| Local AI / optional external AI | Available | Available |
| Live bank connection / automatic web–desktop sync | Not implemented | Not implemented |

Further ports need explicit design for time-entry billing locks, scheduled jobs,
reminder delivery, data migrations and platform-specific validation. Calendar
events should not become required invoice fields; adding cloud-only workflows
must preserve desktop's offline operation.

## Verification

- Web: `npm test`, `npx tsc --noEmit`, production build and targeted ESLint.
  Workspace tests include foreign-user references/IDs, pagination, invalid input,
  ownership during deletion, and multipage PDF text.
- Browser: start a disposable server with
  `RECHLY_DESKTOP=1 NEXT_PUBLIC_RECHLY_DESKTOP=1 NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED=1 RECHLY_DATA_DIR=/tmp/rechly-workspace-test npm run dev -- --hostname 127.0.0.1 --port 3104`.
  Run `RECHLY_DATA_DIR=/tmp/rechly-workspace-test node tests/workspace.browser.cjs`.
  Requires Playwright Core (or `RECHLY_PLAYWRIGHT_PATH`) and Chromium
  (`RECHLY_CHROMIUM`, defaults to `/usr/bin/chromium`). Do not use production data.
- Desktop: `npm test` and `RECHLY_HEADLESS=1 node tests/parity.electron.cjs`
  after a build. The latter starts the actual Electron app in a temporary vault,
  tests native IPC, all invoice templates and PDF export. On a desktop machine,
  omit `RECHLY_HEADLESS`.
- Automated tests use synthetic data. Live Appwrite deployment, Windows/macOS
  installers and scanning with real banking apps are separate release checks.
