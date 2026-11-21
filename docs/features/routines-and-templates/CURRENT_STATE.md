# Routines and templates — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No template was added and no routine was applied or imported on a device in this pass. The `daily-plan` catalog deployment was reported on 2026-10-31 and not re-checked.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

Starting from a blank page is hard. Templates give ready-made goals and habits to adapt, and routines give a time-blocked shape for a whole day. A routine is a reusable definition; each day it produces routine-step items on Today that can be completed like tasks.

## 2. Target user and expected outcome

People who want structure without designing it themselves, and people who already have a routine they want to track. Expected outcome: pick or build a routine in a few minutes, see its blocks on the right days, and adjust blocks as life changes.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Browse 25 goal and 20 habit templates in 13 categories | **Verified** | `features/templates/catalog.ts`; `/templates` route (`app/templates.tsx`). |
| Search and filter by category and kind | **Verified** | Text search over title, description, context, category, kind; category chips; goal/habit toggle. Empty state "No matches yet." |
| Add a goal template (edit name, first step, optional target and unit) | **Verified** | `app/template-detail.tsx`; the goal gets a life area from the template category. |
| Add a habit template (edit name, recurrence, days, tracking type, target, unit) | **Verified** | Same route; creates a `HabitDefinition` with `sourceTemplateId`. |
| Each template can be added once | **Verified** | `added` checks `sourceTemplateId`; the save button is disabled afterward. |
| Browse full-day routines | **Verified** | `/full-day-templates` lists catalog routines and "Your routine" entries, plus "Create your own routine". |
| Built-in "Daily Plan" (8 blocks, every day) | **Verified** | Served by the `daily-plan` Edge Function, cached, with a bundled fallback (`daily-plan-provider.tsx`, `day-schedules.ts`). |
| Use a routine as is, or customize it into a personal copy | **Verified** | `/templates` "Preview routine" → "Use this routine"; `/day-template-detail` "Customize this routine". |
| Create a routine from scratch | **Verified** | `/day-template-detail?id=new`: name, repeat days, time blocks (time and notes optional, title required, optional target and unit). |
| Edit a saved routine's blocks and days | **Verified** | Same screen with `routineId`. From Today, editing a routine step updates the block's title and target. |
| "Build a routine from your day" with any AI assistant | **Verified, user-mediated** | Copy a prompt (`AI_ROUTINE_PROMPT`), paste the assistant's JSON reply, review blocks, then save. No model call in the app. |
| Delete a routine or turn one off | **Not found** | No code removes a `DaySchedule`; routine days can be edited but at least one day is required. |
| Routine reminders | **Not found** | Routines do not schedule notifications. |

**Journey:** Today or onboarding → Templates → "Plan a daily routine." → preview the Daily Plan → "Use this routine" (adds a personal copy once) or "Customize this routine" (edit, then "Apply this routine") → its blocks appear on Today for matching weekdays as routine steps.

## 4. Screens, components, state and persistence

- **Routes:** `app/templates.tsx` (goals and habits catalog, routine preview and quick customize sheet), `app/template-detail.tsx`, `app/full-day-templates.tsx`, `app/day-template-detail.tsx`.
- **Catalog:** `features/templates/catalog.ts` (`goalTemplates`, `habitTemplates`, `scheduleTemplates`, `templateCatalogCounts`, category icons). Routine catalog at runtime comes from `useDailyPlanTemplates()`.
- **Parser:** `features/home/ai-routine-import.ts` (`AI_ROUTINE_PROMPT`, `parseAiRoutineResponse`).
- **Model:** `DaySchedule { id, sourceTemplateId?, dayType, daysOfWeek?, title, blocks[] }`, `DayScheduleBlock { id, time, title, details, targetValue?, targetUnit? }` in `day-schedules.ts`.
- **Persistence:** SQLite `day_schedules`; habits and goals from templates in `habit_definitions` and `goals`; routine steps as `occurrences` with `sourceType: 'routine_step'`. Synced as `daySchedules` when sync is on.
- **Server:** `public.daily_plan_catalog` (one row; select and update granted to `service_role` only) and `supabase/functions/daily-plan` (`GET` public with a 30 s cache; `PUT` for `dashboard_admins` members with `expectedRevision`; unlike the dashboard, it does not also require a confirmed email).
- **Analytics:** `template_added { template_kind, template_category }`; `routine_saved { action, source, day_type, block_count }`. No titles or block text.

## 5. Business rules, validation and calculations

- **Template validation (Verified):** name required; a goal needs a first step; a target must be > 0 and needs a unit (quantity habits and goals); "selected days" needs at least one day.
- **Category → area (Verified):** `lifeAreaIdForCategory()` maps 12 categories to built-in areas (Reading → learning, Social Development → social); "General Goals" maps to no area.
- **Routine validation (Verified):** a name, at least one repeat day, at least one block; each block needs a title, and a target needs a unit and a value > 0.
- **Day matching (Verified):** a routine with `daysOfWeek` matches those weekdays; older routines without it match by `dayType` (weekday or weekend).
- **Step identity (Verified):** `schedule-<routineId>-<date>-<blockId>`; `occurrenceKey` is the block id, so editing a block keeps today's step linked.
- **Server catalog validation (Verified):** schema version 1; 1–20 routines; ids `[a-z0-9-]`; 1–32 blocks; times like `06:30 AM – 07:15 AM`; each details line starts with "•"; targets > 0. An invalid response is ignored.
- **AI import (Verified):** input up to 24,000 characters; extracts the first JSON object (fenced or bare); 1–16 blocks; `dayType` weekday or weekend; `daysOfWeek` integers 0–6; optional target and unit. Targets are coerced with `Number()`, so `true` becomes 1 and `"0x10"` becomes 16 (TD-16).
- **Catalog updates (Verified):** a server update changes the built-in template only; personal copies keep their blocks.

## 6. Loading, empty, success, error and offline states

- **Loading:** the catalog shows the bundled or cached Daily Plan immediately and swaps in a newer valid response. **Verified.**
- **Empty:** "No matches yet. Try another word or category."; "No time blocks yet" in the routine editor; "Routine not found" for a bad id. **Verified.**
- **Success:** routines and templates save locally first, then return. **Verified.**
- **Error:** "Could not save on this device. Your edits are still here. Try saving again."; parser messages such as "That response is too long. Ask for a shorter routine with 4 to 10 blocks." **Verified.**
- **Offline:** catalog falls back to cache, then bundle. Everything else is local. **Verified.**

## 7. Dependencies

Planner session; [daily planning](../daily-planning/CURRENT_STATE.md) materializers; [goals and life areas](../goals-and-life-areas/CURRENT_STATE.md); `expo-clipboard`; the `daily-plan` Edge Function and `daily_plan_catalog`; `dashboard_admins` for catalog updates; PostHog.

## 8. Functional limitations and confusing flows

- There is no way to remove a routine. A person who tries the Daily Plan and changes their mind can only edit it. **Verified.**
- Two places customize routines (`/templates` quick sheet and `/day-template-detail`) with different copy and validation. The quick sheet adds blocks with placeholder data ("Add a time", "New activity") that is saved as-is if not edited. **Verified.**
- The only built-in routine includes faith-specific blocks. **Verified** content.
- Template "first step" text is stored on the goal but not created as a task. **Verified.**
- The catalog `PUT` exists but no dashboard screen calls it; updates need a hand-made request with an admin token. **Verified** (no reference in `dashboard/src`).

## 9. Defects and failure modes

- **Verified (logic):** a goal template whose category maps to a life area the person has not enabled is saved with that area, and the Goals tab's "all" filter hides goals in disabled areas. The template screen shows "added", but the goal does not appear in the list until the area is enabled.
- **Verified (TD-16):** AI-import target coercion accepts booleans and hex strings.
- **Needs Validation:** a stale cached catalog is used indefinitely when the fetch keeps failing; there is no age limit.
- **Needs Validation:** clipboard permission prompts on iOS when copying the prompt.

## 10. Performance, accessibility, security and testability

- **Performance:** the catalog list is a `FlatList` of 45 items; trivial. Routine materialization runs per selected date.
- **Accessibility:** cards and actions are labeled ("View template", "Remove <block>"); day chips are buttons. Screen-reader check is **Needs Validation**.
- **Security:** pasted AI text is parsed as data only and never executed; output is length-capped. The catalog `PUT` checks the caller's token and `dashboard_admins` membership and uses an optimistic revision check. **Verified** in source.
- **Testability:** `ai-routine-import.ts` and the catalog validator are pure and dependency-free but untested.

## 11. Missing capabilities and requirements to confirm

- Delete or pause a routine.
- More built-in routines (weekday, weekend, student, shift worker), including a neutral default.
- Routine block reminders.
- An admin screen for catalog edits.
- Whether template "first step" should create a task.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): routine delete and pause, fix the hidden-goal case, one customize path, strict import validation, parser tests, more catalog routines, and a dashboard catalog editor.

## Source map

- [Template catalog](../../../mobile-app/src/features/templates/catalog.ts)
- [Templates route](../../../mobile-app/src/app/templates.tsx)
- [Template detail](../../../mobile-app/src/app/template-detail.tsx)
- [Full-day routines](../../../mobile-app/src/app/full-day-templates.tsx)
- [Routine editor and AI import UI](../../../mobile-app/src/app/day-template-detail.tsx)
- [AI routine parser](../../../mobile-app/src/features/home/ai-routine-import.ts)
- [Routine model and materializer](../../../mobile-app/src/features/home/day-schedules.ts)
- [Daily Plan provider](../../../mobile-app/src/features/home/daily-plan-provider.tsx)
- [Daily Plan Edge Function](../../../supabase/functions/daily-plan/index.ts)
- [Catalog migration](../../../supabase/migrations/20261030143010_daily_plan_catalog.sql)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Daily planning](../daily-planning/CURRENT_STATE.md) · [Technical debt](../../architecture/TECHNICAL_DEBT.md)
