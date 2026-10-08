# Intro Stepper Implementation Plan

> **For agentic workers:** Use this plan task-by-task in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the Intro's animated progress dots at the top of the screen while preserving existing native iOS footer controls and their width animation.

**Architecture:** Keep the current `IntroPaginationDot` and accessible progress container in `src/app/index.tsx`. Move only the absolute indicator anchor to a safe-area-relative top position; leave Intro state, onboarding, and `StepFooter` behavior intact.

**Tech Stack:** Expo SDK 57, React Native 0.86, Reanimated 4, `@expo/ui` SwiftUI-backed iOS buttons.

**Spec:** `docs/superpowers/specs/2026-10-04-intro-stepper-reference-design.md`

## Global Constraints

- Change only the Intro progress indicator's placement and the spacing needed to accommodate it in `src/app/index.tsx`.
- Preserve the native iOS Back/Next controls and their existing width, spacing, and animation behavior.
- Keep the onboarding flow and welcome screen unchanged.
- Do not add dependencies or copy challenge-demo code.
- Keep the existing progress accessibility semantics and reduced-motion behavior.
- Do not stage or commit files without the user's separate explicit approval.

---

### Task 1: Move the Intro progress dots to the top

**Files:**
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: `showingIntro`, `introStep`, `introSlides.length`, and `insets.top` already in `OnboardingScreen`.
- Produces: the same noninteractive accessible progress bar and animated dot list, anchored below the safe area.

- [ ] **Step 1: Anchor only the Intro progress container below the safe area**

Replace its inline bottom offset with a top offset, retaining the existing dot children and accessibility value:

```tsx
{showingIntro && (
  <View
    pointerEvents="none"
    accessible
    accessibilityRole="progressbar"
    accessibilityValue={{
      min: 1,
      max: introSlides.length,
      now: introStep,
      text: `Page ${introStep} of ${introSlides.length}`,
    }}
    style={[styles.introPaginationFixed, { top: insets.top + 32 }]}
  >
    {introSlides.map((_, index) => (
      <IntroPaginationDot
        key={index}
        index={index}
        selectedIndex={introStep - 1}
        reduceMotion={reduceMotion}
      />
    ))}
  </View>
)}
```

Remove the old `bottom` positioning from this Intro indicator. Keep its existing centered row style, active-dot spring, and static reduced-motion state. Keep the current Intro content top padding (`insets.top + 100`); it leaves space after the indicator without changing the content layout.

- [ ] **Step 2: Run the required static checks**

Run from `mobile-app/`:

```bash
npx tsc --noEmit
npx expo lint
git diff --check
```

Expected: TypeScript succeeds, lint reports no errors, and the diff check is clean. Report any pre-existing lint warnings without expanding scope.

- [ ] **Step 3: Inspect the Intro in the iOS Simulator**

Open each Intro page, including the first page where Back is hidden, and confirm the dots stay centered below the status-bar safe area, the selected dot updates, and no heading overlaps the indicator. Rotate to landscape and confirm the content scrolls and the footer remains usable. Enable Reduce Motion and confirm the selected dot changes without spring movement. Verify Back/Next native button appearance, width, spacing, and transition remain unchanged.

Expected: only the progress indicator moves to the top; the Intro content, footer, onboarding, and welcome screen retain their existing behavior.
