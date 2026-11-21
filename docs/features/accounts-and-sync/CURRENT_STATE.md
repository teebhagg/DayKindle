# Accounts and sync — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No sign-in, sync, conflict, or deletion flow was exercised, and no hosted Supabase project was queried in this pass.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

Lets a person keep using DayKindle as a Guest on one device, or sign in and choose to copy their planner to their account so it is backed up and available on other signed-in devices. Sync is opt-in, per account, and recoverable when two devices disagree.

## 2. Target user and expected outcome

- **Guest:** wants a private planner with no account. Outcome: everything works locally; nothing leaves the device except optional, content-free analytics.
- **Signed-in user:** wants a backup or a second device. Outcome: after explicit consent, goals, actions, routines, check-ins, reflections, commitments and reminders follow them; conflicts are never resolved silently.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Continue as Guest | **Verified** | Welcome/account step in `app/index.tsx`; `continueAsGuest()` signs out any session and keeps local data. |
| Google sign-in (iOS, Android) | **Verified** | `signInWithGoogle()` in `auth-service.ts`: native One Tap via `react-native-nitro-google-signin`, SHA-256 nonce, `signInWithIdToken`. Needs `GoogleServices-Info.plist` and `google-services.json` and a native rebuild. |
| Apple sign-in (iOS only) | **Verified** | `signInWithApple()`; stores the full name on first sign-in with `updateUser`. |
| Web sign-in | **Not found (disabled)** | `supabaseConfigured` is false on web (`supabase-client.ts`). |
| Email/password sign-in in the app | **Not found** | Only Google, Apple and Guest. (The dashboard uses email/password; see [analytics and dashboard](../analytics-and-dashboard/CURRENT_STATE.md).) |
| Explicit sync consent at sign-in | **Verified** | `requestSyncConsent()` shows "Sync your planner?" (Alert on iOS, `SyncConsentDialog` modal on Android). Consent stores `syncConsent`, `syncConsentAt` and `syncConsentUserId`. |
| Turn sync on or off later in Profile | **Verified** | `enablePlannerSync()` lists every synced category in its message; `confirmDisablePlannerSync()` clears consent. |
| Guest → account from Profile | **Verified** | `guest-workspace-sign-in-tray.tsx`: choose provider, confirm a display name, then "Confirm name and sync planner" or "…keep planner on this device". |
| Restore a returning account's setup | **Verified** | `hasSavedCloudOnboarding()` checks `planner_entities` settings rows, then the legacy `planner_snapshots` table, and skips onboarding when found. |
| Entity sync (automatic) | **Verified** | `AccountProvider` runs `syncNow()` 700 ms after the gate opens, when the network returns, and when the app becomes active. |
| Manual "Sync now" and sync status | **Verified** | Profile shows syncing, up to date, offline, conflict, or error, with a "Sync now" button and "Try sync again" on error. |
| Per-item conflict choice | **Verified** | `entityConflictChoice()`: "Keep device version", "Use account version", "Decide later". The item stays queued; other items keep syncing. |
| Whole-planner conflict on first sync | **Verified** | `conflictChoice()` when a legacy snapshot and local data both exist. Both copies are saved as recovery snapshots first. |
| Restore a conflict copy later | **Verified** | Profile "Planner conflict backup" with "Restore device copy" / "Restore account copy"; the current planner is saved as another copy first. |
| Restore earlier guest data | **Verified** | `restoreArchivedGuestData()` from Profile "Earlier guest data". |
| Sign out | **Verified** | Local sign-out (`scope: 'local'`); the planner stays on the device and consent is cleared. |
| Delete account | **Verified** | `delete-account` Edge Function deletes the auth user with the service role; rows cascade (`on delete cascade`); then local data is erased. Guests get "Erase my data". |
| Data export | **Not found** | No export or download of planner data. |
| End-to-end encryption | **Not found** | Synced rows are plain `jsonb`. The consent copy does not mention it. |

## 4. Screens, components, state and persistence

- **Screens:** `app/index.tsx` (welcome, account step, onboarding), `app/auth.tsx` (re-exports the same route for `/auth`), Profile tab in `features/home/home-screen.tsx`.
- **Components:** `welcome-auth-screen.tsx`, `guest-workspace-sign-in-tray.tsx`, `sync-consent-dialog.tsx` (Android only), `apple-auth-button.tsx`, `profile-identity.tsx`.
- **State:** `AccountProvider` in `account-provider.tsx` (`user`, `syncStatus`, `syncError`, sign-in/out, delete, `syncNow`). Consent lives in the planner's `onboarding` profile.
- **Sync engine:** `entity-sync-service.ts` (format 2). A per-user local store `daymark.sync.entities.v2.<userId>` holds a mirror of every server entity, the cursor, and pending mutations, saved as one JSON value in SQLite `storage_metadata`. `sync-service.ts` is the legacy whole-snapshot protocol, used only for first-time bootstrap.
- **Auth session:** Supabase client with AsyncStorage, PKCE, auto-refresh only while the app is active.
- **Server:** `public.planner_entities` (primary key `user_id, collection, entity_id`; RLS select-own only; writes only through `public.sync_planner_mutations`), private `planner_entity_changes` change feed and `planner_mutation_receipts` for idempotency, legacy `public.planner_snapshots` with `save_planner_snapshot`.
- **Synced collections (12):** `plans`, `lifeAreas`, `entries`, `taskDefinitions`, `habitDefinitions`, `goalProgressEvents`, `daySchedules`, `reflections`, `checkIns`, `commitments`, `reminders`, `settings` (`visualStyle`, `selectedDate`, `onboarding`, `onboardingCompleted`).

## 5. Business rules, validation and calculations

- **Sync gate (Verified):** a signed-in user, completed onboarding, `syncConsent === true`, `syncConsentUserId === user.id`, and local storage status `ready`. Any mismatch means no sync.
- **Diffing (Verified):** each run diffs the current planner against the local mirror and queues one mutation per changed entity, with `baseVersion` from the mirror.
- **Batches (Verified):** up to 100 mutations per RPC call and up to 500 changes per page; the loop stops after 1,000 rounds. The RPC rejects larger batches, ids over 300 characters, and mutation ids over 160.
- **Conflict (Verified):** the server returns `conflict` when `baseVersion` is stale. If both sides already match, the conflict clears silently. Otherwise the user chooses. "Decide later" defers that key until "Sync now" retries with `retryConflicts`.
- **Deletes (Verified):** removed local items become tombstones (`is_deleted`, `deleted_at`, `data` null).
- **Bootstrap (Verified):** first sync for an account reads all server rows (500 per page). A `settings/syncSchemaVersion` marker selects entity bootstrap; otherwise the legacy snapshot path runs. A newer marker version stops sync with "uses a newer sync format".
- **Consent copy (Verified):** "Your goals, life areas, tasks, habits, routines, commitments, reminders, progress history, check-ins, and reflections will be saved to your account and available on your other signed-in devices."
- **Analytics identity (Verified):** `posthog.identify(user.id)` on sign-in and `posthog.reset()` on sign-out. The Supabase user UUID becomes the PostHog distinct id.

## 6. Loading, empty, success, error and offline states

- **Loading:** the welcome route holds its splash while it checks for a saved cloud setup, and Profile shows "Checking your account…" while the auth session loads; a failed setup check shows "Could not check your saved setup — Retry before starting onboarding". **Verified.**
- **Success:** "Your planner is up to date." **Verified.**
- **Offline:** outcome `offline`; pending changes stay queued in the local store; retried when the network returns. **Verified.**
- **Error:** `syncStatus: 'error'` with "Could not sync your planner. Your local data is still available." and a retry action. A failed batch marks its mutations `failed` and keeps them. **Verified.**
- **Not configured:** "Guest mode is ready. Account sign-in is not configured on this build." **Verified.**

## 7. Dependencies

Supabase Auth (Google and Apple providers), the `sync_planner_mutations` RPC and its migration, the `delete-account` Edge Function and its service-role secret, `expo-network`, `expo-crypto`, `expo-apple-authentication`, `react-native-nitro-google-signin`, the planner session (`home-session.tsx`, `planner-snapshot.ts`), local storage (`home-storage.ts`), and PostHog for identity and sync logs (`planner_sync_finished`, `planner_sync_failed` with outcome flags only).

## 8. Functional limitations and confusing flows

- Conflict prompts name the item by its title or label ("Choose which version of '<title>' to keep"), but do not show what differs. **Verified.**
- Sync runs whenever the planner object changes identity while the gate is open (the effect depends on `planner`), so it re-arms its 700 ms timer after each edit. **Inferred** from the effect dependencies; network cost not measured.
- On a shared device, after user A signs out, the planner stays local. If user B signs in and consents, A's local planner becomes B's synced planner. The consent prompt does not mention that the current device data will be uploaded. **Inferred** from `handleProviderSignIn()`.
- Recovery copies (`daymark.recovery.v1.*`) are never pruned: `clearRecoverySnapshots()` has no caller. **Verified.**
- Web has no sign-in or sync. **Verified.**

## 9. Defects and failure modes

- **Inferred:** the whole local mirror (all entities) is serialized into one SQLite value and rewritten several times per sync run (`saveStore` after each phase). Large histories increase write cost; not measured.
- **Inferred:** a server row that fails `parseServerEntity()` stops the whole bootstrap ("The cloud planner contains an unsupported entity"). One bad row blocks every device for that account.
- **Needs Validation:** account deletion relies on `on delete cascade` from `auth.users`; the cascade on the hosted project, and the private change and receipt tables, were not checked (TD-05).
- **Needs Validation:** behavior when an access token expires mid-sync, and when two devices sync at the same moment (the RPC takes a per-user lock in SQL; not exercised).
- **Verified risk:** synced planner text is not end-to-end encrypted; anyone with database access (service role, dashboard SQL editor) can read it.

## 10. Performance, accessibility, security and testability

- **Security (Verified in SQL):** clients get `select` on their own rows only; writes go through a bounded `security definer` RPC; the private schema is revoked from `anon` and `authenticated`. The service role appears only in `delete-account`. Live policies are **Needs Validation**.
- **Privacy:** sync is opt-in and per account. The full set of synced categories is listed in the Profile consent copy; the first-run consent copy is shorter and does not list them. **Verified.**
- **Accessibility:** the Android dialog uses `accessibilityViewIsModal` and button labels; iOS uses a system alert. Screen-reader behavior is **Needs Validation**.
- **Testability:** no protocol, RLS, or RPC tests exist (TD-03, TD-04). The sync engine takes the Supabase client and choice callbacks as parameters, so a fake client harness is feasible.

## 11. Missing capabilities and requirements to confirm

- Data export (a copy of everything the user wrote).
- A "this device has data from another account" warning before upload.
- Showing what differs in a conflict.
- A retention policy for recovery copies and tombstones.
- Whether end-to-end encryption is a future requirement (it would block server-side features such as partner projections built on the server).
- Email sign-in for people without Google or Apple accounts.

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): a protocol test harness, RLS tests, shared-device protection, conflict diffs, recovery-copy pruning, export, and a deployed-state record.

## Source map

- [Account provider, consent gate, conflict prompts](../../../mobile-app/src/features/account/account-provider.tsx)
- [Google and Apple sign-in](../../../mobile-app/src/features/account/auth-service.ts)
- [Supabase client](../../../mobile-app/src/features/account/supabase-client.ts)
- [Entity sync protocol](../../../mobile-app/src/features/account/entity-sync-service.ts)
- [Legacy snapshot protocol](../../../mobile-app/src/features/account/sync-service.ts)
- [Android consent dialog](../../../mobile-app/src/features/account/sync-consent-dialog.tsx)
- [Guest sign-in tray](../../../mobile-app/src/features/account/guest-workspace-sign-in-tray.tsx)
- [Welcome and account step](../../../mobile-app/src/app/index.tsx)
- [Recovery copies and local tables](../../../mobile-app/src/features/home/home-storage.ts)
- [Entity sync migration](../../../supabase/migrations/20261005151602_planner_entity_sync.sql)
- [Legacy snapshot migration](../../../supabase/migrations/20261004185306_planner_snapshot_sync.sql)
- [Account deletion function](../../../supabase/functions/delete-account/index.ts)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Onboarding and profile](../onboarding-profile/CURRENT_STATE.md) · [Data flow](../../architecture/DATA_FLOW.md) · [Security audit](../../audits/SECURITY_AUDIT.md)
