# Goals and life areas — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| G1 | C2 — extract and test goal rules | SaS-Next-Steps T0.2 (test runner) | No |
| G2 | A1 — archive instead of remove; confirmed delete; undo | G1 | No |
| G3 | A2 — custom area rename draft | — | No |
| G4 | B1 — milestone list editor | G1 | No |
| G5 | B2 — status filter | G1 | No |
| G6 | B4, B5 — shared area list; delete and reorder | G3 | No |
| G7 | C1 — optional linked progress | G1, owner decision | No |
| G8 | B3 — faster progress entry | — | No |

All data stays in the existing `plans`, `lifeAreas` and `goalProgressEvents` collections. No new sync collection and no migration.

## 2. Decisions needed

1. **Removal (G2):** recommended "Archive" as the card action and permanent delete only from archived goals.
2. **Linked progress (G7):** should it exist? If yes, recommended off by default per goal.
3. **Area delete (G6):** recommended "only when unused, otherwise move goals first".

## 3. Work packages

### G1 — Goal rules module

- **Files (new):** `mobile-app/src/features/goals/goal-rules.ts`, `goal-rules.test.ts`.
- **Functions:** `validateGoalDraft(draft, areas, existingGoal?) → FieldError | null`; `allowedNextStatuses(current, isNew)`; `applyStatus(goal, next, now)` (stamps or clears `completedAt`); `goalProgress(goal) → { percent, status }` combining the quantitative ratio and `getQualitativeProgress()`.
- **Constraint:** use `import type` only from `home-session.tsx`, so the Node test runner can load the file without React Native.
- **Change:** `addEntry()` and `changeGoalStatus()` call these functions; messages stay word-for-word.
- **Tests:** every validation message; every lifecycle transition from the current table; the legacy missing-unit repair; qualitative from manual value and from milestones.

### G2 — Safe removal

- **UI:** card action "Archive" (sets `archived`) with an undo toast; archived goals show "Restore" and "Delete permanently".
- **Delete:** removes the goal and its `goalProgressEvents`; clears `goalId`/`milestoneId` on definitions, on planned future occurrences, and on commitments. Terminal occurrences keep their snapshot title but drop `goalId`.
- **Analytics:** `planner_item_saved` with `item_type: 'goal'` and `action: 'archived' | 'restored' | 'deleted'`.
- **Done when:** tests for each data rule; History shows no orphan progress rows after delete.

### G3 — Area rename

- Local `draftLabel` per row; commit on blur or submit; empty → "Enter a name for this area." Same pattern for the add-area field.

### G4 — Milestone list editor

- Replace the single milestone fields with a list component inside the goal sheet. Save writes `milestones` in order. Existing ids keep `completed`, `completedAt`, `createdAt`.
- **Done when:** tests on a pure `mergeMilestones(existing, edited)`; VoiceOver can add, reorder (move up/down buttons, not drag only), and remove.

### G5 — Status filter

- Default list: `draft` and `active`. A toggle reveals other statuses in labeled groups. The area summary is unchanged.

### G6 — Area list

- **Files (new):** `mobile-app/src/features/goals/life-areas.ts` exporting the 15 built-in areas with ids, labels and icons. Onboarding, `buildLifeAreas()` and normalization import it.
- **Delete/reorder:** delete only when no goal references the area; otherwise show "Move goals to…". Reorder with up/down controls updating `sortOrder`.

### G7 — Linked progress (if approved)

- **Model:** optional `countLinkedActions?: boolean` on the goal; optional `source?: 'manual' | 'linked_action'` and `occurrenceId?: string` on `GoalProgressEvent`.
- **Logic:** in a pure `goalProgressFromCompletion(goal, occurrence, completed)` in `goal-rules.ts`; `toggleEntry()` and recovery "complete it now" call it.
- **Compatibility:** optional fields; older builds ignore them and keep showing the stored `progressValue`.

### G8 — Progress entry

- Long-press on "+" opens an amount field; accepts numbers > 0.

## 4. Rollout and rollback

App-only changes. Optional new fields are ignored by older builds on another synced device. Rollback is a previous build; archived goals remain readable because `archived` already exists.

## 5. Exit evidence

- `goal-rules.test.ts` passes.
- Manual run on iOS and Android: create quantitative and qualitative goals, record progress, add three milestones, archive, undo, restore, delete permanently, rename and delete a custom area.
- [Current state](CURRENT_STATE.md) updated with the review date.
