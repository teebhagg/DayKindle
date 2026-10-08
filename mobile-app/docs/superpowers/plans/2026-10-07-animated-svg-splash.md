# Animated SVG splash implementation plan

## Objective

Add the approved one-shot DayKindle bear-logo reveal while preserving native splash behavior, local hydration gating, and reduced-motion support.

## Steps

1. Add `AnimatedSplash` in `src/features/home/animated-splash.tsx`. Render the existing square logo inside `react-native-svg`, size it to the approved viewport rule, and use installed Reanimated APIs for the 500 ms opacity/scale reveal, 120 ms reduced-motion fade, and 180 ms exit fade.
2. Replace the home-session provider's pre-hydration spinner with `AnimatedSplash`. Keep the fallback mounted until both the reveal and local hydration complete, then render the existing app or recovery UI. Keep planner children unmounted during hydration.
3. Extend `scripts/test-interface.cjs` with source-level regression assertions for the provider fallback, timing/reduced-motion settings, aspect-ratio sizing, accessibility, and no-loop behavior.
4. Run interface tests, TypeScript, lint, and `git diff --check`. Inspect on available iOS/Android runtime targets and report any unavailable platform verification accurately.

## Constraints

- No new dependencies, no icon redraw, no sound or looping motion.
- Keep the native splash's Expo configuration and automatic lifecycle unchanged.
- Do not stage or commit files.
