# Goals and life areas — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No goal lifecycle was exercised on a device in this pass.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

Goals give daily actions a direction. A goal is an outcome ("Feel better in your body"); tasks and habits are the steps toward it. Life areas (Health, Career, Family, and so on) group goals so a person can see where their attention is going and switch areas off without losing history.

## 2. Target user and expected outcome

Anyone who wants more than a to-do list. Expected outcome: pick the areas that matter, set one or more goals with a clear first step and optional measurable target, link actions to them, and see progress without the app declaring a goal "done" on their behalf.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Choose life areas at onboarding | **Verified** | 15 options in `app/index.tsx` (`areas`), including "Something else" with a custom name. |
| Enable, disable, rename, and add custom areas | **Verified** | Life areas sheet in the Goals tab: `setLifeAreaEnabled`, `renameLifeArea`, `addCustomLifeArea` in `home-screen.tsx`. Copy: "Disabling an area keeps its goals and history." |
| Delete a custom area or reorder areas | **Not found** | No removal or reorder code. `sortOrder` is set at creation. |
| Filter goals by area; per-area summary | **Verified** | `selectedAreaFilter`; `getGoalAreaSummary()` returns active count, completed count, and average progress of measurable active goals. |
| Create and edit a goal | **Verified** | Goal form: title, first step, description, why, life area (required), priority, start date, target date, target type, lifecycle status, progress, one milestone per save. |
| Qualitative vs quantitative goals | **Verified** | Quantitative needs target > 0 and a unit; qualitative uses a manual 0–100% or milestone completion ratio (`getQualitativeProgress`). |
| Record quantitative progress | **Verified** | +1 / −1 buttons on the goal card (`updateGoalProgress`) or a value in the form. Each change appends a `GoalProgressEvent` with the target and unit snapshot. |
| Milestones | **Verified** | Add or edit (title, optional due date) through the goal form; toggle complete and remove from the card. Removing clears milestone links on task and habit definitions. |
| Lifecycle | **Verified** | `draft`, `active`, `paused`, `completed`, `abandoned`, `archived`, with allowed next states per current state (`goalLifecycleOptions`). |
| Link tasks and habits to a goal and milestone | **Verified** | `goalLink`, `milestoneLink` in the task/habit form; goal card counts linked entries done. |
| Remove a goal | **Verified** | "Remove" button on the goal card calls `removeGoal()` immediately. |
| Add goals from templates | **Verified** | 25 goal templates (`features/templates/catalog.ts`); see [routines and templates](../routines-and-templates/CURRENT_STATE.md). |
| Goal suggestions on Today | **Verified** | "Connect an action to a goal" when the day has 6+ open items and a goal has no action that day. |

**Journey:** onboarding picks areas and optionally one matching starter goal → the Goals tab lists goals by area with progress bars and status → the "+" sheet adds a goal → actions are linked from the task or habit form → progress is recorded on the card → the person marks the goal completed (it is never automatic).

## 4. Screens, components, state and persistence

- **Screens:** Goals tab (`app/(tabs)/goals*.tsx` → `HomeScreen initialTab="goals"`); goal form and life-area sheet in `features/home/home-screen.tsx`; template detail in `app/template-detail.tsx`.
- **Types (`home-session.tsx`):** `StarterPlan` (the goal; legacy name), `GoalMilestone`, `GoalLifecycleStatus`, `LifeArea`, `GoalProgressEvent`. Helpers `getGoalProgressStatus()` (low ≤ 30%, mid < 70%, high) and, in `use-home-screen-model.ts`, `getQualitativeProgress()`.
- **Local persistence:** SQLite tables `goals`, `life_areas`, `goal_progress_events` (`home-storage.ts`).
- **Sync collections:** `plans`, `lifeAreas`, `goalProgressEvents`.
- **Analytics:** `planner_item_saved` with `item_type: 'goal'`, `action`, and link flags; `template_added` with template kind and category. No titles.

## 5. Business rules, validation and calculations

- **Required (Verified):** title and an enabled life area (a goal may keep a disabled area it already had). Start date must be a real date; target date, if set, must be on or after it.
- **Quantitative (Verified):** target > 0 and a unit. Progress ≥ 0. Legacy goals with a target but no unit can be saved unchanged but show "This saved goal needs a unit before you can record progress."
- **Qualitative (Verified):** manual progress 0–100; without it, progress is completed milestones ÷ all milestones.
- **Progress status (Verified):** ratio ≤ 0.3 low, < 0.7 mid, otherwise high. Copy: "Progress status is automatic and never completes the goal for you."
- **Completion (Verified):** choosing `completed` stamps `completedAt` (kept if already completed); any other status clears it. Reaching the target does not change status. The "A goal reached" achievement counts a goal at or above target, or with every milestone done.
- **Lifecycle transitions (Verified):** new goals may be `draft` or `active`; `active` → paused, completed, abandoned, archived; `paused` → active, completed, abandoned, archived; `archived` → active; `completed` and `abandoned` → active or archived.
- **Area visibility (Verified):** with the "all" filter, goals in disabled areas are hidden; goals with no area or an unknown area id stay visible.
- **Migration (Verified):** normalization fills missing description, why, priority (`medium`), start date (today), target type, and status (`active`), and clamps manual progress to 0–100.

## 6. Loading, empty, success, error and offline states

- **Empty:** "Choose your next goal." / "Choose an area that matters and add one clear next step."; "No life areas selected" in the area list. **Verified.**
- **Success:** "Goal added" / "Goal updated — Saved on this device." after the local save. **Verified.**
- **Error:** field-level messages ("Choose a life area for this goal.", "Enter a target greater than zero.", "Add a unit, such as pages or minutes.", "Enter a percentage between 0 and 100."). Save failures keep the sheet open. **Verified.**
- **Offline:** fully local. **Verified.**

## 7. Dependencies

Planner session and storage; [daily planning](../daily-planning/CURRENT_STATE.md) for linked actions; [progress and history](../progress-and-history/CURRENT_STATE.md) (goal progress counts, "Goal completed" and "Milestone reached" history items); commitments link to goals ([check-ins, reflections and commitments](../check-ins-and-reflections/CURRENT_STATE.md)); templates; onboarding.

## 8. Functional limitations and confusing flows

- Only one milestone can be added per save of the goal form. Building a list of five milestones takes five saves. **Verified.**
- Quantitative progress moves by 1 per tap; large targets (10,000 steps) need the form. **Verified.**
- Goal progress is manual. Completing a linked habit or task does not move a quantitative goal. **Verified.** Whether it should is a product decision.
- Paused, abandoned and archived goals stay in the main list; only the area summary filters by status. **Verified.**
- Onboarding labels differ from the stored defaults for unselected areas ("Finance" vs "Money", "Sleep & recovery" vs "Sleep", "Personal growth" vs "Personal development"). **Verified** in `app/index.tsx` and `buildLifeAreas()`.
- Custom areas can be disabled but not deleted. **Verified.**

## 9. Defects and failure modes

- **Verified:** "Remove" deletes a goal immediately, with no confirmation and no undo. It clears links on task and habit definitions, but occurrences keep their `goalId`, progress events remain, and commitments keep `goalId`. History then labels those events "Goal progress updated" because the title is gone.
- **Verified:** renaming an area writes on every keystroke (`renameLifeArea` per change), so each character triggers a full local save. **Inferred** cost; not measured. It also ignores an empty value, so the last character of a custom area name cannot be deleted to retype it. **Verified** (`label.trim()` guard in a controlled input).
- **Needs Validation:** goal list performance with many goals and long event histories; nothing is paginated.

## 10. Performance, accessibility, security and testability

- **Performance:** goal cards compute linked-entry counts from a map built once per entries change (`goalEntriesByPlan`). Fine for expected sizes; not measured.
- **Accessibility:** progress buttons are labeled "Increase goal progress" / "Decrease goal progress"; milestone actions include the milestone title. Screen-reader order and large text are **Needs Validation**.
- **Privacy:** goal titles, "why", and milestones are personal data. Analytics carry only type, action and link flags. **Verified.**
- **Testability:** validation and lifecycle rules sit inline in `addEntry()`; only the progress-status helpers are pure. No tests.

## 11. Missing capabilities and requirements to confirm

- Confirmation and undo for goal removal, or archive instead of delete.
- A milestone list editor.
- Optional automatic progress from linked habits (count of completions toward a target).
- Reordering and deleting custom areas.
- A "show inactive goals" toggle.
- Whether "first step" should become a real linked task instead of text.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): safe removal, a milestone list, list filtering by status, optional linked progress, area management, and extracting the goal rules into a tested module.

## Source map

- [Goal form, goal cards, life-area sheet](../../../mobile-app/src/features/home/home-screen.tsx)
- [Goal and area types, progress status, normalization](../../../mobile-app/src/features/home/home-session.tsx)
- [Area summaries, qualitative progress, achievements](../../../mobile-app/src/features/home/use-home-screen-model.ts)
- [Onboarding areas and starter goals](../../../mobile-app/src/app/index.tsx)
- [Goal templates](../../../mobile-app/src/features/templates/catalog.ts)
- [History items from goals and milestones](../../../mobile-app/src/features/home/history-screen.tsx)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Daily planning](../daily-planning/CURRENT_STATE.md) · [Progress and history](../progress-and-history/CURRENT_STATE.md)
