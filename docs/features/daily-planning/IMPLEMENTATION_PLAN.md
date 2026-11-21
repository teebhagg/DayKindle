# Daily planning — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [SaS execution plan](../../../SaS-Next-Steps.md).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| P0 | Unit-test runner (shared with every feature) | SaS-Next-Steps T0.2 | No |
| DP1 | C1 — tests for the status machine, recurrence and materializers | P0 | No |
| DP2 | A1 — completion analytics after confirmed save | DP1 | No |
| DP3 | B1 — stop repeating and delete | DP1 | No |
| DP4 | B3 — skip a planned item; A2 — past-date rule | DP1, owner decision | No |
| DP5 | B2 — "only this day" vs "this and future" | DP3 | No |
| DP6 | B4, B5 — device-local date, persisted dismissals | — | No |
| DP7 | C3 — measure, then C2 — extract the editor | DP1–DP5 | No |

Every step keeps planner data local-first. None of them adds analytics content beyond categories.

## 2. Decisions needed before starting

1. **Past-date items (A2):** recommended "Did you do it?" prompt. Alternatives: log as completed, or block past dates.
2. **Delete semantics (B1):** recommended "remove the definition and planned future occurrences; keep terminal history". Confirm that deleted items should still appear in History and Progress.
3. **Back-fill (open question):** should the app create `missed` records for recurring items on days it was not opened? Recommended: no. Back-filling would inflate misses and conflict with the gentle tone.

## 3. Work packages

### DP1 — Tests for planning rules

- **Files (new):** `mobile-app/src/features/home/occurrences.test.ts`, `mobile-app/src/features/home/recurrence.test.ts`.
- **Prerequisite:** `day-schedules.ts` imports `dateKey` from `home-session.tsx`, which loads React Native. Move `dateKey` and `shiftDateKey` into a dependency-free `date-keys.ts` and re-export them from `home-session.tsx` so callers do not change.
- **Cases:** each status transition with and without a correction reason; `reconcileOverdue()` on yesterday, today and tomorrow; duplicate candidates; reschedule to past, same day, a duplicate date, and a valid date; each recurrence rule for 14 consecutive days including a daylight-saving change (run with `TZ=America/New_York` and `TZ=Africa/Accra`).
- **Done when:** all cases pass under `npm run test:unit` and no source behavior changed.

### DP2 — Completion analytics after save

- **File:** `features/home/home-screen.tsx` (`toggleEntry`).
- **Change:** capture `planner_item_completion_toggled` after `confirmLocalSave()` resolves. Keep the payload identical so dashboard queries keep working.
- **Done when:** a forced save failure sends no event (manual check with storage writes blocked) and a success sends exactly one.

### DP3 — Stop repeating and delete

- **Model:** add optional `endDate?: string` to `TaskDefinition` and `HabitDefinition` (`home-session.tsx`). `recurrenceMatches(rule, date, startDate, daysOfWeek, endDate?)` returns false after `endDate`. Normalization accepts the field only when it is a valid date key.
- **UI:** two actions on the edit sheet for recurring sources: "Stop repeating after today" and "Delete". Delete confirms with the count of planned future occurrences it will remove.
- **Data rules:** delete removes the definition and occurrences with `status === 'planned'` and `date >= today`. It never removes terminal occurrences. Links from goals and commitments to the deleted source stay as dangling ids; Progress and History already read occurrences only.
- **Sync:** definitions and occurrences are whole entities; removal produces tombstones through the existing diff. No migration.
- **Analytics:** `planner_item_saved` with `action: 'deleted'` or `'ended'`, plus `item_type`. No title.
- **Done when:** DP1-style tests cover `endDate`; a synced delete on device A removes the item on device B after sync (manual, two simulators).

### DP4 — Skip and the past-date rule

- **UI:** "Skip today" on planned items sets `skipped` with an optional reason from the existing reason list.
- **Past date:** implement the owner's choice from §2.1 inside `addEntry()`.
- **Done when:** tests cover both statuses; Progress counts skipped items as terminal (existing rule).

### DP5 — Recurring edit scope

- **UI:** when an edited planned occurrence has a recurring source, show a two-option choice before saving.
- **"Only this day":** update the occurrence snapshot fields only.
- **"This and future days":** today's behavior (definition update), plus update planned future occurrences already materialized.
- **Done when:** both paths are tested, including a routine step.

### DP6 — Small state fixes

- Remove `selectedDate` from `SETTINGS_FIELDS` in `entity-sync-service.ts`; open Today on today's date.
- Store `{ id, dismissedOn }` for recommendations in session settings; expire after 7 days.

### DP7 — Measure, then extract

- **Measure first:** seed 1, 3 and 5 years of data on a physical iPhone and a mid-range Android device; record save time, cold start, and Today first render. Record device, OS and build.
- **Extract:** move the editor into `features/planner-editor/` with `validateDraft(draft): FieldError | null` and `buildChanges(draft, session): SessionChanges`. `home-screen.tsx` renders the sheet and applies the changes.
- **Done when:** DP1 tests and a scripted manual walkthrough of every field pass before and after; `home-screen.tsx` shrinks without behavior change.

## 4. Rollout and rollback

All changes ship in the app binary or an EAS update. No flags are needed: each step is small and local. Rollback is a previous build. New optional fields (`endDate`) are ignored by older builds, so mixed versions on two synced devices stay readable; an older device would still show ended items until updated, which is acceptable.

## 5. Exit evidence

- `npm run test:unit` passes with the DP1 suite.
- Manual run on iOS and Android: add, complete, un-complete, miss (change device date), reschedule, skip, stop repeating, delete.
- Updated [current state](CURRENT_STATE.md) with a new review date.
