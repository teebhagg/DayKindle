# Daily planning — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No create, complete, miss, or reschedule flow was exercised on a device in this pass. The 2026-10-31 review reported the `daily-plan` catalog migration and Edge Function as deployed; that was not re-checked.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

Daily planning is the Today tab: the place where a person sees what is planned for a date, marks it done, and deals with what slipped. It turns reusable definitions (tasks, habits, routine blocks) into dated records ("occurrences") so each day has its own history that later edits do not rewrite.

## 2. Target user and expected outcome

Anyone using the planner, Guest or signed in. Expected outcome: open the app, see today's tasks, habits and routine steps, complete what gets done, and get a calm next step for anything missed.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Pick a date from the week strip and see that date's plan | **Verified** | `selectedDate` in the session; `dayEntries`, `tasks`, `habits`, `scheduledEntries` in `use-home-screen-model.ts`. |
| Add a task: name, description, priority, due date, estimate (whole minutes), subtasks, target and unit, recurrence, goal and milestone link | **Verified** | `addEntry()` in `home-screen.tsx` creates a `TaskDefinition` and a first occurrence for the selected date. |
| Add a habit: tracking type (yes/no, quantity, duration), target and unit, recurrence, goal and milestone link | **Verified** | `addEntry()` creates a `HabitDefinition` and a first occurrence. Duration defaults the unit to "minutes". |
| Recurrence: once, daily, weekdays, weekends, selected days | **Verified** | `RecurrenceRule` in `home-session.tsx`; `recurrenceMatches()` in `day-schedules.ts`. Selected days require at least one day. |
| Recurring items appear on future dates | **Verified** | An effect in `home-screen.tsx` calls `materializeDayScheduleOccurrences`, `materializeHabitOccurrences` and `materializeTaskOccurrences` for the selected date when it is today or later. |
| Complete or un-complete an item | **Verified** | `toggleEntry()` → `setOccurrenceStatus()`. Un-completing records the reason `user_unchecked_completion`. |
| Tick subtasks on a planned task | **Verified** | `toggleSubtask()` edits `subtasksSnapshot` on planned occurrences only. |
| Edit a planned item (also updates its definition) | **Verified** | Editing a planned occurrence updates the task or habit definition and, for routine steps, the routine block. |
| Missed items: automatic detection, reason, recovery | **Verified** | See [accountability](../accountability/CURRENT_STATE.md). `reconcileOverdue()` runs on load, on every `setEntries`, and on a timer set for the next local midnight. |
| Reschedule a planned or missed item to a later date | **Verified** | `rescheduleOccurrence()` keeps the original, marks it, and adds a linked replacement. |
| "A few ideas" recommendations (up to 3) | **Verified** | `recommendationCandidates` in `home-screen.tsx`: weak weekday, repeated reschedules, 6+ open items, a strong weekday, 3+ days without a completion, an unlinked goal on an overloaded day. |
| Built-in "Daily Plan" routine from a server catalog | **Verified** | `daily-plan-provider.tsx` fetches `GET /functions/v1/daily-plan`, validates, caches in AsyncStorage, and falls back to the bundled copy. |
| Delete a task or habit, or end a recurring series | **Not found** | No code removes a `TaskDefinition` or `HabitDefinition`. A habit can only be paused through a missed-item recovery action. |
| Move a planned item to "skipped" or "cancelled" directly | **Not found** | `cancelled` exists in the type but nothing sets it. `skip` is offered only as a recovery action on a missed item, and it records `recoveryAction` without changing the status. |

**Journey:** Today opens on the saved `selectedDate` (it is a synced setting, so it can be a date chosen earlier or on another device). The header greets by time of day. Recommendations, the "A gentle reset" list of unresolved missed items, tasks, habits, and routine steps render as sections. The "+" sheet adds a task, habit, or goal; it closes only after the local save is confirmed.

## 4. Screens, components, state and persistence

- **Screens:** `mobile-app/src/app/(tabs)/index*.tsx` and `home.tsx` render `features/home/home-screen.tsx` (Today tab). The add/edit sheet, recovery form and date picker (`DateField`, `native-date-picker-popover.*`) live in the same file.
- **Derived state:** `use-home-screen-model.ts` (selected-day lists, routine rows, unresolved misses, weekday summary, day load).
- **Domain rules:** `occurrences.ts` (status machine, reconciliation, materialization, reschedule) and `day-schedules.ts` (recurrence, materializers, bundled Daily Plan).
- **Session:** `home-session.tsx` (`entries`, `taskDefinitions`, `habitDefinitions`, `daySchedules`, `selectedDate`; schema version 9).
- **Local persistence (native):** SQLite `daymark-local.db`; tables `occurrences` (with `source_type`, `source_id`, `occurrence_key`, `scheduled_date`, `status` columns and a unique index on the first four), `task_definitions`, `habit_definitions`, `day_schedules` (`home-storage.ts`). Web uses AsyncStorage (`home-storage.web.ts`).
- **Cloud (opt-in):** sync collections `entries`, `taskDefinitions`, `habitDefinitions`, `daySchedules`, and `settings` (which includes `selectedDate`). See [accounts and sync](../accounts-and-sync/CURRENT_STATE.md).
- **Server catalog:** `public.daily_plan_catalog` (one row, `id = 'default'`), served by `supabase/functions/daily-plan/index.ts` with a 30-second public cache and an ETag.

## 5. Business rules, validation and calculations

- **Status machine (Verified):** `planned → completed | missed | skipped | rescheduled | cancelled`. Every status other than `planned` is terminal: `setOccurrenceStatus()` ignores the change unless a correction reason is given. Each change appends `{from, to, at, reason?}` to `statusHistory`.
- **Overdue rule (Verified):** a `planned` occurrence whose `date` is before today's local date key becomes `missed`. Dates compare as `YYYY-MM-DD` strings.
- **Identity (Verified):** an occurrence is unique by `sourceType:sourceId:occurrenceKey:date`. `materializeOccurrences()` skips candidates that already exist; SQLite enforces the same with a partial unique index.
- **Materialization (Verified):** only for today or later. Past dates show only what was already recorded; for past routine steps, only existing rows show.
- **New item on a past date (Verified):** the first occurrence is created with status `missed`, not `planned`.
- **Snapshots (Verified):** each occurrence copies the title, target and unit, and task details (description, priority, due date, estimate, subtasks) at creation. Editing a completed or missed occurrence does not change it.
- **Validation (Verified):** a name is required; a target must be a number greater than 0 and needs a unit; progress must be 0 or more; the estimate must be a whole number of minutes above 0; due dates must be real calendar dates; each subtask needs a name; "selected days" needs at least one day.
- **Reschedule (Verified):** the new date must be today or later and after the original date; no duplicate may exist for that source and date. A planned original becomes `rescheduled`; a missed original stays `missed` with `recoveryAction: 'rescheduled'`. The replacement id is `<original>:rescheduled:<date>`.
- **Recommendation thresholds (Verified):** weekday rate below 50% with 3+ records; 2+ rescheduled items; 6+ planned items on the selected date; a weekday at 80%+ with 3+ records; last completion more than 3 days ago. Dismissing or applying hides a card only for the current screen session (component state).
- **Day boundary (Verified):** date keys use the device's local calendar. A midnight timer re-runs reconciliation while the app stays open.

## 6. Loading, empty, success, error and offline states

- **Loading:** the session hydrates before any route renders; the animated splash covers it (`HomeSessionProvider`). **Verified.**
- **Empty:** sections use `AppEmptyState`; the check-in sheet says "A quiet day is okay to…" for a day with nothing planned. **Verified.**
- **Success:** toasts such as "Task added — Saved on this device." appear only after `confirmLocalSave()` resolves. **Verified.**
- **Error:** a failed save keeps the sheet open with "Could not save on this device. Your edits are waiting to save. Save again before making more changes." **Verified.** An unreadable saved planner shows a full-screen "Your saved data needs attention" with retry and start-fresh. **Verified.**
- **Offline:** planning is fully local. The Daily Plan catalog uses the cached or bundled copy when the fetch fails. **Verified.**

## 7. Dependencies

Session and storage (`home-session.tsx`, `home-storage.ts`); routines (`day-schedules.ts`, [routines and templates](../routines-and-templates/CURRENT_STATE.md)); goals (links and goal-step recommendation, [goals](../goals-and-life-areas/CURRENT_STATE.md)); [accountability](../accountability/CURRENT_STATE.md) for misses and recovery; [progress and history](../progress-and-history/CURRENT_STATE.md) consumes occurrences; PostHog for `planner_item_saved` and `planner_item_completion_toggled`; the `daily-plan` Edge Function for the built-in routine.

## 8. Functional limitations and confusing flows

- There is no way to delete a task or habit, or to stop a recurring task. A mistaken recurring task keeps appearing. **Verified (no code path).**
- Editing a planned recurring item changes its definition, so all future dates change too. The form does not say "this and future" versus "only this one". **Inferred** from the edit path.
- Past dates never get recurring items filled in, so a day the app was not opened shows nothing to mark missed for habits and recurring tasks. Missed counts therefore depend on app usage. **Inferred.**
- `selectedDate` syncs between devices as a setting. Picking a date on one device can change the opening date on another. **Inferred** from `SETTINGS_FIELDS` in `entity-sync-service.ts`.
- Dismissed recommendations return after the screen remounts. **Verified** (not persisted).
- Routine-step rows for today render even before they are stored (synthetic rows in `scheduledEntries`); toggling one stores it. **Verified.**

## 9. Defects and failure modes

- **Verified (TD-14):** `planner_item_completion_toggled` is sent before the local save is confirmed, so analytics can count a completion that failed to save.
- **Verified:** a new task created on a past date starts as `missed`, and the save toast still reads "Task added". There is no prompt for a reason. Whether this is intended is a product decision.
- **Inferred:** `reconcileOverdue()` runs inside the `setEntries` updater on every change, scanning the full history each time. Cost grows with history size; not measured.
- **Needs Validation:** behavior across daylight-saving changes, time-zone travel, and an app left in the background over midnight on iOS and Android.
- **Needs Validation:** the remote catalog's `daysOfWeek` is required by the client validator; a catalog edit that drops it would be rejected and the cached or bundled plan used silently.

## 10. Performance, accessibility, security and testability

- **Performance:** every save rewrites all planner tables in one exclusive transaction (TD-02). A host-SQLite probe round-tripped 129,015 rows in about 1 s; native timing is **Needs Validation**.
- **Accessibility:** entry rows, checkboxes, date fields and recommendation actions carry labels and roles; recommendation buttons stack when width < 364 or font scale > 1.15. Screen-reader behavior is **Needs Validation** (TD-11).
- **Security and privacy:** titles, descriptions and subtasks are personal data. Analytics payloads carry only categories (`item_type`, `action`, `recurrence`, link flags, `resulting_status`). **Verified** in reviewed calls.
- **Testability:** the status machine, recurrence and materializers are pure functions but have no unit tests. The only test file is `mobile-app/scripts/test-interface.cjs` (11 cases, 3 failing on 2026-11-13).

## 11. Missing capabilities and requirements to confirm

- Delete or archive a task or habit; end a recurring series.
- Mark a planned item skipped or cancelled without waiting for it to be missed.
- Clear rules for editing a recurring item: this date only, or this and future.
- Whether missed history should be back-filled for days the app was not opened.
- Whether `selectedDate` should stay a synced setting or become device-local.
- Calendar integration, time-of-day scheduling for tasks, and drag-to-reorder are **Not found** and not required by current docs.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md). In short: add delete and end-series actions; move completion analytics after the save; give the domain rules unit tests; decide past-date and back-fill rules; make `selectedDate` device-local; then extract the task and habit editor out of `home-screen.tsx`.

## Source map

- [Today UI, add/edit sheet, recommendations](../../../mobile-app/src/features/home/home-screen.tsx)
- [Derived day lists and routine rows](../../../mobile-app/src/features/home/use-home-screen-model.ts)
- [Occurrence status and reconciliation](../../../mobile-app/src/features/home/occurrences.ts)
- [Recurrence, materialization, bundled Daily Plan](../../../mobile-app/src/features/home/day-schedules.ts)
- [Session types, normalization, midnight timer](../../../mobile-app/src/features/home/home-session.tsx)
- [Native storage](../../../mobile-app/src/features/home/home-storage.ts)
- [Daily Plan cache and client](../../../mobile-app/src/features/home/daily-plan-provider.tsx)
- [Daily Plan Edge Function](../../../supabase/functions/daily-plan/index.ts)
- [Daily Plan catalog migration](../../../supabase/migrations/20261030143010_daily_plan_catalog.sql)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Accountability](../accountability/CURRENT_STATE.md) · [Routines and templates](../routines-and-templates/CURRENT_STATE.md) · [Technical debt](../../architecture/TECHNICAL_DEBT.md)
