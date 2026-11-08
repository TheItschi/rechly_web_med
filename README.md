# Rechly

Rechly is an open-source invoicing app for freelancers and small businesses. In addition to the Next.js web application, Rechly is available as a standalone 100% offline desktop application: **[Rechly Desktop](https://github.com/myaxyo/rechly_desktop)**.

## Desktop Edition (100 % Offline)

Prefer running everything locally without cloud or account requirements? **[Rechly Desktop](https://github.com/myaxyo/rechly_desktop)** stores all data on-device in a local vault:

- **100% Offline & Privacy-First**: No internet connection, cloud login, or remote server required.
- **E-Rechnung**: XRechnung 3.0 & ZUGFeRD 2.3 XML export for German B2B e-invoicing compliance (EN 16931).
- **DATEV Export**: Standard DATEV EXTF format 700 CSV export for tax consultants (*Steuerberater*).
- **Optional Local AI**: Natural language text-to-invoice quick fill with local Ollama models (e.g. [`jonprompter/Rechly-DE-3B`](https://ollama.com/jonprompter/Rechly-DE-3B)).
- **Downloads**:
  - [Windows 10/11 (64-Bit)](https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-Setup-win-x64.exe)
  - [macOS Apple Silicon (M1+)](https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-mac-arm64.dmg)
  - [macOS Intel](https://github.com/myaxyo/rechly_desktop/releases/latest/download/Rechly-Desktop-mac-x64.dmg)
  - [All Releases & Release Notes](https://github.com/myaxyo/rechly_desktop/releases)
  - [Source Code](https://github.com/myaxyo/rechly_desktop)

## Stack

- Next.js App Router, React, TypeScript, Ant Design
- Appwrite for auth, database, and server-side admin operations

## Repository Layout

- `src/` - web app routes, UI, shared services, and client/server Appwrite code
- `public/` - static assets and favicons

## Prerequisites

- Node.js 24+ (required for desktop SQLite development; web-only also works on Node 20+, but 24 is recommended)
- npm
- An Appwrite project with the database and collections used by the app

## Web App Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

The app expects the Appwrite database and collections defined in `src/lib/appwrite.ts` and `src/lib/appwrite-server.ts`. Rechly does not yet ship Appwrite provisioning automation, so self-hosters need to create those resources in their own Appwrite project.

## Optional workspace

The optional workspace includes a business overview, projects, a task board,
business documents, time tracking and timers, time-to-invoice billing, project
cost reports, and a calendar with recurring events and ICS import/export.
These workflows add no required fields to ordinary invoicing.
See [web/desktop feature parity and setup](docs/FEATURE_PARITY.md) for the additive
Appwrite migration, feature flag, supported exports and remaining differences.

## Analytics

Revenue forecasting, late-payment risk scoring, customer segmentation, and anomaly detection are computed directly in the Next.js API route (`/api/analytics/insights`). No external ML service is required — the app trains a lightweight logistic regression model on the fly using your invoice history.

## Open-Source Release Notes

- Do not commit `.env.local` or any real credentials.
- Rotate any secrets that existed in local or historical tracked files before publishing this repository.
- Google Analytics is disabled by default unless `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` is set.
- All deploy-specific URLs, repo links, and contact details should be configured via environment variables.
- User-provided AI API keys are encrypted server-side and require `AI_SETTINGS_ENCRYPTION_SECRET` to be set.
- AI requests are rate-limited per user through `AI_DAILY_REQUEST_LIMIT` to reduce accidental provider cost spikes.

## Development Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:einvoice
```

Integration (`tests/einvoice.integration.ts`) is a manual script, not part of
`npm test` — it needs an isolated desktop-backed Next server on `:3102`:

```bash
npm run test:integration
```

## Account Deletion

Users can immediately and permanently delete their account and all associated
data themselves from Settings (`DELETE /api/auth/account`). See
[account deletion documentation](docs/ACCOUNT_DELETION.md).

## Optional E-Invoice Details

Customers can store buyer identifiers and multiple delivery branches; company
settings support seller identifiers. New invoices allow buyer/delivery overrides
and optional item GTINs. Advanced fields stay collapsed until needed, with German
and English labels. Customer retrieval has no fixed record cap.

Before deploying, run the additive Appwrite migration. See
[setup, field mappings, tests and validation limits](docs/E_INVOICE_IDENTIFIERS.md).
The export test corpus passes KoSIT XRechnung 3.0.2, veraPDF PDF/A-3b and Mustang
Factur-X checks. See [validation evidence and reproduction steps](docs/COMPLIANCE_VALIDATION.md).

## Electron Development Wrapper

This repository also includes an Electron wrapper for developing the dashboard
against an on-device SQLite database. It requires Node.js 24 for development,
does not require Appwrite, and stores data in the operating system's
application-data directory. The published desktop app and its downloads are
maintained in the separate [Rechly Desktop repository](https://github.com/myaxyo/rechly_desktop).

```bash
# Start Next.js and Electron in local desktop mode
npm run desktop:dev

# Build an unpacked app for the current operating system
npm run desktop:pack

# Build an installer for the current operating system
npm run desktop:dist
```

The desktop File menu can open the local data directory and create a consistent
SQLite backup. Windows, macOS, and Linux installers are configured; release
installers still need platform signing before distribution.

## Related Repositories

| Repository | Description |
|---|---|
| [rechly_web](https://github.com/myaxyo/rechly_web) | Next.js web application (this repo) |
| [rechly_desktop](https://github.com/myaxyo/rechly_desktop) | 100% offline desktop application for Windows and macOS |

## Current Gaps

- Appwrite infrastructure is documented but not auto-provisioned. `appwrite.config.json` is the source of truth — apply it with the Appwrite CLI (`npx appwrite deploy` / `appwrite init`, see skill `appwrite-cli`) or create the `rechly-db` tables manually to match `src/lib/appwrite.ts`.
- `invoices/create/page.tsx` (~1000 lines) and `MigrationWizard.tsx` (~1500 lines) still need component/hook extraction (stateful UI — refactor with running app + Playwright coverage).
- Release installers need platform signing before distribution.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).
