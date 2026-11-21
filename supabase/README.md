# Supabase setup

The app syncs planner records by entity through `public.planner_entities`. A device keeps a durable, per-account mutation outbox and per-entity metadata for creation, local/server update time, deletion time, and `local`, `pending`, `synced`, `conflict`, or `failed` status. `sync_planner_mutations` applies idempotent batches with per-entity version checks and returns changes after the saved cursor. Independent items merge automatically. A same-item edit from another device prompts the user to keep the device copy, use the account copy, or decide later; both full copies are saved locally for recovery.

`public.planner_snapshots` and `save_planner_snapshot` remain as a one-time compatibility path for accounts created by earlier app builds. The first entity sync reconciles the old snapshot before seeding entity records. Row-level policies restrict entity reads to `auth.uid()`, while all writes go through the authenticated mutation RPC.

## Configure and deploy

1. Create a Supabase project and copy its URL and publishable key into `mobile-app/.env.local` using the names in `.env.example`.
2. From the repository root, run `npx supabase link --project-ref <project-ref>` and `npx supabase db push`. The CLI reads this directory's `config.toml` from there.
3. Enable Google and Apple Auth providers. Configure the iOS bundle ID `com.daykindle.app` for native Apple Sign-In and add `dayweave://auth/callback` to the Auth redirect allow list for native Google OAuth. Keep `daymark://auth/callback` allowed during the transition for already-installed builds.
4. Deploy the account deletion function with `npx supabase functions deploy delete-account`. Keep `SUPABASE_SERVICE_ROLE_KEY` in the Edge Function environment only.

The mobile app uses only the publishable key. The entity table grants authenticated users read access guarded by RLS; direct writes are revoked. The sync RPC verifies the caller, serializes each account's mutation batch, checks each entity's base version, and records idempotency receipts plus a pull cursor. Account deletion cascades through snapshots, entities, mutation receipts, and change history. The Edge Function validates the caller before using the admin API to delete that caller's Auth user.

## Shared daily plan

Apply the `daily_plan_catalog` migration and deploy `npx supabase functions deploy daily-plan`. The public `GET` endpoint serves the current shared plan; the app caches valid responses on-device and can use the last cached or bundled plan offline. The table is not directly accessible to client roles.

Dashboard administrators can update the plan through `PUT /functions/v1/daily-plan` using their Supabase access token and the project publishable key. First call `GET`, then send the returned `revision` as `expectedRevision` and the full edited `templates` array in the JSON body. Each block must use a time range like `06:30 AM – 07:15 AM` and one or more `• ` bullet lines in `details`. The endpoint returns the next revision; a stale revision returns `409`. No service-role key belongs in the client. There is no admin editing screen yet; the Edge Function is the server update interface.
