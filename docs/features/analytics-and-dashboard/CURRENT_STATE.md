# Analytics and dashboard — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. PostHog was not queried, the dashboard was not run, and no hosted Supabase project was checked in this pass.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

The team needs to know whether people get value from DayKindle (do they create plans, complete actions, come back) without reading anyone's goals, check-ins or reflections. Mobile analytics send content-free events to PostHog; a private Next.js dashboard shows aggregates from PostHog and from the database.

## 2. Target user and expected outcome

- **App users:** expect privacy; their text never leaves the device through analytics.
- **Team (dashboard admins):** expect a small set of trustworthy aggregate numbers: activation, engagement, follow-through, reflection adoption, cloud usage and errors.

## 3. Current capabilities and user journey

### Mobile analytics

| Capability | Status | Evidence |
| --- | --- | --- |
| Optional PostHog client | **Verified** | `lib/posthog.ts`: created only when `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN` and `EXPO_PUBLIC_POSTHOG_HOST` are set. GeoIP off, session replay off, `url` stripped, `app_environment` and `app_surface: 'mobile'` added to every event. |
| Product events (9) | **Verified** | `onboarding_completed`, `planner_item_saved`, `planner_item_completion_toggled`, `recovery_action_applied`, `commitment_created`, `daily_check_in_saved`, `weekly_reflection_saved`, `template_added`, `routine_saved`. Properties are categories, counts and booleans only. |
| Screen views (static names) | **Verified** | `PostHogScreenTracker` in `app/_layout.tsx` reports `welcome`, `home`, `goals`, `progress`, `profile`, `history` only, because route parameters can contain user data. Touch and screen autocapture are off. |
| App lifecycle events | **Verified** | `captureAppLifecycleEvents: true`. |
| Error tracking | **Verified** | Uncaught exceptions and unhandled rejections are captured (`$exception`). Native crashes are not. |
| Sync logs | **Verified** | `planner_sync_finished { network_available, outcome, retry_conflicts }`, `planner_sync_failed { retry_conflicts }` through `posthog.logger`. |
| Identity | **Verified** | Signed-in users are identified by Supabase user id; reset on sign-out. Guests stay anonymous. |
| In-app analytics opt-out | **Not found** | No setting, and no opt-out call. |

### Marketing analytics

`marketing/src/components/MarketingAnalytics.tsx` registers `app_surface: 'marketing'`, uses `person_profiles: 'identified_only'`, and disables autocapture and session replay. **Verified.**

### Dashboard

| Capability | Status | Evidence |
| --- | --- | --- |
| Email/password sign-in, password change, sign-out | **Verified** | `login-form.tsx`, `password-change-form.tsx`, `app/actions.ts`. |
| Access gate | **Verified** | `getDashboardAccess()`: a confirmed email and a `dashboard_admins` row; distinct states for not configured, unauthenticated, not allowed, authorization not configured. |
| Overview — cloud database | **Verified** | Confirmed users, cloud-backed users, saved snapshots, active synced records, latest cloud update (`dashboard_database_metrics()` RPC). |
| Overview — product activity (production, mobile) | **Verified** | Engaged IDs (7 days), planner activity events (7 days), exception events (7 days). |
| Activity | **Verified** | Daily engaged users chart (14 days, Recharts) and activity mix by event (7 days). |
| Cohorts | **Verified** | Activation, week-one return, follow-through, reflection adoption, with the counts shown beside each rate. |
| Date-range controls, per-platform or per-version splits | **Not found** | Fixed windows in SQL. |
| Daily Plan catalog editing | **Not found** | The `daily-plan` Edge Function accepts admin `PUT` requests, but no dashboard page calls it. |

## 4. Screens, components, state and persistence

- **Mobile:** `mobile-app/src/lib/posthog.ts`, `lib/posthog-logger.ts`, `PostHogProvider` and the screen tracker in `app/_layout.tsx`; event calls in `home-screen.tsx`, `daily-check-in-sheet.tsx`, `app/index.tsx`, `app/template-detail.tsx`, `app/day-template-detail.tsx`.
- **Dashboard:** `dashboard/src/app/page.tsx` (`force-dynamic`), `app/login`, `app/settings`, `app/auth/callback`; `lib/dashboard-auth.ts`, `lib/dashboard-data.ts` (server-only; five HogQL queries with `cache: 'no-store'`; one Supabase RPC); `components/dashboard-view.tsx`, `dashboard-charts.tsx`, `dashboard-navigation.tsx` (Overview, Activity, Cohorts anchors); `proxy.ts` refreshes the Supabase session.
- **Server credentials:** `POSTHOG_API_HOST`, `POSTHOG_PROJECT_ID`, `POSTHOG_PERSONAL_API_KEY` are read on the server only. **Verified.**
- **Database:** `public.dashboard_admins` (select own row only); `planner_sync_private.dashboard_database_metrics()` (`security definer`, admin check, aggregates only) exposed through `public.dashboard_database_metrics()` (`security invoker`).

## 5. Business rules, validation and calculations

All PostHog queries filter `app_environment = 'production'` and `app_surface = 'mobile'` (or missing, for older events). **Verified.**

| Metric | Definition (Verified in `dashboard-data.ts`) |
| --- | --- |
| Engaged user / ID | A distinct id with a completion (`planner_item_completion_toggled` with `resulting_status = 'completed'`), a check-in, or a reflection in the window. |
| Planner activity | Count of `planner_item_saved`, completion toggles, check-ins and reflections in 7 days. |
| Activation | Of ids that completed onboarding 7–97 days ago, the share who created an item (`planner_item_saved` with `action = 'created'`) within 7 days of onboarding. |
| Week-one return | Of activated ids onboarded at least 14 days ago, the share with an engaged event 7–14 days after onboarding. |
| Follow-through | Of ids engaged in the last 7 days, the share with completions on 3+ distinct days. |
| Reflection adoption | Of ids engaged in the last 7 days, the share who saved a weekly reflection. |
| Cloud-backed users | Distinct users with a legacy snapshot or a non-deleted entity row. |
| Confirmed users | `auth.users` with a confirmed email and no `deleted_at`. |

## 6. Loading, empty, success, error and offline states

- **Dashboard not configured:** a setup notice listing the missing server variables (`setup-notice.tsx`). **Verified.**
- **Partial failure:** the database report and PostHog report fail independently ("DATABASE REPORT UNAVAILABLE"). **Verified.**
- **Access states:** "Team sign-in is not configured", "Team access is required", "Admin access is not ready". **Verified.**
- **Mobile without keys:** in development, a console error explains that events will be missed; in production, analytics are simply off. **Verified.**

## 7. Dependencies

PostHog (ingest, HogQL Query API, personal API key), Supabase Auth and the two dashboard migrations, Next.js server components and server actions, Recharts, shadcn-style UI primitives.

## 8. Functional limitations and confusing flows

- Guests are counted by device-level anonymous ids; a person who later signs in becomes a new identified id (merging depends on PostHog's identify behavior). Engaged "IDs" are therefore not people. The dashboard says "Unique IDs". **Verified** copy; merge behavior **Needs Validation**.
- Windows are fixed (7, 14, 30, 97, 111 days); no comparison with a previous period. **Verified.**
- Events for accountability features (`recovery_action_applied`, `commitment_created`) and templates are collected but not shown. **Verified.**
- No funnel by onboarding step (only completion is sent). **Verified.**

## 9. Defects and failure modes

- **Verified (TD-14):** completion events fire before the local save is confirmed; the dashboard itself notes "A completion tap can be counted before its local save finishes."
- **Verified:** empty reflections count toward "reflection adoption" (the app allows saving an all-empty reflection).
- **Verified:** the first `dashboard_admins` migration seeds the initial owner by a hard-coded email address. Review before using the migration in any other environment.
- **Inferred:** "Confirmed users" may include users created by Google or Apple who never finished onboarding; it is an account count, not an active-user count.
- **Needs Validation:** whether live PostHog events match these names and properties, and whether the hosted RPC and RLS match the migrations.

## 10. Performance, accessibility, security and testability

- **Security:** personal API key and service credentials are server-only; the database RPC returns aggregates and checks admin membership inside a `security definer` function with an empty `search_path`. The full-scale audit found `POSTHOG_PERSONAL_API_KEY` and a service-role variable defined in `mobile-app/.env` (not bundled, because they lack the `EXPO_PUBLIC_` prefix); they should not live in the app directory. **Verified by variable name only.**
- **Privacy:** reviewed event payloads contain no titles, reasons, scores or text. Identification uses the Supabase user id. There is no in-app opt-out and no analytics consent prompt. **Verified.**
- **Accessibility (dashboard):** navigation has `aria-label="Dashboard sections"`; charts include a text caption. Not tested with a screen reader.
- **Testability:** no tests in `dashboard/`. HogQL strings are plain constants and can be snapshot-tested; the RPC can be covered by SQL tests.

## 11. Missing capabilities and requirements to confirm

- An analytics opt-out in Profile, and whether consent is required in target markets.
- An event contract (names, properties, allowed values) checked in tests.
- Accountability, template, and onboarding-funnel cards (aggregates only).
- Date-range and previous-period comparison in the dashboard.
- A Daily Plan catalog editor (see [routines plan](../routines-and-templates/IMPLEMENTATION_PLAN.md) RT8).
- A second admin and an admin-management procedure.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): an event contract with tests, completion after save, an opt-out, accountability and funnel cards, range controls, and moving server credentials out of the app folder.

## Source map

- [Mobile PostHog client](../../../mobile-app/src/lib/posthog.ts)
- [Sync logger](../../../mobile-app/src/lib/posthog-logger.ts)
- [Screen tracker and provider](../../../mobile-app/src/app/_layout.tsx)
- [Account identity calls](../../../mobile-app/src/features/account/account-provider.tsx)
- [Marketing analytics](../../../marketing/src/components/MarketingAnalytics.tsx)
- [Dashboard access gate](../../../dashboard/src/lib/dashboard-auth.ts)
- [Dashboard queries](../../../dashboard/src/lib/dashboard-data.ts)
- [Dashboard view](../../../dashboard/src/components/dashboard-view.tsx)
- [Admin table migration](../../../supabase/migrations/20261008151300_dashboard_admins.sql)
- [Database metrics migration](../../../supabase/migrations/20261008172125_dashboard_database_metrics.sql)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Security audit](../../audits/SECURITY_AUDIT.md) · [Full-scale audit](../../audits/FULL_SCALE_AUDIT.md)
