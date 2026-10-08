# DayKindle animated splash design

## Goal

Give DayKindle a brief, restrained animated launch moment using the approved bear logo. Preserve the supplied artwork and the existing deep-green brand background.

## Platform constraint

iOS and Android native launch screens are static. The animation therefore runs in a full-screen React Native layer in the first app frame, using SVG for the logo composition. Expo keeps its normal automatic native-splash behavior. The animated layer uses the same green background and logo so the handoff does not flash or change color.

## Motion and appearance

- Use the existing `assets/images/daykindle-logo.png` as the artwork inside an SVG image element. Do not trace, redraw, recolor, or crop the bear.
- Reveal the artwork once with opacity from 0 to 1 and a restrained scale from 0.96 to 1 over approximately 500 ms, using an ease-out curve.
- Keep the logo centered on a full-screen `#064B37` background. Do not add a tagline, spinner, progress indicator, sound, or looping motion.
- Render the square logo with `contain`, preserving its 1:1 aspect ratio. Size it to the smaller of 78% of viewport width, 42% of viewport height, or 340 logical pixels.
- After the reveal, fade the full-screen layer away over 180 ms to expose the app.
- For reduced motion, skip scale movement and use a 120 ms opacity-only reveal.

## Startup and component boundary

- Add a focused animated-splash component outside `src/app/` and use it as the home-session provider's pre-hydration fallback. Expo's native splash keeps its automatic behavior; the app already waits for fonts before mounting the provider.
- Animate the SVG logo immediately after the fallback mounts. Keep the splash visible until both local planner hydration has settled and the 500 ms reveal has completed. This prevents planner screens and their effects from mounting before local data is ready.
- Once both conditions are met, replace the splash with the app or its existing recovery UI, fading the splash layer away over 180 ms.
- Treat successful hydration, recovery state, and blocked recovery state as settled outcomes. Show the existing app recovery/error UI after the overlay exits; do not wait on cloud authentication or sync.
- Keep the animation non-interactive and hidden from accessibility focus, while the full-screen layer absorbs touches during the short startup transition. Do not persist a “seen” flag; each app launch gets one brief reveal.
- Use the already-installed `react-native-svg` and `react-native-reanimated` packages. Animate only opacity and scale; keep the logo artwork in an SVG `<Image>` element rather than introducing an animation dependency.
- If the root unmounts, cancel the animation and clean up the overlay state. If the app backgrounds during the reveal, let the native animation runtime pause and resume from the current state; do not restart or loop it. If the reveal finishes while backgrounded, remove the overlay when the app returns to active and hydration is settled.

## Failure and accessibility behavior

- If animation setup fails, remove the app-side overlay and continue to the app. The native splash remains under Expo's normal automatic lifecycle; no manual native hide operation is involved.
- Reduced-motion users receive no scale transform. The launch must remain usable if the animation is skipped.
- Mark the overlay inaccessible and non-interactive (`accessible={false}`, no pointer handling, and excluded from accessibility descendants).
- Do not block app interaction after the brief reveal has completed.

## Validation

- Verify typecheck, lint, and `scripts/test-interface.cjs` source-level assertions for the provider fallback, reveal/readiness gate, overlay accessibility/interactivity, reduced-motion branch, and one-shot cleanup. Confirm that guests are not blocked by the overlay and that it clears for normal, recovery, and recovery-blocked hydration outcomes.
- Check the native-to-animated handoff and final reveal on iOS and Android where devices or simulators are available.
- Confirm that reduced-motion mode removes scale movement and that hydration recovery still reveals the existing recovery UI.
- Confirm the animation plays once per launch and does not loop. During an interruption, resume from the current animated state rather than restarting.

## Out of scope

- Replacing the supplied artwork or producing a new mascot illustration.
- Adding a video, Lottie dependency, sound, loading progress, or onboarding-specific animation.
- Changes to app icon, splash logo artwork, or product flows beyond the launch handoff.
