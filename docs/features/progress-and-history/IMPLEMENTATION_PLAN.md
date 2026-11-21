# Progress and history — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| PH1 | B3 — extract `progress-metrics.ts` | SaS-Next-Steps T0.2 | No |
| PH2 | A2 — seeded fixture with expected values | PH1 | No |
| PH3 | A1 — chart text alternative and list view | — | No |
| PH4 | B1, B2 — routine steps separated; date-basis labels | PH2 | No |
| PH5 | C1 — History filters including recovery | Daily planning DP1 | No |
| PH6 | B4, C4 — remember range; achievement moment | — | No (PostHog event only) |
| PH7 | C2 — journal markers | Check-ins CR6 | No |
| PH8 | C3 — goal detail | Goals G1 | No |

## 2. Decisions needed

1. **Date basis (PH4):** recommended "label, don't change" as described in B2.
2. **Missed items in History (PH5):** confirm they appear only behind a filter, never by default.
3. **Achievement moment (PH6):** confirm a toast is welcome and not pressure.

## 3. Work packages

### PH1 — Metrics module

- **Files (new):** `mobile-app/src/features/progress/progress-metrics.ts`, `progress-metrics.test.ts`.
- **Contents:** `progressRanges`, `computeRange(today, rangeId)`, `computeRates(entries, start, end)`, `computeBuckets(entries, range, start)`, `computeAchievements(entries, plans)`. Import types only from `home-session.tsx`; import `occurrenceStatus` from `occurrences.ts` (dependency-free).
- **Change:** `useHomeScreenModel` calls the module; `ProgressTabModel` stays the same shape.
- **Done when:** no visual change; tests cover each range's bucket boundaries.

### PH2 — Fixture

- **File (new):** `mobile-app/src/features/progress/fixtures/planner-90-days.ts` generating a deterministic planner (fixed seed) with tasks, habits, routine steps, misses, reschedules, skips, and goal events.
- **Expected values:** computed by hand in a table in the test file for 7D, 30D, 3M; asserted for `today` = a fixed date, run under two time zones.

### PH3 — Chart accessibility

- `progress-tab.tsx`: wrap the `Svg` in a view with `accessible`, `accessibilityRole="image"`, and a label from a pure `describeBuckets(buckets, unit)` (tested). Add a "Show as list" toggle that renders rows with `accessibilityRole="text"`.

### PH4 — Clearer rates

- Task rate counts `sourceType === 'task'` only. Chart title "Action completion" gains the subtitle "Tasks and routine steps". History items with `completionDate !== entry.date` show "Planned for <date>".

### PH5 — History filters

- `buildHistoryItems()` returns typed items for completed, missed, skipped, recovered, goal events. Filter chips above the list; default Completed. Missed items show the recovery choice label (from the existing option lists) and, when present, the reason label. Custom reason text is shown only in the day view.

### PH6 — Range and achievements

- Store `progressRangeId` in session settings (excluded from sync like `selectedDate` after DP6).
- Track earned achievement ids in session settings; on a new id, show a toast once and send `achievement_earned { achievement_id }`.

### PH7, PH8

- PH7 adds markers once the journal exists. PH8 adds `app/goal-detail.tsx` reading `goalProgressEvents` and linked occurrences via PH1 functions.

## 4. Rollout and rollback

App-only. PH4 changes a displayed number; mention it in release notes. Rollback is a previous build.

## 5. Exit evidence

PH1/PH2 tests pass with hand-computed values; VoiceOver and TalkBack read the chart summary; manual check of a late completion appearing correctly in both screens. [Current state](CURRENT_STATE.md) updated.
