# Reminders — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** fixes privacy or reliability; **P2** removes friction; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects and risks

### A1. Private notification option — P1, S

- **Evidence:** **Inferred** — the reminder name is the lock-screen title.
- **Approach:** a per-reminder "Hide name on lock screen" switch (default on for new reminders) that uses the title "DayKindle reminder" and keeps the name in the body only after unlock where the platform supports it (iOS `hiddenPreviewsBodyPlaceholder` category; Android `VISIBILITY_PRIVATE` with a public version).
- **Tests:** scheduled content for both settings (mocked `expo-notifications`); device check on the lock screen.

### A2. Reschedule when reminders change through sync — P1, S

- **Evidence:** **Inferred** — rescheduling runs once per `HomeScreen` mount.
- **Approach:** move scheduling into a small `ReminderScheduler` component under `HomeSessionProvider` that reschedules whenever the `reminders` array changes (compared by content), debounced, without prompting for permission.
- **Tests:** a reminder added through `replacePlannerData()` is scheduled.

### A3. Clean up expired one-time reminders — P2, S

- **Evidence:** **Verified** — expired one-time reminders stay listed.
- **Approach:** show them under "Past" for 7 days, then remove them automatically.

## B. Refine existing capabilities

### B1. Time picker and edit — P2, S

- Use the platform date picker in time mode (the app already has `native-date-picker-popover`); add "Edit" to rows.

### B2. Selected-day repeats — P2, M

- Add `repeat: 'weekly'` with `daysOfWeek`; schedule one weekly trigger per selected day. Older builds drop unknown repeats on load (normalization filters them), so ship with A2 and accept that an older second device ignores them.

### B3. Plain-language push copy — P3, S

- Replace the setup-oriented "Push delivery requires an EAS project and a server…" panel with nothing for end users until remote push exists; keep the check behind a developer flag.

## C. New capabilities

### C1. Notification routing — P2, M

- Include a route in `data` (for example `{ route: '/', tab: 'today' }` or `{ checkIn: 'evening' }`) and handle taps with `Notifications.addNotificationResponseReceivedListener` in the root layout. Only allow-listed routes.

### C2. Reminders that follow the plan — P2, L

- Optional "Remind me" on a habit, task, or routine block. A reminder linked to a source is scheduled only for dates where that source has a planned occurrence, and is cancelled when it is completed or paused.
- **Constraint:** iOS allows 64 pending local notifications per app. Schedule a rolling 7-day window and refresh on app open and after each change.

### C3. Remote push readiness — P1 for partners, M

- **Evidence:** **Verified** — the token is obtained and discarded.
- **Approach:** store tokens in a `push_devices` table (owner-only RLS) and add a sender Edge Function, as specified in the [accountability plan](../accountability/IMPLEMENTATION_PLAN.md) Stage B. Local reminders stay local.

### C4. Tests — P1, S

- Extract `validateReminderDraft()` and `buildNotificationRequests(reminders, now)` as pure functions and test time, date, expiry, repeat, and privacy options.

## Measurement

Aggregates only: share of active users with at least one reminder; permission granted vs denied on first prompt; reminders by repeat type; notification opens (after C1) by route. Never reminder names.
