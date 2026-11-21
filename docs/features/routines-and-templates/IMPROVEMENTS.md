# Routines and templates — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** fixes lost or invisible data or a missing core action; **P2** removes friction or risk; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects

### A1. Goal templates must not disappear into a disabled area — P1, S

- **Evidence:** **Verified (logic)** — `lifeAreaIdForCategory()` assigns an area regardless of whether it is enabled; the Goals "all" filter hides goals in disabled areas.
- **User benefit:** a goal added from a template is always visible.
- **Approach:** when the mapped area is disabled, enable it on save and say so in the toast ("Added to Finance. Finance is now shown in your areas."). Alternative: let the person pick the area on the template screen, defaulting to the mapped one.
- **Tests:** add a Finance template with Finance disabled → goal visible under "all" and under Finance.

### A2. Strict target validation in AI import — P2, S

- **Evidence:** **Verified (TD-16)** — `Number(true)` → 1, `Number("0x10")` → 16.
- **Approach:** accept only JSON numbers (or decimal strings matching `^\d+(\.\d+)?$`), finite, > 0, ≤ 100,000; unit ≤ 40 characters.
- **Tests:** booleans, hex, exponent, negative, zero, huge, and valid decimals.

### A3. Don't save placeholder block text — P2, S

- **Evidence:** **Verified** — the `/templates` quick customize sheet adds blocks with "Add a time" and "New activity" as real values.
- **Approach:** remove the quick sheet's editor and route "Customize" to `/day-template-detail` (see B2), which uses empty fields with placeholders.

## B. Refine existing capabilities

### B1. Delete and pause routines — P1, S

- **Evidence:** **Verified** — no code removes a `DaySchedule`.
- **Approach:** "Remove routine" on the routine screen: deletes the schedule and today-or-later planned routine steps; completed and missed steps stay in history. "Pause routine" sets an optional `pausedAt`; paused routines materialize nothing.
- **Tests:** remove keeps terminal steps; pause and resume; synced removal tombstones.

### B2. One customize path — P2, M

- **Evidence:** **Verified** — two editors with different rules.
- **Approach:** keep `/day-template-detail` as the only editor; `/templates` preview offers "Use this routine" and "Customize" (navigates).

### B3. Template "first step" as a task — P3, S

- **Approach:** on adding a goal template, offer "Add the first step to today" (checked by default), creating a one-time task linked to the goal.

### B4. Catalog freshness — P3, S

- **Approach:** store `fetchedAt` with the cache; after 30 days without a successful refresh, fall back to the bundled plan if its revision is newer.

## C. New capabilities

### C1. More built-in routines — P2, M

- **Why:** one routine, with faith-specific blocks, does not fit everyone.
- **Approach:** add a neutral weekday routine, a weekend routine, and a short "minimum day" routine to the catalog (and the bundle). Rename the current one to describe its content. Content decision for the owner.

### C2. Dashboard catalog editor — P3, M

- **Evidence:** **Verified** — the `PUT` endpoint has no UI.
- **Approach:** a dashboard page that loads the catalog, edits blocks in a form that enforces the same validator, previews on a phone frame, and saves with `expectedRevision`. Admin only.

### C3. Parser and validator tests — P1, S

- **Evidence:** **Verified** — `ai-routine-import.ts` and the catalog validator are pure and untested.
- **Approach:** fixtures for fenced JSON, prose around JSON, nested braces in strings, 0/1/16/17 blocks, 24,000 and 24,001 characters, bad days, and catalog edge cases (time format, bullet lines, 32/33 blocks).

### C4. Block reminders — P3, M

- Optional "Remind me at the start of this block" per block, using the existing local scheduler (see [reminders](../reminders/IMPLEMENTATION_PLAN.md)). Needs block times in a parseable format first.

## Measurement

Aggregates only: templates added by kind and category; routines saved by source (template, custom, AI import) and block-count bucket; share of active users with a routine; routine-step completion rate. No block titles or details.
