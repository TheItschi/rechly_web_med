# Termine — Testing

Run: `npx tsx --test tests/termine-*.test.ts` (also covered by `npm test`).

| File | What it proves |
|---|---|
| `tests/termine-engine.test.ts` | Slug normalization/validation/reserved names; host→slug extraction; wall-time parsing; UTC conversion winter/summer; spring DST gap rejected; autumn fold deterministic; midnight arithmetic; overlap semantics (touching edges excluded); status machine transitions |
| `tests/termine-availability.test.ts` | Slot grid with service+cleanup; booked intervals incl. buffers excluded; any-staff determinism; breaks/overrides/blocks/notice honored; inactive staff and unknown staff yield nothing |
| `tests/termine-booking.test.ts` | Against the real desktop SQLite adapter: **8-way concurrent booking race → exactly one wins**; overlapping/buffered starts conflict; reschedule conflict preserves the original; cancel frees the slot; double cancel rejected; completed appointment → exactly one draft invoice (`TN-YYYYMMDD-####`), re-run is a no-op; ICS contains valid `DTSTART`; confirmation email renders |

Browser E2E (manual, desktop mode, documented in the final report): wizard activation → staff/service setup → publish → public booking flow → confirmation + manage link → customer cancel with policy enforcement → dashboard manage (complete → invoice draft) → double-book attempt rejected with 409.

Not yet automated: Playwright E2E (repo has `tests/workspace.browser.cjs` as the pattern; a `tests/termine.browser.cjs` following it is the recommended next step), load testing (100/1k-business synthetic seeding against a staging Appwrite instance — never production).
