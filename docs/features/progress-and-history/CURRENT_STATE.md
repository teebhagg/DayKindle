# Progress and history — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No values were checked against a seeded dataset and no screen was rendered in this pass. A 2026-10-27 simulator screenshot of Progress exists but is not current regression evidence.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

People keep going when they can see that effort adds up. Progress summarizes what was recorded over a chosen period and compares it with the period before; History lets a person look back at a specific day, week or month. Both describe recorded actions only, never inferred behavior.

## 2. Target user and expected outcome

Anyone with a few days of planner use. Expected outcome: an honest picture ("68% of recorded tasks completed, +6 points vs the prior 30 days"), a few earned milestones, and a calendar to revisit good days, without streak pressure.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Range selector: 7D, 30D, 3M, 6M, 1Y | **Verified** | `progressRanges` in `use-home-screen-model.ts`; radio group in `progress-tab.tsx`. |
| "Action completion" bar chart | **Verified** | 7, 6, 12, 6 or 12 buckets; each bar = completed ÷ recorded non-habit items in the bucket. SVG (`react-native-svg`). |
| Task completion rate and habit consistency, each vs prior period | **Verified** | `taskCompletionRate`, `habitConsistency`, prior-period equivalents; `formatProgressComparison()`: "No recorded actions yet", "N% · no previous data", or "+N points vs prior period". |
| Goal progress events and routine steps in range | **Verified** | `rangeGoalEventCount`, `routineEntryCount`, `completedRoutineCount`. |
| Achievements (6; 3 shown, "See more") | **Verified** | First step, Showing up (10 habits), A goal reached, Milestone moment, A fresh start (any recovery), Steady practice (50 actions). |
| Entry points: Daily check-in, History, Weekly reflection | **Verified** | Cards in `progress-tab.tsx`. |
| History calendar: month, week, day views | **Verified** | `history-screen.tsx`; navigation stops at the current period. |
| History items | **Verified** | Completed tasks, habits and routine steps; goals completed; milestones reached; goal progress updates with "value / target unit". |
| Missed, skipped or rescheduled items in History | **Not found** | `buildHistoryItems()` includes completions and goal events only. |
| Check-ins and reflections in History | **Not found** | Not part of the history items. |
| Streaks | **Not found (by design)** | No streak counters; achievements reward totals and recovery. |
| Export or share a summary | **Not found** | — |

**Journey:** Progress tab → choose a range → read the chart and the two rates → open History to see a specific date → tap a day to list what was completed.

## 4. Screens, components, state and persistence

- **Screens:** `app/(tabs)/progress*.tsx` → `HomeScreen` Progress tab → `features/home/progress-tab.tsx`; `app/history.tsx` → `features/home/history-screen.tsx`.
- **Calculations:** `use-home-screen-model.ts` (ranges, buckets, rates, achievements, `progressModel`); `history-analytics.ts` (`summarizePlannerHistory()` for weekday patterns used by Today recommendations, `isTerminalProgressStatus`, `percent`); `buildHistoryItems()` in `history-screen.tsx`.
- **State:** range and "show all achievements" are component state (reset on remount); History view and date are screen state.
- **Persistence:** none of its own; everything is derived from `entries`, `plans` and `goalProgressEvents`.
- **Analytics:** screen views `progress` and `history` only.

## 5. Business rules, validation and calculations

- **Range (Verified):** always ends today (not the selected date); starts `days − 1` earlier. The prior period is the same length immediately before.
- **Counted records (Verified):** non-goal occurrences whose status is `completed`, `missed` or `skipped`. `planned`, `rescheduled` and `cancelled` are excluded, so a rescheduled original does not count against the rate; its replacement counts when it ends.
- **Task completion (Verified):** every counted record whose `sourceType` is not `habit` — this includes routine steps.
- **Habit consistency (Verified):** counted records with `type` or `sourceType` = habit.
- **Buckets (Verified):** the chart excludes habits; an empty bucket draws a 3-pixel stub.
- **Percent (Verified):** `round(completed / total × 100)`; undefined when total is 0.
- **History date (Verified):** completed items are placed on the day they were completed (`completedAt` or the last `to: completed` history event), not the day they were planned.
- **Achievements (Verified):** computed from all history, not the selected range.

## 6. Loading, empty, success, error and offline states

- **Empty:** "No recorded actions yet"; empty buckets; History days read "no recorded activity" to screen readers. **Verified.**
- **Loading and error:** none needed; values derive synchronously from the loaded session. **Verified.**
- **Offline:** fully local. **Verified.**

## 7. Dependencies

Occurrence statuses and timestamps from [daily planning](../daily-planning/CURRENT_STATE.md) and [accountability](../accountability/CURRENT_STATE.md); goals and progress events from [goals](../goals-and-life-areas/CURRENT_STATE.md); check-in and reflection sheets; `react-native-svg`.

## 8. Functional limitations and confusing flows

- "Task completion" includes routine steps; a person with a long routine sees routine steps dominate a number labeled "task". **Verified.**
- Progress groups by planned date, History by completion date. A missed Monday task completed on Wednesday counts as Monday in Progress and appears on Wednesday in History. **Verified.**
- History shows only successes. There is no way to see what slipped on a past day, which the recovery-first design could use ("what helped me recover"). **Verified.**
- Achievements say nothing about when they were earned, and none can be lost (good), but there is no new-achievement moment. **Verified.**
- The chosen range resets to 7D whenever the tab remounts. **Verified.**

## 9. Defects and failure modes

- **Inferred:** missed counts depend on app usage because recurring items are only materialized for dates the app shows (see daily planning). A week without opening the app shows fewer recorded actions rather than misses, so rates can look better than reality. Whether that is desired is a product decision.
- **Verified:** a goal removed with "Remove" leaves its progress events; History shows them as "Goal progress updated" with no title.
- **Needs Validation:** values against a seeded dataset at range boundaries, across a daylight-saving change, and with 1+ year of data.

## 10. Performance, accessibility, security and testability

- **Performance:** each render filters the full entries list several times per range (current and prior). Fine for months of data; 1Y on multi-year histories is **Needs Validation**.
- **Accessibility:** range selector is a radio group; cards have labels and hints; History day buttons announce the date and activity count. The SVG chart has no accessibility label or text alternative. **Verified.**
- **Privacy:** no analytics beyond screen names. **Verified.**
- **Testability:** rates and buckets are inside a React hook (`useHomeScreenModel`); only `history-analytics.ts` is a plain module. No tests.

## 11. Missing capabilities and requirements to confirm

- A text summary or table alternative for the chart.
- Missed and recovered items in History (optional filter).
- A consistent date basis (planned vs completed) across both screens.
- Separate "routine steps" from "tasks" in the rates.
- Persisting the chosen range.
- Per-goal and per-area progress views.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): chart accessibility, a consistent date basis, separate routine-step rates, History filters including recovery, extracting the calculations into a tested module, and a seeded-data verification.

## Source map

- [Progress tab UI and chart](../../../mobile-app/src/features/home/progress-tab.tsx)
- [Ranges, rates, buckets, achievements](../../../mobile-app/src/features/home/use-home-screen-model.ts)
- [Weekday summary and terminal statuses](../../../mobile-app/src/features/home/history-analytics.ts)
- [History calendar and items](../../../mobile-app/src/features/home/history-screen.tsx)
- [History route](../../../mobile-app/src/app/history.tsx)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Daily planning](../daily-planning/CURRENT_STATE.md) · [Check-ins and reflections](../check-ins-and-reflections/CURRENT_STATE.md)
