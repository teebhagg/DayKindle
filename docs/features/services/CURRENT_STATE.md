# Services (Services-as-Software) — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. **No service layer exists.** This page lists what the planned service tier would build on and what is missing. Strategy: [Services-As-Software.md](../../../Services-As-Software.md). Execution: [SaS-Next-Steps.md](../../../SaS-Next-Steps.md).
**Evidence labels:** **Verified** (read in source or run locally on the date above), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, store, legal, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

DayKindle is a free planner. The person does all of the accountability work: noticing misses, choosing a reason and a recovery, closing commitments, and reviewing the week. The service tier would have DayKindle **deliver** part of that work on a schedule (weekly reviews, commitment check-ins, recovery replans, and later a human coach) and take responsibility for delivering it on time, with credits when a delivery is missed. It never promises life outcomes.

## 2. Target user and expected outcome

The PRD's primary persona: a self-directed adult who "struggles with consistency" and "wants accountability". Expected outcome: finished accountability work arrives without the person having to start it, such as "Your week is reviewed, and 2 adjustments are ready."

## 3. Current capabilities

| Capability the service needs | Status | Evidence |
| --- | --- | --- |
| Miss detection, reasons, recovery actions | **Verified** | `reconcileOverdue()` in `features/home/occurrences.ts`; `missedReasonOptions`, `recoveryActionOptions` in `home-screen.tsx`. See [accountability current state](../accountability/CURRENT_STATE.md). |
| Deterministic recommendations with evidence text and one-tap apply | **Verified** | `recommendationCandidates` in `home-screen.tsx`: weekday miss rate, reschedule pattern, overload, high-success day, return after inactivity, goal linking. This becomes the rules layer of the weekly review (K1). |
| Commitment progress | **Verified, bounded** | `commitmentMetrics` in `use-home-screen-model.ts`. There is no outcome, pace or risk (COM-006 not found). K2 check-ins need both. |
| Intensity setting | **Not implemented** | `OnboardingProfile.accountabilityStyle` is declared in `home-session.tsx` but never read or set. Services need it for check-in timing and wording. |
| Weekly reflection | **Verified** | `weekly_reflections` keyed by week start. There is no computed weekly summary to prefill or send. |
| Local-first storage | **Verified** | `home-storage.ts` (SQLite), `home-storage.web.ts`. Services must work when planner sync is off. |
| Consent-gated planner sync | **Verified** | `account-provider.tsx`, `planner_entities`, `sync_planner_mutations`. Strictly owner-scoped by RLS. Services must **not** read it (see the device-summary design in the [plan](IMPLEMENTATION_PLAN.md)). |
| Server-managed, revision-checked content | **Verified** | `daily-plan` Edge Function and `daily_plan_catalog` (`20261030143010_daily_plan_catalog.sql`). The pattern for service-managed prompt and copy templates. |
| Remote push | **Partial** | `registerPushToken()` in `notification-service.ts` obtains an Expo token. Nothing stores it and no sender exists in `supabase/functions/` (only `daily-plan` and `delete-account`). Every service depends on remote push. |
| Scheduled server jobs | **Not found** | No pg_cron, pg_net, Vault or pgmq usage in the five checked-in migrations. |
| AI / model calls | **Not found** | Routine "AI import" (`ai-routine-import.ts`) is copy-and-paste with an external assistant. No model client or server key exists. FR AI-001–005 require a provider-independent interface. |
| Billing and entitlements | **Not found** | No store-billing library in `mobile-app/package.json`, no entitlement table, no webhook. |
| Coach surface | **Not found** | The dashboard (`dashboard/`) is aggregate-only by `AGENTS.md` rule and must not host coach work. |
| Aggregate analytics | **Verified** | PostHog events with categorical properties (for example `recovery_action_applied`, `commitment_created`). Service KPIs can reuse this style. |
| Deep links | **Partial** | `mobile-app/app.json` declares only the legacy schemes `dayweave` and `daymark`. There is no `daykindle` scheme and no universal or app links. Service notifications and partner invites need them. |

## 4. Screens, components, state, persistence

**Not found.** There is no Coach tab, paywall, scope screen, entitlement state, service store, or service table. PRD §8 lists "Coach" in the primary navigation, but the shipped tabs are Today, Goals, Progress and Profile.

## 5. Business rules and constraints already fixed by project documents

- `PRODUCT.md` (mobile): "Do not claim coaching, social accountability, automatic behavior tracking, or guaranteed outcomes." This is still accurate. Marketing and store copy must not describe services until they ship.
- PRD §34 non-goals: no monetary punishments, no leaderboards. They rule out stake-based pricing and ranked circles.
- `AGENTS.md`: planner notes, goals, check-ins, commitments and reflections are personal data and must not enter analytics or internal dashboard views. Cloud sync must not be silently enabled.
- The app is offered to people aged 13 and older (`PRODUCT.md`). Paid services and partners need an age policy; the proposed default is 18+.

## 6. Dependencies

Services depend on, in order: a tested accountability module (accountability Stage A), server push (`push_devices` plus a sender), the partnership model (accountability Stage B), store billing, a scheduler, and a model provider. None of the server pieces exist.

## 7. Defects and blockers that matter for a paid service

Details are in the [full-scale audit](../../audits/FULL_SCALE_AUDIT.md).

1. **Verified 2026-11-13:** `npm run test:interface` fails 3 of 11 cases (stale source contracts). There is no unit-test runner for domain logic.
2. **Verified 2026-10-27, not re-run:** web planner routes hydrate blank because Skia web is not initialized (TD-15). `mobile-app/src` still has no `LoadSkiaWeb` call (re-checked 2026-11-13).
3. **Needs Validation:** deployed migrations, RLS, functions and the deletion cascade (TD-05).
4. **Verified:** completion analytics fires before the local save is confirmed (TD-14). Service KPIs must count durable events only.
5. **Verified:** no project license. `mobile-app/LICENSE` is the unmodified Expo template MIT license with Expo's copyright, and the GitHub repository is **public** with no detected license.

## 8. Limits of this review

No device, store sandbox, database query, provider call or legal review was performed. "Not found" is scoped to this repository.

Related pages: [improvements](IMPROVEMENTS.md), [implementation plan](IMPLEMENTATION_PLAN.md), [accountability](../accountability/CURRENT_STATE.md), [reminders](../reminders/CURRENT_STATE.md), [analytics and dashboard](../analytics-and-dashboard/CURRENT_STATE.md).
