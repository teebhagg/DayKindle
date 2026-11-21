# Security audit

**Reviewed:** 2026-10-27  
**Scope:** Static review of client configuration patterns, Supabase migrations/functions, dashboard access code, and analytics call sites. No dependency vulnerability scan, live policy test, penetration test, or production configuration review was performed.

## Controls present in source

- The mobile client uses the Supabase publishable key. The service-role key is read only in the `delete-account` Edge Function; the dashboard PostHog personal API key is server-side.
- The account-deletion function validates the bearer token with Supabase Auth before using the service-role client to delete that same user.
- `planner_snapshots` and `planner_entities` enable row-level security and bind row access to `auth.uid()`. Snapshot writes use a revision-checked function. Entity mutations use an authenticated SQL function that validates payload bounds and collection names, locks per user, and returns bounded change pages.
- Dashboard access requires a confirmed user plus membership in `dashboard_admins`. The database aggregate function checks that membership, uses an empty search path, and exposes aggregate counts rather than planner rows.
- Reviewed app analytics calls send event metadata without user-entered planner titles or reflection text. Mobile screen analytics use known static route names. Marketing disables autocapture and session replay in its current component.

## Findings and follow-up

| Priority | Finding | Action |
| --- | --- | --- |
| P1 | Source controls do not prove that deployed policies, RPCs, credentials, or Edge Functions match this checkout. | Before release, verify the exact Supabase project and deployed migration/function state using an authorized read-only check, then run account-scoped policy tests. |
| P1 | Synced planner state includes personal notes and reflection text and is not end-to-end encrypted according to the product docs. | Keep this limitation clear in consent/privacy copy. Confirm the hosting project's access, backup, retention, and encryption settings with current provider configuration. |
| P2 | The initial dashboard-admin migration seeds membership by a hard-coded email address. | Review that seed before deploying to a fork or another environment; use an explicit trusted provisioning process appropriate to that environment. |
| P2 | Analytics identity is tied to the Supabase user ID when a user signs in. | Confirm retention, access, deletion, and consent expectations in the configured PostHog project. Keep personal content out of future event properties. |
| P2 | The account-deletion and sync recovery paths have not been exercised against a live project in this audit. | Verify deletion cascades and conflict recovery with a disposable account before a production release. |

## Scope limits

No confirmed exploitable vulnerability is established by this static pass. It also does not establish data-at-rest encryption on user devices, third-party provider configuration, secrets rotation, auth rate limits in a hosted project, or legal compliance. Treat this file as a source review, not a security certification.
