# Accountability — current state

**Reviewed:** 2026-11-12
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No missed-action, recovery, or commitment flow was exercised on a device in this pass.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## What "accountability" means in DayKindle

The requirements describe two separate things under one word. Keep them apart in code and copy.

| Part | Requirement source | Who holds the person accountable | Status |
| --- | --- | --- | --- |
| **Accountability engine (solo)** | `PRODUCT_REQUIREMENTS.md` §19–21, `FUNCTIONAL_REQUIREMENTS.md` COM-001–007 and ACC-001–010 | The app, using the person's own plan and records | **Mostly Verified** — see the table below |
| **Accountability partners (social)** | `FUNCTIONAL_REQUIREMENTS.md` PART-001–002, NOT-004; `PRODUCT_REQUIREMENTS.md` §33 remote notifications | A person the user invites | **Not found** — no invite, sharing, partner, or remote push code exists |

`mobile-app/PRODUCT.md` currently says: "Do not claim coaching, social accountability, automatic behavior tracking, or guaranteed outcomes." That statement is still accurate for the shipped source.

## Requirement-by-requirement status

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| ACC-001 | Detect missed scheduled actions | **Verified** | `reconcileOverdue()` in `features/home/occurrences.ts` marks `planned` occurrences dated before today as `missed` and records a status-history event. Reconciliation runs when the planner state is loaded or opened, not by a background job. |
| ACC-002 | Prompt for a missed-action reason | **Verified, user-initiated** | Today shows "A gentle reset — Plans that need a next step" for missed entries without a `recoveryAction` (`unresolvedMissedEntries` in `use-home-screen-model.ts`). The reason form appears when the user opens the entry. No notification or interruptive prompt exists. |
| ACC-003 | Predefined reasons | **Verified** | `missedReasonOptions` in `home-screen.tsx`: forgot, low motivation, low energy, schedule conflict, lack of time, too difficult, illness, unexpected event, "I chose to skip", prefer not to say, other. |
| ACC-004 | Custom reason | **Verified** | "Other" opens a text field capped at 180 characters. |
| ACC-005 | Store reasons | **Verified** | `missedReason` on the occurrence (`OccurrenceFields`). It is stored locally and included in the `entries` sync collection when sync is on. |
| ACC-006 | Use repeated reasons for recommendations | **Partial** | Inside the recovery form, when the selected reason was recorded on more than one entry, the app suggests one recovery action (`suggestedRecovery`). The Today recommendation engine (`recommendationCandidates`) uses miss and reschedule counts, weekday rates, and load. It does **not** use reasons. Reasons are not summarized in Progress, History, or the weekly reflection. |
| ACC-007 | Offer recovery actions | **Verified** | `recoveryActionOptions`: reschedule, complete it now, skip this one, reduce target, pause habit, replace habit, keep the plan. |
| ACC-008 | Required action set | **Verified** | All six required actions exist, plus "complete it now". Pause and replace are offered only for habits. Reduce target is offered only when the occurrence has a numeric target, and it must be smaller than the current target (default suggestion: 70% of it). |
| ACC-009 | No shame-based messaging | **Verified in reviewed copy** | Copy reads "A gentle reset", "Choose what would help now", and "You've noted this reason before. A small adjustment may make the next step easier." Not reviewed for every locale or screen-reader output. |
| ACC-010 | Respect the selected intensity | **Not implemented** | `OnboardingProfile.accountabilityStyle?: 'gentle' \| 'balanced' \| 'strict' \| null` exists in `home-session.tsx`, but no source reads or sets it. `accountabilityEnabled?: false` is also a type-only legacy field. The PRD (§11) says onboarding should not ask for an accountability tone unless it changes behavior. |
| COM-001–004 | Create commitments with target, deadline, reason, reward, consequence, goal or action link | **Verified** | `Commitment` type in `home-session.tsx`; form in `home-screen.tsx`. Title, target, and a valid deadline are required. The consequence field is labelled "Accountability rule (optional)" (160 characters). |
| COM-005 | Update commitment progress automatically | **Verified, bounded** | `commitmentMetrics` in `use-home-screen-model.ts` counts completed entries of the linked task or habit between the commitment's creation date and its deadline. It works only when a linked action and `requiredActions` are set. |
| COM-006 | Detect commitment risk | **Not found** | There is no risk or "behind pace" calculation. |
| COM-007 | Show remaining required actions | **Verified** | "N of M linked actions · R remaining · P%". |
| — | Commitment outcome (kept, missed, released) | **Not found** | The `Commitment` type has no status. A commitment past its deadline stays in the list with no outcome, and nothing asks the user to close it. |
| PART-001–002 | Invite partners, granular permissions | **Not found** | No tables, RPCs, routes, or UI. The sync schema (`planner_entities`) is strictly owner-scoped by RLS. |
| NOT-003–004 | Remote push for accountability and partner activity | **Not found** | `registerPushToken()` obtains an Expo token but nothing stores or sends with it; no sender exists in `supabase/functions/`. |

## Related behavior that accountability relies on

- **Recovery records stay linked.** Rescheduling keeps the original occurrence and creates a replacement with `relatedOccurrenceId`. Reduce target creates a new planned occurrence for today with the smaller target, except for routine steps. "Complete it now" moves `missed` to `completed` with the correction reason `user_completed_after_missed`. Terminal statuses change only with a correction reason (`setOccurrenceStatus`).
- **Achievements:** "A fresh start" is earned when any entry has a `recoveryAction` (`use-home-screen-model.ts`). It rewards recovery, not streaks.
- **Analytics:** `recovery_action_applied` sends `item_type`, `source_type`, and `recovery_action` only. `commitment_created` sends categorical flags such as `has_required_actions`. Neither sends titles, reasons, or commitment text. **Verified** in the reviewed calls.
- **Privacy:** reasons, commitments, rewards, and consequences are personal data. They stay on the device for Guests and sync only after explicit consent (`account-provider.tsx`). Synced data is not end-to-end encrypted.

## Source map

- [Occurrence status rules](../../../mobile-app/src/features/home/occurrences.ts)
- [Missed-reason and recovery UI, commitment form, recommendations](../../../mobile-app/src/features/home/home-screen.tsx)
- [Unresolved misses, commitment metrics, achievements](../../../mobile-app/src/features/home/use-home-screen-model.ts)
- [Commitment and onboarding types](../../../mobile-app/src/features/home/home-session.tsx)
- [Recurrence matcher](../../../mobile-app/src/features/home/day-schedules.ts)
- [Push token helper](../../../mobile-app/src/features/home/notification-service.ts)
- [Owner-scoped sync schema](../../../supabase/migrations/20261005151602_planner_entity_sync.sql)

## Limits

- No automated tests cover reason capture, recovery actions, or commitment metrics. The only test file, `mobile-app/scripts/test-interface.cjs`, checks contrast, save confirmation, and source contracts.
- Day-boundary behavior (time-zone changes, app left open past midnight) and large histories were not exercised.
- Related pages: [improvements](IMPROVEMENTS.md), [implementation plan](IMPLEMENTATION_PLAN.md), [check-ins, reflections and commitments](../check-ins-and-reflections/CURRENT_STATE.md), [reminders](../reminders/CURRENT_STATE.md).
