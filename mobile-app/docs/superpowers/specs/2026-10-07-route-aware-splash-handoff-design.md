# Route-aware splash handoff design

## Goal

Make the animated splash handoff feel intentional for both first-time users entering onboarding and returning users entering Today. The splash logo should connect spatially to a real destination only when that destination exists. It should not remain large over readable app content.

## Evidence and current behavior

The October 7 iPhone recording shows the Today screen fading in beneath the large centered bear logo. At approximately 11.8 seconds, the home content is already readable while the splash logo still covers its center. This produces a double image and reduces legibility.

The current app reports a measured splash target from the welcome state in `src/app/index.tsx`. A completed onboarding redirects from that route to `/(tabs)`, where no matching logo target is reported. `AnimatedSplash` currently substitutes a centered `0.88` scale when the target is absent. The same 400 ms delay and 400 ms destination fade runs for both flows, so Today becomes visible while that centered logo is still present.

## Design decision

Use two handoff treatments based on an explicit destination-target decision. Represent readiness as `pending`, `target`, or `no-target` in the splash target context.

- The welcome state in `src/app/index.tsx` reports `target` only after its logo has non-zero measured bounds.
- `src/app/index.tsx` reports `no-target` when the first visible state is a redirect, auth/link flow, cloud-check status, or another screen without the welcome logo.
- The tab layout reports `no-target` for Today and other tab destinations. The provider reports `no-target` for its recovery-blocked screen.
- The provider starts the handoff only after hydration, splash reveal completion, and a terminal `target` or `no-target` decision. It must never infer a center destination from missing measurements.
- If the welcome logo remains unmeasured for 250 ms after the welcome state requests measurement, resolve to `no-target` so startup cannot hang. A late target report after the handoff begins is ignored.

### First-time onboarding with a measured target

- Keep the splash background fully opaque while the logo flies to the measured welcome-screen logo target.
- Keep the existing 750 ms logo flight and existing splash artwork.
- After the logo reaches its target, reveal onboarding with a restrained 180-220 ms ease-out crossfade. Start the reveal only after the splash logo bounds align with the measured target within 1 logical point for x, y, width, and height. Keep the splash logo visible through the crossfade so it covers the identical destination logo, then remove the overlay.
- Change the status bar to dark content when the onboarding reveal begins.

### Returning users and destinations without a logo target

- Do not translate the splash logo toward the center of the screen or leave it hovering over Today.
- Fade the splash logo, wordmark, and splash backdrop as the destination screen fades in over approximately 180-220 ms. By the end of the fade, logo and wordmark opacity must be zero and destination opacity must be one.
- Begin both fades together, so the home content becomes clear as the oversized mark disappears.
- Change the status bar to dark content when the destination reveal begins.

The explicit target decision is the source of truth for choosing the spatial transition. A `no-target` decision selects the non-spatial fade. It must not be replaced with an invented center target.

## Startup and state flow

- Keep the current handwritten path reveal, 300 ms fill, 1.55 second hold, hydration gate, and automatic native splash lifecycle unchanged.
- Wait for hydration and splash reveal completion as today.
- Wait for the startup screen to report `target` or `no-target`, then select the corresponding transition.
- Keep the splash overlay mounted until both the logo flight/fade and destination reveal finish.
- Preserve existing recovery and recovery-blocked screens. They use the no-target fade when no logo target is reported.
- Keep the overlay touch-blocking and excluded from accessibility while it is visible; restore destination interaction after exit.

## Motion and accessibility

- Animate only transform and opacity.
- Preserve the current squircle logo shape. Do not morph the shape or add a border.
- Respect reduced motion on both paths. For `target`, omit spatial travel, hold the destination covered while the splash lockup fades out over 100-120 ms, then fade the destination in over 100-120 ms. For `no-target`, crossfade the splash lockup out and destination in together over 100-120 ms. Do not scale or translate in either reduced-motion path.
- Use ease-out curves for entering/revealing content and keep cleanup for timers and animations on unmount.
- Keep the status bar light on the green splash, then switch to dark content at the start of the light destination reveal.

## Scope

This change is limited to startup transition choreography and its provider/context state. It does not change the wordmark animation, logo artwork, onboarding content, Today layout, routes, native launch screen configuration, or splash timing before handoff.

## Validation

- Typecheck, Expo lint, and interface tests pass.
- Add or update source-level checks for pending/target/no-target resolution, the 250 ms measurement fallback, target alignment before reveal, logo/wordmark opacity reaching zero on the no-target path, transition cleanup, both reduced-motion paths, and status-bar timing.
- Inspect first-run onboarding and returning-user Today on iOS and Android simulators where available.
- Confirm that the returning-user recording no longer shows Today content through a large centered splash logo.
- Confirm that first-run logo travel ends at the measured welcome logo before onboarding is revealed.
- Confirm that recovery and recovery-blocked screens still appear after hydration and remain usable.
