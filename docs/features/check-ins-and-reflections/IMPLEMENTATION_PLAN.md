# Check-ins, reflections and commitments — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [accountability plan](../accountability/IMPLEMENTATION_PLAN.md) (commitment outcomes, pace, reason summaries).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| CR1 | C4 — pure week and metric functions with tests | SaS-Next-Steps T0.2; accountability A1 | No |
| CR2 | A1 — check-in save error | — | No |
| CR3 | A2, A3 — edit and delete commitments; deadline minimum | CR1 | No |
| CR4 | B1 — Today check-in card | — | No |
| CR5 | B3 — non-empty reflections | — | No |
| CR6 | C1 — journal view | — | No |
| CR7 | B2 — reflection prefill | Accountability plan A6 | No |
| CR8 | C2 — personal trends | CR6, owner copy review | No |
| CR9 | C3 — check-in reminder preset | Reminders plan (deep links) | No |

All data stays in `checkIns`, `reflections` and `commitments`. No new collections.

## 2. Decisions needed

1. **Today card timing (CR4):** recommended morning before 12:00 and evening after 17:00, local time.
2. **Trend wording (CR8):** owner review of every sentence; no clinical language.
3. **Commitment delete (CR3):** permanent delete, or "released" outcome only (accountability A2 recommends outcomes; delete is for mistakes).

## 3. Work packages

### CR1 — Pure functions

- **Files (new):** `mobile-app/src/features/home/week.ts` (`weekStartFor(dateKey)` Monday-based) with tests; commitment metrics move into `features/accountability/accountability.ts` as planned in accountability A1.
- **Done when:** `use-home-screen-model.ts` and `home-screen.tsx` call these; tests cover week boundaries and metric date edges.

### CR2 — Check-in error

- Add `saveError` state to `DailyCheckInSheet`; set it in the catch block; render `AppFeedback` above the save button with a retry that calls `retrySave()` then `confirmLocalSave()`.

### CR3 — Commitment editing

- **UI:** each commitment card gets "Edit" and "Delete". The form reuses `createCommitment()` with the existing `pendingCommitmentId` pattern (it already replaces by id).
- **Rules:** editing keeps `id` and `createdAt`; deadline picker minimum is today for new items.
- **Analytics:** `commitment_updated` and `commitment_deleted` with the same categorical flags as `commitment_created`.

### CR4 — Today card

- In the Today tab, render a small card when the current time window applies and that period is not saved for today. Tapping opens `DailyCheckInSheet` with an `initialPeriod` prop (new). "Not today" hides it until tomorrow (stored in session settings with the date).

### CR5 — Non-empty reflections

- Disable "Save reflection" until one field has non-whitespace text. Existing empty records stay.

### CR6 — Journal

- **Files (new):** `mobile-app/src/app/journal.tsx` and `features/home/journal-screen.tsx`.
- **Data:** merge `checkIns` and `reflections` into a date-sorted list (pure `buildJournal()` with tests). Windowed `FlatList`.
- **Entry points:** Progress ("Your journal") and History header.
- **Analytics:** `journal_opened` only; add `journal` to the screen whitelist in `app/_layout.tsx`.

### CR7 — Prefill

- Implemented by accountability plan A6 (weekly reflection prefill); this step only places it in the sheet. Renders read-only counts above the fields.

### CR8 — Trends

- Pure `checkInTrends(checkIns, entries, range)` returning weekly averages and completion by energy band, tested. Render only when ≥ 5 check-ins in range.

### CR9 — Reminder preset

- After the reminders plan adds notification routing, add "Evening check-in" as a preset that opens `/?checkIn=evening` (handled by HomeScreen).

## 4. Rollout and rollback

App-only. No schema changes; older builds read the same records. Rollback is a previous build.

## 5. Exit evidence

Tests for CR1 and CR6/CR8 builders pass. Manual iOS and Android run: morning and evening check-in from Today and Progress, forced save failure, reflection create and update, commitment create, edit, delete, journal browsing with VoiceOver and TalkBack. [Current state](CURRENT_STATE.md) updated.
