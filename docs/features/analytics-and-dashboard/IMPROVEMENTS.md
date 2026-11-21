# Analytics and dashboard — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** protects privacy or makes a reported number correct; **P2** adds decision-useful views; **P3** is an enhancement. Effort: S, M, L.

**Rule for every item:** aggregates only. No planner titles, notes, reasons, scores, reflections, commitments, or per-user rows in analytics or the dashboard (AGENTS.md).

## A. Fix defects and risks

### A1. Count completions only after they are saved — P1, S

- **Evidence:** **Verified (TD-14)** — see [daily planning](../daily-planning/IMPROVEMENTS.md) A1. Engagement, follow-through and week-one return all use this event.
- **Then:** remove the dashboard caveat once shipped, and note the change date on the cards (numbers before and after are not comparable).

### A2. Move server credentials out of the app folder — P1, S

- **Evidence:** **Verified by variable name** — `mobile-app/.env` defines `POSTHOG_PERSONAL_API_KEY` and a service-role variable (SaS-Next-Steps T0.6).
- **Approach:** move them to the dashboard's server environment and Supabase secrets; rotate if the file was ever shared; add a lint check that fails when non-`EXPO_PUBLIC_` secrets appear in `mobile-app/.env`.

### A3. Count only non-empty reflections — P2, S

- **Evidence:** **Verified** — empty reflections are saveable and count.
- **Approach:** fix in the app ([check-ins](../check-ins-and-reflections/IMPROVEMENTS.md) B3) and add `has_content: true` to `weekly_reflection_saved` so the dashboard can filter older data.

### A4. Review the admin seed migration — P2, S

- **Evidence:** **Verified** — the first admin is seeded by a hard-coded email.
- **Approach:** replace with a documented one-off SQL step per environment (or a `supabase/seed.sql` that is not run in production) and a short admin-management procedure.

## B. Refine existing capabilities

### B1. An event contract with tests — P1, M

- **Why:** event names and properties are spread over five files; the dashboard depends on exact strings.
- **Approach:** `mobile-app/src/lib/analytics-events.ts` defines every event and its allowed property values as TypeScript types; a typed `track()` wrapper replaces direct `posthog?.capture` calls. A unit test asserts no property is a free-form string except allow-listed enums. The dashboard imports the same names from a shared JSON file.

### B2. Range and comparison controls — P2, M

- Add 7 / 30 / 90-day selection and "vs previous period" to the Overview and Activity sections. Queries take the window as a bound parameter, not string concatenation.

### B3. Accountability card — P2, S

- From existing events: missed items given a recovery action per week, recovery actions by type, commitments created with a linked action. Matches the accountability page's measurement list.

### B4. Onboarding funnel card — P2, S

- After the onboarding plan's OP2 events exist: completion by step.

## C. New capabilities

### C1. Analytics opt-out — P1, S

- **Evidence:** **Not found** — no opt-out.
- **Approach:** Profile switch "Share anonymous usage data" (default on where allowed). Off calls `posthog.optOut()` and stops logs; the choice is device-local. Mention it in the privacy policy and the "Your data" panel (onboarding B3). Decide with the owner whether any market needs opt-in instead.

### C2. Release health card — P3, M

- Exceptions per 1,000 sessions by app version (add `app_version` to `before_send`), plus native crash rates if Sentry or the stores' consoles are connected later.

### C3. Dashboard tests — P2, S

- Snapshot tests for each HogQL string (catch accidental changes) and a parser test for `dashboard-data.ts` result mapping. SQL tests for `dashboard_database_metrics()` (non-admin denied, admin gets aggregates).

## Measurement of the dashboard itself

Track nothing about admins beyond Supabase auth logs. The dashboard is an internal tool; usage analytics on it are not needed.
