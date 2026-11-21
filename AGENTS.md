# Project guidance

## Repository map

- `mobile-app/` is the DayKindle Expo and React Native app. Its local-first planner is the primary product surface.
- `marketing/` is the public TanStack Start website.
- `dashboard/` is the private Next.js aggregate analytics dashboard.
- `supabase/` contains shared database configuration, migrations, and Edge Functions.
- `docs/` contains the current architecture, feature, and audit knowledge base. `docs/superpowers/` and the root product/requirements documents record design intent; confirm behavior in the current source before treating a requirement as implemented.

## Working rules

- Inspect `git status` before editing. Preserve unrelated staged, modified, and untracked work.
- Keep app-specific commands inside that app's directory. Run Supabase CLI commands from the repository root.
- Never put service-role credentials, PostHog personal API keys, OAuth secrets, or other server credentials in a client bundle, `.env.example`, or documentation.
- Distinguish source inspection, automated checks, simulator/device behavior, remote schema state, and production delivery. Claim only evidence actually collected.
- Update the relevant files in `docs/` when a change alters an architecture seam, persistence or sync behavior, privacy property, or user-visible feature. Mark planned work separately from shipped behavior and include a review date.
- Treat planner notes, goals, check-ins, commitments, and reflections as personal data. Do not add their content to analytics or internal dashboard views.
- The app allows local Guest use. Cloud sync requires a signed-in account and explicit consent; do not silently enable it.

## Git commit governance

- Do not stage, commit, or push automatically. Ask the user for explicit approval before preparing or initiating a commit.
- Before asking, present a proposal with: (1) intent, (2) the exact file list proposed for staging and each file's change, and (3) the exact Conventional Commit message using `feat`, `fix`, `refactor`, `style`, `docs`, `test`, or `chore`.
- Wait for the user's approval before running any staging or commit command. Pushes also require explicit approval.
