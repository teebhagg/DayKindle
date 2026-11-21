# DayKindle interface consistency

The shared Evergreen theme follows system light/dark mode. Refined and Expressive retain their fonts and icons. Navigation, planner data structures, and sync consent remain unchanged.

## Cross-platform shape and type pass (reviewed 2026-11-20)

- Rounded cards, containers, and text-field shells share one cubic smoothed Skia path clipped through the native MaskedView on iOS and Android. Android template grid cards and filter capsules use native clipping to avoid per-cell Skia surfaces. Native content remains interactive; circles and pill controls keep their native geometry. Text fields and the Templates search field both resolve to a 15-point drawn edge.
- The animated splash logo and its welcome-screen destination use the same 22% corner-radius ratio and shared smooth path.
- Buttons, tab bars, and selected tab indicators keep capsule shapes. Android tab-bar elevation is disabled because the transparent rounded host cast a rectangular shadow.
- Android uses the progressive paper gradient on collapsing headers. The compact title stays on an opaque area, then the gradient fades scrolled content below it over a 72-point tail.
- Major page, section, and sheet headings may use weights 500 or above. Card titles, empty-state titles, choice labels, body copy, metadata, status text, and button labels use weight 400. Native inputs and platform controls remain in place.

## Android template catalog performance (reviewed 2026-11-20)

- Android uses a standard `FlatList` with a two-screen render window and one grid row per batch. iOS keeps its animated list for the native blur handoff.
- Template cards retain their rounded native clipping without creating a Skia mask per card. Filter capsules use native pill shapes, and the Android gradient is elevated above the list behind the complete sticky search and filter stack. Its fade tail continues 64 points below the filters.
- Pixel 9 Pro API 36 emulator: All, Goals, and Habits states rendered; five scroll gestures left the grid filled with no blank rows. The final five-swipe sample reported 57 frames, 52 janky (91.23%), median 81 ms, p95 300 ms, p99 400 ms. An earlier pre-change sample on this emulator reported 45/45 janky, median 500 ms, p95 1200 ms. Development-emulator timing remains noticeably janky and is not a release-performance certification.
- No new Skia EGL-detach messages appeared during the final swipe sample. Earlier messages occurred around app reload; that startup noise is not resolved for other app surfaces.

## Implementation

Light amber adds a subtle warm tint to onboarding guidance, template context, weekly reflection, profile guidance, and empty-state icon badges. Shared `warmSurface`/`warmAccent` tokens use cream (`#FAF1DE`) in light mode and muted dark amber (`#29271D`) in dark mode. These decorative accents have their own tokens, separate from warning feedback.

- `src/constants/theme.ts` defines backgrounds, surfaces, primary/inverse text, secondary text, primary/pressed actions, selection, separators, control borders, disabled states, chart colors, overlays, and semantic feedback. Screens use `useTheme` and `useThemedStyles` rather than local palettes. Official Apple controls and Google glyph colors remain separate.
- Text fields retain subtle separator borders and use the shared input shell radius. Dark-mode canvas/background tokens use near-black green (`#08110C`); elevated surfaces stay distinct.
- Shared fields provide persistent labels, theme-controlled placeholders, inline errors, forwarded focus refs, and height that scales with system text size. Existing explicit labels suppress duplicate field labels where appropriate.
- Shared buttons have a 44-point minimum height and immediate feedback. Primary actions use green with `onAccent` text. Informational text and missed actions no longer rely on reduced opacity. Shared empty-state and feedback components use the same text and spacing rules.
- Toasts use semantic severity colors and reduced-motion transitions. Save/recovery errors stay visible across routes. Tab selection and checkbox motion respect reduced motion; native gestures remain available.
- Android native backdrop rendering obscured History despite populated accessibility nodes. Android now uses a bounded, theme-colored edge wash. iOS retains native blur and the existing Reduce Transparency fallback.
- Purpose copy now explains Today, goals, templates, check-ins, routines, History, and Progress date ranges and denominators. Profile copy distinguishes local data from cloud sync; it does not advertise remote push delivery as configured.

## Save and recovery behavior

`confirmLocalSave` acknowledges the queued write containing the current edits. Goal/task/habit forms, check-ins, weekly reflections, commitments, reminders, template activation, routine edits, setup, and account sync consent wait for that acknowledgment before reporting a local save or clearing the draft.

Failed primary entry/template writes keep the applied draft pending. Controls stay locked until the same write is retried, avoiding duplicate creations and silently ignored draft changes. Routine and reminder retries reuse stable IDs. Cloud sync status remains independent of local save acknowledgment.

Reminder feedback distinguishes an unsuccessful local save, denied permissions, unsupported notifications, scheduling failure after a local save, and successful scheduling. A failed schedule remains actionable in Profile. Raw service error text is not shown in the account interface.

## Static checks

Run:

```sh
npx tsc --noEmit
npx expo lint --no-cache
npm run test:interface
git diff --check
```

Checks completed 2026-11-20:

- `npx tsc --noEmit`: passed.
- `npx expo lint --no-cache`: passed with no lint output.
- `npm run test:interface`: 12 passed, 0 failed, including shared cross-platform squircle and heading-weight checks.
- `git diff --check`: passed.

These checks describe this working tree only; they do not certify a release build or production delivery.

The interface test suite covers:

- Text/placeholder, primary, pressed, feedback, and control-border contrast in both modes.
- Real style pairings for selected calendar dates, range controls, template choices, primary buttons, and account actions.
- Persistence acknowledgment waiting for a write, isolating later requests, rejecting failed writes, and succeeding after retry.
- Error and warning feedback retaining separate semantic roles from success.

Normal foreground pairs are checked at 4.5:1; control borders at 3:1. These checks cover the tested semantic pairs and style combinations, rather than certifying every composited native effect or large-text layout.

## Runtime evidence and limits

Representative screenshots were reviewed during implementation:

| Platform | Observed screens | Appearance |
| --- | --- | --- |
| iOS 26.3, iPhone 17 Pro simulator | Today and templates in light mode; Goals, Progress, Profile, and History in dark mode; reading goal setup in light mode | Expressive |
| Android Pixel 9 Pro API 36 emulator | Today, Goals, Profile, and Progress in light mode; the Progress header was reviewed after scrolling into its compact state | Refined |
| iOS 26.3.1 iPhone 17 Pro simulator | Goals and Templates in light mode; native tab bar and shared rounded cards were reviewed | Refined |

Selected captures are in `interface-verification/`. They are captures from the implementation pass, not an exhaustive final regression suite.

The final shape-pass smoke check showed the Android Profile screen with rounded cards and the capsule tab bar, and the iOS animated splash logo with its shared medium corner radius. The iOS app's launch overlay remained visible during this check, so final non-splash iOS card clipping was not visually confirmed in this run; shared iOS geometry is covered by source checks but still needs an on-screen confirmation.

The complete screen × mode × appearance matrix, invalid-form focus/keyboard behavior, repeated native submission, injected storage failure, offline sync/conflict recovery, denied notification permission, large text, VoiceOver/TalkBack, and sheet/gesture alternatives remain unverified on devices. The automated storage-failure test is not a device-level injected failure.

No physical-device testing, new native build, backend deployment, or schema migration was performed for this pass. Existing dirty work was preserved; no staging, commit, or push was performed.

## Visual corrections — 2026-11-20

- Android component borders use the same smoothed Skia path as their container fill across screens. Text fields keep the faint theme separator (`theme.line`) and draw it along the shared squircle shell, matching iOS. Outlines appear where a component defines a border; intentionally borderless artwork stays borderless.
- Goals and Habits template tiles use a native rounded content clip inside the virtualized Android grid, alongside the shared Skia squircle fill. This clips the artwork through the Link/MaskedView hierarchy; existing list virtualization remains in place.
- The Home week strip shows the same weekday and date format for every day. Today keeps a separated amber ring when another date is selected; the selected date remains filled green.
- The animated splash and onboarding logo use the same shared squircle path with a reduced 17% corner radius on both platforms.
- Android top gradients start with 90% white beneath the status bar. Template filters stay over the white wash, then its lower tail fades smoothly to transparent; iOS keeps its native blur.
- Verification on this tree: `npx tsc --noEmit`, `npx expo lint --no-cache`, `npm run test:interface` (13 passing), and `git diff --check`. Metro bundled the updated app on Android and the Pixel 9 Pro API 36 emulator was reloaded. Home card outlines matched the fill path and did not appear on Templates; Goals and Habits tiles rendered with rounded corners, and the Habits filter updated the grid. The status-to-filter white gradient was visually checked. This is emulator evidence, not a new native build or physical-device verification.

## Android border parity and Today strip (reviewed 2026-11-20)

- Pixel 9 Pro API 36 was reloaded after each visual edit. Computer-use review covered the Today selector in selected and other-date states, Home task/habit cards, Goals, Progress, Profile, and the task-entry form. Text-field outlines remain faint and follow the shared smoothed squircle shell.
- iPhone 17 Pro iOS 26.3.1 showed the same weekday labels and Today treatment after refresh. Selecting Friday, 20 November updated the selected-date heading and accessibility state.
- `npx tsc --noEmit`, `npx expo lint --no-cache`, `npm run test:interface` (14 passing), and `git diff --check` passed. This is simulator/emulator evidence; no new native build or physical-device verification was performed.

## Template card squircle parity (reviewed 2026-11-20)

- Android outlines now use an inset Skia stroke path, avoiding the same-path clip that weakened the outline. Android native-shape cards use the same visible corner radius as iOS continuous-corner cards.
- Goal and habit template tiles use a 12% measured corner ratio on both platforms; their Android content clip is provided by the shared native-shape pressable so it stays aligned with the outer edge.
- Pixel 9 Pro API 36 and iPhone 17 Pro iOS 26.3.1 were reloaded and visually checked on the Templates screen with the Habits filter selected. TypeScript and `git diff --check` passed; no automated test suite or new native build was run.

## Today date strip (reviewed 2026-11-20)

- Every day uses its weekday and date; the current day no longer substitutes a “TODAY” label. A fine amber ring sits 3 points outside today’s pill, while a green fill marks the selected date.
- Selection fill fades out on the previously selected day while fading in on the newly selected day. Reduced-motion settings disable these transitions; the seven targets gain a little width by tightening their gaps.

## Cross-app motion pass (reviewed 2026-11-21)

- Shared `SquirclePressable` controls use a short, low-opacity press overlay on iOS and a bounded native ripple on Android. The iOS overlay follows the system reduced-motion setting. Native SwiftUI buttons and Android capsule buttons retain their platform interaction styles.
- Android ripples are clipped to each pressable's resolved shape. Controls without an explicit corner radius receive the shared card-radius curve, so their ripple has rounded bounds instead of a square edge.
- The native stack keeps platform default push/pop motion and matches iOS transitions to back gestures. Home tab content and selected states, the history calendar and activity rows, Home entries, and routine blocks animate their appearance or layout changes.
- Scroll and gesture tracking stay immediate and UI-thread driven. No artificial delay is added to touch, scrolling, or gesture response. Bottom sheets, the account tray, and toast transitions keep their native or existing Reanimated presentations.
- Verification on 2026-11-21: TypeScript and `git diff --check` passed. The iPhone 17 Pro iOS 26.3.1 confirmed the selected date fill and opened then dismissed the “Erase my data” confirmation without deleting data. The Pixel 9 Pro API 36 confirmed the Habits filter and Goals tab remain interactive after the press feedback change. This is simulator/emulator evidence, not a release build or physical-device check.

## Consistent card corners (reviewed 2026-11-20)

- Card, large-card, hero, and panel radius tokens now share one 28-point radius; normalization keeps the rendered edge at 27 points. Inputs, small controls, circles, and pill actions retain their own shape roles.
- Android template cards draw their faint border on the rounded native content clip, keeping it above the card artwork without a per-card MaskedView. The artwork skips the iOS-only zoom wrapper so its top corners follow the card edge; iOS uses the shared smoothed path for fill and clip.
- Goal cards and empty Habit cards continue to use the shared smoothed surface and faint separator border.
- The ring stays visible when another date is selected. Date targets and their accessibility labels remain unchanged.


## Daily plan spacing and card borders (updated 2026-11-21)

- Daily routine headings and blocks use more vertical breathing room and clearer separation between routines. Goal cards retain the shared faint outline; habit entries use matching rounded, faintly outlined cards on iOS and Android.
- Android action buttons provide a visible pressed opacity/scale response alongside the clipped native ripple.
- Android routine template cards and timed daily-plan entries use roomier internal spacing to account for their denser rendered layout. Expressive body text now uses 1.1x on iOS and 1.25x on Android; display headings retain their separate hierarchy scale.
