# Life Areas and Goal Model

**Status:** Implemented; static checks pass. Simulator acceptance remains pending.
**Date:** 2026-09-28  
**Scope:** Phase 2 first slice: local life-area management and the complete MVP goal record and flow.

## Context

The local guest app stores selected life areas only in its onboarding profile. Goals are currently lightweight starter-plan records with a title, first step, optional quantitative progress, and milestones. The Functional Requirements define editable default and custom life areas, goals with a complete lifecycle and metadata, and milestones that can link tasks and habits. SQLite persistence was added in Phase 1; this slice extends that local data foundation without introducing accounts or sync.

The selected scope is intentionally one vertical slice: life areas, goals, and their milestones. Task, habit, and routine definition expansion remains in later Phase 2 slices.

## Goals

- Let users view, enable, and disable predefined life areas and create custom areas.
- Associate goals with life areas and expose useful area-level progress.
- Create and edit goals with the fields and lifecycle in the FRD.
- Keep quantitative goal progress dated and preserve its target/unit snapshot.
- Preserve existing guest records and stable IDs during migration.
- Preserve task, habit, and occurrence records when a goal or milestone is removed.

## Non-goals

- Cloud accounts, sync, conflict resolution, remote push, or server APIs.
- A general task, habit, or routine builder; those are later slices.
- Changing the visual style system or replacing the existing navigation architecture.
- Guessing a life-area assignment for a pre-existing goal when no reliable association was saved.

## Domain model

### Life area

Persist life areas in the HomeSession and native SQLite repository:

```text
id: stable string
label: string
icon: optional existing AppIcon name
enabled: boolean
isCustom: boolean
sortOrder: integer
createdAt: ISO timestamp
```

The initial catalog uses the IDs and labels already presented in onboarding: health, fitness, sleep, career, finance, learning, relationships, family, social, productivity, personal development, mental wellbeing, spirituality, lifestyle, and `custom`. The `custom` record defaults to “Something else”; when onboarding saved a custom label, use that label on the same stable `custom` ID. Map the `personal_goal` onboarding starter to `custom`. Later custom areas use generated stable IDs. This preserves the existing “Something else” selection and starter goal even when the user skipped entering a custom label.

Creating a custom area requires a non-empty label. Area IDs remain stable when labels change. Existing goals retain their area ID when an area is disabled. A disabled area is omitted from the active overview and new-goal picker; its goals and history remain intact. Re-enabling the area restores it. If a custom area is deleted in a future UI, its goals must be reassigned or retained under an explicit unassigned state; this slice only requires enable/disable, so deletion is not included.

On migration, create catalog records and set `enabled` based on the selected area IDs in the saved onboarding profile. Do not invent a life-area assignment for legacy goals. Present them as unassigned until the user edits and assigns them.

### Goal

Extend the current goal record while retaining its stable `id`, `title`, and `firstStep` fields:

```text
id
title
description
lifeAreaId (optional only for migrated legacy goals)
why
priority
startDate
targetDate
targetType
targetValue
unit
status
progressValue (current quantitative amount)
manualProgressValue (optional 0-100 qualitative percentage override)
firstStep (retained for existing onboarding-created goals)
milestones
```

`targetType` is `qualitative` or `quantitative`; existing goals with a positive numeric target migrate as quantitative, others as qualitative. If a legacy quantitative goal has no non-empty unit, preserve the numeric target and target type, expose a “Unit needed” repair prompt, and do not derive `progressStatus` or accept new progress until the user supplies a unit. Do not invent a unit. Newly-created quantitative goals always require both a positive target and a non-empty unit. Goal lifecycle `status` is one of `draft`, `active`, `paused`, `completed`, `abandoned`, or `archived`. The separate `progressStatus` is derived as `low`, `mid`, or `high` for quantitative goals only; it is never stored in or substituted for lifecycle `status`.

For quantitative goals, `progressValue` is a non-negative current amount in target units; a positive target and non-empty unit are required. The descriptive `progressStatus` is derived from progress/target: `low` at or below 30%, `mid` above 30% and below 70%, and `high` at or above 70%. It never changes goal lifecycle status automatically. Quantitative progress updates append to the existing dated goal-progress event collection and snapshot the target and unit used at that time.

For qualitative goals, progress is a percentage from 0 through 100. If milestones exist and there is no manual override, derive it from completed milestones divided by total milestones. A user may set `manualProgressValue` to override that derived percentage; clearing the override returns to milestone-derived progress. With no milestones and no override, qualitative progress is unavailable. Persist the current override on the goal; the FRD does not require dated history for qualitative overrides, so they do not create `GoalProgressEvent` records. Qualitative progress is excluded from the area’s quantitative progress average.

New goals start as `active` unless the user explicitly chooses “Save as draft.” The allowed lifecycle transitions are:

| Current state | Allowed next states |
|---|---|
| `draft` | `active`, `abandoned`, `archived` |
| `active` | `paused`, `completed`, `abandoned`, `archived` |
| `paused` | `active`, `completed`, `abandoned`, `archived` |
| `completed` | `active` (explicit reopen), `archived` |
| `abandoned` | `active` (explicit reopen), `archived` |
| `archived` | `active` (restore) |

No status transition deletes progress or linked history. New goals must choose an enabled life area. Existing unassigned goals stay editable and visibly request an area assignment; migration will not assign a guessed value.

Priority values will be stable low/medium/high values. If the current UI has no priority field, use a neutral default (`medium`) for new and migrated records until edited.

### Milestone

Milestones retain stable IDs and support a title, optional local calendar due date, and completion state independent from the parent goal. A task or habit may reference one milestone belonging to its linked goal. On milestone deletion, clear `milestoneId` from linked task and habit definitions without deleting those records. Existing occurrences are historical snapshots and keep their original relationship metadata; no terminal occurrence is rewritten. On goal deletion, clear goal and milestone references from linked definitions, while preserving all occurrences and their original relationship snapshots.

## User flows

### Life-area management

- Show enabled areas in the active overview with active-goal count and an area progress summary.
- Allow predefined areas to be enabled or disabled.
- Allow a user to add a custom area and edit its label.
- Disabled areas remain accessible in area management and through existing linked goals; they are not offered for new goal assignment.
- An area with no goals shows a calm empty state and a direct create-goal action.

Area progress is derived from goal records, not stored as a second mutable metric. Show active and completed goal counts. For active quantitative goals with valid positive targets, show their arithmetic mean progress percentage, clamped to 100% per goal; label the metric as an average and omit it when no active quantitative goals exist. Qualitative goals are excluded from this average. This avoids one large-target goal overwhelming the area's summary.

### Goal create/edit and lifecycle

- The goal form supports title, description, life area, why, priority, start date, target date, qualitative/quantitative type, target and unit when quantitative, and optional first step.
- Validate a non-empty title, an enabled area for new goals, a valid start date, an optional target date not earlier than start date, and positive finite target with a non-empty unit for quantitative goals.
- Provide explicit lifecycle actions for draft creation, activation, pause/resume, completion, abandonment, archive/restore, and reopening as defined in the transition rules. Status changes do not erase goal history or linked action history.
- Keep milestone creation/edit/completion within the goal context. Deleting a milestone clears action links as defined above.
- Removing a goal keeps linked tasks and habits, clearing their goal and milestone references. Existing occurrences remain historical snapshots and are not rewritten.

## Persistence and migration

- Add `lifeAreas` to the persisted session and SQLite tables, preserving current collection/table mappings and HomeSession consumers where practical.
- Evolve the session schema version with a deterministic migration from every currently supported snapshot version.
- Seed life areas from onboarding selections and map onboarding-selected starter plans to their source catalog's known life-area IDs during new seeding.
- For already-saved starter goals with no stored area ID, leave the relationship absent and show an unassigned prompt; do not infer from a title or first step.
- Preserve goal, milestone, progress-event, task, habit, and occurrence IDs and data. For a stored SQLite session, first serialize the current pre-migration snapshot into the backup metadata row, then write the normalized target-version session (including `lifeAreas`) in one exclusive SQLite transaction. Read it back and compare its normalized contents before treating migration as complete. The current SQLite rows remain intact if the transaction rolls back; the backup metadata preserves the pre-migration copy.
- For legacy AsyncStorage migration, write the normalized target-version session to SQLite and read/compare it before clearing any legacy keys. On any validation, write, or read-back failure, leave legacy keys untouched, retain SQLite recovery copies, and enter the existing write-blocked recovery state.
- If validation or migration fails, retain the existing primary/backup/recovery copies and block overwriting, following the HomeSession recovery contract.

## Acceptance criteria

- A user can view predefined areas, enable/disable them, create and rename custom areas, and see enabled state after app restart.
- Disabling an area hides it from active overview and new goal assignment while retaining its goals and history; re-enabling it restores those goals.
- Each area exposes the defined active/completed counts and mean quantitative progress when applicable.
- A user can create/edit goals with the FRD fields, change lifecycle status, and receive validation for invalid dates or quantitative targets.
- Goal progress thresholds are correct at 30%, just above 30%, just below 70%, and 70%; progress never implicitly completes a goal.
- Dated quantitative goal events preserve the target and unit that existed when progress was recorded.
- Milestone completion is independent of parent-goal completion.
- Deleting a milestone or goal clears references but preserves task/habit definitions, occurrences, and history.
- Existing AsyncStorage guest sessions migrate without lost IDs or guessed area assignments; failure retains recoverable copies.
- `npx tsc --noEmit`, `npm run lint`, and `git diff --check` pass. Focused persistence/model checks and simulator flows are reported separately from static checks.

## Alternatives considered

1. **Additive evolution (selected):** extend session records and existing screens, preserving stable IDs and migration paths. Lowest risk to the local app and Phase 1 storage work.
2. **Replace the planning model:** split all domain records and screens in one rewrite. Cleaner separation but creates a large migration and regression surface.
3. **Life areas only:** add area CRUD and defer goal fields. Smaller immediate change but leaves the approved life-area/goal slice incomplete and adds repeated migration work.

## Dependencies and boundaries

The existing shared occurrence design governs dated progress and preservation of action history. This slice does not change occurrence lifecycle or the later task/habit/routine flows. Later slices can add task priority, subtasks, habit consistency, routine sequencing, and additional recurrence rules without changing the stable life-area and goal identifiers.
