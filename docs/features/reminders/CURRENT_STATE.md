# Reminders — current state

**Reviewed:** 2026-11-20
**Status:** Custom sound, notification actions, and Normal/Important scheduling are configured in source. A native rebuild and iOS/Android behavior check have not been done.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

A plan helps only if the person remembers it at the right moment. Reminders are local notifications the person sets for themselves ("Evening walk", 18:30 daily). They work offline and for Guests because the phone schedules them; no server is involved.

## 2. Target user and expected outcome

Anyone who wants a nudge at a set time. Expected outcome: create a one-time or daily reminder in a few seconds, receive it on time, and remove it when it is no longer useful.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Create a reminder: name, time (24-hour text, "08:30"), repeat once or daily, date for once | **Verified** | Profile "Reminders" section; `saveNotificationReminder()` in `home-screen.tsx`. |
| Permission request on first save | **Verified** | `syncLocalNotifications(next, { requestPermission: true })`. |
| Schedule on iOS and Android | **Verified** | `notification-service.ts`: cancels every app-owned notification, then schedules each valid reminder (daily trigger or date trigger). Android channel "DayKindle reminders". |
| Custom reminder sound | **Source configured; Needs Validation** | Every local reminder uses the selected SFXMint “Warm Notification Chime 15” WAV. The Expo config plugin lists it for native bundling; notification content references it on both platforms, and Android uses a dedicated channel. Native rebuild and device playback still need validation. |
| Interactive actions | **Source configured; Needs Validation** | Reminder notifications expose “Snooze 10 min” and “Done” or “Done today.” Snoozes are scheduled locally and survive normal reminder rescheduling. Completing a one-time reminder removes it from the saved planner; completing a daily reminder dismisses only that occurrence. |
| Importance | **Source configured; Needs Validation** | Normal is the default. Important uses Android ongoing notification behavior and a higher-importance channel, plus iOS Time Sensitive interruption level. Android settings and iOS Focus/notification settings can change delivery. Neither OS lets the app guarantee top-of-list placement. |
| Sound selection | **Not found** | All local reminders use the same selected sound. There is no in-app per-reminder sound selector or mute setting. |
| Remove a reminder | **Verified** | "Remove" on each row; reschedules the rest. |
| Edit a reminder | **Not found** | Remove and recreate. |
| Weekly or selected-day repeats | **Not found** | Only `once` and `daily`. |
| Reminders tied to a task, habit, or routine block | **Not found** | Reminders are free-standing. The only linked reminders are the check-in reminders below. |
| Open the reminder screen from a notification tap | **Source configured; Needs Validation** | Tapping an app-owned reminder routes to Profile. Tapping a check-in reminder (`checkInPeriod` set) opens Today with the matching check-in sheet. Action buttons open the app so their response can be applied and saved. |
| Daily check-in reminders from Profile wake and sleep times | **Source configured; Needs Validation** (updated 2026-11-21) | Profile → Daily check-ins saves `wakeTime` and `sleepTime`. Each creates a daily reminder with a fixed ID (`checkin-morning` at wake time, `checkin-evening` 60 minutes before sleep). Clearing a time removes its reminder. |
| Apple Live Activity | **Not found** | The app uses scheduled notifications; it does not include an ActivityKit Live Activity or widget extension. |
| Web | **Not supported** | Returns `unsupported`; copy: "Notifications require the iOS or Android app." |
| "Check push setup" | **Verified, partial** | `registerPushToken()` obtains an Expo push token on a physical device with a project id and permission. The token is not stored or sent anywhere. Copy: "Server delivery still needs to be connected." |
| Remote push delivery | **Not found** | No token table and no sender in `supabase/functions/`. |

**Journey:** Profile → Reminders → "Add a reminder" → name, time, repeat, importance → "Save reminder" → local save confirmed → permission prompt (first time) → "Reminder scheduled — Saved on this device." → the notification shows the reminder's name, selected importance behavior, and “Snooze 10 min” / “Done” action buttons. Snoozing schedules another local alert ten minutes later with the same importance and sound.

## 4. Screens, components, state and persistence

- **UI:** Profile tab section and form in `features/home/home-screen.tsx` (`applyNotificationReminders`, `saveNotificationReminder`, `removeNotificationReminder`, `checkPushReadiness`); status via `AppFeedback`.
- **Service:** `features/home/notification-service.ts` (`setNotificationHandler` shows banners and lists; action categories expose snooze/completion; Android channels carry importance and sound; snoozes are preserved while a reminder remains; `requestNotificationPermission`, `syncLocalNotifications` serialized through a promise queue, `registerPushToken`).
- **Model:** `NotificationReminder { id, title, time: 'HH:mm', repeat: 'once' | 'daily', importance?: 'normal' | 'important', date? }` in `home-session.tsx`.
- **Persistence:** inside the SQLite `session_settings` JSON (no table of its own). Synced as the `reminders` collection when sync is on.
- **Ownership:** scheduled notifications carry `data.daymarkReminderId` (or the legacy `daymarkCategory`), so the app cancels only its own.
- **Config:** `expo-notifications` plugin in `app.json` (color `#587A66`, default channel, and bundled reminder WAV). Android reminders use `daykindle-reminders-warm-v1`; the existing default channel remains for push setup.

- **Importance data:** older saved reminders normalize to Normal. Important is stored with the reminder and uses a separate Android channel so the OS can retain each channel's user settings.
- **Action handling:** the root layout reads notification responses, applies snooze/completion locally, and routes a normal notification tap to Profile. A tap on a check-in reminder routes to Today instead (`checkInPeriod` set; `at` param makes repeat taps reopen the sheet). Check-in reminder helpers live in `src/features/home/check-in-reminders.ts`.

## 5. Business rules, validation and calculations

- **Name** required (trimmed). **Time** must match `^([01]\d|2[0-3]):[0-5]\d$`. **Once** needs a real calendar date and a future date-time. **Verified.**
- **Scheduling rule (Source configured):** each sync cancels and recreates regular app-owned reminders, keeps pending snoozes whose reminder still exists, and cancels snoozes for removed reminders. Expired one-time reminders are skipped but stay in the list.
- **Permission (Verified):** asked only when saving a new reminder; removing never prompts. Denied → "Saved on this device. Allow notifications in device settings to receive reminders."
- **Order (Verified):** local save is confirmed first; scheduling failure after a successful save reports "Saved on this device, but notifications could not be scheduled. Try again."
- **Startup (Verified):** `HomeScreen` reschedules once per mount (`didSyncReminders`), without asking for permission.
- **Normalization (Verified):** stored reminders with a bad time, empty name, or a once-reminder without a valid date are dropped on load.

## 6. Loading, empty, success, error and offline states

- **Empty:** "No reminders added yet. Add one when you want a nudge." **Verified.**
- **Success:** "Reminders are scheduled on this device." and the "Reminder scheduled" toast. **Verified.**
- **Warnings and errors:** denied permission, unsupported platform, save failure ("Could not save your reminder changes. Try saving again."), scheduling failure. **Verified.**
- **Offline:** fully local. **Verified.**

## 7. Dependencies

`expo-notifications`, `expo-device`, `expo-constants` (EAS project id), planner session and storage, entity sync (`reminders` collection), Profile UI.

## 8. Functional limitations and confusing flows

- Time is typed as text in 24-hour format; there is no time picker. **Verified.**
- Expired one-time reminders stay in the list with no "past" marker. **Verified** (no filter in the row list).
- Reminders arriving from another device through sync are not scheduled here until the Home screen remounts, because rescheduling runs once per mount. **Inferred** from the `didSyncReminders` guard.
- The "Push notifications" panel ("Push delivery requires an EAS project and a server…") exposes setup details to end users. **Verified** copy.
- Reminders do not know about the plan: a daily "Workout" reminder fires on days the workout habit is paused or already done. **Verified.**

## 9. Defects and failure modes

- **Inferred privacy risk:** the notification title is the reminder's name, which appears on the lock screen. A reminder named after a health or personal goal is visible to anyone who sees the phone. No option to hide it.
- **Needs Validation:** delivery after device restart, after a time-zone change (daily triggers use local wall-clock time), with Android battery optimization, and on iOS with Focus modes.
- **Needs Validation:** reminder sound playback on physical iOS and Android devices, foreground and background. Silent mode, Focus/Do Not Disturb, app permissions, and Android channel settings can suppress sound.
- **Android channel migration:** The new reminder channel is created because Android does not allow apps to change a channel's sound after creation. On first creation, code carries forward a previously silent/blocked default channel; users can manage the new channel in system settings.
- **Importance limits:** Android ongoing notifications cannot be dismissed by swipe, but the OS controls ordering and users can change channel settings. iOS Time Sensitive may receive more immediate delivery when the user allows it, but iOS does not let apps pin alerts at the top of Notification Center.
- **Live Activities:** Current reminders are scheduled notifications, not Apple ActivityKit Live Activities. Live Activities would need a separate native widget/ActivityKit implementation.
- **Needs Validation:** behavior when more than 64 notifications are pending on iOS (the system limit); not reachable with today's reminder counts, but relevant if reminders are added per task or habit.

## 10. Performance, accessibility, security and testability

- **Performance:** cancel-all-then-reschedule is cheap for a handful of reminders. **Inferred.**
- **Accessibility:** inputs are labeled ("REMINDER NAME", "TIME · 24-HOUR FORMAT"); a typed time field is harder with voice control than a picker. **Inferred.**
- **Security:** no server path; the push token never leaves the device. **Verified.**
- **Testability:** validation is inline in the screen; `notification-service.ts` depends directly on `expo-notifications`, so it needs a mock for tests. No tests.

## 11. Missing capabilities and requirements to confirm

- Time picker; edit; weekday and selected-day repeats.
- Reminders linked to a habit, task, routine block, or check-in, which skip when done or paused.
- Reminder actions do not mark a linked task or habit complete; reminders remain standalone.
- A "private notification" option that hides the title.
- Remote push (needed for partner nudges and services; see the [accountability plan](../accountability/IMPLEMENTATION_PLAN.md) Stage B).
- Rescheduling when synced reminders change.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): a time picker and edit, private titles, reschedule on sync, linked reminders that respect the plan, notification routing, and remote push readiness.

## Source map

- [Notification service](../../../mobile-app/src/features/home/notification-service.ts)
- [Reminders UI and handlers](../../../mobile-app/src/features/home/home-screen.tsx)
- [Reminder type and normalization](../../../mobile-app/src/features/home/home-session.tsx)
- [Notifications plugin config](../../../mobile-app/app.json)
- [Sound source and license note](../../../mobile-app/assets/sounds/README.md)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Accountability](../accountability/CURRENT_STATE.md) · [Technical debt TD-10](../../architecture/TECHNICAL_DEBT.md)
