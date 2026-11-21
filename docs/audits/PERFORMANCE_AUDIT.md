# Performance audit

**Reviewed:** 2026-10-27  
**Method:** Static source review plus a host-SQLite stress probe and Expo web export measurement. No React Profiler, native device timing, browser interaction measurement, or production telemetry was collected.

## Findings

| Priority | Area | Source evidence | Recommended measurement or improvement |
| --- | --- | --- | --- |
| P1 | Native local save work scales with all stored collections | `mobile-app/src/features/home/home-storage.ts` uses an exclusive SQLite transaction but deletes and reinserts every row in each collection on each session snapshot write. An adapter-based host SQLite probe wrote 129,015 records (17.1 MB serialized input) in 1.04 s and read them in 279 ms; a duplicate-key write rolled back to the prior snapshot. | Treat host timings as a scale signal only. Repeat cold/warm save and load timings on supported native devices, with repeated trials and realistic histories. Compare full replacement with per-collection or per-entity diffs only if device measurements justify it. |
| P1 | Full session hydration reads every stored row | Native `readSnapshot()` reads all collection rows and rebuilds a complete serialized snapshot at startup. The host probe read the 129,015-row snapshot in 279 ms, excluding app hydration, normalization, rendering, and device I/O. | Measure cold-start load and memory at increasing record counts on iOS and Android; consider paged history or indexed queries only if those measurements exceed an agreed budget. |
| P2 | Broad React context can amplify updates | The session context value includes the whole session and all setters. A collection update changes the value for every consumer. | Use React profiling on Today and Progress with a large dataset. Split/select state only if the profile shows avoidable work. |
| P2 | Large feature modules raise change and review cost | `home-screen.tsx`, `home-session.tsx`, and onboarding `index.tsx` contain large amounts of UI/model coordination. File size alone is not a latency measurement. | Extract cohesive modules without changing behavior, then profile render and interaction paths before/after. |
| P2 | Dashboard analytics has external query latency | The dashboard runs five PostHog queries concurrently plus an aggregate database RPC. PostHog requests use `cache: 'no-store'`. | Track server response time and provider rate limits; consider a short server-side cache only if freshness requirements allow it. |
| P2 | Web entry transfer is sizable | Expo export produced a 13,234,362-byte JavaScript entry (2,594,275 bytes gzip) and a 15 MB output directory. This is bundle-size evidence, not browser startup timing. | Measure cold-cache transfer and interaction timing on representative networks/devices. Review optional routes and large dependencies for deferred loading if product budgets require it. |

## Existing favorable controls

- SQLite is configured for WAL and writes use an exclusive transaction.
- Local writes are queued and surfaced to the UI as acknowledged or failed.
- Entity sync caps pages and mutation batches and serializes per-user server work.
- Dashboard queries are concurrent rather than sequential.

## Limits

The host SQLite probe used Node SQLite 3.53.4 with an adapter implementing the Expo SQLite calls; it did not run on the app's native driver. The web export compiled, but the isolated browser smoke encountered Skia runtime exceptions and blank planner screens, so its viewport checks are not a usable rendering-performance result. The disposable iOS simulator reached the Expo development-client picker but did not load the JS bundle; Android had no attached device. Native render/startup performance remains unmeasured. Do not describe the app as fast or slow from these host timings or bundle size alone. Capture device, OS, build, dataset size, cold/warm state, and repeated timings before setting performance budgets.
