# DayKindle knowledge base

**Reviewed:** 2026-10-27; index, accountability, services, strategy and full-scale audit links added 2026-11-13; the nine core feature folders were rewritten from source on 2026-11-13. This is a source-based snapshot of the current local checkout, not a claim about a deployed environment.

Use this set as the fast map into the repository. Source code, app configuration, and applied database migrations are the evidence for current behavior. Product and design documents describe intent and may be ahead of implementation. Older audit records remain useful only with their original dates and scope.

## Architecture

- [System overview](architecture/SYSTEM_OVERVIEW.md) — product surfaces, runtime stack, and trust/data boundaries.
- [Module map](architecture/MODULE_MAP.md) — source directories, key modules, and their interfaces.
- [Data flow](architecture/DATA_FLOW.md) — local persistence, account sync, notifications, and analytics.
- [Technical debt](architecture/TECHNICAL_DEBT.md) — ranked maintainability, reliability, and verification work.

## Features

- [Feature inventory](features/FEATURE_INVENTORY.md) — implemented, partial, and absent capabilities.
- Feature pages use the same three files: current behavior, improvement opportunities, and a proposed implementation plan.
- The nine core feature folders (onboarding through analytics) use 12 sections in `CURRENT_STATE.md` (purpose; target user; capabilities and journey; screens, state and persistence; business rules; loading, empty, error and offline states; dependencies; limitations; defects; performance, accessibility, security and testability; missing capabilities; proposed improvements), then a source map. Claims carry the labels **Verified**, **Inferred**, **Needs Validation** or **Not found**.

| Feature | Current state | Improvements | Plan |
| --- | --- | --- | --- |
| Onboarding and profile | [Current](features/onboarding-profile/CURRENT_STATE.md) | [Ideas](features/onboarding-profile/IMPROVEMENTS.md) | [Plan](features/onboarding-profile/IMPLEMENTATION_PLAN.md) |
| Goals and life areas | [Current](features/goals-and-life-areas/CURRENT_STATE.md) | [Ideas](features/goals-and-life-areas/IMPROVEMENTS.md) | [Plan](features/goals-and-life-areas/IMPLEMENTATION_PLAN.md) |
| Daily planning | [Current](features/daily-planning/CURRENT_STATE.md) | [Ideas](features/daily-planning/IMPROVEMENTS.md) | [Plan](features/daily-planning/IMPLEMENTATION_PLAN.md) |
| Routines and templates | [Current](features/routines-and-templates/CURRENT_STATE.md) | [Ideas](features/routines-and-templates/IMPROVEMENTS.md) | [Plan](features/routines-and-templates/IMPLEMENTATION_PLAN.md) |
| Check-ins, reflections and commitments | [Current](features/check-ins-and-reflections/CURRENT_STATE.md) | [Ideas](features/check-ins-and-reflections/IMPROVEMENTS.md) | [Plan](features/check-ins-and-reflections/IMPLEMENTATION_PLAN.md) |
| Progress and history | [Current](features/progress-and-history/CURRENT_STATE.md) | [Ideas](features/progress-and-history/IMPROVEMENTS.md) | [Plan](features/progress-and-history/IMPLEMENTATION_PLAN.md) |
| Reminders | [Current](features/reminders/CURRENT_STATE.md) | [Ideas](features/reminders/IMPROVEMENTS.md) | [Plan](features/reminders/IMPLEMENTATION_PLAN.md) |
| Accounts and sync | [Current](features/accounts-and-sync/CURRENT_STATE.md) | [Ideas](features/accounts-and-sync/IMPROVEMENTS.md) | [Plan](features/accounts-and-sync/IMPLEMENTATION_PLAN.md) |
| Analytics and dashboard | [Current](features/analytics-and-dashboard/CURRENT_STATE.md) | [Ideas](features/analytics-and-dashboard/IMPROVEMENTS.md) | [Plan](features/analytics-and-dashboard/IMPLEMENTATION_PLAN.md) |
| Accountability (solo engine and partners) | [Current](features/accountability/CURRENT_STATE.md) | [Ideas](features/accountability/IMPROVEMENTS.md) | [Plan](features/accountability/IMPLEMENTATION_PLAN.md) |
| Services (Services-as-Software, planned) | [Current](features/services/CURRENT_STATE.md) | [Ideas](features/services/IMPROVEMENTS.md) | [Plan](features/services/IMPLEMENTATION_PLAN.md) |

## Strategy and upgrade plan

- [Services-As-Software.md](../Services-As-Software.md) — the move from a free planner (SaaS-style tool) to delivered accountability services: service catalog, pricing, competitor matrix, KPIs, target architecture and phases. **Proposal; nothing is implemented.**
- [SaS-Next-Steps.md](../SaS-Next-Steps.md) — the execution plan: owner tasks (Track A), Phase 0 at code level, then accountability Stages A and B, then the paid tiers.

The accountability plan explains how the feature works in three stages: A (solo engine), B (partners, sharing, nudges, push) and C (DayKindle as a paid partner, detailed in the services plan).

## Audits

- [Full-scale audit](audits/FULL_SCALE_AUDIT.md) — consolidated findings, today's check results and Services-as-Software readiness (2026-11-13).
- [UX audit](audits/UX_AUDIT.md)
- [Performance audit](audits/PERFORMANCE_AUDIT.md)
- [Security audit](audits/SECURITY_AUDIT.md)
- [Test coverage](audits/TEST_COVERAGE.md)

## Keeping this knowledge current

When behavior changes, update its feature page and the relevant architecture or audit page in the same change. Include the source paths reviewed, date, and verification level. A plan is not evidence that work shipped. A local migration is not evidence that it is deployed. A screenshot or source assertion is not a full platform regression pass.
