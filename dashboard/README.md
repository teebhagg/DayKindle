# DayKindle internal analytics dashboard

Private team dashboard built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth, and PostHog's Query API.

## Local development

```sh
npm install
npm run dev
```

The dashboard runs at `http://localhost:3001`; the marketing app uses port `3000`.

Copy `.env.example` to `.env.local`. Disable public sign-up in Supabase and provision a confirmed Auth account. Apply `supabase/migrations/20261008151300_dashboard_admins.sql`; dashboard access requires a matching row in `public.dashboard_admins`, which the migration grants only to that user's own authenticated session. Add any later admins to the table through a trusted Supabase admin path.

The PostHog personal API key stays server-side and needs the `query:read` scope. Set its API host separately from the mobile ingestion host. The dashboard returns aggregates only and filters all product metrics to `app_environment=production`.

This directory is independently installable and buildable. Hosting, domain protection, Supabase project configuration, and PostHog credentials remain deployment setup.
