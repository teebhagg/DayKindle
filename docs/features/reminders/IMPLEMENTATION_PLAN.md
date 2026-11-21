# Reminders — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [accountability plan](../accountability/IMPLEMENTATION_PLAN.md) (remote push, Stage B).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| R1 | C4 — pure validation and request builder with tests | SaS-Next-Steps T0.2 | No |
| R2 | A2 — scheduler follows the reminders list | R1 | No |
| R3 | A1 — private notification option | R1 | No |
| R4 | B1, A3 — time picker, edit, expired cleanup | — | No |
| R5 | C1 — notification routing | T0.7 scheme (for future links) | No |
| R6 | B2 — selected-day repeats | R2 | No |
| R7 | C2 — reminders linked to plan items | R2, R5, daily planning DP3 | No |
| R8 | C3 — remote push | Accountability Stage B migration | Yes |
| R9 | B3 — remove setup copy from Profile | R8 decision | No |

## 2. Decisions needed

1. **Default privacy (R3):** recommended "hide name on lock screen" on by default for new reminders.
2. **Linked reminders (R7):** which sources first (habits recommended), and the rolling window length (7 days recommended).
3. **Remote push (R8):** timing is set by the accountability and services plans.

## 3. Work packages

### R1 — Pure functions

- **File (new):** `mobile-app/src/features/reminders/reminder-rules.ts` with `validateReminderDraft(draft, now)` and `buildNotificationRequests(reminders, now, platform)` returning `{ identifier, content, trigger }[]` without calling Expo.
- **Change:** `notification-service.ts` maps the requests to `scheduleNotificationAsync`; `home-screen.tsx` uses the validator.
- **Tests:** every message in `saveNotificationReminder()`, expiry, daily vs once triggers, Android channel id.

### R2 — Scheduler component

- **File (new):** `mobile-app/src/features/reminders/reminder-scheduler.tsx`, mounted inside `HomeSessionProvider` children in `app/_layout.tsx`.
- **Behavior:** on a content change to `reminders` (stable JSON key), wait 500 ms, then `syncLocalNotifications(reminders)` without a permission request. Remove the `didSyncReminders` effect from `home-screen.tsx`.
- **Done when:** a reminder that arrives through sync or restore is scheduled without visiting Profile.

### R3 — Private notifications

- **Model:** optional `hideTitle?: boolean` on `NotificationReminder` (normalization keeps it when boolean).
- **Scheduling:** when set, `content.title` = "DayKindle reminder" and the real name goes in `body` with platform privacy settings (an iOS notification category with a hidden-preview placeholder; Android channel lockscreen visibility private).
- **Done when:** device check on both platforms with the phone locked.

### R4 — Picker, edit, cleanup

- Time field uses the native picker; rows get "Edit" (reuses the form with `pendingReminderId`). One-time reminders older than 7 days are dropped during normalization.

### R5 — Routing

- Root layout listens for notification responses; `data.route` must be in an allow-list (`today`, `progress`, `check-in-morning`, `check-in-evening`). Unknown routes open Today.

### R6 — Weekly repeats

- `repeat: 'weekly'` + `daysOfWeek`; one `WEEKLY` trigger per day. Normalization accepts it. Ship after R2 so mixed-version devices are handled by rescheduling.

### R7 — Linked reminders

- **Model:** optional `source?: { type: 'habit' | 'task' | 'routine_block'; id: string }`.
- **Scheduling:** for the next 7 days, schedule a date trigger only where a planned occurrence exists or would be materialized (`recurrenceMatches`); refresh on app open, on completion, and on pause. Cap total pending notifications at 50.

### R8 — Remote push

- Implement as part of accountability Stage B: `push_devices` table, token registration on consent, an Edge Function sender, and lock-screen text without titles by default. Not repeated here.

## 4. Rollout and rollback

R1–R7 are app-only; new optional fields are ignored by older builds. Rollback is a previous build; after rollback the old once-per-mount scheduling resumes. R8 follows the accountability plan's rollout.

## 5. Exit evidence

R1 tests pass. Device runs on iOS and Android: create, edit, remove, deny then allow permission, restart the device, change time zone, lock-screen privacy, tap-to-open. Record device, OS and build. [Current state](CURRENT_STATE.md) updated.
