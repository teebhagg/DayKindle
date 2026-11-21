# Accountability — implementation plan

**Created:** 2026-11-12
**Status:** Proposed design. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [Services-as-Software strategy](../../../Services-As-Software.md), [SaS execution plan](../../../SaS-Next-Steps.md).

This plan explains how the accountability feature works end to end. It is delivered in three stages that build on each other:

| Stage | What ships | Needs an account? | Needs a server change? |
| --- | --- | --- | --- |
| **A. Solo engine completion** | Commitment outcomes and pace, reason patterns, intensity setting, weekly summary, a tested pure module | No. Works for Guests. | No |
| **B. Accountability partners** | Invite-only partners, per-item sharing with previews, preset nudges, remote push | Yes, for both people | Yes: new tables, RPCs, one Edge Function |
| **C. Service partner** | DayKindle (AI, later a human coach) acting as a partner. See [services](../services/IMPLEMENTATION_PLAN.md). | Yes | Yes: reuses Stage B and adds the service engine |

Stage B is designed so that Stage C is a new **role** on the same partnership model, not a second sharing system.

---

## 1. Principles

1. **Recovery over failure.** Every accountability moment ends in a choice of next step. No streak-loss messaging, no red failure states, no money at stake. Monetary punishments are a PRD non-goal (§34).
2. **The user decides what is shared, item by item, after seeing a preview.** Nothing is shared by default. Reflections, check-ins, journal text, custom miss reasons, rewards, and consequences are never shared in v1.
3. **Share without syncing.** Partners read a small summary that the owner's device publishes. They never read `planner_entities`. A user can have partners while keeping planner sync off.
4. **The server validates and rebuilds every shared payload** from an allow-list of fields, so a buggy or modified client cannot publish extra data.
5. **Deterministic rules.** Pace, risk, and reason summaries are pure functions with unit tests. No model decides anything in Stages A and B.
6. **Content-free analytics.** Events carry categories and counts only. This matches the existing `recovery_action_applied` and `commitment_created` events.

## 2. How it works (overview)

```mermaid
flowchart LR
  subgraph Owner device
    P[Planner state<br/>entries, definitions, commitments] --> M[accountability.ts<br/>pure rules]
    M --> UI1[Today: gentle reset,<br/>commitment pace, close-out]
    M --> PR[Projection builder<br/>allow-listed fields only]
  end
  PR -->|publish_accountability_projections RPC| DB[(Supabase<br/>accountability_* tables)]
  subgraph Partner device
    PV[Partner view] -->|get_accountability_partner_view RPC| DB
    PV -->|preset nudge| EF[Edge Function<br/>accountability-nudge]
  end
  EF -->|send_accountability_nudge RPC| DB
  EF -->|Expo Push API| Owner device
```

The owner's planner data stays where it is today, on the device and in planner sync if the user opted in. Only the projection for granted items crosses to the accountability tables.

---

## 3. Stage A — solo engine completion

### A1. Extract a pure, tested accountability module

**Why:** the reason, recovery, and commitment logic sits inside `home-screen.tsx` and `use-home-screen-model.ts`. Stage B needs the same rules to build projections, and nothing is unit-tested today.

**Files (new):**
- `mobile-app/src/features/accountability/accountability.ts`
- `mobile-app/src/features/accountability/accountability.test.ts`

**Testing approach:** the app has no Jest. Node v22.23.4 (verified in this checkout on 2026-11-12) loads `.ts` files directly by stripping types. That works for dependency-free modules, so the module must use **only `import type`** for anything outside itself, because a runtime import of `home-session.tsx` would pull in React Native. Add a script:

```json
"test:unit": "node --test \"src/**/*.test.ts\""
```

```ts
// mobile-app/src/features/accountability/accountability.ts
import type { OccurrenceStatus } from '../home/occurrences';

export type CommitmentOutcome = 'active' | 'kept' | 'missed' | 'released';
export type CommitmentPace = 'met' | 'on_track' | 'tight' | 'behind';
export type LinkedRecord = { date: string; status: OccurrenceStatus; missedReason?: string };

export type CommitmentEvaluation = {
  outcome: CommitmentOutcome;
  completedActions: number;
  requiredActions?: number;
  remainingActions?: number;
  opportunitiesLeft?: number;
  pace?: CommitmentPace;
  needsClosing: boolean;
};

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Dates in [from, to] on which `isScheduled` is true. Future occurrences are not pre-created, so pace must be computed from the recurrence rule. */
export function scheduledDatesBetween(from: string, to: string, isScheduled: (date: string) => boolean, maxDays = 366): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  for (let i = 0; i < maxDays; i += 1) {
    const key = localKey(cursor);
    if (key > to) break;
    if (isScheduled(key)) dates.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function evaluateCommitment(
  commitment: { createdAt: string; deadline: string; requiredActions?: number; status?: CommitmentOutcome },
  linked: LinkedRecord[],
  scheduledDates: string[],
  today: string,
): CommitmentEvaluation {
  const start = commitment.createdAt.slice(0, 10);
  const inWindow = linked.filter((record) => record.date >= start && record.date <= commitment.deadline);
  const completedActions = inWindow.filter((record) => record.status === 'completed').length;
  const outcome = commitment.status ?? 'active';
  const active = outcome === 'active';
  const needsClosing = active && today > commitment.deadline;
  const required = commitment.requiredActions;
  if (required == null) return { outcome, completedActions, needsClosing };

  const remainingActions = Math.max(0, required - completedActions);
  const settled = new Set(inWindow.filter((record) => record.status !== 'planned').map((record) => record.date));
  const opportunitiesLeft = scheduledDates.filter((date) => date >= today && date <= commitment.deadline && !settled.has(date)).length;
  const pace: CommitmentPace = remainingActions === 0 ? 'met'
    : remainingActions > opportunitiesLeft ? 'behind'
    : remainingActions === opportunitiesLeft ? 'tight'
    : 'on_track';
  return { outcome, completedActions, requiredActions: required, remainingActions, opportunitiesLeft, pace, needsClosing };
}

const KNOWN_REASONS = ['forgot', 'low_motivation', 'low_energy', 'schedule_conflict', 'lack_of_time', 'too_difficult', 'illness', 'unexpected_event', 'deliberately_skipped'] as const;
export type ReasonCategory = (typeof KNOWN_REASONS)[number] | 'other' | 'private';

/** Custom reason text is personal; it is only ever counted as "other". */
export function reasonCategory(reason: string | undefined): ReasonCategory | undefined {
  if (!reason) return undefined;
  if (reason === 'prefer_not_to_say') return 'private';
  return (KNOWN_REASONS as readonly string[]).includes(reason) ? (reason as ReasonCategory) : 'other';
}

export function summarizeMisses(records: LinkedRecord[], from: string, to: string) {
  const counts: Partial<Record<ReasonCategory, number>> = {};
  let missed = 0;
  for (const record of records) {
    if (record.status !== 'missed' || record.date < from || record.date > to) continue;
    missed += 1;
    const category = reasonCategory(record.missedReason);
    if (category) counts[category] = (counts[category] ?? 0) + 1;
  }
  return { missed, counts };
}
```

**Test cases (`accountability.test.ts`, `node:test` + `node:assert/strict`):**
- `scheduledDatesBetween` with a weekday rule across a weekend returns only weekdays, and stops at `maxDays`.
- `evaluateCommitment`:
  - no `requiredActions` gives no pace, but `needsClosing` still works;
  - 3 required, 1 done, 2 scheduled dates left gives `tight`; 1 date left gives `behind`; 3 done gives `met`;
  - a date that already has a `missed` or `skipped` record is not counted as an opportunity;
  - records outside the creation-to-deadline window are ignored (same window as today's `commitmentMetrics`);
  - `status: 'released'` never reports `needsClosing`.
- `reasonCategory('my boss called')` returns `'other'`; `'prefer_not_to_say'` returns `'private'`; `undefined` returns `undefined`.
- `summarizeMisses` ignores non-missed records and dates outside the range.

Then replace the inline calculations in `use-home-screen-model.ts` (`commitmentMetrics`) with calls to this module, passing `(date) => recurrenceMatches(rule, date, start, daysOfWeek)` from `day-schedules.ts` as `isScheduled`. **Exit check:** the Progress commitment line shows the same numbers before and after.

### A2. Commitment outcomes and close-out

**Model change** (`home-session.tsx`), additive and optional:

```ts
export type Commitment = {
  // ...existing fields unchanged...
  status?: 'active' | 'kept' | 'missed' | 'released';
  closedAt?: string;
};
```

- Bump `SCHEMA_VERSION` from 9 to 10. Normalization leaves `status` undefined, which the module reads as `active`. No data rewrite is needed.
- **Sync compatibility:** commitments sync as whole JSON objects in the `commitments` collection, so the new fields travel without a server change. **Known edge:** a device still on a schema-9 build that edits a commitment rebuilds the object from its form fields and drops `status`. The commitment then reopens as `active` and will ask to be closed again. That is harmless and self-correcting. Record it in the release notes rather than adding a server guard.
- **Close-out UI:** when `needsClosing` is true, the commitment card shows "This one ended on {date}. How did it go?" with three choices: **I kept it**, **Not this time**, **Let it go**. "Not this time" offers a short follow-up: "Want to set a smaller one?". It opens the commitment form prefilled with a lower `requiredActions`.
- **Copy rule:** never use "failed" or "broken". The stored value `missed` is shown as "Not this time".
- **Analytics:** `commitment_closed` with `{ outcome, had_required_actions, pace_at_deadline }`. No title.

### A3. Pace on the commitment card

Replace "N of M linked actions · R remaining · P%" with a pace-aware line from `evaluateCommitment`:

| Pace | Copy (Gentle) |
| --- | --- |
| `met` | "Done: {M} of {M}." |
| `on_track` | "{R} to go, {O} chances left." |
| `tight` | "{R} to go and {O} chances left, so every one counts." |
| `behind` | "{R} to go, {O} chances left. You could add a session or adjust the target." The card gets an **Adjust** action that opens the commitment form. |

### A4. Reasons in recommendations (ACC-006)

Add one candidate to `recommendationCandidates` in `home-screen.tsx`, scored between "reschedule pattern" (80) and "overload" (70):

- **Trigger:** for one task or habit definition, 3 or more of its last 5 missed occurrences in the past 28 days share a known reason category.
- **Copy:** title "{Reason label} keeps coming up", evidence "{n} of the last {m} missed {title} sessions were marked '{label}'." The action depends on the category: low energy, illness, or too difficult offer **Make it smaller**; schedule conflict or lack of time offer **Try another time**; forgot offers **Add a reminder**.
- The categories `other` and `private` never trigger this, so custom text is never echoed back.

### A5. Intensity setting (ACC-010)

- Profile, then Accountability, then "How should DayKindle check in?": **Gentle** (default), **Balanced**, **Direct**.
- Persist in the existing `onboarding.accountabilityStyle` field, using the stored values `gentle`, `balanced` and `strict`. Treat persisted keys as a compatibility API (TD-08): show `strict` as "Direct" without renaming the stored value.

| Behavior | Gentle | Balanced | Direct |
| --- | --- | --- | --- |
| Unresolved misses | Listed on Today | Bottom sheet once per day on first open | Sheet, plus an optional 8 pm local notification if misses are unresolved |
| Commitment pace | Shown on the card | Card, plus a Today banner when `behind` | Banner when `tight` or `behind` |
| Close-out prompt | On the card | Card and Today banner | Banner and a local notification on the day after the deadline |
| Wording | Invitational | Plain | Short and specific ("2 left, 1 day to go.") |

No intensity uses shame, streak-loss language, countdown pressure, or sound.

### A6. Weekly reflection prefill

When the weekly reflection opens, show a read-only summary above the three text fields: actions completed, actions missed, top two reason categories, recoveries chosen, and commitments closed by outcome. It is built from `summarizeMisses` and occurrence counts. The user's own past reflection text is never quoted.

**Stage A exit evidence:** `npm run test:unit` passes; `npm run lint`, `npx tsc --noEmit` and `npm run test:interface` show no new failures; a simulator walk-through of miss, reason, recovery, commitment pace, and close-out in both visual styles and with reduced motion; [current state](CURRENT_STATE.md) updated.

---

## 4. Stage B — accountability partners

### B1. Product rules

- **Directional.** "Ama supports Kofi" means Kofi (the owner) shares items with Ama (the partner). Mutual support is two partnerships. After accepting, a partner is offered "Share something back?".
- **Invite-only by link.** No search, contacts upload, or public profiles.
- **Limits in v1:** 5 active partners per owner, 5 open invites, invites expire after 7 days and are single-use.
- **Both people need an account.** Guests see an explanation and a sign-in action. Planner sync is **not** required.
- **Age:** proposed default, pending an owner decision: partner features require each person to confirm they are 18 or older until a teen and guardian policy exists. The app is offered to people aged 13 and older (`PRODUCT.md`).
- **Ending:** either side can end a partnership at any time. The other person sees "This partnership has ended" and no reason. Ending removes the partner's access immediately.

### B2. What a partner can see

Permissions are set per shared item, matching PART-002. The partner always sees the item's share title, kind, deadline, outcome, and when it was last updated. The owner opts into the rest.

| Permission (PART-002) | Implemented as | Fields the partner sees |
| --- | --- | --- |
| `view_commitment` / `view_goal` | A grant row exists for the item | `title` (the owner's **share title**, which defaults to the item title and can be edited in the preview), `deadline`, `outcome`, `last_activity_on`, `published_at` |
| `view_progress` | `show_progress = true` | `completed`, `required`, `opportunities_left`, `pace` |
| `view_misses` | `show_misses = true` | `misses_7d`, `miss_reasons_7d` (known categories only; "other" as a count; "prefer not to say" excluded from the breakdown) |
| `send_nudge` | `allow_nudges = true` on the partnership | Can send preset nudges |

**Never shared in v1:** commitment target text, why, reward, consequence ("accountability rule"), custom miss-reason text, check-ins, reflections, task descriptions and subtasks, goal descriptions, life areas not tied to a shared item, and anything about unshared items.

### B3. Data model (new migration)

**Verification level:** the SQL in B3 and B4 is a design draft. It was written against the conventions of `20261005151602_planner_entity_sync.sql` but has **not been executed** against any database. It must pass the B9 pgTAP suite on a local Supabase stack before it is proposed as a migration. It also assumes `pgcrypto` is installed in the `extensions` schema, which is the Supabase default (**Needs Validation** on the target project).

One timestamped migration under `supabase/migrations/`, following the existing conventions: RLS on, `revoke all` from client roles, read-only `select` grants, and every write through a `security definer` function with `set search_path = ''`.

```sql
-- supabase/migrations/<timestamp>_accountability_partners.sql

create table public.accountability_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  adult_confirmed_at timestamptz,
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  quiet_start time not null default '21:00',
  quiet_end time not null default '08:00',
  show_titles_on_lock_screen boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.accountability_partnerships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid references auth.users (id) on delete cascade,
  role text not null default 'peer' check (role in ('peer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  owner_label text not null check (char_length(owner_label) between 1 and 60),
  partner_label text check (char_length(partner_label) between 1 and 60),
  allow_nudges boolean not null default true,
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  check (partner_id is null or partner_id <> owner_id),
  check ((status = 'pending') = (invite_token_hash is not null))
);
create unique index accountability_partnerships_active_pair
  on public.accountability_partnerships (owner_id, partner_id)
  where status = 'active';
create index accountability_partnerships_partner_idx
  on public.accountability_partnerships (partner_id) where status = 'active';

create table public.accountability_grants (
  partnership_id uuid not null references public.accountability_partnerships (id) on delete cascade,
  item_kind text not null check (item_kind in ('commitment', 'goal')),
  item_id text not null check (char_length(item_id) between 1 and 300),
  show_progress boolean not null default true,
  show_misses boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (partnership_id, item_kind, item_id)
);

create table public.accountability_projections (
  owner_id uuid not null references auth.users (id) on delete cascade,
  item_kind text not null check (item_kind in ('commitment', 'goal')),
  item_id text not null check (char_length(item_id) between 1 and 300),
  version bigint not null default 1 check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 4096),
  published_at timestamptz not null default now(),
  primary key (owner_id, item_kind, item_id)
);

create table public.accountability_nudges (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.accountability_partnerships (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('thinking_of_you', 'you_can_do_it', 'want_to_talk', 'proud_of_you')),
  created_at timestamptz not null default now(),
  deliver_after timestamptz not null default now(),
  delivered_at timestamptz,
  delivery_attempts integer not null default 0,
  seen_at timestamptz
);
create index accountability_nudges_undelivered_idx
  on public.accountability_nudges (deliver_after) where delivered_at is null;

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_token text not null unique check (expo_token ~ '^Expo(nent)?PushToken\[[^\]]+\]$'),
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Client roles may read only; all writes go through the functions below.
do $$
declare t text;
begin
  foreach t in array array['accountability_settings', 'accountability_partnerships', 'accountability_grants',
                           'accountability_projections', 'accountability_nudges', 'push_devices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create policy "Own accountability settings" on public.accountability_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Either side reads the partnership" on public.accountability_partnerships
  for select to authenticated using (owner_id = (select auth.uid()) or partner_id = (select auth.uid()));
create policy "Owner reads grants" on public.accountability_grants
  for select to authenticated using (exists (
    select 1 from public.accountability_partnerships p
    where p.id = partnership_id and p.owner_id = (select auth.uid())));
create policy "Owner reads own projections" on public.accountability_projections
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Sender or recipient reads nudges" on public.accountability_nudges
  for select to authenticated using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "Own push devices" on public.push_devices
  for select to authenticated using (user_id = (select auth.uid()));
```

**Why partners have no direct `select` on projections or grants:** the partner view must strip fields the owner did not allow. A single `security definer` read function does that in one place. A row-level policy can hide rows but cannot hide fields.

**Deletion:** every user reference cascades from `auth.users`. The existing `delete-account` Edge Function calls `auth.admin.deleteUser`, so deleting either person removes their partnerships, grants, projections, nudges, and devices. **Needs Validation** with a disposable account after deployment.

### B4. Functions (same migration)

All functions are `security definer`, `set search_path = ''`, start with an authentication check, and are granted to `authenticated` only (`revoke execute ... from public, anon`).

| Function | Caller | Behavior |
| --- | --- | --- |
| `confirm_accountability_adult()` | Anyone signed in | Upserts `adult_confirmed_at = now()`. |
| `set_accountability_preferences(time_zone, quiet_start, quiet_end, show_titles)` | Anyone signed in | Validates the IANA zone with `now() at time zone p_time_zone` inside an exception block, then upserts. |
| `create_accountability_invite(owner_label)` | Owner | Requires adult confirmation. Enforces ≤5 open invites and ≤5 active partners. Generates a 256-bit token, stores only its SHA-256, and returns the raw token once. |
| `accept_accountability_invite(token, partner_label)` | Partner | Requires adult confirmation. Locks the row, checks it is pending and unexpired, that the caller is not the owner, and that no active pair exists. Activates and clears the token. |
| `end_accountability_partnership(id)` | Either side | Sets `ended` and clears any invite token (required by the status/token check, and this is how an owner cancels an open invite). Deletes its grants, then the owner's projections that no other active grant covers. |
| `set_accountability_grant(partnership_id, item_kind, item_id, shared, show_progress, show_misses)` | Owner | Upserts or deletes one grant on an active partnership. |
| `set_accountability_nudges(partnership_id, allowed)` | Owner | Toggles `allow_nudges`. |
| `publish_accountability_projections(items jsonb)` | Owner | Rebuilds each payload from allow-listed fields, stores only granted items, and deletes ungranted projections. |
| `get_accountability_partner_view()` | Partner | Returns active partnerships with permission-filtered payloads. |
| `send_accountability_nudge(partnership_id, kind)` | Partner | Checks permission and the rate limit, applies quiet hours, and inserts the nudge. |
| `register_push_device(token, platform)` / `revoke_push_device(token)` | Device owner | Upsert, or set `revoked_at`. A token that moves to a new user is reassigned, because the device signed in as someone else. |

**Invite and accept:**

```sql
create or replace function public.create_accountability_invite(p_owner_label text)
returns table (partnership_id uuid, invite_token text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_token text;
  v_id uuid;
  v_expires timestamptz := now() + interval '7 days';
begin
  if v_user is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if not exists (select 1 from public.accountability_settings s where s.user_id = v_user and s.adult_confirmed_at is not null) then
    raise exception 'Confirm your age before inviting a partner.' using errcode = '42501';
  end if;
  if p_owner_label is null or char_length(btrim(p_owner_label)) not between 1 and 60 then
    raise exception 'Add a name between 1 and 60 characters.' using errcode = '22023';
  end if;
  if (select count(*) from public.accountability_partnerships p
      where p.owner_id = v_user and p.status = 'pending' and p.invite_expires_at > now()) >= 5 then
    raise exception 'You have 5 open invites. Wait for one to be used or expire.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.accountability_partnerships p where p.owner_id = v_user and p.status = 'active') >= 5 then
    raise exception 'You can have up to 5 partners.' using errcode = 'P0001';
  end if;

  -- 32 random bytes, base64url without padding (43 characters).
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into public.accountability_partnerships (owner_id, owner_label, invite_token_hash, invite_expires_at)
  values (v_user, btrim(p_owner_label), encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires)
  returning id into v_id;
  return query select v_id, v_token, v_expires;
end $$;

create or replace function public.accept_accountability_invite(p_token text, p_partner_label text)
returns table (partnership_id uuid, owner_label text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.accountability_partnerships;
begin
  if v_user is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if not exists (select 1 from public.accountability_settings s where s.user_id = v_user and s.adult_confirmed_at is not null) then
    raise exception 'Confirm your age before accepting an invite.' using errcode = '42501';
  end if;
  if p_partner_label is null or char_length(btrim(p_partner_label)) not between 1 and 60 then
    raise exception 'Add a name between 1 and 60 characters.' using errcode = '22023';
  end if;

  select * into v_row from public.accountability_partnerships p
   where p.invite_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and p.status = 'pending'
   for update;
  if not found or v_row.invite_expires_at <= now() then
    raise exception 'This invite is no longer valid. Ask for a new link.' using errcode = 'P0002';
  end if;
  if v_row.owner_id = v_user then
    raise exception 'This is your own invite.' using errcode = '22023';
  end if;
  if exists (select 1 from public.accountability_partnerships p
             where p.owner_id = v_row.owner_id and p.partner_id = v_user and p.status = 'active') then
    raise exception 'You are already partners.' using errcode = '23505';
  end if;

  update public.accountability_partnerships
     set partner_id = v_user, partner_label = btrim(p_partner_label), status = 'active',
         accepted_at = now(), invite_token_hash = null, invite_expires_at = null
   where id = v_row.id;
  return query select v_row.id, v_row.owner_label;
end $$;
```

**Publishing:** the server rebuilds the payload. Unknown keys are dropped, numbers are clamped, and enums are checked.

```sql
create or replace function public.publish_accountability_projections(p_items jsonb)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_kind text;
  v_id text;
  v_payload jsonb;
  v_count integer := 0;
begin
  if v_user is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Provide an array of up to 50 items.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_kind := v_item ->> 'item_kind';
    v_id := v_item ->> 'item_id';
    if v_kind is null or v_kind not in ('commitment', 'goal') or v_id is null or char_length(v_id) not between 1 and 300 then
      raise exception 'Invalid item reference.' using errcode = '22023';
    end if;
    continue when not exists (
      select 1 from public.accountability_grants g
      join public.accountability_partnerships p on p.id = g.partnership_id
      where p.owner_id = v_user and p.status = 'active' and g.item_kind = v_kind and g.item_id = v_id);

    v_payload := jsonb_strip_nulls(jsonb_build_object(
      'title', nullif(left(btrim(v_item ->> 'title'), 80), ''),
      'deadline', (v_item ->> 'deadline')::date,
      'outcome', case when v_item ->> 'outcome' in ('active', 'kept', 'missed', 'released') then v_item ->> 'outcome' end,
      'pace', case when v_item ->> 'pace' in ('met', 'on_track', 'tight', 'behind') then v_item ->> 'pace' end,
      -- greatest()/least() ignore NULL, so absent numbers are checked first rather than clamped into a value.
      'completed', case when v_item ? 'completed' then least(greatest((v_item ->> 'completed')::integer, 0), 10000) end,
      'required', case when v_item ? 'required' then least(greatest((v_item ->> 'required')::integer, 1), 10000) end,
      'opportunities_left', case when v_item ? 'opportunities_left' then least(greatest((v_item ->> 'opportunities_left')::integer, 0), 10000) end,
      'misses_7d', case when v_item ? 'misses_7d' then least(greatest((v_item ->> 'misses_7d')::integer, 0), 1000) end,
      'miss_reasons_7d', (
        select nullif(jsonb_object_agg(r.key, least(greatest(r.value::integer, 0), 1000)), '{}'::jsonb)
        from jsonb_each_text(coalesce(v_item -> 'miss_reasons_7d', '{}'::jsonb)) r
        where r.key in ('forgot', 'low_motivation', 'low_energy', 'schedule_conflict', 'lack_of_time',
                        'too_difficult', 'illness', 'unexpected_event', 'deliberately_skipped', 'other')),
      'last_activity_on', (v_item ->> 'last_activity_on')::date
    ));
    if v_payload ->> 'title' is null then
      raise exception 'Each shared item needs a title.' using errcode = '22023';
    end if;

    insert into public.accountability_projections as pr (owner_id, item_kind, item_id, payload)
    values (v_user, v_kind, v_id, v_payload)
    on conflict (owner_id, item_kind, item_id)
    do update set payload = excluded.payload, version = pr.version + 1, published_at = now();
    v_count := v_count + 1;
  end loop;

  delete from public.accountability_projections pr
   where pr.owner_id = v_user
     and not exists (
       select 1 from public.accountability_grants g
       join public.accountability_partnerships p on p.id = g.partnership_id
       where p.owner_id = v_user and p.status = 'active' and g.item_kind = pr.item_kind and g.item_id = pr.item_id);
  return v_count;
end $$;
```

A malformed number or date raises `22P02`, so the whole batch fails and the device retries after fixing it. That is intended: a partial publish could show a partner a stale mix of fields.

**Partner view:** fields are filtered by the grant.

```sql
create or replace function public.get_accountability_partner_view()
returns table (partnership_id uuid, owner_label text, allow_nudges boolean,
               item_kind text, item_id text, payload jsonb, published_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.owner_label, p.allow_nudges, g.item_kind, g.item_id,
         (pr.payload
            - case when g.show_progress then array[]::text[] else array['completed', 'required', 'opportunities_left', 'pace'] end
            - case when g.show_misses then array[]::text[] else array['misses_7d', 'miss_reasons_7d'] end),
         pr.published_at
    from public.accountability_partnerships p
    join public.accountability_grants g on g.partnership_id = p.id
    left join public.accountability_projections pr
      on pr.owner_id = p.owner_id and pr.item_kind = g.item_kind and pr.item_id = g.item_id
   where p.partner_id = auth.uid() and p.status = 'active';
$$;
```

**Nudges:** the row lock makes the rate limit safe under concurrent taps.

```sql
create or replace function public.send_accountability_nudge(p_partnership_id uuid, p_kind text)
returns table (nudge_id uuid, recipient_id uuid, deliver_after timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.accountability_partnerships;
  v_settings public.accountability_settings;
  v_local time;
  v_after timestamptz := now();
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if p_kind is null or p_kind not in ('thinking_of_you', 'you_can_do_it', 'want_to_talk', 'proud_of_you') then
    raise exception 'Unknown nudge.' using errcode = '22023';
  end if;
  select * into v_row from public.accountability_partnerships p
   where p.id = p_partnership_id and p.partner_id = auth.uid() and p.status = 'active'
   for update;
  if not found or not v_row.allow_nudges then
    raise exception 'Nudges are not available for this partnership.' using errcode = '42501';
  end if;
  if (select count(*) from public.accountability_nudges n
      where n.partnership_id = v_row.id and n.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'You can send up to 3 nudges a day.' using errcode = 'P0001';
  end if;

  select * into v_settings from public.accountability_settings s where s.user_id = v_row.owner_id;
  if found then
    v_local := (now() at time zone v_settings.time_zone)::time;
    if (v_settings.quiet_start > v_settings.quiet_end and (v_local >= v_settings.quiet_start or v_local < v_settings.quiet_end))
       or (v_settings.quiet_start < v_settings.quiet_end and v_local >= v_settings.quiet_start and v_local < v_settings.quiet_end) then
      v_after := ((date_trunc('day', now() at time zone v_settings.time_zone)
                   + case when v_local >= v_settings.quiet_end then interval '1 day' else interval '0' end
                   + v_settings.quiet_end::interval) at time zone v_settings.time_zone);
    end if;
  end if;

  insert into public.accountability_nudges (partnership_id, sender_id, recipient_id, kind, deliver_after)
  values (v_row.id, auth.uid(), v_row.owner_id, p_kind, v_after)
  returning id into v_id;
  return query select v_id, v_row.owner_id, v_after;
end $$;
```

### B5. Push delivery

**New Edge Function `supabase/functions/accountability-nudge/index.ts`:**

1. Require `Authorization: Bearer <user JWT>`. Create a caller-scoped client with the publishable key, matching `daily-plan` and `delete-account`, and call `send_accountability_nudge` as the caller. Authorization and rate limits therefore stay in SQL.
2. If `deliver_after <= now()`, use the service-role client to read the recipient's non-revoked `push_devices` rows and the sender's `partner_label`, then `POST https://exp.host/--/api/v2/push/send` with a batch of messages.
3. Message: title "DayKindle". Body from the kind, for example "{partner_label} is thinking of you." Data: `{ type: 'nudge', nudgeId }`. Commitment titles are **never** included. The setting `show_titles_on_lock_screen` is reserved for future partner-activity pushes.
4. On an Expo `ok` ticket, set `delivered_at`. On `DeviceNotRegistered`, set that device's `revoked_at`. Increment `delivery_attempts` either way.
5. Return `{ nudgeId, queued: deliver_after > now() }`.

**Retry and quiet-hours sweeper:** the same function also accepts `POST` with a shared-secret header from **pg_cron + pg_net** every 5 minutes, with the secret stored in **Vault**. It selects up to 200 rows `where delivered_at is null and deliver_after <= now() and delivery_attempts < 5 ... for update skip locked` and delivers them. pg_cron jobs and Vault secrets are not migrations; record them in `supabase/README.md`.

**Trade-off:** a synchronous send from the Edge Function gives instant delivery in the common case. The cron sweep covers failures and quiet hours. A queue-only design (pgmq) adds latency and infrastructure for a low-volume, best-effort message, so it is not used here. Revisit pgmq when service check-ins (Stage C) need guaranteed scheduling.

**Device registration:** extend `registerPushToken()` callers. After a successful token fetch, and when the user is signed in, call `register_push_device(token, Platform.OS)`. On sign-out, call `revoke_push_device(token)` *before* the Supabase sign-out, while the session is still valid. Update the Profile copy that today says server delivery is not connected. Also check the iOS push entitlement and Android FCM credentials in the EAS project, because remote push needs them (**Needs Validation**).

### B6. Device-side publishing

New module `mobile-app/src/features/accountability/accountability-sharing.ts`:

- Builds projection items for every locally known item that has an active grant, using `evaluateCommitment` and `summarizeMisses` over the last 7 days. The share title comes from a local `shareTitles` map (`settings` entity) and defaults to the item title.
- **When it publishes:** after `confirmLocalSave()` resolves for a change that touches entries, commitments, plans, or definitions (debounced 5 seconds); on app foreground; on network recovery; and immediately after a grant changes.
- **Change detection:** stores a hash of the last published JSON per item in AsyncStorage (`daykindle.accountability.published.v1`) and skips unchanged items.
- **Failure:** keeps the pending set and retries with the same triggers as entity sync. A small "Partners will see this when you're back online" line appears on the share screen if a publish is pending for more than 10 minutes.
- **Multiple devices:** whichever device publishes last wins. The `version` column only orders updates; it does not detect conflicts. That is acceptable because the payload is derived data, and the next publish from the up-to-date device corrects it. If planner sync is off on one device, that device's view of progress can differ. The share screen says which device last published.

### B7. Mobile UI

| Route (Expo Router, `src/app/`) | Who | Purpose |
| --- | --- | --- |
| `partners/index.tsx` | Both | Two sections: **People supporting you** (manage sharing, nudges on or off, end) and **People you support** (read-only cards with nudge buttons). Empty state explains the feature and offers **Invite someone**. |
| `partners/invite.tsx` | Owner | Age confirmation (once), "What should they call you?", then the system share sheet with the invite link. Lists open invites with expiry and **Cancel**. |
| `partners/accept.tsx` | Partner | Opened from the invite link. If signed out, it shows sign-in first and then returns. Confirms "{owner_label} would like your support", asks for the partner's display name, and offers **Accept** or **Not now**. |
| `partners/[partnershipId].tsx` | Owner | Per-item sharing: toggle each commitment or goal, **Show progress**, **Show misses**, an editable share title, and a **live preview card rendered exactly as the partner will see it**. |
| `partners/view/[partnershipId].tsx` | Partner | Shared items with pace, last update ("Updated 2 days ago"), and four preset nudge buttons. A disabled state explains the daily limit. |
| Commitment card action | Owner | **Share with a partner** opens the sharing screen with that item preselected. |

**Deep links:**
- `mobile-app/app.json` currently declares only the legacy schemes `dayweave` and `daymark`. Add `daykindle` so the in-app link is `daykindle://partners/accept?token=…`.
- The shared link should be an HTTPS universal or app link on the marketing domain, for example `https://<site>/partner?token=…`. The marketing site serves a fallback page ("Open in DayKindle" / store badges) plus `apple-app-site-association` and `assetlinks.json`. It needs `ios.associatedDomains` and Android `intentFilters` in `app.json` and a rebuilt native client.
- The fallback page must not log or forward the token, so configure analytics to drop the query string. Marketing analytics already disables autocapture, but check that page-view URLs exclude the query.

**Accessibility:** nudge buttons announce "Send '{text}' to {name}". Pace is never shown by color alone. The preview card is a real component, not an image, so screen readers read it.

### B8. Analytics (content-free)

| Event | Properties |
| --- | --- |
| `partner_invite_created` | `open_invites` (count) |
| `partner_invite_accepted` | none |
| `partner_share_changed` | `item_kind`, `shared`, `show_progress`, `show_misses` |
| `partner_nudge_sent` | `kind` |
| `partner_nudge_opened` | `kind` |
| `partnership_ended` | `ended_by_role` (`owner` or `partner`), `days_active_bucket` |

No labels, titles, tokens, or user IDs of the other person appear in properties.

### B9. Tests

- **pgTAP** in `supabase/tests/accountability_partners.test.sql`, the first database test in the repository; run with `supabase test db`:
  - anon cannot execute any function;
  - an invite cannot be accepted twice, after expiry, by the owner, or without adult confirmation;
  - the partner view hides progress and miss fields when the grant flags are false;
  - a third user sees nothing;
  - publishing an ungranted item stores nothing, and extra keys such as `why` or `consequence` are dropped;
  - a fourth nudge within 24 hours raises;
  - ending a partnership removes the partner's view immediately and deletes orphaned projections;
  - deleting a user cascades.
- **Unit (`node:test`):** the projection builder never emits fields outside the allow-list. It maps custom reasons to `other` and excludes `private` from the breakdown.
- **Device:** a two-simulator walk-through of invite, accept, share with preview, publish, partner view, nudge, quiet-hours queueing, end, and sign-out device revocation.

**Stage B exit evidence:** pgTAP suite passing locally; security review of the migration and Edge Function; push delivered on a physical iOS and Android device; deletion cascade verified on a disposable project; privacy policy and in-app notices updated (they currently say nothing about sharing with other people).

---

## 5. Stage C — DayKindle as a partner (summary)

The service tier adds a `role` value for DayKindle-operated partners. The `role` check gains `'service'` and, later, `'coach'`. A human coach is then a partnership whose grants the user sets in the same sharing screen, with the same preview. The AI check-in service reads the user's own projection plus a weekly summary the user approves. Details, billing, and the service engine are in [services/IMPLEMENTATION_PLAN.md](../services/IMPLEMENTATION_PLAN.md) and [SaS-Next-Steps.md](../../../SaS-Next-Steps.md).

A coach **must not** use the internal team dashboard. `AGENTS.md` forbids planner content in internal dashboard views. Coaches get their own surface that sees only what each client shared with them.

---

## 6. Decisions and trade-offs

| # | Decision | Chosen | Alternative | Why |
| --- | --- | --- | --- | --- |
| 1 | What partners read | Device-published projection | Read-only RLS on `planner_entities` | Planner rows hold free text in JSON. RLS cannot strip fields, and sharing would then require full sync. |
| 2 | Field filtering | One `security definer` view function | Per-partner projections | One publish per item, and filtering lives in one tested place. |
| 3 | Relationship shape | Directional (owner to partner) | Symmetric pairs | Each person controls their own sharing; mutual support is two rows. |
| 4 | Nudge content | Four presets | Free-text messages | Removes most harassment and moderation risk in v1. Revisit with block/report data. |
| 5 | Push path | Edge Function send plus cron sweep | pgmq queue | Low volume and best-effort. pgmq is deferred to Stage C. |
| 6 | Age policy | 18+ confirmation for partner features | Open to 13+ | Contact between adults and minors needs a policy and possibly guardian consent. Owner decision. |
| 7 | Intensity | Changes timing and wording only | Penalties or stakes | PRD non-goals and product principles. |
| 8 | Test runner | `node --test` with Node type stripping | Add Jest | No new dependency. It works for dependency-free modules (verified on Node 22.23.4). |

## 7. Documentation to update when work lands

- This feature's [current state](CURRENT_STATE.md) after each stage.
- [Feature inventory](../FEATURE_INVENTORY.md): commitments, partners, and push rows.
- [Data flow](../../architecture/DATA_FLOW.md) and [system overview](../../architecture/SYSTEM_OVERVIEW.md): the new sharing boundary, tables, Edge Function, and cron job.
- [Security audit](../../audits/SECURITY_AUDIT.md): the new cross-user access path.
- `mobile-app/PRODUCT.md`: the "do not claim social accountability" line changes only after Stage B passes its exit evidence.
- Privacy policy and terms in `marketing/src/routes/`.
