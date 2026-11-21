# DayKindle web apps

This repository contains three app surfaces and one shared Supabase project:

- `mobile-app/`: DayKindle Expo app.
- `marketing/`: public DayKindle site built with TanStack Start.
- `dashboard/`: private team analytics app built with Next.js.
- `supabase/`: shared Supabase configuration, migrations, and Edge Functions.

Run package-manager commands from the selected app directory. Configure each hosting project with that directory as its root. Run Supabase CLI commands from the repository root so they use `supabase/config.toml`.

For local development, the marketing site uses `http://localhost:3000` and the dashboard uses `http://localhost:3001`, so both can run at once.
