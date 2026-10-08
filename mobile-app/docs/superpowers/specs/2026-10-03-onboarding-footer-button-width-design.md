# Onboarding Footer Button Width Animation

## Problem

The Continue/Next button appears to snap when its available width changes as the Back button enters or leaves the onboarding footer. The current button and nested pressable use `flex: 1`, which can let Yoga resolve the destination width immediately and compete with Reanimated's layout transition.

## Design

The intro and onboarding screens share one `StepFooter`. Follow the Flexi Button pattern: keep a Reanimated shared progress value and derive the button container's width with `interpolate` between collapsed and expanded endpoints. Define both endpoints independently of Back visibility: expanded width is the measured footer navigation row width; collapsed width is that width minus the Back button's declared 58-point width and the 10-point row gap. Back visibility selects which endpoint progress targets. Initialize progress and measured row width from the first valid layout without animation. Ignore zero-width measurements and keep the last valid row width until a usable measurement arrives.

Re-measure when the available row width changes, including device rotation. Animate the shared row-width value from its current value to a new valid measurement so changing interpolation endpoints cannot jump while progress is between them. When Back visibility changes during an active animation, retarget the shared progress from its current value so the transition continues smoothly. Remove flex growth only from the width-controlled container so layout does not override the interpolated width. Keep the button's inner content filling that container. Keep existing position, height, label, Back button, footer, and onboarding transitions unchanged; the custom layout transition may continue to animate position and height but must not animate width. Do not add the reference component's blur, icon, or text opacity/scale effects.

## Timing and accessibility

- Width growth: animate progress toward the expanded endpoint immediately, linear, 180 ms.
- Width shrink: delay progress toward the collapsed endpoint by 110 ms, then animate linearly for 240 ms.
- Row-width remeasurement: animate the shared row-width value linearly to the new measurement in 180 ms with no delay (100 ms when reduced motion is enabled).
- Reduced motion: no delay and a 100 ms linear progress transition.

## Scope

Apply only to the intro and onboarding footer's Continue/Next button. Keep other screens and controls unchanged. On the first intro slide, where Back is hidden, the button occupies the full row width.

## Validation

- On iOS Simulator and Android Emulator, move forward to show Back and verify the button shrinks gradually after the delay.
- Move back to hide Back and verify the button grows smoothly and faster than it shrinks.
- Repeat forward/back transitions during an active animation and verify the width retargets without snapping.
- Change available screen width and verify the button remains within the footer row.
- Change available screen width during a button animation and verify the width retargets without jumping.
- With reduced motion enabled, verify the width transition has no shrink delay and completes in 100 ms.
- Confirm the label, button height, and other footer transitions remain unchanged.
- Run `npx tsc --noEmit`, `npm run lint`, and `git diff --check`.
