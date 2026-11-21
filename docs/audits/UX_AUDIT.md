# UX audit

**Reviewed:** 2026-10-27  
**Scope:** Static source and product copy review, informed by retained dated UX records, plus an isolated web route smoke. No planner flow was successfully exercised; no native screen-reader, large-text, or browser interaction walkthrough was completed.

## Current product flow in source

- The first-run flow offers Google, Apple, and Guest, then a short setup for life areas, an optional starter goal, visual style, and an optional weekday/weekend routine.
- The main planner routes expose Today, Goals, Progress, and Profile; History is a separate route. Shared state and much of the UI are hosted in `home-screen.tsx`.
- Profile distinguishes local Guest data from optional cloud sync and offers appearance, reminders, recovery, and account actions.
- User-facing copy describes local saves, sync consent, reminder limitations, and recovery paths rather than promising automatic behavior tracking or remote push delivery.

## Findings

| Priority | Finding | Evidence and next step |
| --- | --- | --- |
| P1 | Web routes fail during Skia hydration in the isolated browser run. | Exported pages returned HTTP 200, but `/goals` raised `PathBuilder` and `Typeface` undefined errors and several planner routes had no rendered text. `src/` imports Skia in screens/surfaces and has no `LoadSkiaWeb` call; the package web module reads `global.CanvasKit`. This is a strong initialization lead. The smoke blocked external requests, so verify with CanvasKit/WASM assets served locally before assigning a sole cause. |
| P1 | Current full-flow usability is not reverified across platforms and styles. | The source offers separate iOS/Android tab shells and Refined/Expressive styles. Repeat onboarding, task/goal creation, sync consent, reminders, and recovery on supported devices in both appearance modes. |
| P1 | Accessibility is only partially covered by source assertions. | The interface script checks selected contrast pairs, a tray header, and some labels. It does not establish VoiceOver/TalkBack order, dynamic type, keyboard focus, gesture alternatives, or all target sizes. Verify those on device. |
| P2 | Screen responsibilities are concentrated in one large planner screen. | Today, Goals, Progress, and Profile behavior share a large file. Audit navigation labels, focus restoration, form-state retention, and scroll state while extracting features. |
| P2 | Reminder capability varies by platform and delivery type. | Scheduled notifications are unsupported on web. Mobile scheduling is local; remote push delivery is not connected. Keep the UI's limitation visible and verify denied-permission and rescheduling flows. |
| P2 | Several important saved-data states need deliberate usability coverage. | Save failure, backup recovery, offline sync, and conflict recovery have UI paths. Walk them with injected errors and confirm users can tell whether data is local, cloud-synced, or awaiting action. |

## Historical device evidence

`mobile-app/docs/qa/android-audit-2026-10-16.md` records a partial Android API 36 emulator walkthrough and captures for Today, Goals, Progress, History, check-in, and Profile. It identified transient card-surface timing and a compact-header text collision in that dated working tree. Those observations are leads to recheck; later edits mean they are not findings confirmed against the current screen rendering. `mobile-app/docs/interface-consistency.md` also records screenshots and checks from an earlier implementation pass, with an explicit incomplete coverage matrix.

## Verification needed for a complete audit

Resolve the Skia web runtime issue and retest the exported routes with all dependencies served locally. Then test iOS, Android, and web routes with keyboard/screen-reader use, large text, reduced motion, light/dark themes, both visual styles, denied notification permissions, storage failure, guest-data recovery, and two-account sync conflict. The isolated browser run covered 13 routes and 16 viewport cases with no horizontal overflow, but its JavaScript exceptions make those layout observations incomplete. Record device/OS/build and date. Source assertions and screenshots alone do not establish complete usability.
