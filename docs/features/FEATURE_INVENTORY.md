# Feature inventory

**Reviewed:** 2026-10-27  
**Evidence:** Current local source, package manifests and checked-in migrations, plus one read-only screenshot of the running app's Progress screen on an iPhone 17 Pro simulator (iOS 26.3). No user flow, provider, remote database or production deployment was exercised.

Status labels:

- **Verified** — an implementation path exists in reviewed source.
- **Inferred** — likely product or architecture implication from source, not runtime-observed.
- **Needs Validation** — requires device/browser or deployment evidence.
- **Not found** — no implementation was found in the reviewed source. This is scoped to the files inspected, not proof that no external system exists.

## Mobile user journeys

| Feature | User-facing routes/components | Business logic and state | Local persistence | Cloud/integrations | Status and limits |
| --- | --- | --- | --- | --- | --- |
| Startup, visual style and motion | Root app shell; `mobile-app/src/app/_layout.tsx`, `features/home/animated-splash.tsx`, `visual-style-context.ts`, theme hooks | Font/startup readiness, light/dark palette, Refined/Expressive style, reduced-motion branches | Style and session settings in `session_settings` or web snapshot | Expo fonts, Reanimated and Skia | **Verified** source behavior; native startup timing and assistive-tech behavior **Needs Validation**. |
| Welcome, onboarding and guest setup | `/`; `mobile-app/src/app/index.tsx` | Life-area selection; optional starter goal and starter routine; Refined/Expressive style; onboarding completion; `HomeSessionProvider` | `lifeAreas`, `plans`, `daySchedules`; other onboarding/style fields in native `session_settings` or web snapshot | Optional `onboarding_completed` event; auth entry points | **Verified.** Guest can use local planner. First-install and native transition behavior **Needs Validation**. |
| Account sign-in and profile identity | `/`, `/auth`, Profile UI; `features/account/welcome-auth-screen.tsx`, `profile-identity.tsx`, `guest-workspace-sign-in-tray.tsx` | Google/Apple native identity token exchange; user name update; sign out; account delete; explicit sync consent | Auth session through AsyncStorage; planner stays local unless consent allows cloud sync | Supabase Auth; `delete-account` Edge Function | **Verified** in code. Google on iOS/Android, Apple on iOS; web client disabled. OAuth setup and deletion deployment **Needs Validation**. No email/password flow found in inspected routes. |
| Today and selected date | `/(tabs)/`, shared `features/home/home-screen.tsx` | Selected date, daily schedule and recommendations from planner state | `entries` in `occurrences`; related task/habit definitions; selected date in session settings | Optional analytics events | **Verified.** Main Today logic shares a large screen module with other tabs. |
| Tasks | Today and add/edit sheet in HomeScreen | Name/description, priority, due date, estimate, subtasks, recurrence, target/unit, goal/milestone linking | `taskDefinitions` → `task_definitions`; dated `entries` → `occurrences` | Entity sync collections `taskDefinitions`, `entries`; categorized PostHog events | **Verified.** Creation forms a definition and occurrence; history behavior is derived from occurrences. |
| Habits | Today and add/edit sheet in HomeScreen | Tracking type, target/unit, recurrence, pause state, goal/milestone link | `habitDefinitions` → `habit_definitions`; dated `entries` → `occurrences` | Entity sync collections `habitDefinitions`, `entries`; categorized PostHog events | **Verified.** Recurring occurrences are materialized from definitions; no remote habit service. |
| Occurrence completion and correction | Today action controls in HomeScreen | Status transitions, completed dates, reason for corrections, missed-state recovery, rescheduling and replacement linkage | Updated occurrence rows | `entries` entity sync; completion analytics | **Verified.** Domain rules are in `features/home/occurrences.ts`. Device/date edge cases **Needs Validation**. |
| Goals and milestones | Goals tab/editor in HomeScreen | Life-area link, lifecycle, qualitative or quantitative target, manual progress, milestone list, linked actions and goal progress event history | `plans` → `goals`; `lifeAreas` → `life_areas`; `goalProgressEvents` → `goal_progress_events` | Entity sync; event payloads use categorical metadata | **Verified.** Goal model type retains legacy naming (`StarterPlan`). Progress thresholds do not by themselves mark a goal completed in inspected code. |
| Life-area management | Profile/goals controls in HomeScreen | Enable/disable built-in areas, add/rename custom areas; disabled areas retain their goals/history | `lifeAreas` → `life_areas` | Entity sync | **Verified.** Disabling an area does not delete its goals. |
| Daily check-ins | Daily sheet from Today; `features/home/daily-check-in-sheet.tsx` | Morning/evening mood, energy and sleep/productivity/satisfaction scales, intention and reflection text | `checkIns` → `daily_check_ins` keyed by date | Entity sync; event reports period only | **Verified.** Save awaits local confirmation and retains sheet on save failure. Device interaction **Needs Validation**. |
| Weekly reflections | Progress/reflection sheet in HomeScreen | Week-keyed reflection form; create/update action | `reflections` → `weekly_reflections` keyed by week start | Entity sync; event reports action only | **Verified.** User-entered reflection is not in reviewed analytics call. |
| Commitments | Progress/commitments section in HomeScreen | Title, target, deadline, optional timeframe/why/reward/consequence and linked goal/task/habit | `commitments` → `commitments` | Entity sync | **Verified.** No external commitment integration. |
| Progress and recommendations | `/(tabs)/progress`; `features/home/progress-tab.tsx`, `use-home-screen-model.ts` | Date-range metrics, achievements, weekday summary, action recommendations and commitments | Derived from planner collections; no separate progress table | Local calculations; optional product events | **Verified.** No profiling or metric correctness suite was run. |
| History | `/history`; `features/home/history-screen.tsx`, `history-analytics.ts` | Calendar/day/week summaries from completed/missed actions, goals, milestones and goal progress | Derived from occurrences, plans and progress events | None required | **Verified.** Runtime/date-range behavior **Needs Validation**. |
| Routine catalog and day templates | `/templates`, `/full-day-templates`, `/day-template-detail` | Static schedules; create/edit time blocks, repeat days, block targets; apply schedules | `daySchedules` → `day_schedules`; routine steps later become `entries`/`occurrences` | `expo-clipboard` for prompt/result flow; analytics metadata | **Verified.** Schedule catalog is source-defined in `features/templates/catalog.ts`. |
| Goal and habit template catalog | `/templates`, `/template-detail` | Static catalog filters; clone goal or habit template into user state; validate target/unit/repeat days | `plans` or `habitDefinitions`; occurrences generated for habits | `template_added` event | **Verified.** No network template service. |
| AI-assisted routine import | `/day-template-detail`; `mobile-app/src/app/day-template-detail.tsx`, `features/home/ai-routine-import.ts` | App presents a prompt for an external assistant; user copies the response back; parser accepts 1–16 blocks with a 24,000 JavaScript-code-unit input cap and optional positive target/unit | Parsed routine saved as `daySchedules` | Clipboard; no model API/client in reviewed source | **Verified, user-mediated only.** Boundary probe found `targetValue: true` becomes `1` and `"0x10"` becomes `16` through numeric coercion; accepted JSON target types/range **Need Validation**. Do not describe as in-app AI generation. |
| Local reminders | Reminder controls in Profile/HomeScreen; `features/home/notification-service.ts` | One-time or daily schedule, permission request and scheduler reconciliation | `reminders` embedded in `session_settings`/snapshot; no dedicated SQLite table | `expo-notifications`; Android local notification channel | **Verified.** Web unsupported. Actual delivery and permission behavior **Needs Validation**. |
| Push-token readiness | Profile action; `registerPushToken()` | Checks physical device, project id and notification permission, then obtains Expo push token | No token persistence or server registration path was found in this reviewed flow | Expo token service; no sender in `supabase/functions/` | **Partial.** Server delivery is unconnected according to Profile copy; remote push is not established. |
| Local data recovery | Global save/recovery feedback and Profile recovery options; `home-session.tsx` | Retry failed writes, restore archived guest state, preserve unreadable/legacy snapshots and sync conflict copies | Native `storage_metadata`/recovery records or AsyncStorage recovery keys on web | Local only, except conflict copies originate from sync | **Verified** in code. Corruption/process-kill recovery **Needs Validation**. |

## Marketing and team-facing surfaces

| Feature | Routes/modules | Data and dependencies | Status |
| --- | --- | --- | --- |
| Public product information | `marketing/src/routes/index.tsx`, `about.tsx`, `author.tsx` | Page content, metadata and shared navigation/components | **Verified** source; deployment **Needs Validation**. |
| Legal pages and indexing | `privacy.tsx`, `terms.tsx`, sitemap and robots route modules | Static content/SEO; independent TanStack app | **Verified** source; current deployed copy **Needs Validation**. |
| Marketing analytics | `marketing/src/components/MarketingAnalytics.tsx` | Optional PostHog page views; autocapture and session replay disabled in reviewed setup | **Verified** source; configured provider **Needs Validation**. |
| Team dashboard authentication | `/login`, auth callback, settings and overview; `dashboard-auth.ts` | Supabase server session; requires confirmed user and `dashboard_admins` membership | **Verified** source; live access-control behavior **Needs Validation**. |
| Aggregate product and database metrics | Dashboard overview and `dashboard-data.ts` | Five PostHog aggregate queries; Supabase aggregate RPC for database counts; chart view through Recharts | **Verified** source. No individual planner item query found. Live aggregate accuracy and deployment **Needs Validation**. |

## Persistence and sync mapping

| Domain collection | Native local table | Synced collection | Notes |
| --- | --- | --- | --- |
| Goals (`plans`) | `goals` | `plans` | Type alias remains `StarterPlan`. |
| Life areas | `life_areas` | `lifeAreas` | Built-in and custom areas. |
| Dated actions / occurrences | `occurrences` | `entries` | Task, habit and routine step instances; includes source/date/status index columns. |
| Task definitions | `task_definitions` | `taskDefinitions` | Recurrence and task-specific details. |
| Habit definitions | `habit_definitions` | `habitDefinitions` | Tracking type, recurrence and pause data. |
| Goal progress history | `goal_progress_events` | `goalProgressEvents` | Snapshot target/unit and date. |
| Routine schedules | `day_schedules` | `daySchedules` | Schedule blocks and selected days. |
| Weekly reflections | `weekly_reflections` | `reflections` | Entity id is week start. |
| Daily check-ins | `daily_check_ins` | `checkIns` | Entity id is date. |
| Commitments | `commitments` | `commitments` | User-authored commitment records. |
| Reminders and app settings | `session_settings` JSON | `reminders`, `settings` | Reminder is a cloud entity, but no separate local SQLite table. |

Cloud sync uses `public.planner_entities`, a private cursor change feed and mutation receipts through `sync_planner_mutations`. `public.planner_snapshots` remains in the repository for the legacy snapshot protocol/bootstrap. Migration presence does not prove remote deployment.

## Capabilities not found or limited in reviewed source

| Capability | Finding | Status |
| --- | --- | --- |
| Budgeting, bank account balances, transactions or ledger | Finance is available as a life-area/template category, but no corresponding budget/transaction domain model or user flow was found. | **Verified not found** in reviewed application/backend source. |
| Remote notification delivery | Local notification scheduling and token retrieval exist; no push sender was found in `supabase/functions/`. | **Verified partial/not present** in reviewed repository. |
| In-app AI generation | Routine support is external prompt/copy/paste plus parser; no model API call found. | **Verified not present** in reviewed routine flow. |
| Email/password auth | No email/password mobile sign-in path found in reviewed routes; current native entry is Google/Apple plus Guest. | **Verified not found** in inspected mobile flow. |
| Web planner account sync | Supabase client is disabled on web and notification APIs are unsupported there. | **Verified limitation** in inspected client source. |
| End-to-end encryption | Product docs state synced planner data is not end-to-end encrypted; no encryption protocol was found in the inspected sync path. | **Verified limitation in documented design;** device storage protections **Needs Validation**. |

## Related documentation

- [System overview](../architecture/SYSTEM_OVERVIEW.md) — deployable surfaces, system boundaries and evidence scope.
- [Module map](../architecture/MODULE_MAP.md) — route, module, storage and backend map.
- [Data flow](../architecture/DATA_FLOW.md) — validation, mutation, persistence and error behavior.
- [Technical debt](../architecture/TECHNICAL_DEBT.md) — ranked architecture and verification risks.
- [Accountability](accountability/CURRENT_STATE.md) — requirement-by-requirement status of misses, reasons, recovery and commitments; partners are not found (reviewed 2026-11-12).
- [Services](services/CURRENT_STATE.md) — no service, billing or model layer exists; lists the building blocks for the planned paid tiers (reviewed 2026-11-13).
- Existing feature notes live under `docs/features/<feature>/CURRENT_STATE.md`; treat them as additional leads, not runtime verification.
