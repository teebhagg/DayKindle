# Daily planning — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** fixes wrong data or a missing core action; **P2** removes friction or risk; **P3** is an enhancement. Effort: S (a day or two), M (under a week), L (more).

## A. Fix defects

### A1. Send completion analytics only after the local save succeeds — P1, S

- **Evidence:** **Verified** — `toggleEntry()` calls `posthog?.capture('planner_item_completion_toggled', …)` before `setEntries` (TD-14, SaS-Next-Steps T0.5). The dashboard's "engaged users" and "follow-through" both count this event.
- **User benefit:** none directly; the team's completion numbers become trustworthy.
- **Approach:** await `confirmLocalSave()` after the state change, then capture. On failure, show the existing save-error feedback and send nothing.
- **Risk:** a slow save delays the event. Completion UI must stay optimistic.
- **Tests:** unit test with a fake save that rejects → no event; resolves → one event with the same properties as today.

### A2. Decide what happens to an item added to a past date — P2, S

- **Evidence:** **Verified** — `addEntry()` sets `status: 'missed'` when `selectedDate < today`. The toast still says "Task added".
- **Options:** (a) create it as `completed` ("log something I did"), (b) ask "Did you do it?" with Done / Missed, (c) block past dates. Option (b) is recommended because it matches the recovery-first tone.
- **Tests:** past, today and future dates each produce the chosen status, with a status-history entry.

## B. Refine existing capabilities

### B1. Delete a task or habit and end a recurring series — P1, M

- **Evidence:** **Verified (no code path)** — nothing removes a `TaskDefinition` or `HabitDefinition`.
- **User benefit:** a mistaken or finished recurring item stops appearing.
- **Approach:** on the edit sheet, offer "Stop repeating" (sets an `endDate` on the definition so `recurrenceMatches` returns false after it) and "Delete" (removes the definition and only **planned future** occurrences; completed and missed history stays). Use a confirmation that says how many future items will be removed.
- **Compatibility:** `endDate` is optional; old records behave as today. Sync carries definitions as whole entities, so no server change.
- **Tests:** recurrence with and without `endDate`; delete keeps terminal history; synced delete produces a tombstone.

### B2. Make recurring edits explicit — P2, M

- **Evidence:** **Inferred** — editing a planned recurring occurrence rewrites the definition, which changes all future dates.
- **Approach:** when the source recurs, ask "Only this day" (edit the occurrence snapshot) or "This and future days" (edit the definition).
- **Tests:** both paths; past terminal occurrences never change.

### B3. Allow skip and cancel on planned items — P2, S

- **Evidence:** **Verified** — `cancelled` is never set; `skip` exists only as a recovery action on missed items.
- **Approach:** add "Skip today" to the edit sheet for planned items (status `skipped`, reason optional). Keep `cancelled` for system use (definition deleted).
- **Tests:** status machine transitions; Progress counts skipped as terminal (it already does).

### B4. Make `selectedDate` device-local — P3, S

- **Evidence:** **Verified** — `selectedDate` is in `SETTINGS_FIELDS` and syncs. **Inferred** effect: one device's date choice moves another's.
- **Approach:** drop it from the synced settings and always open on today. Keep the field locally for one session.
- **Compatibility:** the server row stays; clients ignore it. Old clients keep writing it harmlessly.

### B5. Persist dismissed recommendations — P3, S

- **Evidence:** **Verified** — `dismissedRecommendationIds` is component state.
- **Approach:** store dismissed ids with a date in session settings and expire them after 7 days.

## C. Structure and quality

### C1. Unit-test the planning rules — P1, M

- **Evidence:** **Verified** — `occurrences.ts`, `recurrenceMatches()` and the three materializers have no tests.
- **Approach:** use the Node test runner proposed in SaS-Next-Steps T0.2. Cover every status transition, overdue reconciliation, duplicate prevention, reschedule rules, and each recurrence rule across a week, a month end, and a daylight-saving week.

### C2. Extract the task/habit editor from `home-screen.tsx` — P2, L

- **Evidence:** **Verified** — the 1,520-line screen declares 87 `useState` hooks, 32 of them named `…Draft`, most serving this form (TD-01).
- **Approach:** after C1, move draft state, validation and the save into `features/planner-editor/` with a pure `validateDraft()` and a `buildChanges()` that returns the session updates. The screen keeps layout only.
- **Risk:** behavior drift. Mitigate with C1 tests plus a manual walkthrough of every field.

### C3. Measure history growth — P2, M

- **Evidence:** **Verified** — full-table rewrite on every save (TD-02); **Inferred** — `reconcileOverdue()` scans the full history on every change.
- **Approach:** seed 1, 3 and 5 years of daily use, measure save and first-render time on a mid-range Android device and an iPhone, then decide. Do not optimize before measuring.

## Measurement

Track as aggregates only: share of planned occurrences completed within the day; share of created recurring items later stopped or deleted (after B1); time from app open to first completion. No titles or descriptions.
