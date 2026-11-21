# Services — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) turns them into ordered work, and [SaS-Next-Steps.md](../../../SaS-Next-Steps.md) schedules them.

P1 items block a paid launch. P2 items are needed for the tier to be worth paying for. P3 items come later.

## Foundations (no user-visible service yet)

| # | Priority | Improvement | Why | Guardrail |
| --- | --- | --- | --- | --- |
| 1 | P1 | **Server push** (`push_devices`, register/revoke RPCs, Expo sender) | Every service delivers through push. Shared with accountability Stage B. | Lock-screen text never includes item titles by default. Revoke on sign-out before the session ends. |
| 2 | P1 | **Unit-test runner for pure modules** (`node --test` with type stripping) | Every service number comes from rules, and rules without tests cannot carry a delivery guarantee. | No new dependency. Modules stay free of React Native imports. |
| 3 | P1 | **Project license and publication decision** | The repository is public with no project license. Paid features need a clear licensing position. | Owner decision. |
| 4 | P1 | **Deployed-state record** | A service cannot rest on unverified RLS and deletion. | Read-only checks only. |
| 5 | P2 | **`daykindle` URL scheme and universal links** | Service notifications and the scope screen deep-link into the app. | Keep `dayweave` and `daymark` for existing installs. |

## Service engine

| # | Priority | Improvement | Why | Guardrail |
| --- | --- | --- | --- | --- |
| 6 | P1 | **Device-built service summary** with a server allow-list | Services run without planner sync and without free text. One privacy story: *a service is a partner you pay for*. | The server rebuilds the payload from allow-listed keys and drops everything else. Reflection text is excluded unless the person opts in per feature. |
| 7 | P1 | **Service run state machine in SQL** (`service_runs` plus a transition function) | Delivery guarantees need an auditable record of every run, when it was due and when it was delivered. | Transitions only through one `security definer` function; illegal transitions raise. |
| 8 | P1 | **Scheduler** (pg_cron, pg_net and Vault; pgmq for check-ins) | Runs must open on time in each person's local time zone. | Idempotent per (engagement, kind, period). |
| 9 | P1 | **Rules-only fallback for every service** | If the model is down, the person still gets the work; the run is credited. | The fallback is the default code path, and the model only rewrites its text. |
| 10 | P2 | **Provider-independent model interface** (`_shared/ai/`) | FR AI-001–005. Lets the provider change without client releases. | The model never computes numbers or picks adjustments. Keys are server-side only. Cost is logged without content. |
| 11 | P2 | **Automatic credits** | The delivery guarantee is the product. Missed deliveries must be visible and credited without a support ticket. | Credits extend the renewal date where the store allows it; otherwise an extra included outcome next month. |

## Billing

| # | Priority | Improvement | Why | Guardrail |
| --- | --- | --- | --- | --- |
| 12 | P1 | **Store billing and entitlements** | App Store 3.1.1/3.1.3: digital services delivered in the app use in-app purchase. | Nothing free today becomes paid (guideline 3.1.2). Restore purchases and manage-subscription links are required. |
| 13 | P1 | **Scope screen before purchase** | Guideline 3.1.2 requires a clear description of what is included. It also defines "done" for each outcome. | Countable scope ("4 weekly reviews, check-ins on up to 3 commitments"). No outcome promises. |
| 14 | P2 | **"What DayKindle did for you" monthly receipt** | Makes the service and its credits visible; justifies renewal. | Counts only, built on the device. |

## Experience

| # | Priority | Improvement | Why | Guardrail |
| --- | --- | --- | --- | --- |
| 15 | P1 | **Coach tab** (Insights, Suggestions, Weekly Review, Reflection Prompts) | PRD §8 and §18 already describe it. Free users see the rules-only version, so the tab is not a paywall. | The design spec says it "should not launch as an empty chatbot". No open-ended chat in Phase 3. |
| 16 | P2 | **Notification actions on check-ins** ("Done", "Not yet", "Adjust") | One-tap answers make K2 feel light. | Respect quiet hours and intensity. |
| 17 | P2 | **Approval diff for replans** | Nothing changes in the planner without a tap. | Each approval is recorded locally with what was approved. |
| 18 | P3 | **Coach surface** (separate app or mode) | Phase 4 human coaching. | Never the internal dashboard. Coach sees only what the person shared, through the same preview a peer partner gets. All coach reads are audit-logged. |
| 19 | P3 | **Circles** | Phase 5 group accountability. | No leaderboards or ranking. |

## Measurement

Service KPIs live on a **Services** page in the dashboard as aggregates only. The definitions are in [Services-As-Software.md §9](../../../Services-As-Software.md). Harm signals (intensity downgrades, check-in mutes, "too much" feedback) are first-class KPIs, not afterthoughts.
