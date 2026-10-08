# Reacticx Sign-In Tray Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the guest sign-in flow's native community BottomSheet with the existing Reacticx Tray and make its header and content consistent on iOS and Android.

**Architecture:** Keep the account flow in `GuestWorkspaceSignInTray`, but render it inside the existing local compound Tray. Use Tray navigation for provider selection and name confirmation, the shared Tray scroll view for overflow, and the app's own palette and selected typography for all content.

**Tech Stack:** Expo SDK 57, React Native 0.86, local Reacticx Tray source, Reanimated 4, Gesture Handler, Worklets, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-07-reacticx-sign-in-tray-design.md`

## Global Constraints

- Replace only `GuestWorkspaceSignInTray`; do not migrate unrelated app sheets.
- Preserve OAuth, local persistence, sync-consent semantics, and existing user-visible copy.
- Reuse the local Tray source and installed Reanimated, Gesture Handler, and Worklets dependencies. Do not install another tray package or refresh copied source.
- Support iOS and Android in the shared React Native flow.
- Keep the light app palette, green accent, selected visual-style typography, and 44-point minimum icon actions.
- Do not stage or commit files without the user's separate explicit permission.

---

### Task 1: Move the guest sign-in flow to the shared Tray

**Files:**
- Modify: `src/features/account/guest-workspace-sign-in-tray.tsx`
- Reference: `src/shared/components/organisms/tray/index.tsx`

**Interfaces:**
- Consume `Tray`, `useTray`, `Tray.Content`, `Tray.View`, `Tray.Header`, and `Tray.ScrollView` from the existing local Tray export.
- Preserve the public `GuestWorkspaceSignInTrayHandle` interface: `{ open: () => void }`.
- Preserve `confirmName(enableSync: boolean)` and all existing auth and persistence calls.

- [x] Replace imports of `BottomSheet`, `BottomSheetScrollView`, and `BottomSheetMethods` with the local Tray compound component and `useTray`.
- [x] Keep the flow's `open()` ref API and ensure each new open starts on the provider view; closing by backdrop, drag, or close control must close the controlled flow and allow reopening.
- [x] Move `view`, `setView`, and `close` access to Tray navigation context while preserving the provider and confirmation branches.
- [x] Put content in the Tray's scrollable region and size its max height to the available viewport so the input and consent actions can scroll into view.
- [x] Remove obsolete native BottomSheet refs, snap points, and background styling.

### Task 2: Correct hierarchy, app styling, and behavior checks

**Files:**
- Modify: `src/features/account/guest-workspace-sign-in-tray.tsx`
- Test: `scripts/test-interface.cjs` only if a focused source-level regression can be added without mocking the native animation stack

**Interfaces:**
- Continue using the existing `TrayCopy`, app `useTheme`, `useThemedStyles`, `VisualStyleContext`, and `AppTextInput`.
- Use the Tray `palette` prop to pass app theme colors for surface, border, handle, text, muted text, and scrim.

- [x] Change the tray header to a single row with a 44-point left back/placeholder control, centered title/subtitle, and a 44-point right close control.
- [x] Use Tray's `Header`, `Back`, and `Close` primitives; keep custom copy to preserve the app's selected typography.
- [x] Keep the name field, inline validation, error feedback, provider loading/disabled states, and the two explicit sync choices intact.
- [x] Constrain the header copy and scroll view so text can wrap within the available viewport; size icon controls to 44 points.
- [x] Run `npx tsc --noEmit`, `npx expo lint`, `node --test scripts/test-interface.cjs`, and `git diff --check`.
- [ ] Inspect tray presentation, reopen/reset behavior, keyboard-visible form, backdrop dismissal, drag dismissal, and enlarged text on both platforms. The iOS simulator's current build has cloud sign-in disabled, so the Tray itself could not be opened; no Android device is attached.

## Self-review

- Spec coverage: component replacement and scope are covered by Task 1; app styling, header hierarchy, all preserved states, accessibility sizing, and validation are covered by Task 2.
- No code placeholder steps remain. The interface test is conditional because the repository's current harness is source-level and does not mount the native gesture/animation tree.
- No commit step is included because repository instructions require explicit user permission before staging or committing.
