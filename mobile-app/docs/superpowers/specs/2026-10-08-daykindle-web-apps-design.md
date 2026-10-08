# DayKindle Web Apps Design

## Goal

Create two independent web apps for DayKindle: a public, SEO-focused marketing site and a private product analytics dashboard for the internal team. Keep the Expo mobile app as the product source of truth and preserve its current in-progress changes.

## Architecture

- `marketing/`: TanStack Start, React, TypeScript, Tailwind CSS, shadcn/ui, and Motion for React. Use server rendering for the public route and provide page metadata, canonical URL, Open Graph metadata, `robots.txt`, and `sitemap.xml`.
- `dashboard/`: Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui. Keep the app separately installable and deployable.
- Both apps use the DayKindle Satoshi typography, warm light palette, and squircle geometry from the mobile product. Each app owns its package manifest, lockfile, and environment configuration. No root workspace or Expo package changes are required.

## Marketing experience

- Build a concise landing page that explains the supported product: plan goals, tasks, habits, and routines; review recorded activity; adjust plans when a day changes.
- Keep copy practical and non-punitive. Do not claim that sign-in, cloud sync, coaching, social accountability, behavior detection, guaranteed results, or accessibility readiness is available.
- Use an animated product preview as the hero visual, with a small number of scroll reveals and interaction details. Respect `prefers-reduced-motion`; the essential page content must render without client-side animation.
- Load PostHog from public project configuration only when configured. Mark browser events with `app_surface=marketing` and the environment. Do not capture form input or use session replay/autocapture.

## Dashboard experience

- Restrict the dashboard to authenticated, confirmed, invite-provisioned internal accounts. Use Supabase Auth with cookie-based SSR and a server-only `requireDashboardUser` check in every protected page, server action, and route handler before data access. The Next.js Proxy only refreshes sessions and helps navigation; it is not the authorization boundary. Validate identity with `getClaims()` or `getUser()`, never `getSession()` alone.
- Keep public sign-up disabled and provision dashboard accounts by invitation. Authorize against `DASHBOARD_ALLOWED_EMAILS` only after confirming the account email; use stable Supabase user IDs instead when available.
- Query PostHog on the server only. Keep the personal API key out of browser bundles; configure the Query API host separately from the public ingestion host, alongside the project ID. Never return raw user identifiers or reflection/check-in content to the browser.
- Filter production reporting to `app_environment=production`; distinguish mobile and marketing surfaces. Show an unconfigured state when credentials are absent and source/coverage notes when a metric is provisional.
- Start with the five metric definitions in `docs/posthog-analytics.md`: activation, weekly engaged users, week-one retention, follow-through, and reflection adoption. Show counts and denominators alongside rates. Label completion-based metrics provisional until save confirmation is reliable. Show an error trend only if the PostHog project actually contains `$exception` events; otherwise explain that error capture is not configured.
- Treat these as definitions, not live results. Never use fabricated analytics values.

## Shared design language

- Light surfaces: background `#F7F8F5`, white cards, ink `#24332D`, muted text `#526359`, green `#356348`, and warm accent `#79551E`.
- Use Satoshi and existing mobile font assets where licensing and web delivery permit; use a system sans fallback.
- Prefer a custom SVG/CSS superellipse or squircle primitive with a browser-safe fallback. Do not rely solely on the experimental CSS `corner-shape` property.
- Keep the dashboard calm and information-dense; keep decorative animation on the public marketing site.

## Out of scope

- Reworking the Expo app or its existing analytics event semantics.
- Changing Supabase schemas, identity policy, production PostHog settings, DNS, domains, or deployment configuration. Hosting target selection is deferred; each app must be buildable independently.
- Adding Sentry, session replay, third-party ad tracking, a shared monorepo toolchain, or a backend service beyond the apps' server routes.

## Acceptance criteria

- Each app has its own install/build commands and can run independently.
- Marketing pages are server rendered and have complete route metadata plus robots and sitemap responses.
- The motion-enhanced marketing page remains legible and usable with reduced motion and before hydration.
- Dashboard server routes enforce Supabase authentication and the email allowlist before querying PostHog.
- PostHog API credentials remain server-side; absent configuration produces an honest empty state.
- Metric queries match the existing event contract and identify provisional coverage.
- Both apps pass lint, typecheck, and production build checks; browser smoke inspection confirms public HTML and dashboard auth behavior.
- No existing Expo changes are staged, overwritten, or otherwise disturbed.
