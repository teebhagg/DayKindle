# Onboarding and profile — improvements

**Reviewed:** 2026-11-21
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** blocks a core path or misleads; **P2** removes friction; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects

### A1. Verify onboarding on real devices — P1, M

- **Evidence:** **Needs Validation** — no fresh install, provider sheet return or cancel, or returning-account run has been recorded (full-scale audit, open item 6).
- **Approach:** scripted manual run on iOS and Android for Guest, Google, Apple, cancel at each sheet, returning account, offline Guest, and "Start fresh on this device" from the recovery screen. Record device, OS and build in `docs/audits/`.

### A2. Give the returning-account check an offline escape — P2, S

- **Evidence:** **Inferred** — a failed `hasSavedCloudOnboarding()` shows "Retry before starting onboarding" and holds the user.
- **Approach:** add "Set up on this device" next to Retry. The local setup proceeds; sync bootstrap later handles the cloud copy through the existing conflict path.
- **Tests:** offline launch with a signed-in session reaches onboarding in one tap.

### A3. Remove dead onboarding fields — P3, S

- **Evidence:** **Verified** — `accountabilityStyle`, `accountabilityEnabled`, `wakeTime`, `sleepTime`, `focusWindow` have no reader or writer; `focusWindow*` styles are unused.
- **Approach:** drop `wakeTime`, `sleepTime`, `focusWindow` and the styles. Keep `accountabilityStyle` only if the [accountability plan](../accountability/IMPLEMENTATION_PLAN.md) Stage A intensity setting is approved; then rename it there. Normalization deletes unknown fields as it already does for legacy reminder fields.

## B. Refine existing capabilities

### B1. Offer a neutral routine and a choice — P2, S

- **Evidence:** **Verified** — the only routine offered is the Daily Plan, which includes Bible reading and prayer.
- **Approach:** serve two catalog routines (a neutral "Balanced day" and the current plan, renamed to describe its content) through the existing `daily-plan` function; the step shows both plus "No routine for now".
- **Dependency:** catalog update through the Edge Function `PUT` (admin only); no app change beyond showing more than one card.

### B2. Edit display name in Profile — P2, S

- **Evidence:** **Verified** — `updateUserName()` is reachable only from the guest tray.
- **Approach:** an "Edit name" action on the identity card for signed-in users, reusing the tray's validation and error copy.

### B3. Data and privacy panel — P2, S

- **Approach:** a Profile row "Your data" that states, in four lines: what stays on the device, what syncs when on, that synced data is not end-to-end encrypted, and what analytics collect (categories, never your text). Link to the privacy policy.

### B4. Move appearance after first use — P3, S

- **Evidence:** **Inferred** — a cosmetic step sits before the planner is seen.
- **Approach:** test removing step 3 and showing a one-time "Make it yours" card on Profile instead. Decide with funnel data (C1).

## C. New capabilities

### C1. Step-level onboarding funnel — P2, S

- **Evidence:** **Verified** — only `onboarding_completed` is sent.
- **Approach:** `onboarding_step_viewed` with `step` (`intro_1`…`intro_4`, `account`, `areas`, `appearance`, `routine`) and `onboarding_step_completed` with the same plus categorical choices (`account_type`, `area_count` bucket, `has_starter_goal`, `appearance`, `has_routine`). No area names or custom names.
- **Dashboard:** a funnel card using only these events (see [analytics and dashboard](../analytics-and-dashboard/IMPLEMENTATION_PLAN.md)).

### C2. Optional wake and sleep times — P3, M

- **Only if** they change behavior: default reminder times, routine block times, or the "day" boundary for late-night users. Otherwise do not ask (PRD §11).

## Measurement

Completion rate by step; share choosing Guest vs account; share with a starter goal and with a routine; time from install to first completed action (existing events). Aggregates only.
