# Onboarding and profile — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| OP1 | A1 — device verification run | Development builds for iOS and Android | No |
| OP2 | C1 — step funnel events | — | No (PostHog only) |
| OP3 | A2 — offline escape from the account check | OP1 | No |
| OP4 | B2, B3 — name editing; "Your data" panel | — | No |
| OP5 | B1 — neutral routine and choice | Owner content decision | Catalog content via `daily-plan` PUT |
| OP6 | A3 — remove dead fields | Accountability Stage A decision on intensity | No |
| OP7 | B4 — appearance step experiment | OP2 data (4+ weeks) | No |
| OP8 | C2 — wake and sleep times | Product decision that they change behavior | No |

## 2. Decisions needed

1. **Routine content (OP5):** the neutral routine's blocks and the new name for the current plan.
2. **Intensity field (OP6):** keep `accountabilityStyle` for the accountability intensity setting or delete it.
3. **Appearance step (OP7):** keep, move, or remove, after funnel data.

## 3. Work packages

### OP1 — Device verification

- **Script:** fresh install → intro → Guest → areas (2) → starter goal → Expressive → routine → Today. Repeat with Google (Android, iOS), Apple (iOS), cancel at each provider sheet, offline Guest, returning account with saved setup, and "Start fresh on this device" from the unreadable-data recovery screen with existing data (check the archive is restorable from Profile). Updated 2026-11-21: the account-screen "Use Guest" skip no longer exists, so it is not part of this script.
- **Accessibility:** the same path with VoiceOver and TalkBack, large text (200%), and reduced motion.
- **Output:** `docs/audits/ONBOARDING_DEVICE_RUN_<date>.md` with device, OS, build, and pass/fail per row.

### OP2 — Funnel events

- **File:** `app/index.tsx`.
- **Events:** `onboarding_step_viewed { step }` on step change; `onboarding_step_completed { step, …categorical choices }` in `next()` and the account handlers. Area count as a bucket (`0`, `1`, `2-3`, `4+`).
- **Guardrail:** a unit-tested `onboardingEventProperties()` builder that cannot accept free text.
- **Done when:** events appear in a development PostHog project with only the listed properties.

### OP3 — Offline escape

- Add a second action to the failed-check state: "Set up on this device". It sets the cloud-check state to `not-found` for this session and shows step 2.
- **Done when:** airplane-mode launch with a stored session reaches the areas step.

### OP4 — Name and data panel

- **Name:** `ProfileIdentity` gets an "Edit name" button for signed-in users that opens a small sheet calling `account.updateUserName()`.
- **Data panel:** a static Profile row; copy reviewed against `marketing/src/routes/privacy.tsx` so they agree.

### OP5 — Routine choice

- **Content:** add the neutral routine to `public.daily_plan_catalog.templates` through `PUT /functions/v1/daily-plan` with `expectedRevision` (admin token). Add the same routine to the bundled `dayScheduleTemplates` so offline installs see it.
- **App:** step 4 renders every catalog template (`dayScheduleTemplates.map`) instead of the first; selection stays single.
- **Done when:** both routines show offline (bundled) and online (catalog); the chosen one seeds `daySchedules`.

### OP6 — Dead fields

- Remove the unused fields from `OnboardingProfile` and the styles from `app/index.tsx`; add `delete` lines in `normalizeSession()` (as it already does for the legacy `reminders` and `reminderWindows` fields) so old snapshots drop them on read.
- **No schema bump:** dropping optional fields keeps version 9 readable by older builds. A bump to 10 would make older builds treat new saves as unreadable (`parseStoredSnapshot()` accepts versions 2–9 only).
- **Done when:** a snapshot with the fields loads and saves without them, and a build from before the change still reads the result.

### OP7 — Appearance experiment

- After OP2 has 4+ weeks of data, compare completion with and without step 3 using a PostHog feature flag (local evaluation, no personal data). Keep whichever completes better without lowering 7-day activation.

### OP8 — Wake and sleep times

- Only after a decision that they drive behavior (for example, default reminder times). Add an optional step after areas with "Skip".

## 4. Rollout and rollback

App builds or EAS updates for OP2–OP4, OP6–OP8; rollback is a previous build. Catalog content for OP5 can be reverted with another `PUT` using the previous templates and the current revision.

## 5. Exit evidence

OP1 report filed; funnel visible in the dashboard; [current state](CURRENT_STATE.md) updated with what was verified on devices.
