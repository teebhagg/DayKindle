# Services — implementation plan

**Created:** 2026-11-13
**Status:** Proposed design. No implementation is authorized by this document. Nothing described as "new" exists in source yet. SQL and TypeScript below are design drafts that have **not been executed**.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [Services-as-Software strategy](../../../Services-As-Software.md), [SaS execution plan](../../../SaS-Next-Steps.md), [accountability plan](../accountability/IMPLEMENTATION_PLAN.md).

This is Stage C of the accountability plan: **DayKindle acting as a partner the person pays for**. It reuses Stage A (pure accountability rules) and Stage B (partnerships, grants, projections, push) and adds a service engine, billing and a model interface.

---

## 1. Principles

1. **A service is a partner you pay for.** It sees what a partner would see: a device-built, allow-listed summary. It never reads `planner_entities`.
2. **Rules compute, the model words.** Counts, pace, risk and which adjustments to offer come only from tested pure functions in `features/accountability/`. The model rewrites text and nothing else.
3. **Approval before change.** No service writes to the planner. Adjustments are proposals the person applies on the device.
4. **Every run is on the record.** Each unit of work is a `service_runs` row with a due time, a state history and an outcome. Late or failed runs are credited automatically.
5. **Rules-only is the default path.** The model is an enhancement layered over a complete rules-only result, so a model outage degrades wording, not delivery.
6. **Promise delivery, not results.**

## 2. How it works

```mermaid
sequenceDiagram
  participant Cron as pg_cron (hourly)
  participant Sched as service-scheduler
  participant DB as Postgres (service_* tables)
  participant Push as Expo Push
  participant App as Person's device
  participant Sum as service-summary
  participant AI as _shared/ai (model)

  Cron->>Sched: tick
  Sched->>DB: open due runs (status scheduled → awaiting_summary)
  Sched->>Push: silent/visible "your review is being prepared"
  App->>App: build summary from local planner (accountability.ts)
  App->>Sum: POST summary (JWT)
  Sum->>DB: validate allow-list, store service_summaries
  Sum->>Sum: rules → review + adjustments (deterministic)
  Sum->>AI: reword (optional, with timeout)
  AI-->>Sum: text or failure
  Sum->>DB: status ready; outcome pending
  Sum-->>App: prepared review
  App->>App: person reads, applies adjustments
  App->>DB: mark_service_run_reviewed (outcome counted)
  Sched->>DB: runs past due_at without delivery → late → credit
```

**Why the device sends the summary:** planner data is local-first and sync is optional. Building the summary on the device means Guests-turned-subscribers do not have to enable sync, and the server only ever holds counts and categories. **Trade-off:** a run cannot complete until the device opens. The scheduler therefore defines "delivered" as "ready on the first app open on or after the due time", and sends a push at the due time to prompt that open. A run whose device has not opened within 72 hours is closed as `not_counted` (person absent), not credited.

## 3. The service summary (allow-list)

Built on the device by a new pure function `buildServiceSummary(period, state)` in `mobile-app/src/features/accountability/service-summary.ts`, using `evaluateCommitment` and `summarizeMisses` from Stage A.

```ts
export type ServiceSummaryV1 = {
  v: 1;
  periodStart: string;      // YYYY-MM-DD, person-local
  periodEnd: string;
  timeZone: string;         // IANA, max 64 chars
  actions: { planned: number; completed: number; missed: number; skipped: number; rescheduled: number };
  missReasons: Partial<Record<ReasonCategory, number>>; // known categories; 'other' as count; 'private' excluded
  recoveries: Partial<Record<RecoveryAction, number>>;
  recoverySuccess: { attempted: number; completed: number };
  byWeekday: Array<{ weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; planned: number; completed: number; missed: number }>;
  commitments: Array<{
    ref: string;            // opaque per-engagement id, not the local id
    shareTitle?: string;    // only if the person enabled titles for the service (default off)
    deadline: string;
    required?: number;
    completed: number;
    opportunitiesLeft?: number;
    pace: 'met' | 'on_track' | 'tight' | 'behind' | 'unknown';
    status: 'active' | 'kept' | 'missed' | 'released';
  }>;                       // max 3 for Check-ins
  candidates: Array<{ key: RecommendationKey; score: number; evidence: Record<string, number | string> }>; // max 5
  inactiveDays: number;
};
```

**Never in the summary:** reflection text, check-in text, custom miss reasons, task descriptions, subtasks, goal descriptions, commitment why, reward or consequence, and anything about items the person did not include.

**Server validation** (`service-summary` function): parse with a strict schema (unknown keys dropped, numbers bounded 0–10,000, arrays capped, strings capped at 80 characters, enums enforced). Store the rebuilt object, never the raw body. A unit test asserts that a summary built from a fixture full of free text contains none of it.

**Opt-in reflection excerpt (Phase 3, optional):** a separate toggle, "Let DayKindle read this week's reflection to personalize your review". When on, the device adds `reflectionExcerpt` (max 1,200 characters) for that run only. The function passes it to the model, never stores it, and nulls it before writing `service_summaries`. Default off.

## 4. Rules (deterministic)

New pure module `mobile-app/src/features/accountability/service-rules.ts`, mirrored server-side in `supabase/functions/_shared/service-rules.ts`. One source file is kept in `supabase/functions/_shared/` and the mobile copy is checked by a test that compares the two files' hashes, because Deno and Metro cannot share a module path without a build step. **Trade-off:** a duplicated file with a drift test is simpler than a shared package for one module.

| Service | Rule output |
| --- | --- |
| K1 weekly review | `headline` (one of 6 templates chosen by completion rate and trend), `stats` (from the summary), up to 3 `adjustments` chosen from `candidates` by score with category de-duplication, `reasonInsight` when one category is at least 40% of misses with at least 3 misses |
| K2 check-in | For each commitment: due check-in points (midpoint and evening before deadline by default; one extra when `pace` is `tight` or `behind`), message template by pace and intensity |
| K3 recovery replan | Triggered when `missed ≥ 3` in 7 days or `inactiveDays ≥ 7`. Proposes: lower numeric targets to 70%, move the weekday with the worst miss rate, pause at most one habit. Output is a diff the device can apply. |

Rule versions are stored as `rules_version` on each run. Every user-visible number in a review is traceable to the summary and rule version that produced it.

## 5. Model interface

`supabase/functions/_shared/ai/` (Deno), matching the design spec §32:

```ts
export interface WordingProvider {
  rewordReview(input: { template: ReviewTemplate; stats: ReviewStats; intensity: Intensity; locale: string; reflectionExcerpt?: string }): Promise<{ text: ReviewText }>;
  rewordCheckIn(input: { pace: Pace; intensity: Intensity; locale: string }): Promise<{ text: string }>;
}
```

- One implementation at launch, chosen in SaS-Next-Steps T3.3. Selected by environment variable; keys in Supabase secrets.
- **Guardrails:** 8-second timeout; output schema-validated; any number in the output must appear in the input stats, or the output is rejected and the rules text is used; a blocklist for shame words ("failed", "lazy", "disappointing", "streak lost"). Rejections are logged as `ai_cost_log.rejected = true` without content.
- **Provider terms:** no training on inputs, documented retention and region (**Needs Validation** for the chosen provider). Declared in the privacy policy and store labels before launch.

## 6. Data model (new migration, draft)

One migration `supabase/migrations/<timestamp>_service_engine.sql`, following the conventions in `20261005151602_planner_entity_sync.sql`: RLS on, `revoke all` from `anon` and `authenticated`, read-only `select` policies for owners, writes only through `security definer` functions with `set search_path = ''`.

```sql
create type public.service_run_status as enum
  ('scheduled','awaiting_summary','preparing','ready','delivered','late','failed','not_counted');

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_key text not null check (product_key in ('checkins','coach')),
  source text not null check (source in ('app_store','play','grant','founding')),
  store_ref text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (source, store_ref)
);

create table public.store_events (
  id text primary key,                 -- store notification id; idempotency key
  platform text not null check (platform in ('app_store','play')),
  payload_hash text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create table public.service_engagements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_key text not null check (service_key in ('checkins','coach')),
  scope_version text not null,
  intensity text not null default 'gentle' check (intensity in ('gentle','balanced','strict')),
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  share_titles boolean not null default false,
  terms_accepted_at timestamptz not null,
  status text not null default 'active' check (status in ('active','paused','ended')),
  unique (user_id, service_key)
);

create table public.service_runs (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.service_engagements (id) on delete cascade,
  kind text not null check (kind in ('weekly_review','commitment_checkin','recovery_replan','coached_week')),
  period_key text not null,            -- e.g. '2027-05-10' (week start) or '<commitment ref>:<checkpoint>'
  due_at timestamptz not null,
  status public.service_run_status not null default 'scheduled',
  rules_version text,
  wording_source text check (wording_source in ('rules','model')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (engagement_id, kind, period_key)
);

create table public.service_run_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.service_runs (id) on delete cascade,
  from_status public.service_run_status,
  to_status public.service_run_status not null,
  actor text not null check (actor in ('system','rules','model','coach','person')),
  at timestamptz not null default now()
);

create table public.service_summaries (
  run_id uuid primary key references public.service_runs (id) on delete cascade,
  payload jsonb not null check (pg_column_size(payload) < 16384),
  received_at timestamptz not null default now()
);

create table public.service_results (
  run_id uuid primary key references public.service_runs (id) on delete cascade,
  payload jsonb not null check (pg_column_size(payload) < 16384)  -- prepared review text + adjustments
);

create table public.service_outcomes (
  run_id uuid primary key references public.service_runs (id) on delete cascade,
  counted boolean not null,
  not_counted_reason text check (not_counted_reason in ('person_absent','paused','too_little_activity','notifications_off')),
  reviewed_at timestamptz,
  adjustments_applied smallint not null default 0
);

create table public.service_credits (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.service_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  days smallint not null check (days between 1 and 30),
  method text check (method in ('store_extension','extra_outcome')),
  platform_ref text,
  applied_at timestamptz
);

create table public.ai_cost_log (
  id bigint generated always as identity primary key,
  run_id uuid references public.service_runs (id) on delete set null,
  provider text not null, model text not null,
  input_tokens int not null, output_tokens int not null,
  cost_micros bigint not null, rejected boolean not null default false,
  at timestamptz not null default now()
);
```

**State machine.** One function owns every transition:

```sql
create or replace function public.transition_service_run(p_run uuid, p_to public.service_run_status, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_from public.service_run_status;
begin
  select status into v_from from public.service_runs where id = p_run for update;
  if not found then raise exception 'run not found'; end if;
  if not (
       (v_from = 'scheduled'        and p_to in ('awaiting_summary','not_counted'))
    or (v_from = 'awaiting_summary' and p_to in ('preparing','late','not_counted'))
    or (v_from = 'preparing'        and p_to in ('ready','failed'))
    or (v_from = 'late'             and p_to in ('preparing','not_counted'))
    or (v_from = 'ready'            and p_to = 'delivered')
  ) then raise exception 'illegal transition % -> %', v_from, p_to; end if;
  update public.service_runs set status = p_to,
    delivered_at = case when p_to = 'delivered' then now() else delivered_at end
  where id = p_run;
  insert into public.service_run_events (run_id, from_status, to_status, actor) values (p_run, v_from, p_to, p_actor);
end $$;
revoke all on function public.transition_service_run from public, anon, authenticated;
```

`late` is set by the scheduler when a run is `awaiting_summary` and the person opened the app after `due_at` but the summary was not prepared within the delivery window (a DayKindle-side failure). `failed` plus `late` both create a `service_credits` row. Person-side absence becomes `not_counted`. **This distinction is the delivery guarantee**, so it is pgTAP-tested.

**Client RPCs** (`security definer`, `authenticated` only, each checks `auth.uid()` owns the engagement first): `get_my_service_state()`, `pause_service(p_service)`, `resume_service(p_service)`, `mark_service_run_reviewed(p_run, p_adjustments_applied)`.

**Deletion:** every table cascades from `auth.users`. Extend `delete-account` tests to assert zero rows remain. Store subscriptions are cancelled by the person in the store; the deletion flow says so.

## 7. Edge Functions and jobs

| Function | Trigger | Responsibility |
| --- | --- | --- |
| `store-webhook` | App Store Server Notifications v2; Google Play RTDN through Pub/Sub push | Verify the signed payload (JWS for Apple, Pub/Sub OIDC token for Google), insert `store_events` with `on conflict do nothing`, then upsert `entitlements`. Returns 200 for duplicates. |
| `service-scheduler` | pg_cron hourly via pg_net with a Vault-stored secret | For each active engagement whose local time passed Monday 06:00, insert the week's K1 run (unique key makes this idempotent); enqueue K2 checkpoints to pgmq with `delay`; mark overdue runs `late`; close runs with no app open in 72 hours as `not_counted`. |
| `service-summary` | Device `POST` with JWT | Validate, store, run rules, call the wording provider with a timeout, store `service_results`, transition to `ready`, return the result. |
| `service-checkin-worker` | pgmq read, every minute | Pop due check-ins, respect quiet hours (re-enqueue with delay), send push with notification category `CHECKIN` (Done / Not yet / Adjust). |
| `service-credit` | Runs marked `late` or `failed` | Compute days (K1: 1, K2: 1 per missed checkpoint, max 3 per month for K2), apply the extension through the store API or record `extra_outcome`. |

pg_cron jobs, pgmq queues and Vault secrets are configuration, not migrations. Record them in `supabase/README.md` with the exact `cron.schedule` calls.

## 8. Billing

**Products:** `daykindle.checkins.monthly`, `daykindle.checkins.annual` in one subscription group; Coach in a second group later. Introductory offers implement founding prices.

**Client library decision** (made in SaS-Next-Steps T3.1):

| Option | For | Against |
| --- | --- | --- |
| Native StoreKit 2 and Play Billing via an Expo module, plus our own `store-webhook` | No third-party processor of purchase data; full control of credits | More code: receipt verification, renewals, grace periods, refunds and two webhook formats |
| A subscription-management SDK (for example RevenueCat) | Receipt handling, entitlements and webhooks in days | Another processor in the privacy policy; fee above a revenue threshold (**Needs Validation** on current pricing); credits still need store APIs |

**Recommendation:** the subscription SDK for Phase 3, with its webhook writing our `entitlements` table, so the server never depends on the SDK at request time. Revisit at the price-increase gate.

**Entitlement on device:** read from `get_my_service_state()` and cached in AsyncStorage with `ends_at`. The app honours the cache offline until `ends_at` plus a 3-day grace window. Free features never check entitlements.

## 9. Mobile UI

| Surface | Purpose |
| --- | --- |
| **Coach tab** (`src/app/(tabs)/coach.tsx`, iOS and Android shells) | Free: rules-only weekly review computed locally, with no server call. Subscribed: delivered reviews, open check-ins, replans, the receipt card. Empty state explains, never upsells first. |
| **Scope screen** (`src/app/services/scope.tsx`) | What is included, what counts, how credits work, what DayKindle can and cannot see (with a rendered sample summary), intensity choice. Purchase buttons at the bottom. |
| **Review screen** (`src/app/services/review/[runId].tsx`) | Headline, stats, adjustments with **Apply** each (applies through existing planner setters and `confirmLocalSave()`), **Mark reviewed**. |
| **Replan diff** (`src/app/services/replan/[runId].tsx`) | Before and after per item; accept all, accept some, decline. |
| **Profile → Services** | Pause, resume, intensity, show titles to the service (default off), reflection opt-in, manage subscription, restore purchases. |

Applying an adjustment never calls the server for planner data. The device records `{ runId, adjustmentKey, appliedAt }` locally and reports only the count in `mark_service_run_reviewed`.

## 10. Coach tier (Phase 4, design summary)

- A coach is a partnership with `role = 'coach'` from accountability Stage B. The person sets grants in the same screen with the same preview.
- Coach surface: a separate Expo app or a coach mode gated by a `coaches` row. **Not** the dashboard.
- Draft-and-edit: `service-summary` produces a model draft per shared miss; the coach edits and sends; `service_tasks` records minutes and whether the draft was edited (no message content in analytics).
- Every coach read of a partner view is logged (`coach_access_log`: coach, partnership, at). The person can see "Your coach last looked on Tuesday".
- Safety protocol and escalation are written and reviewed by a qualified professional before the pilot. Crisis keywords in an opted-in reflection show crisis resources to the person; they do not trigger automated outreach.

## 11. Analytics (content-free)

| Event | Properties |
| --- | --- |
| `service_scope_viewed` | `service` |
| `service_purchase_started` / `_completed` / `_failed` | `service`, `plan` (`monthly` or `annual`), `offer` |
| `service_run_opened` | `kind`, `wording_source`, `hours_after_due_bucket` |
| `service_review_completed` | `adjustments_offered`, `adjustments_applied` |
| `service_checkin_answered` | `answer` (`done`, `not_yet`, `adjust`), `pace` |
| `service_paused` / `service_resumed` | `service` |
| `service_intensity_changed` | `from`, `to` (a harm signal when it goes down) |

## 12. Tests

- **Unit (`node --test`):** `buildServiceSummary` never emits free text; `service-rules` for every template, adjustment selection and replan trigger; the drift test between mobile and Deno rule copies.
- **pgTAP (`supabase/tests/service_engine.test.sql`):** every legal and illegal transition; idempotent run creation; credit only for `late` and `failed`; owners see only their rows; anon sees nothing; deletion cascades.
- **Deno tests** for `store-webhook` with recorded sandbox payloads (duplicate, out-of-order, refund, revoke) and for `service-summary` validation (extra keys dropped, oversize rejected, model timeout falls back to rules).
- **Device:** a sandbox purchase, a forced late run producing a credit, check-in notification actions, offline entitlement grace.

## 13. Decisions and trade-offs

| # | Decision | Chosen | Alternative | Why |
| --- | --- | --- | --- | --- |
| 1 | Where numbers are computed | Device (summary) and server rules on the summary | Server reads synced planner | Sync is optional and holds free text; matches the partner privacy model. |
| 2 | Delivery definition | Ready on first open after due time, plus a push | Must be opened by due time | DayKindle controls preparation, not when the person opens the app. |
| 3 | Scheduling | pg_cron for runs, pgmq for check-ins | Edge cron only | Check-ins need durable delayed delivery and retries; reviews do not. |
| 4 | Rules sharing | Duplicated file with drift test | Shared package and build step | One module; no build pipeline exists for Edge Functions. |
| 5 | Model role | Wording only, validated, rules fallback | Model generates reviews | Accuracy and the "no silent failure" guarantee. |
| 6 | Billing | Subscription SDK writing our table | Native only | Speed for a small team; reversible because entitlements are ours. |
| 7 | Credits | Store renewal extension, else extra outcome | Refunds | Refunds are store-controlled and slow; extensions keep the person subscribed. |

## 14. Documentation to update when work lands

- This folder's [current state](CURRENT_STATE.md) after each phase.
- [Feature inventory](../FEATURE_INVENTORY.md), [system overview](../../architecture/SYSTEM_OVERVIEW.md), [data flow](../../architecture/DATA_FLOW.md), [module map](../../architecture/MODULE_MAP.md).
- [Security audit](../../audits/SECURITY_AUDIT.md) for store webhooks, the model provider and coach access.
- Privacy policy and terms (`marketing/src/routes/privacy.tsx`, `terms.tsx`) and store privacy labels before each paid phase.
- `mobile-app/PRODUCT.md` "do not claim coaching" only after Phase 4 passes its gate.
