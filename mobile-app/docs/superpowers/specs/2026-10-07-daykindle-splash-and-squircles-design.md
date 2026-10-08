# DayKindle splash and squircle surfaces

## Goal

Extend the existing DayKindle launch reveal with an animated brand name, use the Reacticx Squircle View shape for the logo, and make rounded non-button surfaces consistent across iOS and Android.

## Product and mobile context

DayKindle is a calm, practical, offline-capable personal planner. The app is Expo/React Native and targets iOS and Android, phone-first. Preserve the existing green brand palette, user-selected app typography, native-driven motion, accessibility, and local-data hydration gate.

## Splash design

- Keep the deep-green full-screen backdrop and supplied bear artwork.
- Size the square artwork to the smaller of 78% viewport width, 42% viewport height, or 340 logical pixels, preserving the 1:1 ratio. Mask it with the Reacticx `SquircleView` path so its corners form a smooth squircle on both platforms. Use Skia for the geometry and rendering path.
- Show the `DayKindle` name beneath the artwork, using the existing `DeliciousHandrawn-Regular` typeface to match the hand-drawn brand feel.
- Reveal the name from left to right with a narrow moving reveal edge, giving the appearance of the word being written. Use a Skia clip/reveal when it provides a smooth GPU-backed draw. Fade the squircle-masked artwork in at the same time.
- The normal-motion reveal lasts 2.2 seconds minimum. Run the reveal and opacity/scale changes on Skia/Reanimated's native rendering path; use only opacity, transform, and a clipping/mask reveal.
- Start local planner hydration independently while the reveal runs. Keep the splash until both hydration and the reveal have settled, then fade the overlay away over 180 ms. Preserve the existing recovery and recovery-blocked outcomes.
- Reduced-motion users receive an opacity-only reveal capped at 200 ms. Hydration continues independently, and the overlay remains until both hydration and that shorter reveal have settled. Do not force a two-second wait for reduced-motion users.
- Keep the surface inaccessible to screen readers and absorb touches only while the startup overlay is present. Do not loop, add sound, spinner, tagline, or persist a seen flag.

## App-wide surface shape system

- Use the Reacticx Squircle View implementation, based on a Skia-generated squircle path and MaskedView, as the shared primitive. Reuse the app's installed Skia and Reanimated packages. For masking, use the already-installed Expo SDK 57-compatible `@expo/ui/community/masked-view` implementation rather than adding a second masking library.
- Add a shared app-facing surface wrapper with the existing theme colors, border, sizing, and corner-radius conventions. The wrapper masks children and draws the surface path and border using the Reacticx implementation.
- Audit rounded containers throughout `src/` and migrate all user-facing rectangular surface containers on both platforms, including cards, panels, fields, sheets, dialogs, grouped controls, and icon backplates. Keep button shapes unchanged. Preserve intentional circular geometry such as avatars, progress dots, and icon circles.
- Do not replace layout-only border radii, thin separators, or geometric circles with squircles. Preserve existing spacing, typography, interaction, hit areas, and platform-specific layout.
- Avoid nested masks where an outer surface already clips a child. Keep rounded surfaces visually aligned with existing borders/backgrounds and do not add extra shadow or radius.
- The project currently contains 158 `borderRadius` declarations across `src`; inventory every direct and computed rounded surface and classify each as a surface, button, intentional circle, or layout/detail before migration. Acceptance requires all in-scope rectangular surfaces to use the shared squircle shape, with only buttons and intentionally circular geometry retaining their current shapes.
- Avoid nested masks when one parent surface already clips its contents. Profile representative card-heavy and scrolling screens before and after on iOS and Android; the same-device scroll run must average at least 55 frames per second with no sustained frame stalls over 33 ms. If a regression appears, optimize the shared primitive while keeping the requested shape consistent.

## Implementation boundaries

- Keep the launch animation in the existing home-session pre-hydration boundary.
- Put the reusable shape primitive and app wrapper outside `src/app/` so route files stay thin.
- Keep the native iOS/Android launch screens static and let Expo retain its current native splash lifecycle.
- Preserve existing dirty work and do not stage or commit files.

## Failure and accessibility behavior

- If animation setup fails, remove the animated layer and continue after local hydration settles.
- If a surface has not measured yet, render its children without clipping until a valid size is available, matching Reacticx's fallback behavior.
- The mask layer itself must not intercept touches or accessibility focus; children must retain their normal touch targets and accessibility tree. The splash itself remains hidden from accessibility focus.
- Test larger text, reduced motion, offline launch, recovery UI, and both platform renderers.

## Validation

- Confirm the splash reveal runs once, lasts at least 2.2 seconds in normal motion, and completes after local hydration.
- Confirm reduced motion removes scale movement and shortens the launch reveal.
- Verify the logo and representative card, text field, tray/sheet, dialog, and icon backplate render with the same squircle geometry on iOS and Android, including measured/unmeasured transitions and touch/accessibility behavior.
- Audit all 158 direct corner-radius declarations and any computed rounded surfaces, confirming all in-scope rectangular surfaces use squircles while button and intentional-circle exceptions remain unchanged.
- Compare baseline and updated representative-screen scrolling performance on the same iOS and Android devices; verify the 55 FPS average and no sustained stalls over 33 ms.
- Run `npx tsc --noEmit`, `npx expo lint`, interface tests, and iOS/Android development builds or simulator/device checks when available.

## Out of scope

- Redrawing or replacing the supplied logo.
- Changing app content, theme, navigation, native launch screen config, or button geometry.
- Converting avatars, status dots, or icon circles into squircles.
