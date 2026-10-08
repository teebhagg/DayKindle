# DayKindle marketing site

Public SEO-focused marketing app built with TanStack Start, React, TypeScript, Tailwind CSS, shadcn/ui, and Motion for React.

## Local development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local`. Set `VITE_SITE_URL` to the real public domain before production deployment. The sitemap and robots responses use the request origin. PostHog browser tracking is disabled until a public project token is configured; the client uses page views only, with autocapture and session replay disabled.

This site is independently installable and buildable. Hosting and domain configuration are intentionally deferred.

## App screenshot mockups

Portrait mockups are in `public/mockups/`. They were generated with MockUPhone using its iPhone 15 Pro Black Titanium frame. MockUPhone's [attribution page](https://mockuphone.com/attribution/) licenses generated art under CC BY 3.0 and recommends credit in the source project.
