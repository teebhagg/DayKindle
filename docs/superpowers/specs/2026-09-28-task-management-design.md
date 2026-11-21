# Task Management and Occurrence Checklists

**Status:** Design approved in conversation; awaiting written-spec review.
**Date:** 2026-09-28
**Scope:** Phase 3 next slice: complete task metadata and occurrence-scoped subtasks in the local guest app.

## Context

The app already stores task definitions separately from dated occurrences. `TaskDefinition` currently includes a stable ID, title, scheduled start date, recurrence, optional goal and milestone links, optional quantitative target, and creation time. `materializeTaskOccurrences` creates one idempotent occurrence for each due task/date. The task editor and Today checklist already support recurrence, measured progress, goal links, and completion.

The FRD adds description, priority, due date, estimated duration, and subtasks to tasks. The approved shared occurrence model requires future definition edits not to rewrite existing occurrence snapshots. The user chose subtasks that share their parent's schedule and reset for every recurring occurrence.

## Goals

- Add the remaining task fields required by `TASK-002`.
- Let users add, edit, and remove ordered subtasks from the existing task editor.
- Let users check off subtasks in Today for the selected task occurrence.
- Keep each occurrence's subtask completion independent, including recurring tasks.
- Preserve stable task IDs, goal/milestone links, quantitative progress, and historical occurrences.

## Non-goals

- Independently scheduled child tasks, nested subtasks, dependencies, or subtask recurrence.
- Task tags, attachments, collaboration, cloud sync, or new routes.
- Reworking task accountability, completion/recovery transitions, or reminder delivery.
- Changes to habit definitions or routine sequencing.

## Data model

### Task definition

Add these optional properties to `TaskDefinition` while retaining existing fields and stable IDs:

```text
description?: string
priority?: 'low' | 'medium' | 'high'
dueDate?: local YYYY-MM-DD
estimatedDurationMinutes?: positive integer
subtasks?: { id: string; title: string; sortOrder: number }[]
```

`scheduledDate` remains the recurrence start date used by `recurrenceMatches`; `dueDate` is a separate optional deadline. Subtask IDs are stable within their parent task. Subtasks are a flat ordered checklist; empty or whitespace-only titles are rejected. The task has one optional description with a 500-character limit. Duration is a positive integer number of minutes. New tasks default to medium priority and no due date, description, estimate, or subtasks. Migrated definitions with no priority normalize to medium and missing subtasks normalize to an empty list; unset optional fields remain absent.

### Occurrence snapshot

Add optional task-specific snapshots to `HomeEntry` for the materialized occurrence:

```text
taskDescriptionSnapshot?: string
taskPrioritySnapshot?: 'low' | 'medium' | 'high'
taskDueDateSnapshot?: local YYYY-MM-DD
taskEstimatedDurationMinutesSnapshot?: positive integer
subtasksSnapshot?: { id: string; title: string; sortOrder: number; completed: boolean }[]
```

The snapshot copies the effective task metadata and subtask titles/order when an occurrence is generated. Priority resolves to `medium` for new and migrated definitions; other optional values stay absent when unset. Each occurrence owns its own `completed` values. Newly generated occurrences begin with every subtask unchecked. Two occurrences of the same recurring task never share mutable checklist state. A legacy occurrence whose snapshot fields are absent keeps them absent until that specific planned occurrence is explicitly edited.

Routine-step and habit occurrences keep their current data shape and behavior. Goal and milestone links remain on the parent task definition and occurrence; a subtask does not have its own goal link.

## Behavior and UI

### Create and edit

Extend the existing task editor sheet with description, priority, optional due date, estimated minutes, and a subtask list with add, edit, and remove actions. Keep existing controls for scheduled date, recurrence, measurable target, goal link, and milestone link.

Validate the title and non-empty subtask titles; validate local calendar dates and a positive integer duration. A task's due date may differ from its scheduled date. Existing tasks with absent metadata migrate to the defaults above.

Adding or editing task definition metadata affects occurrences generated afterward. Already materialized occurrences, including planned ones, keep their snapshots unless the user explicitly saves edits to that occurrence in the task editor. That save writes the submitted metadata and checklist snapshot to only the selected planned occurrence and updates the task definition for future occurrences; it does not update other materialized occurrences. Terminal/history occurrences are never changed by a definition edit. When the user explicitly edits a planned occurrence's subtask list, keep completion for subtask IDs that remain; a renamed item keeps its ID and completion; newly added items append unchecked; removed IDs are removed from that planned occurrence. Old terminal occurrence snapshots retain their subtask history. Subtasks stay in insertion order; reordering is not part of this slice.

### Today checklist

For a task occurrence with subtasks, show its subtask checklist below the task row, with an accessible checkbox for each item and a checked/total count. Checking a subtask updates only that occurrence's `subtasksSnapshot` and does not complete the parent task. Completing the parent task does not require every subtask to be checked. When the parent transitions to any terminal status (`completed`, `missed`, `skipped`, `rescheduled`, or `cancelled`), the original occurrence's subtask snapshot freezes with its current checked values. A replacement occurrence created by rescheduling copies the original occurrence's subtask IDs, titles, order, and checked values; the original remains frozen, and the replacement can then be edited independently while planned. Ordinary recurrence is not a reschedule: every normally generated occurrence starts with all subtasks unchecked.

Display priority, due date, and estimate as compact task metadata in Today and in the task editor. Rescheduling copies every task metadata snapshot and the subtask snapshot from the source occurrence to its replacement. For legacy source occurrences where a snapshot is absent, the replacement preserves that absence instead of inferring values from the current task definition. Avoid changing the existing habit, routine, and goal row behavior.

### Recurrence and identity

Keep the existing recurrence rules and stable occurrence key. Ordinary occurrence generation remains idempotent by source type, task ID, occurrence key, and local scheduled date. Each occurrence generated by a recurrence rule receives a fresh unchecked subtask snapshot from the current definition. A rescheduled replacement is created by the recovery flow, not ordinary recurrence generation, and copies all source task metadata snapshots and checklist state as defined above. Editing a definition does not alter previously materialized dates unless that exact planned occurrence is explicitly edited.

## Persistence and migration

- Add the fields within existing task definitions and occurrence rows; no new SQLite table is needed.
- Bump the session schema from version 6 to version 7.
- Accept schema versions 6 and earlier using the existing legacy readers, then normalize v6 task definitions with missing priority to medium and missing subtasks to an empty list. Leave unset description, due date, and duration absent; do not infer values.
- Preserve already-materialized v6 occurrences as-is, including their current optional-field shape; do not retroactively copy current task-definition metadata or subtasks into their snapshots. New occurrences generated after migration use v7 snapshots. A legacy planned occurrence receives snapshots only if the user explicitly edits that still-planned occurrence. Existing terminal occurrences remain unchanged.
- Preserve every existing task, goal, milestone, occurrence, completion, progress, and relationship ID/value.
- Preserve the existing verified-migration contract: back up the original session, write the normalized schema-v7 envelope, read it back and compare the normalized session, then accept migration. Legacy AsyncStorage keys are cleared only after verification succeeds. On failure, keep recovery copies and block writes.
- Preserve all v6 occurrence rows and their absent snapshot properties as-is. Existing occurrences are not populated retroactively from today's task-definition metadata. If a v6 planned occurrence is explicitly saved in the task editor, initialize that selected occurrence's task metadata and subtask snapshots from the submitted editor values; do not alter other planned occurrences or terminal history.

## Verification and acceptance

- Create a task with all supported metadata and subtasks, save, restart, and verify the values and ordering remain.
- Edit a task's definition and confirm a newly generated occurrence receives the new data while an already materialized occurrence remains unchanged unless explicitly edited.
- Generate two ordinary occurrences for one recurring task and verify checking a subtask on one date leaves the other date unchecked; separately reschedule an occurrence and verify its checked values carry to the replacement while the original stays frozen.
- Verify occurrence generation is idempotent and existing task recurrence, goal/milestone links, quantitative progress, and completion remain functional.
- Check and uncheck subtasks in Today; verify parent completion is independent, subtask state freezes at terminal transitions, and rescheduling follows the selected carry/reset rule.
- Reject invalid dates, blank subtask titles, zero/negative/non-integer duration, and empty task titles without losing the draft.
- Migrate a v6 local session and verify normalized definitions, task IDs, occurrence history, and other session collections after schema-v7 read-back. Verify a failed migration retains the old primary/backup data and blocks overwrites; verify legacy occurrence snapshot absences and terminal rows remain unchanged.
- Run `npx tsc --noEmit`, `npm run lint`, and `git diff --check`. Report simulator interaction separately from static checks.

## Alternatives considered

1. **Occurrence-scoped checklist (selected):** stable subtask definitions live under their task; each scheduled occurrence snapshots those items and owns their checked state. This matches the existing dated occurrence model and the user's chosen shared-schedule behavior.
2. **Independently scheduled child tasks:** each subtask becomes a separate task definition with its own recurrence and occurrence stream. This adds scheduling and parent/child lifecycle rules not requested by the FRD.
3. **Definition-only checklist:** store checked state on the task definition. This would cause recurring dates to share completion state and would not preserve dated checklist history, so it is rejected.

The existing shared occurrence design governs identity, recurrence, terminal history, and explicit planned-occurrence edits. This design adds task-specific fields without changing the domain boundaries for habits, routines, or goals.
