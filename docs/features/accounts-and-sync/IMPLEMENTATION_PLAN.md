# Accounts and sync — implementation plan

**Created:** 2026-11-13
**Status:** Proposed. No implementation is authorized by this document. Nothing described as "new" exists in source yet.
**Companion documents:** [current state](CURRENT_STATE.md), [improvements](IMPROVEMENTS.md), [SaS execution plan](../../../SaS-Next-Steps.md), [accountability plan](../accountability/IMPLEMENTATION_PLAN.md).

## 1. Why this order

Partners and paid services build on accounts. Before anything is shared with another person, the team needs proof that one account cannot see another's data, a record of what is actually deployed, and a sync engine covered by tests. Those come first; user-facing refinements follow.

| Step | Improvement | Depends on | Server change? |
| --- | --- | --- | --- |
| AS1 | C4 — record deployed state (read-only) | Owner access to the project | No |
| AS2 | C3 — RLS and RPC tests on a local stack | AS1 | Tests only |
| AS3 | C2 — sync protocol harness | SaS-Next-Steps T0.2 | No |
| AS4 | A1 — shared-device protection | AS3 | No |
| AS5 | A2, A3 — prune recovery copies; tolerate unreadable rows | AS3 | No |
| AS6 | B1, B2 — conflict diff sheet; consistent consent copy | AS3 | No |
| AS7 | C1 — export my planner | — | No |
| AS8 | B3 — debounce sync (after measuring) | AS3 | No |
| AS9 | C5 — email OTP sign-in | T0.7 deep links, owner decision | Auth settings |

## 2. Decisions needed

1. **Shared-device default (A1):** recommended "start fresh for the new account and keep the old planner as a recoverable copy".
2. **Recovery retention (A2):** recommended newest 5 per kind plus anything under 30 days.
3. **Export format (C1):** recommended one JSON file with all collections and a CSV of occurrences.
4. **Email sign-in (C5):** whether to offer it at all, and whether it is OTP-only.

## 3. Work packages

### AS1 — Deployed-state record

- **Output:** `docs/audits/DEPLOYED_STATE_<date>.md` listing migration history (`supabase migration list` and `select * from supabase_migrations.schema_migrations`), RLS policies on `planner_entities`, `planner_snapshots`, `dashboard_admins`, `daily_plan_catalog`, function definitions for `sync_planner_mutations` and `dashboard_database_metrics`, and Edge Function versions.
- **Rules:** read-only queries; no `db push`. The daily-planning review already noted the remote has no migration-history table and that a broad push is unsafe until reconciled.
- **Done when:** every local migration is marked present, absent, or different on the hosted project.

### AS2 — Database tests

- **Files (new):** `supabase/tests/planner_entities_rls.sql`, `supabase/tests/sync_rpc_limits.sql`, `supabase/tests/account_delete_cascade.sql`.
- **Cases:** cross-user select returns zero rows; the RPC writes only the caller's rows whatever ids are passed; `anon` gets permission denied; batch of 101, id of 301 characters, `p_limit` 0 and 501 all raise; deleting an auth user removes rows from `planner_entities`, `planner_entity_changes`, and `planner_mutation_receipts`.
- **Run:** `supabase start` then `supabase test db` from the repository root.
- **Done when:** all pass locally; results recorded with the date.

### AS3 — Sync harness

- **Files (new):** `mobile-app/src/features/account/entity-sync-service.test.ts`, `mobile-app/src/features/account/test/fake-planner-server.ts`.
- **Prerequisite:** `entity-sync-service.ts` imports storage from `home-storage.ts` (SQLite). Inject `readSnapshot`, `writeSnapshot` and `saveRecoverySnapshot` through an optional `storage` parameter with today's functions as defaults, so tests use an in-memory map.
- **Cases:** first sync with empty server; first sync with server data and empty device; both non-empty (snapshot conflict); entity conflict with each choice; "decide later" then retry; delete → tombstone → second device removes; 1,200 entities (three pages); RPC failure mid-batch leaves mutations `failed` and retried once; duplicate mutation id returns the stored receipt; account switch uses separate stores.
- **Done when:** cases pass under `npm run test:unit`; no behavior change in source.

### AS4 — Shared-device protection

- **Model:** add `lastSyncedUserId: string | null` to the onboarding profile (normalization defaults it to `syncConsentUserId`).
- **Flow:** in `handleProviderSignIn()` and `enablePlannerSync()`, if the planner has data and `lastSyncedUserId` is set and differs from the new user, show the A1 choice before consent. "Start fresh" calls `startFreshGuestData()` (which already archives the planner) and then continues.
- **Done when:** AS3 harness covers both choices; manual run on one device with two test accounts.

### AS5 — Recovery pruning and tolerant bootstrap

- **Pruning:** `pruneRecoverySnapshots({ keepPerKind: 5, keepDays: 30, protectIds })` in `home-storage.ts`; called after a successful sync and on startup. Conflict copies referenced by a pending conflict are protected.
- **Tolerant bootstrap:** in `fetchRemoteEntities()`, collect unreadable rows into a `skipped` list; exclude their keys from diffs; surface a count in Profile.
- **Done when:** unit tests for pruning boundaries and a harness case with one malformed row.

### AS6 — Conflict diff and consent copy

- **Conflict sheet:** replace the alert in `entityConflictChoice()` with a bottom sheet driven by a pure `describeEntityDiff(collection, local, cloud)` that returns labeled before/after pairs for `plans`, `entries`, `taskDefinitions`, `habitDefinitions`, `commitments`, and `reminders`.
- **Copy:** one exported `SYNC_CONSENT_COPY` used by `app/index.tsx`, `sync-consent-dialog.tsx`, the guest tray, and Profile.
- **Done when:** unit tests for `describeEntityDiff`; VoiceOver and TalkBack read the sheet in order.

### AS7 — Export

- **Files (new):** `mobile-app/src/features/account/export-planner.ts` (pure builder) and a Profile action using `expo-sharing` and `expo-file-system` (install with `npx expo install`).
- **Content:** every collection from `createPlannerSnapshot()` plus `exportedAt` and the schema version. No auth tokens.
- **Done when:** a seeded planner exports and re-imports into the normalizer without loss (unit test).

### AS8 — Debounced sync

- Measure RPC calls during a scripted 5-minute edit session first. Then add a `revision` counter to the session and debounce `syncNow` by about 2 s. Keep the network and app-active triggers.

### AS9 — Email OTP sign-in (optional)

- Enable email OTP in Supabase Auth; add an email entry and code screen; route the magic link through the `daykindle` scheme. Consent flow is unchanged.

## 4. Rollout and rollback

- AS1–AS3 are tests and documentation; no user impact.
- AS4–AS8 ship in app builds. New optional fields are ignored by older builds. Rollback is a previous build.
- AS9 changes provider settings; turning the provider off is the rollback.

## 5. Exit evidence

- Database tests and the sync harness pass and are recorded with the date.
- Two-device manual run on iOS and Android: consent, sync, conflict (each choice), decide later, delete on one device, sign out, second account on the same device, account deletion.
- [Current state](CURRENT_STATE.md) updated, including what was verified on the hosted project.
