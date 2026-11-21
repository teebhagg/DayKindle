# Progress and history — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** makes numbers trustworthy or accessible; **P2** makes them clearer; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects

### A1. Give the chart a text alternative — P1, S

- **Evidence:** **Verified** — the SVG in `progress-tab.tsx` has no accessibility label.
- **Approach:** `accessible` + `accessibilityLabel` summarizing the series ("Action completion, last 7 days: Mon 50%, Tue 100%, … 3 days with no recorded actions"), and a "Show as list" toggle that renders the buckets as rows.
- **Tests:** label builder unit test; VoiceOver and TalkBack read it.

### A2. Verify the numbers with seeded data — P1, M

- **Evidence:** **Needs Validation** — no calculation has been checked against known data.
- **Approach:** a fixture planner with hand-computed expected values for each range, including a daylight-saving week and a rescheduled item; assert them in unit tests (after B3 extraction) and compare on a device once.

## B. Refine existing capabilities

### B1. Separate routine steps from tasks — P2, S

- **Evidence:** **Verified** — "Task completion" includes routine steps.
- **Approach:** compute tasks as `sourceType === 'task'`; routine steps already have their own card. Keep the chart's combined "Action completion" but label it so.
- **Compatibility:** numbers change for routine users; note it in release notes.

### B2. One date basis — P2, S

- **Evidence:** **Verified** — Progress uses the planned date, History the completion date.
- **Recommended:** keep both but say which in the UI: History items completed late show "planned for Mon" as detail. This keeps History truthful about when work happened and Progress truthful about plans.

### B3. Extract calculations into a tested module — P1, M

- **Evidence:** **Verified** — rates and buckets live inside `useHomeScreenModel`.
- **Approach:** `features/progress/progress-metrics.ts` with `computeProgress(entries, plans, events, range, today)` returning the same `ProgressTabModel` fields; the hook memoizes the call.

### B4. Remember the chosen range — P3, S

- Store the last range in session settings (device-local, not synced).

## C. New capabilities

### C1. History filters, including recovery — P2, M

- **Why:** History shows only successes; the recovery-first design benefits from seeing "missed → rescheduled → done".
- **Approach:** filter chips: Completed (default), Missed and skipped, Recovered (has `recoveryAction` or `relatedOccurrenceId`), Goals. Missed items use neutral styling and show their recovery choice; reasons are shown only to the owner, as already stored.

### C2. Check-ins and reflections in History — P3, S

- Show a small marker on days with a check-in or reflection; the day view links to the journal entry (see [check-ins plan](../check-ins-and-reflections/IMPLEMENTATION_PLAN.md) CR6).

### C3. Per-goal and per-area progress — P3, M

- A goal detail view with its linked actions' completion over time and its progress events as a line. Area summary gains completion for linked actions.

### C4. New-achievement moment — P3, S

- When an achievement becomes earned, show one calm toast ("A fresh start — you chose a next step after a missed day"). Track `achievement_earned { id }` (fixed ids, no content). Respect reduced motion.

## Measurement

Aggregates only: Progress and History screen views per active user per week; range selection distribution; achievement earned counts by id (after C4).
