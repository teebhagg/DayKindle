# Intro Stepper Reference Design

## Status

Approved design direction: 2026-10-04. Implementation is gated on user review of this document.

## Context

The shared Intro and onboarding screen is implemented in `src/app/index.tsx`. Intro pages currently show centered animated progress dots above the bottom footer. The active dot widens and changes color; the footer already uses native iOS Back/Next buttons and animates the Next button width when Back appears or disappears.

The Day 25 reference describes a top progress view with animated dots and split navigation buttons that resize and reposition. Adapt that pattern to the existing Intro rather than importing the challenge demo. Keep this change limited to Intro.

## Goals

- Move the existing Intro page indicator to the top of the content area, below the safe area.
- Preserve clear current-step feedback, page accessibility information, and reduced-motion behavior.
- Preserve the native iOS Back/Next controls and their existing width, spacing, and animation behavior.
- Keep the onboarding flow and welcome screen unchanged.

## Design

Place the centered dot indicator in the reserved top area of Intro pages, below the status-bar safe area and above the scrollable Intro content. Keep the current active-pill treatment: the selected dot widens and uses the brand green; the others remain small muted dots. Keep the existing spring response for normal motion and the static selected state when Reduce Motion is enabled.

Keep the existing progress-bar accessibility semantics (`min`, `max`, current page, and “Page n of N” text). The dots remain informational and do not become tap targets. Keep the footer's current native iOS Back/Next buttons, Back visibility, content, and width interpolation unchanged. The shared non-iOS implementation retains the same step behavior.

Reserve sufficient top padding in the Intro scroll content so the indicator does not overlap the first heading. Position the indicator using the safe-area inset rather than a fixed screen coordinate, and keep it centered on narrow layouts and after rotation.

## Scope and non-goals

- Change only the Intro progress indicator's placement and the spacing needed to accommodate it in `src/app/index.tsx`.
- Do not change onboarding progress, footer controls, Intro copy/artwork, the welcome screen, or the existing button-width animation.
- Do not add dependencies or copy challenge-demo code.
- Do not add blur, decorative movement, or extra progress labels.

## Validation

- Verify all Intro pages update the selected dot and the accessibility value.
- Verify the dots sit below the safe area without overlapping content on a compact iPhone and after rotation.
- Verify native iOS Back/Next controls and the existing footer width transition are unchanged.
- Verify the selected dot stays static with Reduce Motion enabled.
- Run the repository-required `npx tsc --noEmit`, `npx expo lint`, and `git diff --check`; inspect the Intro in the iOS Simulator.

## Reference

- [Day 25: Onboarding Steps](https://github.com/hewad-mubariz/reactnative-50-days/blob/main/README.md#day-25-onboarding-steps)
