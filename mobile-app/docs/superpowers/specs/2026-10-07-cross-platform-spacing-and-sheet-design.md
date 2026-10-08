# Cross-platform spacing and sheet layout design

## Status

Design approved in conversation; awaiting written-spec review before implementation.

## Context

DayKindle is a warm, calm personal planning app built with Expo Router and React Native. Its Today, Goals, Progress, Profile, History, template, onboarding, and account surfaces use a shared theme and typography, with separate iOS and Android navigation implementations. The attached iPhone screenshots are evidence of two visible issues: the weekly reflection sheet header lets its title crowd the close control, and the “A few ideas” recommendation actions read as plain text rather than distinct controls. The user also asked for even, intentional spacing across all screens on iOS and Android.

The screenshots are references for the requested defects and visual tone; they do not contain implementation instructions. Keep the current light appearance, chosen typography, product copy, and existing planner behavior.

## Goals

- Prevent bottom-sheet content and controls from clipping or overflowing on both platforms, with the reflection header as the first concrete fix.
- Make recommendation actions on Today clearly actionable, with a visibly primary action and a quieter secondary dismissal.
- Establish a repeatable spacing rhythm across all app screens and routes, including onboarding and sheets, while retaining intentional density differences between related controls and distinct sections.
- Preserve DayKindle’s existing colors, selected font style, navigation, data semantics, and native platform conventions.
- Verify behavior at narrow phone widths and with larger system text; do not claim device verification without inspecting both platform builds.

## Non-goals

- Rebranding, replacing fonts/colors, adding dark mode, changing app navigation, or changing planner/check-in/recommendation data behavior.
- A blanket increase to every margin or padding value.
- New animations or decorative card wrappers.
- Tablet-specific redesign or accessibility certification.

## Proposed design

### 1. App-wide spacing rhythm

Audit the shared layout primitives and all user-facing routes before editing. Use the existing spacing scale in `src/constants/theme.ts` as the baseline and consolidate repeated layout roles only where current values are arbitrary or inconsistent. Define semantic roles for screen insets, section separation, grouped content, and compact control gaps if the existing scale cannot express those roles clearly. Keep the scale based on 4-point increments; preserve deliberate platform safe-area and tab-bar insets.

Apply the rhythm route by route: Today, Goals, Progress, Profile, History, templates and template details, onboarding, auth/account flows, and their sheets. Use these roles as review criteria, then tune by content rather than repeating one gap everywhere:

| Layout role | Baseline |
| --- | ---: |
| Screen horizontal inset | 20–24 pt/dp |
| Label to its control/content | 8 pt/dp |
| Related controls or rows | 12–16 pt/dp |
| Distinct sections | 24–32 pt/dp |
| Minimum gap between separate touch targets | 8 pt/dp |

Keep values on the existing 4-point scale where practical. Record each route in an implementation checklist with its screen inset, section rhythm, and any intentional exception. Group labels with their content; separate unrelated sections more generously; avoid wrapping content in additional cards solely to create spacing. Keep visual hierarchy from the existing typography, color, and spacing rather than changing the brand.

### 2. Bottom sheets

Keep the existing native sheet component and internal scroll/keyboard-avoidance patterns. Review every sheet for bounded layout, internal scrolling, safe-area bottom padding, and controls reachable above the keyboard. For the weekly reflection sheet, make the date label a compact first row and place the title and close action in a second row. Give close a stable platform-sized hit target (at least 44 pt on iOS and 48 dp on Android); constrain the title to the remaining width and permit wrapping/scaling without pushing close off-screen. Keep the explanatory copy below the title row. Do not solve overflow by shrinking text below its accessible size or disabling scrolling.

Use platform-aware touch targets (at least 44 pt on iOS and 48 dp on Android) while maintaining one visual component system. Respect native back/dismiss behavior and the existing pan-to-close affordance.

### 3. “A few ideas” recommendation actions

Keep the recommendation content and action semantics unchanged. Render the apply/review action as an unmistakable filled primary control using the existing green/on-accent palette, with a minimum platform touch target. Render “Dismiss” as a quiet secondary action with adequate spacing and its existing accessibility label. Let the action group adapt to available width: keep the controls horizontal only when their measured intrinsic widths (including padding and any icon) plus an 8 pt/dp gap fit within the card’s usable width at the current font scale. Otherwise stack them, primary first and full-width. Preserve a 48 pt/dp minimum control height and at least an 8 pt/dp gap between separate targets. Ensure labels wrap safely without clipping and preserve dynamic font scaling.

### 4. Platform behavior

Unify content structure, semantic spacing, and action hierarchy. Preserve platform-specific tab navigation, safe-area handling, keyboard avoidance, touch feedback, and native sheet dismissal. Do not force iOS and Android into identical system chrome when their navigation implementations differ.

## Implementation boundaries

- Shared theme and reusable components should own spacing roles and control sizing when the same pattern appears across screens.
- Screen-level layout remains responsible for content-specific grouping and density.
- Avoid unrelated component rewrites, dependency additions, or data/state changes.
- Preserve all pre-existing worktree changes; do not stage or commit as part of implementation without the user’s explicit permission.

## Acceptance criteria

1. On the reflection sheet, the title and close control never overlap or clip at the reference screenshot’s 402 × 874 pt iPhone 17 Pro logical viewport, a 320 pt/dp narrow-phone viewport, or the largest available iOS Dynamic Type and Android 200% font-scale settings.
2. Reflection inputs and the save action remain reachable by scrolling, including with the keyboard visible; bottom content clears the safe area.
3. The Today recommendation’s primary action has a visible filled treatment and its secondary dismissal is clearly quieter; both have accessible hit areas and remain legible at large text sizes and narrow widths.
4. Every user-facing app route listed above is checked against the spacing-role table and recorded in a route-by-route checklist. Intentional density differences are documented in code where non-obvious.
5. iOS and Android retain their respective navigation and dismissal behavior; no touch target falls below platform minimums.
6. No planner data, copy, or action outcomes change.
7. Run lint and typecheck. Inspect the affected Today and sheet routes on iOS and Android; report a separate status for each platform covering build, visual inspection, and interaction checks. If a platform cannot be built or inspected, record the concrete blocker and leave that verification explicitly unconfirmed.

## Validation plan

- Static: lint, TypeScript check, and `git diff --check`.
- Visual: inspect Today and the reflection sheet at 402 × 874 pt (matching the supplied iPhone 17 Pro screenshot), 320 pt/dp wide, maximum supported text scaling, and Android; verify both primary/secondary actions and sheet header geometry.
- Interaction: open/close sheet, scroll through all reflection fields, focus inputs and save with keyboard visible, and activate/dismiss the recommendation.
- Accessibility: inspect labels/roles, minimum touch areas, and large text scaling.

## Design review notes

The app already has a shared semantic palette, typography system, a spacing scale, and platform-specific tab layouts. The design uses those as the source of truth. It deliberately avoids applying web landing-page patterns to native app screens; recommendations from the UI design system search are subordinate to the existing native product language and the screenshot evidence.
