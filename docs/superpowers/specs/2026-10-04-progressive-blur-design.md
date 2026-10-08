# App-Wide Progressive Edge Blur

## Status

Design approved and implemented on 2026-10-04. TypeScript and lint checks pass; device-level visual and interaction verification remains pending.

## Context

The app already depends on `expo-backdrop`. Progressive blur is used on the Today and Templates top headers, while iOS uses a native material blur for its tab bar. Templates also has a horizontal category rail with opaque filter pills and edge fades. Other routes include intro/onboarding, Goals, Progress, Profile, full-day templates, and template detail screens. These surfaces currently use different combinations of scrolling content and anchored controls.

The visual reference is the linked progressive-blur example. The intended treatment is at screen and scroll boundaries, not on individual cards. The library's `ProgressiveBlurView` supports top, bottom, left, and right edges, and its `scrollFallback` can replace blur with a gradient while the underlying scroll view moves quickly. The overlay must not intercept touches.

## Goals

- Make progressive edge treatment consistent throughout the iOS and Android app.
- Fade horizontal scroller edges while preserving the opaque appearance of chips and cards.
- Show a bottom fade only when sticky or floating UI overlays scrollable content.
- Preserve current navigation behavior, content hierarchy, colors, and touch targets.
- Keep blur behavior usable during fast scrolling and on screens with reduced motion enabled.

## Design

### Screen top edges

Provide a subtle progressive blur at the top edge of every screen with scrollable content. When a fixed or sticky header overlays that content, the blur sits behind the header and strengthens toward the screen edge. On screens without an overlay header, it remains a restrained edge treatment and must not create a permanent opaque strip. Existing top blur on Today and Templates should use the same shared configuration as the other screens.

Use a 72 dp top edge depth and intensity 64 as the initial shared values. Measure this from the owning scroll viewport's top, including the screen safe-area region where that viewport reaches it; for bottom sheets, measure from the sheet's content viewport, not the app window. Use the existing warm paper/surface color as the 70% tint wash (`#B3` alpha for the current six-digit hex surface tokens), with that same color as `fallbackColor`. The fallback must not become a permanent opaque strip when content is stationary.

Apply the top edge to both vertical `BottomSheetScrollView`s in Templates, clipped to each sheet's content viewport. Do not add a vertical edge to the Home Add/Edit sheet: it currently uses `BottomSheetView`, not a vertical scroll view. Its horizontal pickers still receive side edges when their contents overflow.

### Horizontal scrollers

For horizontal rails that overflow their viewport and can scroll beneath its edges, apply left and right progressive fades. Hide the fades for a rail that fits its viewport. Keep the items themselves opaque. Place edge overlays within the rail's clipped viewport, give them no touch handling, and allow taps and horizontal gestures to reach the rail. Apply this to every horizontal rail listed under Screen coverage.

Use 24 dp side-edge depth and intensity 52 as the initial shared values. Horizontal rails inside the home Add/Edit bottom sheet are included when their contents overflow the viewport.

### Bottom edge

Render a bottom progressive fade only while sticky or floating UI overlays scrollable content. The fade is owned by that scroll viewport, clipped to it, and ends at its bottom edge. Measure its 88 dp depth upward from that edge, including the viewport's bottom safe-area region when it reaches the app window; place the anchored control above the fade and keep interactive content reachable. Use intensity 64 as the initial shared value. Bottom fade eligibility follows the actual floating tab bar visibility (`HomeScreen.showTabBar`), not only the route name:

- Intro/onboarding (`src/app/index.tsx`): yes, behind the fixed step footer.
- Android Today, Goals, Progress, and Profile: yes, behind the floating tab bar (`showTabBar` defaults to `true`).
- Standalone `/home`: yes on both platforms because it renders `HomeScreen` without overriding `showTabBar`, so the floating bar remains visible.
- iOS Today, Goals, Progress, and Profile: no additional app-level bottom fade because those route wrappers pass `showTabBar={false}`; retain the native tab bar's `systemChromeMaterial` blur.
- Templates, full-day templates, template detail, and day-template detail routes: no, unless a future screen adds its own sticky/floating bottom control that overlays its scroll viewport.
- Bottom sheets: no current bottom fade. Add one only if a sheet has a bottom-anchored control overlaying its scroll content.

Keep the iOS native tab bar's existing `systemChromeMaterial` blur. Do not layer an additional app-level blur over the native bar. If a future iOS screen adds a separate app-owned sticky bottom control above the native tab bar, scope its fade to that control and its scroll viewport.

### Shared implementation boundary

Create a small reusable progressive-edge component outside `src/app/` so route files remain screens. It wraps `expo-backdrop` and standardizes edge, size, tint, intensity, fallback, and `pointerEvents="none"` behavior. Screens place it beside the scroll viewport or behind the anchored chrome it belongs to. Avoid a global overlay that guesses which scroll view is beneath it; nested scroll views, sheets, and horizontal rails need explicit ownership.

Use each screen's existing warm paper/surface token for the 70% tint wash so content remains legible and the blur fits the app's palette. The current tokens are opaque six-digit hex colors; append alpha `B3` for the wash while keeping the opaque RGB surface as the fallback. The formal and expressive visual styles change typography and icons, not the surface tokens; use the same blur values for both. Keep the horizontal rail items opaque. Enable the library's fast-scroll fallback to prevent blur capture from competing with active scrolling. Preserve a web fallback if the existing screen already renders on web; this task's visual acceptance targets are iOS and Android.

When iOS Reduce Transparency is enabled, keep the same edge coverage and direction but replace the blur with a surface-colored fade that ramps from clear to opaque at the owning viewport's edge. Read the system preference through React Native AccessibilityInfo and respond if it changes while the app is running. If reading the preference fails or a change listener cannot be established, use the surface-colored fade as the conservative fallback. Keep the native blur path otherwise. This is an accessibility fallback for the custom overlay, not a layout or navigation change.

### Screen coverage

The current route and horizontal-rail inventory is:

- `src/app/index.tsx`: Intro, account choice, onboarding, and completion screens use vertical scroll views; the shared navigation footer is bottom-anchored.
- `src/app/(tabs)/index*`, `goals*`, `progress*`, and `profile*`: all render `HomeScreen` from `src/features/home/home-screen.tsx`, with one vertical animated scroller. Android shows the floating tab bar; iOS delegates tabs to `NativeTabs`.
- `src/app/home.tsx`: standalone `HomeScreen` route; apply bottom fade only when its floating tab bar is visible.
- `src/app/templates.tsx`: vertical list, sticky header/filter region, horizontal category filters, horizontal schedule cards, and two bottom-sheet scroll views. Give the category and schedule rails side fades only when they overflow; give each bottom-sheet scroll view a top edge measured and clipped to its own content viewport. No bottom fade while sheets have no anchored footer.
- `src/app/full-day-templates.tsx`, `src/app/template-detail.tsx`, and `src/app/day-template-detail.tsx`: vertical scroll routes with top treatment and no bottom fade.
- `src/features/home/home-screen.tsx`: the Life Areas horizontal summary rail and horizontal pickers in the Add/Edit sheet receive side fades when content overflows. The Add/Edit sheet has no vertical scroll viewport today and therefore receives no top or bottom edge.

This is the complete current route and horizontal-rail inventory. If implementation finds another routed scroll surface or horizontal rail, add it to this inventory and apply the same rules; do not silently expand bottom-fade eligibility.

## Interaction and accessibility

- All blur overlays pass touches through to content and controls.
- Use the package's gradient fallback during fast scrolling.
- On iOS, honor Reduce Transparency with the opaque fade described above; verify text and controls remain legible at both preference states.
- The effect is static and does not add decorative movement; Reduce Motion behavior remains unchanged.
- Keep sufficient scroll content inset/padding so content can reach its final position above any bottom overlay.
- Preserve existing contrast and legibility of headers and anchored controls in both visual styles.

## Scope and non-goals

- Apply only to iOS and Android app surfaces; retain existing web behavior or fallback where applicable.
- Do not blur card backgrounds or change their existing opacity, color, borders, or shadows.
- Do not replace the iOS native tab bar or change navigation semantics.
- Do not add dependencies; `expo-backdrop` is already installed.
- Do not redesign screen layouts, headers, typography, filters, or bottom controls.
- Do not add blur at the bottom of screens without sticky or floating UI over scrollable content.

## Validation

- Inventory every routed screen and horizontal rail to ensure the intended edge treatment is applied once and only where appropriate.
- Verify edge overlays do not block taps, scrolling, text inputs, or accessibility actions.
- Inspect Intro/onboarding, Today, each tab, Templates, and detail routes on iOS Simulator and Android Emulator.
- Confirm the bottom fade appears behind anchored footers/floating controls and is absent on screens without them.
- Confirm the iOS native tab bar keeps its existing material blur without a doubled layer.
- Confirm iOS Reduce Transparency replaces the custom blur with the surface-colored fade and updates when the system preference changes.
- Confirm preference-read or listener setup failure selects the surface-colored fade, clipped to the owning viewport; confirm horizontal fades disappear when their content fits the viewport.
- Check light and dark system appearance if supported, both app visual styles, fast scrolling, short content, and Reduce Motion.
- Run `npx tsc --noEmit`, `npx expo lint`, and `git diff --check` before implementation is declared complete.

## References

- [Progressive Blur (Android & iOS)](https://www.reddit.com/r/reactnative/comments/1wncbg9/progressive_blur_android_ios/)
- [`expo-backdrop` documentation](https://github.com/rit3zh/expo-backdrop)
