# DayKindle Android UI audit — 16 October 2026

## Evidence and scope

- Device: Android Studio's **DayKindle Debug API 36** emulator (`emulator-5554`).
- App state: local guest workspace, entered by skipping account setup. The Google sign-in flow was excluded on this emulator at the user's request.
- Video: `/Users/mac/Desktop/Screen_recording_20261016_231704.webm` (1080 × 2424, 24 fps, 239.302 s). Frames were extracted at 4 fps to inspect every 250 ms of the actions the video actually contains. Timestamps below are video timestamps, not measured input-to-response latency.
- A later Android Studio Screen Recorder action timed out. The user authorized ADB as a temporary control fallback; ADB captured `/private/tmp/daykindle-audit-progress-20261016.mp4` (1080 × 2424, 124.67 s) and the screenshots named below. All routes not observed in either recording or live screenshots remain unverified.
- The repository already contained extensive uncommitted changes. The subsequent user-directed header correction changed only the shared home header metrics, title animation and title style; no commit or staging was performed.

## Runtime coverage

| Screen or action | Evidence | Result |
| --- | --- | --- |
| Profile, guest workspace at top | Video 0–29.25 s; live emulator screenshot after reverting a native bottom-blur experiment | Guest card, title, copy, sign-in action and solid tab bar rendered. |
| Profile, scrolled to bottom | Live emulator screenshot | Reminders, appearance cards and erase-data button rendered; erase-data button was fully visible above the tab bar. No destructive action was taken. |
| Profile → Today tab | Video 29.25–29.75 s, viewed at 125 ms steps | Today appeared by 29.375 s; date strip appeared by 29.500 s; task and habit card surfaces appeared by 29.625 s. The stagger is visible. |
| Today, idle and date selection | Video 30–50 s | Friday and Saturday selections rendered; Saturday gained the amber ring and the weekend routine prompt. |
| Today → Add Task sheet | Video 50.500–51.125 s, viewed at 125 ms steps | Sheet started rising by 50.625 s and was settled by about 51.000 s. The background dimmed and the form controls appeared. |
| Empty task name validation | Video around 202.75–203.00 s | “Enter a name” appeared after the keyboard action. The floating Gboard toolbar came from the emulator's input configuration; it is not evidence of an app defect. |
| Close Add Task sheet | Video around 212 s | Sheet dismissed and Today returned. |
| Today → Goals tab | Video 222.125–222.750 s, viewed at 125 ms steps | Selected pill changed by 222.125 s; Goals content appeared by 222.375 s; squircle card surfaces appeared by 222.625 s. |
| Goals, initial guest view | Video 222.625–239.302 s; live emulator screenshot | Commitments, Life areas, Your goals and Browse templates rendered with a solid tab bar. |
| Progress, date ranges | ADB screenshots `/private/tmp/daykindle-progress-{30d,3m,6m,1y,7d}.png` | The selected range pill, date span, and chart grouping changed for each of 7D, 30D, 3M, 6M, and 1Y. Charts had no recorded actions in this guest workspace. |
| History | ADB screenshots `/private/tmp/daykindle-history{,-week,-day}.png` | Month, Week and Day controls switched views. Month calendar and selected day rendered; empty activity state rendered. |
| Daily check-in | ADB screenshots `/private/tmp/daykindle-checkin{,-lower,-evening,-evening-lower}.png` | Sheet opened, expanded, switched Morning/Evening, and scrolled to the save control. No check-in was saved. |
| Header correction | ADB screenshots `/private/tmp/daykindle-progress-header-final.png`, `/private/tmp/daykindle-profile-header-scrolled.png`, `/private/tmp/daykindle-today-header-150.png`, `/private/tmp/daykindle-goals-header-120.png` | Goals/Progress/Profile expanded content height is 120 px; Today stays 150 px; compact height stays 60 px. Progress, Profile and Goals title glyphs render dark/opaque over the gradient after the animated wrapper explicitly sets opacity to 1. |
| Bottom fade correction | ADB screenshots `/private/tmp/daykindle-tab-fade-fixed-{today,goals,progress,profile,profile-mid}.png`, `/private/tmp/daykindle-tab-fade-lowered-20-{progress,profile-mid}.png`, `/private/tmp/daykindle-history-bottom-fade-20.png` | A progressive color fade rendered above the solid tab bar on Today, Goals, Progress, and Profile, including a scrolled Profile view. The user then requested a further 20 px downward shift: the 52 px tab fade now extends 32 px below the scroll viewport, leaving its upper 20 px visible over content and its lower portion behind the tab bar. The final Progress and scrolled Profile screenshots confirm the lower placement. History's separate fade remains 20 px above its screen base. Both use the header's nine-stop opacity ramp at 95% container opacity. Other full-screen routes received the shared fade but still need rendered inspection. |

## Findings

| Severity | Observed behavior | Evidence and likely cause | Action to verify or fix |
| --- | --- | --- | --- |
| P2 | Goals card text appears before its surface, leaving briefly unstyled content during tab entry. A similar stagger occurs on Today. | Video 222.375–222.625 s and 29.375–29.625 s. On Android, `SquircleCard` clears the native background; `SquircleSurface` only draws its Skia path after `onLayout` reports a nonzero size (`src/components/squircle-card.tsx`, `src/components/squircle-surface.tsx`). This is a source-supported explanation, not a renderer trace. | Render a native rounded fallback until the Skia path has its first drawable frame, then repeat the 250 ms capture. Check that the fallback does not protrude at squircle corners. |
| P3 | The Add Task sheet takes roughly 375–500 ms to rise and settle. | Video 50.500–51.000 s. The video does not establish that the duration is a performance bottleneck. | Compare with the app's intended motion timing and reduced-motion behavior. |
| Informational | Native `expo-backdrop` bottom blur made the Profile guest card disappear in emulator screenshots during a live experiment; the change was reverted immediately. | Live before/after emulator screenshots in the working session. Current Android code uses a 40 px progressive color fade above the solid tab bar. | Keep the current safe rendering path until a native blur is tested without affecting unrelated content. |
| Resolved in working tree | Expanded tab titles looked translucent even though the text color was opaque. | The text was nested in an animated wrapper. Explicit wrapper opacity of 1, a stable key and an explicit ink color produced opaque Progress/Goals/Profile titles in ADB screenshots. | Recheck after a fresh Android install and on iOS. |
| P2 | On a compact Profile or Goals header, the next section's text can remain visible directly behind the opaque title. | `/private/tmp/daykindle-profile-footer-fade-final.png` shows “Reminders” behind “Profile”; `/private/tmp/daykindle-bottom-fade-tab.png` shows the Goals subtitle behind “Goals”. The progressive wash intentionally becomes transparent toward its lower edge, but the text collision is observable. | Revisit title placement or scroll-content treatment without changing the user-approved gradient opacity. |

## Remaining device coverage

| Area | Required actions still unverified |
| --- | --- |
| Today | Create, save, edit and complete tasks and habits; priority, repeat, dates and measurements; routine selection and editing; check-in, reflection and recovery; scroll and footer across full content. |
| Goals | Commitment form and details; Life areas manager; add/edit/status/progress/milestones; template browsing; every form's validation and close path. |
| Progress | Date and range controls, cards and charts, reflection flow, History route and all history filters. |
| Profile | Reminder creation and removal, push setup result, appearance switch and reversion, guest sign-in tray and consent dialog; destructive prompts should be opened and canceled without deleting data. |
| Templates | Search, category filters, horizontal rails, previews, routine use/customize, template detail, full-day templates and routine detail. |
| Welcome and auth | Intro, onboarding steps, skipped guest and data-entering guest paths, login and return paths. These routes require a deliberate plan to preserve the current guest data. Google sign-in remains excluded on this emulator. |
| Cross-cutting | Each screen's expanded-to-compact header, 10 px scroll increments, status-bar and footer fades, input/keyboard transitions, reduced motion, both visual styles, and every button response at 250 ms intervals. |

This is a partial audit. No claim of complete screen or action coverage is supported yet.
