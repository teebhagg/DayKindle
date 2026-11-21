# Goals and life areas — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** prevents data loss or a broken core flow; **P2** removes friction; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects

### A1. Make goal removal safe — P1, S

- **Evidence:** **Verified** — the card's "Remove" calls `removeGoal()` with no confirmation or undo; progress events, occurrences and commitments keep the dead `goalId`.
- **User benefit:** a mis-tap no longer erases a goal, its milestones and its title in History.
- **Approach:** replace "Remove" with "Archive" (status `archived`, reversible). Offer permanent delete only from an archived goal, with a confirmation that names what is kept (linked actions and their history) and what goes (the goal, its milestones and progress events). Add an undo toast for 5 seconds after archive.
- **Tests:** archive and restore; delete removes the goal's progress events and clears `goalId` on commitments; History no longer shows orphan "Goal progress updated" rows.

### A2. Fix custom area renaming — P2, S

- **Evidence:** **Verified** — `renameLifeArea` runs per keystroke and ignores an empty value, so the field cannot be cleared.
- **Approach:** edit into a local draft; commit on blur or "Done"; reject an empty name with a message; keep the old name on cancel.
- **Tests:** clear-and-retype, empty submit, cancel.

## B. Refine existing capabilities

### B1. Milestone list editor — P2, M

- **Evidence:** **Verified** — the form adds or edits one milestone per save.
- **Approach:** an inline list in the goal form: add row, edit title and due date, reorder, remove. Save writes the full list. Keep `completed` and `completedAt` for existing ids.
- **Tests:** add three, reorder, remove one, edit a completed milestone's title (completion kept).

### B2. Filter the goal list by status — P2, S

- **Evidence:** **Verified** — paused, abandoned and archived goals stay in the main list.
- **Approach:** show active and draft goals by default; a "Show paused and finished" toggle reveals the rest, grouped by status.

### B3. Faster quantitative progress entry — P3, S

- **Evidence:** **Verified** — ±1 per tap.
- **Approach:** long-press opens a small "Add amount" field; keep ±1 taps.

### B4. Consistent area names — P3, S

- **Evidence:** **Verified** — onboarding and stored defaults use different labels for four areas.
- **Approach:** one shared `LIFE_AREAS` constant used by onboarding, `buildLifeAreas()` and normalization.
- **Compatibility:** stored labels stay as they are; only new installs and unselected areas change.

### B5. Custom area delete and reorder — P3, M

- **Approach:** delete is allowed only when no goal uses the area (otherwise offer "Move goals to…"); drag to reorder updates `sortOrder`.

## C. New capabilities

### C1. Optional progress from linked habits — P2, M

- **Why:** today a quantitative goal never moves unless the person updates it, even when a linked habit is done every day.
- **Approach:** a per-goal switch "Count completed linked actions toward this goal". When on, each completion of a linked occurrence adds its `progressValue` (or 1 for yes/no habits) and records a `GoalProgressEvent` with a `source: 'linked_action'` marker. Un-completing reverses it.
- **Guardrail:** off by default; never marks the goal completed.
- **Tests:** complete, un-complete, recovery "complete it now", and reduced-target recovery each produce the right event.

### C2. Tested goal rules module — P1, M

- **Evidence:** **Verified** — validation and lifecycle rules are inline in `addEntry()`.
- **Approach:** `features/goals/goal-rules.ts` with `validateGoalDraft()`, `allowedNextStatuses()`, `applyStatus()`, `goalProgress()`; the screen calls them. Prerequisite for C1 and for any server-side reuse (partners, services).

## Measurement

Aggregates only: goals created per active user; share of goals with at least one linked action; share of goals with a target; goals completed, abandoned, or archived per month. No titles or "why" text.
