# iOS native action button scroll handoff

Review date: 2026-11-01  
Status: Implemented in the local checkout; not committed or deployed.

## Finding and change

DayKindle keeps its native SwiftUI `Button` controls inside Expo UI `Host` views, including controls embedded in React Native scroll content. The iOS simulator A/B check isolated the scroll handoff issue to the host's container safe-area participation: dragging from an in-feed native button did not move the parent scroll view when the setting was omitted, while the same drag moved the content with `ignoreSafeArea="container"` enabled. This indicates a coordinate/safe-area mismatch at the SwiftUI-to-React-Native boundary.

The iOS `Host` now sets `ignoreSafeArea="container"`. Expo SDK 57 documents this value as ignoring container safe areas while continuing to respect keyboard safe areas. The React Native scroll views and native SwiftUI buttons remain in place.

## Manual simulator cases

Device: iPhone 17 Pro simulator, iOS 26.3.1, DayKindle development client. No planner changes were saved during this pass.

| Surface | Steps | Result |
| --- | --- | --- |
| Today | Start at the top; drag vertically from the in-feed “Add a task for that day” native button; drag back from the lower “Add a task” native control. | A/B: baseline without the Host setting did not scroll; with it, the same gesture reached the bottom and the reverse gesture returned to the top. Neither drag activated the button. |
| Today action | Tap the lower “Add a task” native control, inspect the sheet, then close it. | The native tap opened the expected task sheet and retained its default values. The sheet closed without saving. |
| Goals | Inspect the native area and goal actions; attempt a drag from the lower native action. | No action was activated. In the seeded guest state the empty Goals content fits the viewport, so this state does not provide a long scroll range. A prior pass from the native area action moved the longer Goals content without firing it. |
| Progress | Inspect the date-range controls, chart, achievements, and native achievement action. | Layout and accessibility content rendered. A prior candidate pass scrolled from content and reversed from the native achievement action. Repeated Device Hub drags during this final pass did not move this screen, so this gesture was not independently reconfirmed. |
| Profile | From the lower Profile content, drag down starting on “Check push setup.” | Returned to the Profile top; the push setup action did not fire. No account or reminder settings changed. |
| Templates | Inspect the native “See more full-day templates” action and routine card. | The route and controls rendered. A previous candidate pass moved through the template list from the native action; repeat drags in this pass were inconclusive in Device Hub and did not navigate. |
| History | Drag up from the calendar content to the activity section. | The calendar moved up and the lower activity state became visible. A reverse drag was not consistently delivered by Device Hub. No date selection or activity data changed. |
| Goal template detail | Open “Move a little more,” drag down from its native Save action after scrolling to the bottom. | The form returned to its top without saving or changing fields. |
| Full-day rhythms / Daily Plan | Open the built-in Daily Plan, verify its eight schedule blocks, and drag up from the schedule text. | The list reached the evening blocks and fixed Edit/Save footer. No save was triggered. The footer is anchored outside the scroll content, so a drag beginning on its buttons is not a scroll-handoff case. |
| Custom routine editor | Open “Create your own routine”; drag on “View example” and nearby content. | The editor opened with the default “My routine” title and no blocks. Device Hub did not reliably scroll this route in the final pass; no title, days, or blocks were changed. |

Small 2–20 px drags did not produce a reliable scroll. They are recorded as below-threshold input observations, not as successful scrolling; the verified handoff used a deliberate vertical drag.

## Automated checks

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run test:interface`: 8 passed, 3 failed. The failures are existing source-contract mismatches in dirty files outside this fix: the home primary-button semantic pair, the animated splash opacity expression, and the shared squircle-card radius helper. The focused regression check for the iOS Host setting passes.

## Limits

This verifies local source, automated checks, and selected iOS simulator paths. It does not verify Android runtime behavior, a production build, or production delivery. Device Hub gesture injection was intermittent on Progress and Templates during the final repeat pass; those outcomes are not treated as product failures or as confirmed passes.
