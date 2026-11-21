# Accounts and sync — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** protects data or privacy, or unblocks partners and services; **P2** reduces risk or friction; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects and risks

### A1. Protect against uploading another person's planner on a shared device — P1, M

- **Evidence:** **Inferred** — sign-out keeps the planner on the device; a different account that then signs in and consents uploads it (`handleProviderSignIn()` in `app/index.tsx`, `enablePlannerSync()` in `home-screen.tsx`).
- **User benefit:** nobody's goals or reflections end up in someone else's account by accident.
- **Approach:** record `lastSyncedUserId` with the local planner. When a different user signs in and the local planner has data, ask: "This device has a planner from another account. Start fresh for this account (the current planner is kept as a recoverable copy) / Use this planner with this account." Default to start fresh.
- **Risk:** extra step for the common "same person, new account" case. Keep the copy short.
- **Tests:** sign in as A with data, sign out, sign in as B → prompt; sign in as A again → no prompt.

### A2. Prune recovery copies — P2, S

- **Evidence:** **Verified** — `clearRecoverySnapshots()` has no caller; every conflict and fresh start adds a full planner copy.
- **Approach:** keep the newest 5 per kind and anything under 30 days; prune after a successful sync or on startup. Never prune the only copy for an unresolved conflict.
- **Tests:** 0, 5, 6, and 20 copies; an unresolved conflict copy older than 30 days survives.

### A3. Don't let one unreadable server row block every device — P2, S

- **Evidence:** **Verified** — `fetchRemoteEntities()` throws on the first row that fails `parseServerEntity()`.
- **Approach:** skip and count unreadable rows, keep their keys out of the diff so they are never overwritten, and report "Some items from your account couldn't be read on this version" with a category count.

## B. Refine existing capabilities

### B1. Show what differs in a conflict — P2, M

- **Evidence:** **Verified** — `entityConflictChoice()` shows only the item's title.
- **Approach:** a sheet that lists changed fields (name, date, status, target) side by side for the common collections, falling back to "changed on another device" for others. Keep the three choices.
- **Tests:** snapshot of the field list for each collection type.

### B2. Make the first-run consent copy match Profile — P2, S

- **Evidence:** **Verified** — the Profile alert lists every synced category; the first-run dialog says only "sync your planner to this account".
- **Approach:** one shared string listing categories, plus "Synced data is stored on our servers and is not end-to-end encrypted."

### B3. Reduce redundant sync runs — P3, S

- **Evidence:** **Inferred** — the auto-sync effect depends on the whole `planner` object.
- **Approach:** depend on a stable `plannerRevision` counter that increments on saved changes, and debounce to about 2 seconds.
- **Measure first:** count RPC calls during a 5-minute editing session before and after.

## C. New capabilities

### C1. Export my data — P1, M

- **Why:** people should be able to keep what they wrote, and it is expected before any paid tier (privacy and app-store review).
- **Approach:** "Export my planner" in Profile produces a JSON file (and a readable CSV of occurrences) through the share sheet, from local data, so it works for Guests and offline.
- **Guardrail:** generated on device; never uploaded.

### C2. Protocol test harness — P1, L

- **Evidence:** **Verified** — no tests for the sync engine; the engine takes the client and callbacks as parameters.
- **Approach:** a fake client implementing `from().select().range()` and `rpc('sync_planner_mutations')` against an in-memory server model with versions, change ids and receipts. Cover idempotent retry, paging, tombstones, each conflict choice, "decide later", legacy bootstrap, and account switching.

### C3. Database tests for RLS and the RPC — P1, M

- **Evidence:** **Verified** — no SQL tests; isolation is asserted by reading SQL only.
- **Approach:** pgTAP (or plain SQL scripts run with `supabase test db`) on a local stack: user A cannot read or write B's rows through the table or the RPC; `anon` cannot call the RPC; batch and id limits raise; deleting a user removes rows in all three tables.

### C4. Record the deployed state — P1, S

- **Evidence:** **Needs Validation** — no hosted project was compared with this checkout (SaS-Next-Steps T0.4).
- **Approach:** read-only queries for migration history, policies, function definitions and Edge Function versions, saved to `docs/audits/` with the date.

### C5. Email sign-in — P3, M

- **Why:** some people have neither Google nor Apple accounts, or prefer not to link them.
- **Approach:** Supabase email OTP (no passwords). Requires a deep-link scheme (SaS-Next-Steps T0.7).

## Measurement

Aggregates only: share of signed-in users with sync on; sync runs by outcome (`synced`, `offline`, `conflict-pending`, error); conflicts per 100 sync runs and how they were resolved (device, account, later). These come from the existing `planner_sync_*` logs plus a categorical conflict-choice field. Never titles.
