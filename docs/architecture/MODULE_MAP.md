# Module map

**Reviewed:** 2026-10-27  
**Evidence:** Current local source, package manifests, and checked-in SQL. Runtime call tracing was not performed.

Status labels describe the confidence of the source finding: **Verified**, **Inferred**, or **Needs Validation**.

## Repository and deployable modules

| Path | Responsibility | Entry points and important interfaces |
| --- | --- | --- |
| `mobile-app/src/app/` | Expo Router routes and platform route shells | `_layout.tsx`, `index.tsx`, `(tabs)/_layout.ios.tsx`, `(tabs)/_layout.android.tsx` |
| `mobile-app/src/features/home/` | Planner domain state, occurrence rules, persistence, reminders, analytics views | `home-session.tsx`, `home-screen.tsx`, `history-screen.tsx`, `day-schedules.ts`, `occurrences.ts` |
| `mobile-app/src/features/account/` | Native identity, account state, consent, cloud sync, conflicts | `account-provider.tsx`, `auth-service.ts`, `entity-sync-service.ts`, `sync-service.ts` |
| `mobile-app/src/features/templates/` | Static goal, habit, and schedule template catalogs | `catalog.ts` |
| `mobile-app/src/components/` | Reusable type, surface, action, feedback and toast primitives | `themed-text.tsx`, `squircle-card.tsx`, `native-action-button*.tsx`, `app-feedback.tsx`, `toast/` |
| `mobile-app/src/shared/` | Shared composite UI | Tray and masked tab bar under `components/organisms/` |
| `mobile-app/src/hooks/`, `src/lib/`, `src/constants/` | Theme/style hooks, analytics setup, shared palette | `use-theme.ts`, `use-themed-styles.ts`, `posthog.ts`, `theme.ts` |
| `marketing/src/routes/` | Public site routes and SEO endpoints | `index.tsx`, `about.tsx`, `author.tsx`, `privacy.tsx`, `terms.tsx`, sitemap/robots routes |
| `marketing/src/components/` | Marketing navigation, visual effects and analytics | `Header.tsx`, `Footer.tsx`, `ScrollReveal.tsx`, `MarketingAnalytics.tsx` |
| `dashboard/src/app/` | Team dashboard, sign-in, callback, settings and server action routes | `page.tsx`, `login/page.tsx`, `auth/callback/route.ts`, `settings/page.tsx`, `actions.ts` |
| `dashboard/src/lib/` | Dashboard auth, Supabase clients, metric queries and mapping | `dashboard-auth.ts`, `dashboard-data.ts`, `supabase/` |
| `supabase/migrations/` | Sync tables/RPCs, dashboard authorization and aggregates | Four ordered migration files reviewed; checked-in only, not deployment proof |
| `supabase/functions/` | Server-side account operation | `delete-account/index.ts` |

## Mobile route map

| Route or shell | Screen/module | Notes |
| --- | --- | --- |
| `/` | `mobile-app/src/app/index.tsx` | **Verified:** onboarding, local guest start, life-area and starter-goal choices, visual style, starter schedule, and account entry. Sign-in may be presented as an onboarding step or linked-account flow. |
| `/auth` | `mobile-app/src/app/auth.tsx` | **Verified:** re-exports the onboarding/auth route. |
| `/(tabs)/`, `/(tabs)/goals`, `/(tabs)/progress`, `/(tabs)/profile` | `mobile-app/src/features/home/home-screen.tsx` | **Verified:** route wrappers select Today, Goals, Progress or Profile in the shared HomeScreen. iOS uses native tabs; Android uses its own shell and tab presentation. |
| `/history` | `mobile-app/src/features/home/history-screen.tsx` | **Verified:** separate calendar and day/week history surface, derived from planner state. |
| `/home` | `mobile-app/src/app/home.tsx` | **Verified:** shared HomeScreen route. |
| `/templates` | `mobile-app/src/app/templates.tsx` | **Verified:** catalog and schedule selection. |
| `/full-day-templates` | `mobile-app/src/app/full-day-templates.tsx` | **Verified:** schedule/routine template route. |
| `/template-detail` | `mobile-app/src/app/template-detail.tsx` | **Verified:** goal or habit template detail and save. |
| `/day-template-detail` | `mobile-app/src/app/day-template-detail.tsx` | **Verified:** view, edit and apply a routine, including block editor and prompt/paste helper. |

The iOS wrappers pass `showTabBar={false}` because the native tab shell owns that navigation; Android wrappers use HomeScreen's tab bar. Route names and links are source-derived; runtime navigation across all platform builds is **Needs Validation**.

## Feature-to-code, state, and persistence map

| Feature / user surface | UI and rules | State and storage | Cloud / integration | Status |
| --- | --- | --- | --- | --- |
| Onboarding and profile | `app/index.tsx`, `features/account/welcome-auth-screen.tsx`, `profile-identity.tsx`, `sync-consent-dialog.tsx` | `onboarding`, `visualStyle`, `lifeAreas`, `plans`, and `daySchedules`; native local collections/settings | Supabase Auth on supported native platforms; optional PostHog onboarding event | **Verified** source path; provider/device behavior **Needs Validation** |
| Today / daily actions | `features/home/home-screen.tsx`; `day-schedules.ts`; `occurrences.ts` | `entries` → native `occurrences`; definitions → `task_definitions`, `habit_definitions`; linked plans/areas persisted separately | Sync collections `entries`, `taskDefinitions`, `habitDefinitions`, `plans`, `lifeAreas` | **Verified** |
| Goals and milestones | HomeScreen goal editor, progress actions and lifecycle UI; `use-home-screen-model.ts` derives values | `plans` → `goals`; goal progress events → `goal_progress_events`; life areas → `life_areas` | Entity collections `plans`, `lifeAreas`, `goalProgressEvents` | **Verified** |
| Routine schedules and steps | `app/templates.tsx`, `full-day-templates.tsx`, `day-template-detail.tsx`; `day-schedules.ts` | `daySchedules` → `day_schedules`; generated routine step occurrences are stored as `entries`/`occurrences` | Entity collections `daySchedules`, `entries`; clipboard interaction for prompt/paste helper | **Verified** |
| Goal/habit templates | `features/templates/catalog.ts`, `app/template-detail.tsx` | Saves into `plans` or `habitDefinitions`; later scheduled occurrences into `entries` | Template-added analytics event; no external template API | **Verified** |
| Daily check-ins | `features/home/daily-check-in-sheet.tsx` | `checkIns` → `daily_check_ins`, keyed by date | `checkIns` entity; PostHog event sends morning/evening period | **Verified** |
| Weekly reflections | Reflection UI/handlers in `features/home/home-screen.tsx` | `reflections` → `weekly_reflections`, keyed by week start | `reflections` entity; event uses action metadata | **Verified** |
| Commitments | Progress/profile-area UI and handlers in HomeScreen | `commitments` → `commitments` | `commitments` entity; no external commitment service | **Verified** |
| Local reminders | Profile/reminder controls in HomeScreen; `features/home/notification-service.ts` | `reminders` live in session settings JSON; no dedicated native reminder table | `expo-notifications` local scheduling; `registerPushToken()` helper has no sender here | **Verified**, server push **not present in reviewed source** |
| Progress and history | `features/home/progress-tab.tsx`, `history-screen.tsx`, `history-analytics.ts`, `use-home-screen-model.ts` | Derived from entries, goals, progress events, check-ins, reflections, commitments | Optional event analytics; no separate reporting backend for personal chart data | **Verified** |
| Account and sync | `features/account/account-provider.tsx`, `auth-service.ts`, `entity-sync-service.ts`, `sync-service.ts` | Planner state and local recovery snapshots; sync metadata in local storage | Supabase Auth, `planner_entities`, `sync_planner_mutations`, legacy snapshot bootstrap | **Verified** source; live service **Needs Validation** |
| Team analytics dashboard | `dashboard/src/app/page.tsx`, `dashboard/src/lib/dashboard-data.ts`, `dashboard-auth.ts` | Aggregate only in returned dashboard model | Server-side PostHog Query API plus `dashboard_database_metrics` RPC | **Verified** source; live authorization/data **Needs Validation** |
| Public product site | `marketing/src/routes/`, `MarketingAnalytics.tsx` | Static route content; no planner state | Optional PostHog page views | **Verified** |

### Mobile planner model

**Verified:** `mobile-app/src/features/home/home-session.tsx` is the canonical client-side model. The session exposes planner collections and setters, onboarding, selected date, appearance, reminders, storage state and recovery methods. Main arrays include:

- `plans` (goal records using the legacy type name `StarterPlan`)
- `lifeAreas`
- `entries` (dated occurrences, including task, habit and routine-step instances)
- `taskDefinitions` and `habitDefinitions`
- `goalProgressEvents`
- `daySchedules`
- `reflections`, `checkIns`, `commitments`, and `reminders`
- settings such as onboarding, visual style and selected date

`features/home/planner-snapshot.ts` converts the session to the sync snapshot shape. `entity-sync-service.ts` declares the synced collections as `plans`, `lifeAreas`, `entries`, `taskDefinitions`, `habitDefinitions`, `goalProgressEvents`, `daySchedules`, `reflections`, `checkIns`, `commitments`, `reminders`, and `settings`.

### Persistence table map

**Verified:** `mobile-app/src/features/home/home-storage.ts` maps native collections as follows. Most rows contain a JSON record, with selected indexed columns on occurrence and goal progress rows.

| Session field | Native SQLite table | Important details |
| --- | --- | --- |
| `plans` | `goals` | Row id plus `data_json` |
| `lifeAreas` | `life_areas` | Row id plus `data_json` |
| `entries` | `occurrences` | Source identity/date/status columns, JSON payload, unique source/date index when identifiers are present |
| `taskDefinitions` | `task_definitions` | Row id plus `data_json` |
| `habitDefinitions` | `habit_definitions` | Row id plus `data_json` |
| `goalProgressEvents` | `goal_progress_events` | Source/date columns plus JSON payload |
| `daySchedules` | `day_schedules` | Row id plus `data_json` |
| `reflections` | `weekly_reflections` | Keyed by week start when no `id` exists |
| `checkIns` | `daily_check_ins` | Keyed by date when no `id` exists |
| `commitments` | `commitments` | Row id plus `data_json` |
| `reminders`, onboarding, visual style, selected date, other session fields | `session_settings` | Kept together as JSON; reminders have no separate table |
| recovery and migration metadata | `storage_metadata` | Recovery snapshots and saved legacy/quarantine state |

On web, `home-storage.web.ts` stores the full session snapshot and recovery records through AsyncStorage. Cloud sync metadata and entity-sync recovery are also maintained client-side; their exact local key shapes are implementation details in `entity-sync-service.ts` and `home-storage.ts`.

## Domain logic modules

| Module | Responsibility | Architecture note |
| --- | --- | --- |
| `features/home/occurrences.ts` | Occurrence identity, status transitions, transition history, terminal reconciliation, dedupe and rescheduling | **Verified:** pure domain logic is separated from the screen component. |
| `features/home/day-schedules.ts` | Recurrence matching, dated task/habit/routine materialization and schedule definitions | **Verified:** definitions and dated occurrences are distinct. Current date calculations use local JavaScript dates; DST/timezone outcomes need device checks. |
| `features/home/history-analytics.ts` | History summaries from stored events | **Verified:** derived calculations are separate from the History screen. |
| `features/home/use-home-screen-model.ts` | Derived values for range summaries, recommendations, achievements and commitment views | **Verified:** view-model logic is partly separated; some orchestration remains in HomeScreen. |
| `features/home/ai-routine-import.ts` | Prompt and pasted structured-response parsing | **Verified:** no model/network client; external assistant use is user-mediated. |
| `features/home/local-save-confirmation.ts` | Save request queue and confirmation semantics | **Verified:** consumers can await durable local write completion. |
| `features/account/entity-sync-service.ts` | Local/cloud entity diff, pending mutation queue, cursor pull, tombstones, idempotency and conflicts | **Verified:** main sync implementation; imports legacy snapshot helpers. |
| `features/account/sync-service.ts` | Snapshot sync and shared conflict outcome helpers | **Verified:** older protocol code remains for bootstrap/compatibility. |

## UI and state patterns

- **Verified:** `components/native-action-button*.tsx` provides native-specific button implementations; `squircle-card.tsx`, `squircle-surface.tsx`, `page-text.tsx`, and `app-icon.tsx` centralize appearance primitives.
- **Verified:** `visual-style-context.ts` and `constants/theme.ts` separate Refined/Expressive style from light/dark theme. `use-theme.ts` and `use-themed-styles.ts` support shared palette and styles.
- **Verified:** Feedback and toast components include semantic tones and accessibility labels/live-region support. Platform tab shells, date pickers, buttons and animation components have platform/reduced-motion branches.
- **Verified:** `features/home/home-screen.tsx` is approximately 1,500 lines and owns major tabs, forms, state derivation, reminders and many mutation handlers. See the debt register for the impact and proposed validation.
- **Inferred:** Reusing a single context with many fields can make unrelated consumers subscribe to broad updates; whether this causes material renders requires profiling. Do not add memoization solely from this static observation.

## Other apps and backend seams

### Marketing

**Verified:** `marketing/src/router.tsx` and generated route tree bind file routes. Pages are public product, About, Author, Privacy and Terms, plus sitemap and robots endpoints. `MarketingAnalytics.tsx` is optional, page-view-only in reviewed calls, with autocapture and replay off. It does not share planner runtime state.

### Dashboard

**Verified:** Dashboard app routes include login, overview, auth callback and settings. `getDashboardAccess()` requires a configured Supabase client, a valid user, confirmed email, and row in `dashboard_admins`. `dashboard-data.ts` contains server-only PostHog SQL/HogQL queries and a Supabase aggregate RPC; failures are represented as unavailable/error states. Dashboard UI charts use Recharts.

### Supabase

| Database object | Purpose in checked-in SQL | Source |
| --- | --- | --- |
| `public.planner_snapshots` and `save_planner_snapshot` | Legacy revision-checked per-user whole-snapshot sync | `20261004185306_planner_snapshot_sync.sql` |
| `public.planner_entities` | Current per-user entity records with version and tombstone metadata | `20261005151602_planner_entity_sync.sql` |
| `planner_sync_private.planner_entity_changes` | Cursor-based change feed | `20261005151602_planner_entity_sync.sql` |
| `planner_sync_private.planner_mutation_receipts` | Mutation idempotency receipts | `20261005151602_planner_entity_sync.sql` |
| `public.sync_planner_mutations` | Authenticated, bounded push/pull RPC for entity mutations | `20261005151602_planner_entity_sync.sql` |
| `public.dashboard_admins` | Dashboard user authorization records | `20261008151300_dashboard_admins.sql` |
| `dashboard_database_metrics` | Aggregate database metrics exposed through an invoker wrapper and restricted private function | `20261008172125_dashboard_database_metrics.sql` |
| `delete-account` Edge Function | Authenticated account deletion | `supabase/functions/delete-account/index.ts` |

**Needs Validation:** None of these definitions proves that the matching objects or function are deployed to the configured production project.

## Main static architecture risks

- **Verified:** Several responsibilities are concentrated in HomeScreen and HomeSession; the exact size and interfaces are visible in source.
- **Verified:** Snapshot and entity synchronization implementations coexist, and entity sync uses snapshot sync for bootstrap/conflict helpers.
- **Verified:** Native storage snapshot writes replace each listed collection within one SQLite transaction.
- **Inferred:** These boundaries can increase change coupling, persistence cost, and protocol test complexity. No regression or performance measurement was performed. Details and ordered audit recommendations are in [technical debt](TECHNICAL_DEBT.md).
