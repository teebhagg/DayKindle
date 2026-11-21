# Analytics and dashboard — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [SaS execution plan](../../../SaS-Next-Steps.md) (T0.5, T0.6).

## 1. Scope and order

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| AD1 | A2 — move server credentials; rotate if needed | Owner access | Secrets only |
| AD2 | B1 — event contract and typed `track()` | SaS-Next-Steps T0.2 | No |
| AD3 | A1 — completion after save (daily planning DP2) | AD2 | No |
| AD4 | C1 — analytics opt-out | AD2, owner decision on default | No |
| AD5 | A3 — `has_content` on reflections | AD2 | No |
| AD6 | C3 — dashboard and RPC tests | Accounts AS2 (local Supabase tests) | Tests only |
| AD7 | B2 — range and comparison controls | AD6 | Dashboard only |
| AD8 | B3, B4 — accountability and funnel cards | AD2, onboarding OP2 | Dashboard only |
| AD9 | A4 — admin seed procedure | AD1 | Migration review |
| AD10 | C2 — release health | AD2 | Dashboard only |

## 2. Decisions needed

1. **Opt-out default (AD4):** on with an opt-out (recommended for the current content-free events), or opt-in in some markets.
2. **Comparability (AD3):** accept a visible break in completion-based metrics on the release date.
3. **Admin management (AD9):** who can add admins, and how it is recorded.

## 3. Work packages

### AD1 — Credentials

- Move `POSTHOG_PERSONAL_API_KEY` to the dashboard host's server environment and the service-role key to Supabase function secrets only. Delete both from `mobile-app/.env`. Rotate the PostHog personal key and the service-role key if the file was ever copied off the machine.
- Add `mobile-app/scripts/check-env.cjs` that fails when `mobile-app/.env` contains keys without the `EXPO_PUBLIC_` prefix; run it in `npm run lint`.

### AD2 — Event contract

- **Files (new):** `mobile-app/src/lib/analytics-events.ts` (event name → property type map), `mobile-app/src/lib/track.ts` (`track<E>(event, properties)` calling `posthog?.capture`), `analytics-events.test.ts`, and `shared/analytics-events.json` listing names for the dashboard.
- **Change:** replace the 11 direct `capture` calls with `track`. Payloads stay identical.
- **Test:** every property type is a boolean, number, or string-literal union; no plain `string`.

### AD3 — Completion after save

- Implemented as daily planning DP2. Add a dated note to the Cohorts section footer.

### AD4 — Opt-out

- Profile switch stored in device-local settings; on change call `posthog.optOut()` / `posthog.optIn()`; `plannerSyncLogger` checks the same flag. Update `marketing/src/routes/privacy.tsx` copy in the same change.

### AD5 — Reflection content flag

- `weekly_reflection_saved` gains `has_content: boolean`; the dashboard's reflection adoption counts `has_content = true` or the property missing (older events), with a note.

### AD6 — Tests

- `dashboard/src/lib/dashboard-data.test.ts` (Vitest or Node test runner): HogQL snapshot tests, result-row parsing, partial failure handling.
- `supabase/tests/dashboard_metrics.sql`: non-admin and anonymous calls raise `42501`; admin gets one row; no personal columns.

### AD7 — Range controls

- A `range` search param (7, 30, 90) parsed and clamped on the server; queries use HogQL placeholders for the interval. Previous-period values are a second query with the window shifted.

### AD8 — New cards

- **Accountability:** counts of `recovery_action_applied` by `recovery_action`, and `commitment_created` with `has_linked_action`, last 30 days.
- **Onboarding funnel:** distinct ids per `onboarding_step_completed.step`, ordered.
- Both show counts beside rates, like the existing cohort cards.

### AD9 — Admin procedure

- Keep the existing migration for the current environment's history. Add `docs/` guidance (in the architecture data-flow page) for adding or removing an admin with a one-line SQL statement run by the owner, recorded in a dated note. Do not add emails to new migrations.

### AD10 — Release health

- Add `app_version` (from `expo-application`) in `before_send`; dashboard card: `$exception` events per 1,000 `Application Opened` events by version, last 14 days.

## 4. Rollout and rollback

Mobile changes ship in app builds; dashboard changes deploy independently and can be reverted by redeploying the previous version. Event payloads stay backward compatible: new properties are additive, and queries tolerate their absence.

## 5. Exit evidence

Event-contract test passes; a development PostHog project shows only allow-listed properties; dashboard tests and SQL tests pass; credentials no longer present in `mobile-app/.env` (checked by the lint script). [Current state](CURRENT_STATE.md) updated.
