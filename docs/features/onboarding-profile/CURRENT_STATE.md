# Onboarding and profile — current state

**Reviewed:** 2026-11-21
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No onboarding run, fresh install, or Profile action was exercised on a device in this pass.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

Onboarding gets a new person from install to a useful Today screen in a few taps, without forcing an account. Profile is where they later change how the app looks, manage reminders, connect an account, turn sync on or off, recover earlier data, sign out, or delete everything.

## 2. Target user and expected outcome

First-time users (Guest or signed in) and returning users on a new device. Expected outcome: a planner seeded with the areas they care about, at most one starter goal, an optional daily routine, and a look they like, with a clear statement that their data stays on the device unless they choose to sync.

## 3. Current capabilities and user journey

| Step | What the person sees | Status | Evidence |
| --- | --- | --- | --- |
| 0. Welcome and intro | A splash that flies into the logo, then 4 intro slides: goals/habits/tasks, routines, daily notes ("A check-in does not complete your tasks"), review your activity | **Verified** | `introSlides` and `IntroFadeText` in `app/index.tsx`; word fade honors reduced motion. |
| 1. Account | "Continue with Google", "Sign in with Apple" (iOS), "Continue as guest". Sign-in asks "Sync your planner?" | **Verified** | `handleProviderSignIn()`, `continueAsGuest()`; see [accounts and sync](../accounts-and-sync/CURRENT_STATE.md). |
| — Returning account | If the account already has a saved setup, onboarding is skipped | **Verified** | `hasSavedCloudOnboarding()`; initial-session check holds the splash until it answers. |
| 2. Areas and starter goal | "What would you like to focus on?" — pick any of 15 areas (custom name for "Something else"), then at most one matching starter goal | **Verified** | `areas`, `starterPlans` (15, one per area); `togglePlan()` keeps a single selection. |
| 3. Appearance | "Choose a look for DayKindle, or keep the refined default." Refined (`formal`) or Expressive | **Verified** | `visualStyle` state; preview card "Your day, in focus." |
| 4. Optional routine | "Would a simple rhythm help?" — the Daily Plan from the server catalog, or "No routine for now" | **Verified** | `routineTemplateId`; `useDailyPlanTemplates()`. |
| Finish | "Start my day" seeds the session, waits for the local save, sends `onboarding_completed`, opens Today with "Your planner is ready" | **Verified** | `next()` at step 4 → `seedHomeSession()` → `confirmLocalSave()`. |
| Skip (removed) | The duplicate "Use Guest" skip on the account screen was removed. "Continue as Guest" is the only guest path and continues into setup. Account screen has a back button to the intro. | **Verified** (source, 2026-11-21; not run on a device) | `welcome-auth-screen.tsx`, `index.tsx`. Planned: none. |

**Profile tab (Verified, `home-screen.tsx` profile section):**

| Section | What it does |
| --- | --- |
| Identity | Shows the account name (from provider metadata, else derived from the email) and avatar, or a Guest state (`profile-identity.tsx`). |
| Your space / appearance | Switch Refined or Expressive; "Your appearance choice is saved on this device." |
| Your starting point | The life areas chosen at onboarding. |
| Planner sync | Turn on, Sync now, Turn off; status line; error with "Try sync again". |
| Guest actions | "Sign in" (opens the guest sign-in tray, which also confirms a display name) and "Leave guest workspace". |
| Recovery | "Restore earlier planner" (archived guest data) and "Planner conflict backup" (device or account copy). |
| Reminders and push | See [reminders](../reminders/CURRENT_STATE.md). |
| Sign out, delete | Confirmation dialog (system alert on iOS); "Delete account and data" or, for Guests, "Erase my data". |

## 4. Screens, components, state and persistence

- **Routes:** `app/index.tsx` (welcome, onboarding, `/auth` and link modes); redirects to `/(tabs)` once `onboardingCompleted` is true. Profile tab: `app/(tabs)/profile*.tsx` → `HomeScreen`.
- **Components:** `welcome-auth-screen.tsx`, `guest-workspace-sign-in-tray.tsx`, `sync-consent-dialog.tsx`, `profile-identity.tsx`, `apple-auth-button.tsx`, `animated-splash.tsx`.
- **State:** `OnboardingProfile` in `home-session.tsx`: `accountType`, sync consent fields, `routineTemplateIds`, `appearance`, `areas`, `customAreaName`. Type-only fields with no reader or writer: `accountabilityStyle`, `accountabilityEnabled`, `wakeTime`, `sleepTime`, `focusWindow` (**Verified**). Unused `focusWindow*` styles remain in `app/index.tsx`.
- **Persistence:** onboarding and `visualStyle` are stored in the SQLite `session_settings` row; life areas in `life_areas`; starter goal in `goals`; routine in `day_schedules`. Synced as `settings`, `lifeAreas`, `plans`, `daySchedules` when sync is on.
- **Analytics:** `onboarding_completed` with `account_type`, `starter_plan_count`, `has_routine`. Screen names `welcome`, `home`, `goals`, `progress`, `profile`, `history` only (`PostHogScreenTracker` in `app/_layout.tsx`).

## 5. Business rules, validation and calculations

- **Nothing is required (Verified):** areas, starter goal, look and routine can all be skipped. "Choose an area above to see a matching goal. You can also skip both."
- **One starter goal (Verified):** selecting a second replaces the first. The goal keeps the template id as its `id`, its "first step" text, and its area.
- **Seeding (Verified):** `seedHomeSession()` replaces entries, definitions and progress events with empty lists, builds all 15 life areas with the chosen ones enabled, and sets `selectedDate` to today.
- **Consent (Verified):** stored only with the current user's id; the Guest path clears it.
- **Fresh workspace (Verified):** `startFreshGuestData()` now resets to a clean planner with onboarding not completed, so the next launch shows setup. It is used by the "Start fresh on this device" recovery action, which archives earlier data first.
- **Returning account (Verified):** found when a non-deleted `settings/onboardingCompleted` row is `true`, a `settings/onboarding` object exists, or a legacy snapshot row exists. Existing consent is kept only if it belongs to the same user.

## 6. Loading, empty, success, error and offline states

- **Loading:** the splash waits for fonts, session hydration and the logo target (with a 250 ms fallback). **Verified.**
- **Success:** "Your planner is ready — Saved on this device." **Verified.**
- **Error:** "Could not save your setup. Keep the app open and try again."; "Sign-in could not finish — Retry, or continue as a guest."; "Could not check your saved setup — Retry before starting onboarding."; "Could not switch to a guest workspace". **Verified.**
- **Offline:** Guest onboarding works offline; the routine step uses the cached or bundled Daily Plan. The returning-account check needs the network. **Verified / Inferred.**
- **Not configured:** sign-in buttons are disabled and "Guest mode is ready. Account sign-in is not configured on this build." is shown. **Verified.**

## 7. Dependencies

Planner session (`seedHomeSession`, `confirmLocalSave`), `AccountProvider`, Daily Plan provider, life-area and goal models, PostHog, Expo Router, Reanimated and Skia for the splash and intro, `expo-apple-authentication`, native Google sign-in.

## 8. Functional limitations and confusing flows

- Intro step 3 says "A check-in does not complete your tasks" — accurate, but a new user meets "check-in" before seeing one. **Inferred** UX issue.
- The appearance step is the only place a first-time user learns Expressive exists; it is a cosmetic choice placed before the planner is seen. **Inferred.**
- The routine step offers only one routine (the Daily Plan), which includes faith-specific content ("Bible reading, prayer"). Some users may skip the routine feature for that reason. **Verified** content; impact **Inferred**.
- The display name can be set only in the guest sign-in tray; signed-in Profile has no name editor. **Verified** (`updateUserName` has one caller).
- Life areas chosen here are labeled differently from the stored defaults for some areas (see [goals](../goals-and-life-areas/CURRENT_STATE.md)). **Verified.**

## 9. Defects and failure modes

- **Verified:** dead model fields (`accountabilityStyle`, `focusWindow`, `accountabilityEnabled`) and leftover styles suggest removed onboarding steps; they are synced as part of `onboarding` if present in old data. `wakeTime` and `sleepTime` are no longer dead: they are set in Profile (Daily check-ins) and drive two daily reminders (updated 2026-11-21, **Needs Validation** on device). Onboarding does not collect them.
- **Needs Validation:** returning from the Google or Apple sheet, cancelling it, and fresh-install behavior on both platforms.
- **Needs Validation:** web onboarding; the full-scale audit found web planner routes blank because Skia web is not initialized (TD-15).
- **Inferred:** if the returning-account check fails offline, the user is held with an error until retry; there is no "continue on this device" escape on that toast.

## 10. Performance, accessibility, security and testability

- **Performance:** splash minimum length and transitions are deliberate; native startup timing is **Needs Validation**.
- **Accessibility:** intro text has `accessibilityRole="text"` with the full sentence as label; pagination is a `progressbar` with "Page n of 4"; buttons are labeled. Reduced motion shortens fades. VoiceOver/TalkBack order is **Needs Validation**.
- **Privacy:** onboarding sends only counts and flags. The Guest promise "Guest plans stay on this device. Sync is your choice." matches the code. **Verified.**
- **Testability:** `test-interface.cjs` checks a few source contracts (guest tray, Profile actions, splash); 3 of 11 cases fail on 2026-11-13. No flow test.

## 11. Missing capabilities and requirements to confirm

- Name editing in Profile for signed-in users.
- More than one routine choice, including a neutral (non-faith) default.
- Wake and sleep times are set in Profile, not onboarding, because they now change behavior (reminders) and PRD §11 says not to ask in onboarding otherwise. Onboarding entry remains unbuilt (updated 2026-11-21).
- A short "how DayKindle handles your data" panel reachable from Profile.
- Onboarding funnel measurement by step (only completion is measured).

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): clean dead fields, a neutral routine option, Profile name editing, an offline escape from the account check, step-level funnel events, and device verification.

## Source map

- [Welcome, onboarding steps, account step](../../../mobile-app/src/app/index.tsx)
- [Profile tab](../../../mobile-app/src/features/home/home-screen.tsx)
- [Onboarding profile type and seeding](../../../mobile-app/src/features/home/home-session.tsx)
- [Profile identity](../../../mobile-app/src/features/account/profile-identity.tsx)
- [Guest sign-in tray](../../../mobile-app/src/features/account/guest-workspace-sign-in-tray.tsx)
- [Welcome auth screen](../../../mobile-app/src/features/account/welcome-auth-screen.tsx)
- [Screen tracking](../../../mobile-app/src/app/_layout.tsx)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Accounts and sync](../accounts-and-sync/CURRENT_STATE.md) · [UX audit](../../audits/UX_AUDIT.md)
