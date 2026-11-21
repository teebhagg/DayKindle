# Full-scale audit — current working tree

**Reviewed:** 2026-11-13
**Status:** Local source and automated-check phase complete. Production, device, accessibility, store and live-authorization validation remain open.
**Scope:** Current working tree (dirty: 40 modified tracked files plus untracked docs, the `daily-plan` function and its migration) across `mobile-app/`, `marketing/`, `dashboard/` and `supabase/`. Read-only except for audit documentation. This page consolidates the dated [UX](UX_AUDIT.md), [performance](PERFORMANCE_AUDIT.md), [security](SECURITY_AUDIT.md) and [test coverage](TEST_COVERAGE.md) audits and the [technical debt register](../architecture/TECHNICAL_DEBT.md), and adds what a paid, vendor-accountable service would need ([Services-As-Software.md](../../Services-As-Software.md)).

## Executive findings

| Priority | Status | Finding |
| --- | --- | --- |
| High | **Verified (GitHub API, 2026-11-13)** | The repository `teebhagg/DayKindle` is **public** and has **no project license** (`licenseInfo: null`). The only license file, `mobile-app/LICENSE`, is the Expo template's MIT license with Expo's copyright. The README says "open-source". Untracked strategy files (pricing, margins) would be published on commit. |
| High | **Verified run** | `npm run test:interface`: **8 of 11 pass, 3 fail** (cases 6, 10, 11). The same three stale source contracts as 2026-10-27. There is no unit-test runner, and no tests in marketing, dashboard or Supabase. |
| High | **Verified source (2026-10-27); not re-run** | Web planner routes hydrate blank: Skia web is not initialized (`PathBuilder`/`Typeface` undefined). `mobile-app/src` still has no `LoadSkiaWeb` call (re-checked 2026-11-13). |
| High | **Needs Validation** | Deployed migrations, RLS, Edge Function versions and the account-deletion cascade have not been compared with this checkout. The daily-plan feature page reports the catalog migration and function as deployed (2026-10-31); nothing else was checked. |
| Medium | **Verified by variable name** | `mobile-app/.env` defines `POSTHOG_PERSONAL_API_KEY` and `SUPASBASE_SERVICE_ROLE_KEY` (names printed by `expo lint`; values not read). They are not `EXPO_PUBLIC_`, app source reads only `EXPO_PUBLIC_*` (Verified grep), and `.env` is gitignored, so they are **not** bundled today. Server credentials still should not live in the app directory. |
| Medium | **Verified source** | Completion analytics (`planner_item_completion_toggled`, `home-screen.tsx:574`) fires before local save confirmation (TD-14). Any KPI that counts completions may over-count on write failure. |
| Medium | **Verified source** | Accountability gaps: no commitment outcome or risk (COM-006), intensity setting unused (ACC-010), reasons not used in recommendations (ACC-006 partial). Details: [accountability current state](../features/accountability/CURRENT_STATE.md). |
| Medium | **Verified source** | Remote push is not connected: `registerPushToken()` obtains a token that is never stored, and no sender exists. Partners and services both depend on it. |
| Medium | **Verified source** | `home-screen.tsx` is 1,520 lines and owns Today, Goals, Progress, Profile UI, forms, reminders, reflections, commitments and analytics (TD-01). |
| Low | **Verified source** | `app.json` schemes are the legacy `dayweave` and `daymark`; there is no `daykindle` scheme or universal link setup. |
| Low | **Verified source** | Routine import coerces `true` → 1 and `"0x10"` → 16 for targets (TD-16). |

## Automated checks run (2026-11-13)

| Check | Directory | Result |
| --- | --- | --- |
| `npm run test:interface` | `mobile-app/` | **Fail:** 11 tests, 8 pass, 3 fail. Case 6 reads styles from `home-screen.tsx` that moved to `home-screen-styles.ts`; case 10 expects splash opacity `revealProgress * (1 - exitProgress)`; case 11 expects squircle ratio 0.1, source uses 0.14. |
| `npx tsc --noEmit` | `mobile-app/` | Pass (exit 0) |
| `npm run lint` (`expo lint`) | `mobile-app/` | Pass (exit 0, no warnings printed) |
| `npx tsc --noEmit` | `dashboard/` | Pass |
| `npm run lint` (`eslint`) | `dashboard/` | Pass |
| `npx tsc --noEmit` | `marketing/` | Pass |
| `npm run lint` (`eslint .`) | `marketing/` | Pass |
| `gh repo view … --json visibility,licenseInfo` | root | `PUBLIC`, `null` |

No coverage report, browser smoke, native build, simulator session, database query, Edge Function invocation, store sandbox or provider call was run in this pass. Earlier dated results (host-SQLite stress probe, web export size, browser smoke) are in [TEST_COVERAGE.md](TEST_COVERAGE.md) and [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md).

## Security and privacy

**Verified controls:** publishable key on the client; service role only in `delete-account`; `planner_entities` and `planner_snapshots` RLS bound to `auth.uid()`; bounded `security definer` sync RPC with per-user locking; dashboard requires a confirmed user plus `dashboard_admins`; aggregate-only dashboard RPC; content-free analytics in reviewed calls; consent-gated sync.

**Gaps that matter before any cross-user or paid feature:**

1. No database tests exist, so RLS and RPC authorization are asserted only by reading SQL.
2. Synced planner data is not end-to-end encrypted. Partners and services must therefore not read it; the accountability and services plans use device-built, allow-listed projections instead.
3. The first dashboard-admin migration seeds membership by a hard-coded email. Review before deploying to any other environment.
4. The privacy policy and terms (`marketing/src/routes/privacy.tsx`, `terms.tsx`) do not describe sharing with other people, model processing, a billing processor or coaches. They must before Phases 2 and 3.
5. The app is offered to people aged 13 and older. Partner contact and paid services need an age policy; the proposed default is 18+.

## Readiness for Services-as-Software

| Requirement for a vendor-accountable service | State | Blocking phase |
| --- | --- | --- |
| Tested rules for every number shown | No unit runner; rules inline in UI | Phase 0–1 |
| Durable, auditable delivery record | No service tables | Phase 3 |
| Remote push | Token only | Phase 2 |
| Scheduled jobs | None (no pg_cron/pgmq) | Phase 2–3 |
| Billing and entitlements | None | Phase 3 |
| Model interface with fallback | None | Phase 3 |
| Verified deletion and RLS | Not verified on a live project | Phase 0 |
| License and publication policy | None | Phase 0 (owner) |
| Privacy/terms covering sharing and AI | Not covered | Phase 2–3 |

## Open validation work

1. Decide the license and where strategy documents live; replace `mobile-app/LICENSE`.
2. Align the three interface contracts and add `npm run test:unit` (SaS-Next-Steps T0.1, T0.2).
3. Initialize Skia on web, then repeat the browser route smoke with CanvasKit served locally.
4. Record deployed migration, policy and function state read-only; verify the deletion cascade on a disposable project.
5. Move server credentials out of `mobile-app/.env`; rotate if exposure is possible.
6. Run onboarding, create/complete, miss/recovery, commitment, reminders and sync account-switch flows on iOS and Android; VoiceOver and TalkBack passes; record device, OS and build.
7. Profile native startup and save with representative history sizes before setting performance budgets.

## Scope and caveat

The working tree was dirty during review. Findings describe the local checkout on the date above, not a release build or deployed environment. Source review is not a security certification, and a passing static check is not a runtime test.
