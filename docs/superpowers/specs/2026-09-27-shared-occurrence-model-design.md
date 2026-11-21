# Shared Occurrence Model Design

**Status:** Approved in conversation; awaiting written-spec review  
**Date:** 2026-09-27  
**Scope:** MVP foundation for planned and completed goals, tasks, habits, and routines

## Context

The PRD defines an MVP with goals, milestones, tasks, habits, routines, reminders, accountability, recovery, weekly reviews, and recommendations. The current mobile app is a local-first guest prototype. Features that compare planned activity with actual outcomes need one reliable record of each scheduled action and its history.

The user confirmed that the full PRD MVP list remains a launch requirement (excluding the already planned Google and Apple sign-in work for this discussion), and approved a shared dated-occurrence model. This document describes that foundation; it does not implement it.

## Goals

- Record what action was expected on a particular local calendar day and what happened.
- Preserve the original plan when it is missed, skipped, or rescheduled.
- Give reviews, reminders, recovery, and recommendations one consistent activity history.
- Keep task, habit, and routine-specific configuration and user experiences distinct.
- Preserve current quantitative progress semantics: Meh at or below 30%, Okay above 30% and below 70%, and Fantastic at or above 70% of target.

## Non-goals

- Implementing authentication, cloud sync, notifications, or any UI in this work item.
- Replacing goals, tasks, habits, or routines with a generic activity type.
- Pre-generating an unbounded set of future occurrences.
- Automatically completing an action because its quantity status is Fantastic.

## Proposed domain model

### Activity definition

Goals, tasks, habits, and routines remain separate domain records. Scheduled task, habit, and routine-step occurrences reference their source using a typed source identifier and a stable occurrence key. Goals remain outcome records; dated goal progress updates use the same event envelope with `kind: goal_progress`, but do not use the scheduled-action status lifecycle. Definitions retain feature-specific attributes such as recurrence rules, goal links, quantitative targets, and routine ordering.

### Dated occurrence

An occurrence represents one expected action on one scheduled date. Its logical fields are:

| Field | Purpose |
|---|---|
| `id` | Stable occurrence identity |
| `kind` | `scheduled_action` or `goal_progress` |
| `sourceType`, `sourceId` | Identify the task, habit, routine step, or goal definition |
| `occurrenceKey` | Stable recurrence slot/instance identity; routine steps use their step ID |
| `scheduledDate` | Local calendar date the action was planned for |
| `status` | Scheduled-action state; absent for goal progress events |
| `progressValue` | Optional non-negative quantity recorded for this occurrence/progress event |
| `targetValueSnapshot`, `targetUnitSnapshot` | Optional immutable target and unit in effect when this value was recorded |
| `completedAt` | Optional timestamp for completion |
| `missedReason` | Optional reason captured during reflection |
| `recoveryAction` | Optional action chosen for recovery |
| `relatedOccurrenceId` | Link to the prior occurrence when recovery creates another occurrence |
| `createdAt`, `updatedAt` | Audit and reconciliation metadata |

Quantitative status is derived, never treated as source data. For valid positive target `T` and non-negative progress `P`, calculate `P/T`: `low` when at or below 0.30, `mid` when above 0.30 and below 0.70, and `high` at or above 0.70. UI labels are Meh, Okay, and Fantastic. A missing or invalid target yields no quantitative status. Status does not change completion state. A dated progress event captures the target and unit in effect at logging time so later definition edits do not reinterpret historical progress.

### State transitions

Scheduled action occurrences start as `planned`. While planned, progress may be recorded without changing the status. The occurrence may then transition once to one terminal outcome: `completed`, `missed`, `skipped`, `rescheduled`, or `cancelled`. Terminal occurrences are immutable; later user corrections are explicit audit events, not silent rewrites. At end of day, only still-planned occurrences become `missed`.

Rescheduling before the original day ends changes the original occurrence to `rescheduled` and creates a linked occurrence for the replacement date. Rescheduling after the original occurrence is already `missed` leaves it `missed`, records the recovery action, and creates a linked occurrence. In both cases the old record is excluded from later missed reconciliation. Goal progress events are append-only dated values and do not transition through scheduled-action states.

## Lifecycle and data flow

1. A user creates or edits a goal, task, habit, or routine definition.
2. When a day is opened, the app materializes only the due occurrence records for that day from the definitions and recurrence rules. Generation must be idempotent for `(sourceType, sourceId, occurrenceKey, scheduledDate)`. The occurrence key distinguishes multiple same-day slots and routine steps, so reopening the day cannot duplicate an occurrence while legitimate same-day occurrences remain distinct.
3. The user records completion or quantity progress against that occurrence. Quantity progress remains attached to its occurrence date.
4. At the end of the scheduled local day, still-planned occurrences become missed. If the app was not running then, it reconciles overdue occurrences the next time it opens. Reconciliation must be idempotent and must not alter completed, missed, skipped, rescheduled, or cancelled occurrences.
5. For a missed occurrence, the user may record a reason and choose a recovery action. Rescheduling preserves the original record and creates a new occurrence for the replacement date linked to the original.
6. Weekly review and recommendation logic read occurrence history rather than inferring outcomes from the current definition.

Definition edits apply to occurrences generated afterward. An already materialized planned occurrence keeps its title, scheduled date, target, and unit snapshot unless the user explicitly edits or cancels that occurrence. Terminal and historical occurrences never inherit changed definition values.

## Timezone and offline behavior

Scheduling and end-of-day reconciliation use the device's local calendar day and timezone. Occurrence dates should be stored as calendar-date values, separately from timestamps such as `completedAt`. The local-first implementation must reconcile on app open and remain useful without network access. A future synced implementation must make occurrence creation and reconciliation idempotent across devices; conflict behavior for concurrent edits will be specified in the sync design.

## Error handling and integrity

- Reject non-finite or negative progress and non-positive quantitative targets.
- Require target units whenever quantitative targets are enabled.
- Do not silently overwrite occurrence history when definitions change or an action is rescheduled.
- Keep generation and overdue reconciliation repeatable without duplicate or backward state transitions.
- If local persistence fails, keep the last-known-good persisted snapshot intact, retain the latest in-memory changes where the app remains open, clearly show that changes may not have been saved, and offer retry. Do not show a successful save state until persistence succeeds. If recovery data cannot be parsed, stop automatic writes and require an explicit retry or fresh-start choice before replacing it.
- If timezone changes, use the device's current local timezone for future scheduling. Preserve the stored `scheduledDate` for existing occurrences; do not rewrite past dates.

## Testing and acceptance criteria

This design is accepted for implementation when:

- Opening a day repeatedly yields one occurrence per due source and date.
- Multiple legitimate same-day recurrence slots and routine steps each yield one distinct occurrence.
- Recurring habits create due occurrences on demand, not for all future dates.
- Completion and quantity progress remain associated with the correct occurrence date.
- End-of-day reconciliation marks only eligible incomplete occurrences missed and can safely run more than once.
- Skipping or rescheduling preserves the original occurrence; rescheduling creates a linked occurrence on the new date.
- Quantity status boundaries are correct at 30%, just above 30%, just below 70%, and exactly 70% for tasks and goals.
- Changing a goal/task target does not rewrite historical occurrence values.
- Editing a definition does not silently rewrite already materialized or terminal occurrences; a user can explicitly adjust a still-planned occurrence.
- Simulated persistence failure preserves the last-known-good stored snapshot, reports unsaved changes, and allows retry without duplicate records.
- Data survives app restart and the existing local recovery path without loss or duplication.

## Open design boundary

Cloud synchronization, cross-device idempotency, and conflict resolution need a dedicated design before sync is implemented. This spec only requires the local domain model to leave stable identifiers and relationships that can support that later work.
