# Termine — Booking Engine

Pure function `computeAvailability` (`src/lib/termine/availability.ts`): no I/O,
no clock except via explicit `nowUtc` (testable).

1. **Eligible staff** = active + bookable + assigned to the service (optionally one selected).
2. **Day schedule** = date override if present, else weekly template; closed → no slots.
3. **Windows** = working periods minus breaks, per day, in business-tz wall minutes.
4. **Candidates** = wall starts on the slot grid fitting prep + service + cleanup inside a window; nonexistent DST wall times are skipped (`wallToUtc` returns null on the spring gap; autumn ambiguity resolves deterministically to one occurrence).
5. **Filters**: past + `minNoticeMinutes`, beyond `maxHorizonDays`, prep/buffer overlap with busy intervals (appointments with blocking status + blocks, staff-scoped).
6. First eligible staff (deterministic id order) wins each start in any-staff mode.

Blocking statuses: `PENDING`, `CONFIRMED`, `COMPLETED`. Cancelled/no-show release the slot.
Completed appointments intentionally keep blocking so history can never be rewritten into a double booking.

**Atomic commit** (`src/lib/termine/booking.ts` + `store.ts#atomic`): re-validate the slot inside an Appwrite transaction, touch deterministic staff/UTC-day guard rows for every day of the occupied interval, then create the deterministic start reservation (concurrent overlapping commits conflict → one 409), then appointment, manage token, audit and outbox rows, then commit. Transaction conflicts roll back everything. Reschedule deletes the old reservation before claiming the new one and restores it if the claim fails, so a booking is never lost. Cancel deletes the reservation (missing = already gone after retry) and flips status; the state machine (`canTransition`) forbids illegal moves.

Verified by `tests/termine-booking.test.ts`: 8-way concurrent race yields exactly one winner; overlapping/buffered starts conflict; reschedule conflict preserves the original; cancel frees the slot; double cancel is rejected. Additional regression tests cover any-staff selection, replay recovery, original duration/buffers on reschedule, notice enforcement and notification leases. Guards deliberately serialize even non-overlapping concurrent writes for the same staff/day; a rejected request may retry after refreshing availability.
