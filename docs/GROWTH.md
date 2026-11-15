# Growth: SEO CTR, positioning and activation

## Problem 1 — 800–1000 impressions/day but only 10–20 clicks (CTR ~1–2 %)

That pattern is a **position + snippet problem**, not a traffic problem. Google
shows Rechly often on page 2 / low page 1, where CTR is 1–4 % even with good
titles. Two levers, in order:

1. **Snippet (done in code).** Homepage and `/features` titles now lead with the
   exact query (`Kostenlose Rechnungssoftware … [0 €]`), state the price anchor
   and end with a call to action. Hero H1 matches the title promise.
2. **Position (owner action, in Search Console).** Sort Performance by
   impressions, filter average position 5–20, CTR below position average.
   For each such query: (a) confirm the landing page answers that exact query in
   the first screen, (b) add 2–3 internal links from tools/lexikon/vorlagen
   pages with that query as anchor, (c) request indexing after the deploy.
   Expect 2–4 weeks before re-measurement; compare equal 28-day windows.

Do not add fake ratings/reviews schema: Google ignores or penalises invented
`aggregateRating`. FAQ rich results were discontinued by Google in May 2026, so
FAQ schema stays only as page content / AI-search context, not a CTR lever.

## Problem 2 — Signups that never create a first invoice

Fixed in this change: professional split-screen auth (login, register,
forgot/reset password), an honest competitor comparison on `/` and `/features`,
password recovery (previously missing entirely — a locked-out user churned
silently), and a 3-step getting-started checklist on the empty dashboard.

### Competitor snapshot (Sep 2026, net prices from published price lists)

| | Rechly | Lexware Office (lexoffice) | sevDesk |
|---|---|---|---|
| Price | 0 € forever | 7.90–32.90 €/mo | 8.90–25.90 €/mo |
| Free-tier invoice limit | none | — | 3/month |
| E-invoice sending | included | top tier only | included |
| Booking, projects, time tracking | included | no | no |
| Offline desktop, open source, self-host | yes | no | no |

Rechly already ships almost every paid competitor feature that is free to
provide (DATEV export, bank file matching, dunning, recurring invoices,
migration import, optional BYO-key/Ollama AI). The remaining paid-suite edge —
full bookkeeping with direct ELSTER filing and tax-advisor portal — needs
certified third-party filing and is deliberately out of scope; the landing
copy says so honestly and wins on price, limits, lock-in and privacy instead.

### Free differentiators added / surfaced

- Password recovery via Appwrite (`/forgot-password`, `/reset-password`) — €0.
- “Switch in 2 minutes” activation path on the homepage and dashboard.
- Comparison tables that name exact competitor prices and limits.

### Next free wins (no third-party cost)

1. Public invoice link with GiroCode “pay now” (GiroCode already exists).
2. Email sending of invoices via the operator's own SMTP (Appwrite SMTP).
3. Weekly “open amounts” digest email via the existing cron route.
4. More importers (sevDesk/lexoffice CSV dialects) in the migration wizard.

## UI system (what “professional” means here now)

One design language everywhere: ink `#152438`, brand blue `#2855d9`, muted
`#526174`, hairline `#e3e9f1`, 8–10px radii, no rainbow icon palettes, no
indigo/purple accents, no cream or blue hero gradients.

- Public: `PublicTheme` (AntD tokens) in the root layout; ink `Footer`;
  `ToolLayout` + tools hub on `tool.module.css`; keyword/SEO pages retokened.
- Auth: split-screen `AuthShell` for login, register, forgot/reset password.
- Dashboard: `dashboard.css` “subpage system” — every list, form, settings,
  workspace and Termine page inherits the same cards, tables, inputs, tags.
- Verified: all key public routes return 200 with the new titles and zero
  legacy `indigo` classes in the rendered HTML.

## Retention & smoothness research (Nov 2026)

What keeps users on invoicing platforms, and what Rechly now does about it —
everything below is free to run (no paid third-party service):

| Driver (source pattern) | Rechly |
|---|---|
| First invoice fast, guided empty states | 3-step getting-started checklist on empty dashboard |
| Never lose work / get locked out | Password recovery (Appwrite), guest mode with upgrade path |
| Clients pay faster with a link + QR | **Public invoice link** `/i/[token]`: view, status, GiroCode QR to pay; revocable in one click |
| Automation without effort | Recurring invoices, dunning/reminder drafts, booking self-service |
| Power users stay for speed | **Cmd/Ctrl+K command palette**: every page and “create” action by keyboard |
| Perceived performance | **Skeleton loading** (`loading.tsx` for dashboard + public), 220 ms page entrance, `prefers-reduced-motion` respected |
| No lock-in fear | One-click data export/backup, CSV importers for lexoffice/sevDesk/FastBill/Papierkram/DATEV, self-hosting |
| Habit loop | Booking page clients reuse, projects/time that turn into invoices, DATEV handover at tax time |

Still deliberately out (needs paid/certified third parties): direct ELSTER
filing, live bank feeds (PSD2 aggregator), card payment processing, OCR
receipt scanning at scale. The free equivalents ship instead: EÜR/tax reports,
bank file import + matching, GiroCode payment, optional BYO-key/Ollama AI.

Sources: vendor pricing/feature pages (Lexware Office, sevDesk, FreshBooks,
Wave) and 2026 B2B-SaaS UX retention roundups — skeleton loaders (~30 %
better perceived load), command palettes and keyboard-first flows are the
patterns premium tools (Linear, GitHub) normalised.

## Measurement

- Search Console: clicks, impressions, CTR, position for `/` and `/features`,
  28 days before vs. after deploy (after re-crawl).
- Product: % of new accounts creating a first invoice within 7 days
  (activation), guest→account conversion.
