# DayKindle Web Apps Implementation Plan

> **For agentic execution:** Implement the tasks inline in order. Preserve the current Expo working tree. Do not stage, commit, or push.

**Goal:** Create a public TanStack Start marketing site and a separate internal Next.js analytics dashboard for DayKindle.

**Architecture:** Independent app roots under `apps/marketing` and `apps/dashboard`, each with its own dependencies and lockfile. Share visual conventions by copying only the needed font assets and using matching tokens; do not convert the Expo root into a package workspace. Marketing renders publicly with TanStack Start and uses Motion for React. Dashboard uses Next.js App Router, Supabase cookie auth plus an email allowlist, and server-side PostHog Query API calls.

**Tech:** TanStack Start, React, TypeScript, Tailwind CSS, shadcn/ui, Motion for React; Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui; Supabase SSR; PostHog Query API; npm.

## Task 1: Scaffold independent apps

- Create `apps/marketing` with the official TanStack CLI and `apps/dashboard` with the Next.js App Router defaults.
- Configure independent npm scripts, TypeScript, Tailwind, and shadcn/ui in each app.
- Keep app-specific configuration in each app root and add sanitized `.env.example` files.
- Confirm generated files do not overwrite or relocate any existing mobile files.

## Task 2: Build the public marketing site

- Add the DayKindle tokens, Satoshi font files, and a reusable superellipse card/surface primitive.
- Create the responsive landing page and truthful product copy based on `PRODUCT.md`.
- Add an animated product preview, restrained page reveals, keyboard/accessibility support, and reduced-motion behavior.
- Add route metadata, canonical/Open Graph values, robots, and sitemap; retain server-rendered content.
- Add optional PostHog browser setup with environment and `app_surface=marketing`, without autocapture or replay.

## Task 3: Build the private dashboard shell and auth

- Add the DayKindle dashboard theme and reusable squircle UI primitives.
- Add Supabase browser/server clients and the Next.js request proxy/middleware required by the installed Next version.
- Add a server-only `requireDashboardUser` check in every protected page and data boundary; verify identity with `getClaims()` or `getUser()`. The proxy refreshes sessions but does not authorize data access.
- Add a sign-in/sign-out flow with no public sign-up. Require confirmed, invitation-provisioned accounts and apply `DASHBOARD_ALLOWED_EMAILS` (or stable Supabase user IDs if supplied) before rendering private data.

## Task 4: Add source-backed analytics

- Add a server-only PostHog Query API client with a dedicated API host, project ID, and personal API key from server env; do not reuse the mobile public ingestion host for queries.
- Add protected API/data-loading functions that return only aggregate metric values.
- Implement the five metrics defined in `docs/posthog-analytics.md`, filtering production events and labeling provisional measures.
- Show real counts, denominators, date ranges, loading/error/no-credential states, and an exception trend only when `$exception` events exist in the project.
- Never invent placeholder metric values or expose raw event properties to the browser.

## Task 5: Verify and document

- Run each app's lint, typecheck, and production build scripts.
- Start each app and inspect the public rendered HTML, SEO endpoints, reduced-motion behavior, dashboard sign-in protection, and configured/unconfigured analytics behavior.
- Leave hosting-provider setup deferred until a deployment target is selected; independently buildable apps do not imply deployed or protected production domains.
- Record exact validation evidence and list the environment values needed for deployment.
- Check `git status` and diffs to confirm the pre-existing Expo work remains intact; do not stage or commit.
