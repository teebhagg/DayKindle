# App-Wide Progressive Edge Blur Implementation Plan

> **For agentic workers:** Use the inline executing-plans workflow for this plan. Do not stage or commit files without the user's separate explicit approval.

**Goal:** Apply the approved progressive blur and fade consistently at screen and horizontal-scroll edges across iOS and Android.

**Architecture:** Add a shared `ProgressiveEdgeBlur` for native blur and a web SVG gradient fallback, plus a `ProgressiveHorizontalScrollView` that owns its side fades. Place top and eligible bottom overlays beside their owning scroll view or anchored chrome so `expo-backdrop` tracks the correct scroll surface. Preserve native iOS tab-bar material blur.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `expo-backdrop` 0.1.x, `react-native-svg`.

## Global Constraints

- Apply progressive edge treatment to the current screen and horizontal-rail inventory in `docs/superpowers/specs/2026-10-04-progressive-blur-design.md`.
- Use 72 dp / intensity 64 for top edges, 24 dp / intensity 52 for horizontal edges, and 88 dp / intensity 64 for eligible bottom edges.
- Tint with the current surface token at 70% opacity and use that surface token as the scroll fallback color.
- All overlays use `pointerEvents="none"` and the library's fast-scroll gradient fallback.
- On iOS, Reduce Transparency or a failed preference read/listener uses an edge-matched surface gradient; the preference observer is shared and responds to setting changes.
- Horizontal fades render only when measured content exceeds the viewport and are clipped by that viewport.
- Bottom fade is limited to the Intro/onboarding footer and visible Android floating tab bar; keep the iOS native tab bar's existing `systemChromeMaterial` blur without an app overlay.
- Do not blur card surfaces, redesign layout or navigation, add dependencies, or change web behavior except for a safe visual fallback.
- Preserve all unrelated working-tree changes. Do not stage or commit files without separate explicit approval.

---

### Task 1: Add reusable edge overlays

**Files:**
- Create: `src/components/progressive-edge-blur.tsx`
- Create: `src/components/progressive-edge-blur.web.tsx`
- Create: `src/components/progressive-horizontal-scroll-view.tsx`

**Interfaces:**
- `ProgressiveEdgeBlur` consumes `edge: 'top' | 'bottom' | 'left' | 'right'` and a surface color; it produces an absolute overlay with the fixed edge dimensions, intensity, tint wash, fallback, and touch passthrough.
- `ProgressiveHorizontalScrollView` consumes ordinary `ScrollViewProps` other than `horizontal`, plus `surfaceColor`; it produces a horizontal scroll view with left and right overlays that track that scroller.

- [x] Define edge dimensions from the approved spec: 72 dp top, 88 dp bottom, 24 dp sides.
- [x] Implement native `ProgressiveEdgeBlur` with `ProgressiveBlurView`, `intensity` 64 for top/bottom and 52 for sides, `startOffset={0}`, `scrollFallback`, the surface fallback color, and a 70% tint wash derived from the supplied hex surface color.
- [x] Implement `ProgressiveEdgeBlur.web.tsx` with an SVG linear gradient from the surface color at the named edge to transparent at the opposite edge; retain the same dimensions and `pointerEvents="none"` behavior without importing the unsupported native module.
- [x] Implement `ProgressiveHorizontalScrollView` as a clipped relative wrapper containing a horizontal `ScrollView` and both `ProgressiveEdgeBlur` side overlays; forward scroll props, `style`, and `contentContainerStyle`.
- [x] Run `npx tsc --noEmit` after the shared interfaces compile.

### Task 2: Apply top and eligible bottom edges to vertical screens

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `src/features/home/home-screen.tsx`
- Modify: `src/app/templates.tsx`
- Modify: `src/app/full-day-templates.tsx`
- Modify: `src/app/template-detail.tsx`
- Modify: `src/app/day-template-detail.tsx`

**Interfaces:**
- Screens consume `ProgressiveEdgeBlur` from `src/components/progressive-edge-blur.tsx` and pass their existing paper/surface color.

- [x] Add one top edge overlay to the onboarding root so it belongs to the active onboarding scroll view; change `AppChromeBackdrop`'s bottom blur to the shared bottom overlay while retaining its existing web fallback and footer content layout.
- [x] Replace the home header's direct `ProgressiveBlurView` with the shared top overlay. Add the shared bottom overlay behind the visible Android floating tab bar only; keep iOS `NativeTabs` behavior unchanged.
- [x] Replace Templates' direct top blur with the shared top overlay behind its animated header. Keep the existing sticky filter background and search surface unchanged.
- [x] Add the shared top overlay to full-day template, template detail, and day-template detail roots. Add no bottom overlays on these routes.
- [x] Keep bottom-sheet vertical scroll content bounded to each sheet viewport; add no bottom fades because the sheets have no anchored footer.
- [x] Run `npx tsc --noEmit` and `npx expo lint` after route integration.

### Task 3: Apply side fades to horizontal scroll rails

**Files:**
- Modify: `src/features/home/home-screen.tsx`
- Modify: `src/app/templates.tsx`

**Interfaces:**
- Horizontal rails consume `ProgressiveHorizontalScrollView` and their current screen surface token. The wrapper owns fade placement and gesture passthrough.

- [x] Replace the Life Areas summary horizontal `ScrollView` with the shared wrapper.
- [x] Replace the Add/Edit sheet's horizontal area, repeat, selected-day, tracking, goal, and milestone pickers with the shared wrapper wherever each picker currently uses a horizontal `ScrollView`.
- [x] Replace Templates' horizontal full-day schedule rail with the shared wrapper.
- [x] Replace Templates' category rail's platform-specific SVG masks and animated edge-opacity views with the shared progressive side overlays; remove only the now-unused category fade animation state and imports.
- [x] Verify all listed rails preserve their current content, selection behavior, scroll gestures, clipping, and chip/card opacity by source review.
- [x] Run `npx tsc --noEmit`, `npx expo lint`, and `git diff --check`.

### Task 4: Verify the finished treatment

**Files:**
- Verify: all files listed above.

- [ ] Inspect the changed routes on iOS Simulator and Android Emulator, including Intro/onboarding, each tab, Templates, detail routes, and the Home Add/Edit sheet. iOS simulator launch failed because `Simulator.app` is absent from the selected Xcode developer directory; Android was not launched.
- [x] Source-review top-edge ownership by screen/sheet and side-fade ownership by horizontal rail, including nested Home sheet pickers; rendered behavior remains unverified.
- [ ] Confirm overlays do not intercept touches, block keyboard input, or cover controls; verify fast-scroll fallback returns to blur after scrolling settles.
- [x] Source-review bottom-fade conditions: onboarding footer and `HomeScreen.showTabBar` only; iOS tab routes pass `showTabBar={false}` and keep native tab material. Rendered layering remains unverified.
- [ ] Confirm formal and expressive visual styles retain legible text and the same surface colors.
- [x] Run `npx tsc --noEmit`, `npx expo lint`, `git diff --check`, and whitespace scan; report exact results and any simulator/build checks not completed. TypeScript passed; lint had zero errors and four warnings; diff and whitespace checks passed.
