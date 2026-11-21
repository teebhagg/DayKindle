# Routines and templates — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| RT1 | C3 — parser and catalog-validator tests | SaS-Next-Steps T0.2 | No |
| RT2 | A2 — strict import targets | RT1 | No |
| RT3 | A1 — visible template goals | — | No |
| RT4 | B1 — remove and pause routines | Daily planning DP1 tests | No |
| RT5 | B2 + A3 — single customize path | — | No |
| RT6 | C1 — more catalog routines | Owner content | Catalog content only |
| RT7 | B3, B4 — first-step task; catalog freshness | — | No |
| RT8 | C2 — dashboard catalog editor | AS1 deployed-state record | Dashboard only |
| RT9 | C4 — block reminders | Reminders R6, parseable block times | No |

## 2. Decisions needed

1. **Hidden goals (RT3):** auto-enable the area (recommended) or ask for an area on the template screen.
2. **Routine content (RT6):** names and blocks for new routines; new name for the current Daily Plan.
3. **Block times (RT9):** keep free text, or store `startTime`/`endTime` as `HH:mm` alongside the display text.

## 3. Work packages

### RT1 — Tests

- **Files (new):** `mobile-app/src/features/home/ai-routine-import.test.ts`; move the catalog validator from `daily-plan-provider.tsx` into `features/home/daily-plan-validation.ts` (no React imports) with `daily-plan-validation.test.ts`.
- **Shared rule:** the Edge Function has its own `validTemplates()`; add a fixture file both test suites read (JSON in `supabase/functions/daily-plan/fixtures/`), so the client and server agree on what is valid.

### RT2 — Strict targets

- Replace `Number(item.targetValue)` with `parsePositiveNumber(value)` that accepts JSON numbers or plain decimal strings only, finite, in (0, 100000].
- **Done when:** RT1 fixtures for coercion cases fail before and pass after.

### RT3 — Visible template goals

- In `template-detail.tsx` `save()`: if the mapped area exists and is disabled, `setLifeAreas` enables it in the same save; the toast names the area.
- **Done when:** a manual run with Finance disabled shows the goal under "all".

### RT4 — Remove and pause

- **Model:** optional `pausedAt?: string` on `DaySchedule`; `daySchedulesForDate` and the materializer skip paused routines.
- **Remove:** delete the schedule and planned occurrences with `scheduleId` = id and `date >= today`.
- **UI:** "Pause routine" / "Resume routine" and "Remove routine" (with confirmation) on `/day-template-detail`.
- **Analytics:** `routine_saved` with `action: 'paused' | 'resumed' | 'removed'`.

### RT5 — One customize path

- `/templates` preview: "Use this routine" (unchanged) and "Customize" → `router.push('/day-template-detail?id=<templateId>')`. Delete the quick editor state (`scheduleDraft`, `applySchedule`, its sheet).

### RT6 — Catalog routines

- Add routines through `PUT /functions/v1/daily-plan` with `expectedRevision`; mirror them in `dayScheduleTemplates` for offline installs. `full-day-templates.tsx` already lists every catalog routine.

### RT7 — First step and freshness

- **First step:** checkbox on goal templates; creates a one-time `TaskDefinition` for today linked to the new goal.
- **Freshness:** cache `{ payload, fetchedAt }`; prefer the bundle when the cache is older than 30 days and the bundle revision is higher.

### RT8 — Dashboard catalog editor

- **Files (new):** `dashboard/src/app/catalog/page.tsx` (server component gated by `getDashboardAccess()`), `dashboard/src/components/catalog-editor.tsx`, a server action calling the Edge Function with the admin's session token.
- **Rule:** the browser never holds a service-role key; the Edge Function stays the only writer.
- **Also:** make the function require `email_confirmed_at`, matching the dashboard's own gate.

### RT9 — Block reminders

- Only after block times are parseable. Each enabled block becomes a `NotificationReminder` with `repeat: 'weekly'` and the routine's `daysOfWeek` (requires reminders plan R6).

## 4. Rollout and rollback

App changes ship in builds; optional `pausedAt` is ignored by older builds (they would still show a paused routine until updated). Catalog changes are reverted by a `PUT` of the previous templates. The dashboard editor ships separately and can be removed without affecting the app.

## 5. Exit evidence

RT1 suites pass; manual run: add each template kind, add with a disabled area, use and customize the Daily Plan, import a pasted routine, pause, resume and remove a routine. [Current state](CURRENT_STATE.md) updated.
