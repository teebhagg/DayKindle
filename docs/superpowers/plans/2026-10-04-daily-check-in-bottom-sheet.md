# Daily Check-in Bottom Sheet Implementation Plan

> **For agentic workers:** Execute this plan inline in the current task, one task at a time. Do not stage or commit files.

**Goal:** Replace the long inline Progress check-in form with one action that opens a compact, scrollable, date-pinned native bottom sheet on iOS and Android.

**Architecture:** Add a dedicated feature component that owns check-in draft state, date-specific plan context, and the existing local save contract. `HomeScreen` snapshots the selected date when the user opens the sheet and renders a single accessible entry button; it no longer owns check-in form state.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `@expo/ui/community/bottom-sheet`, Expo Router, local `useHomeSession` storage.

**Spec:** `docs/superpowers/specs/2026-10-04-daily-check-in-bottom-sheet-design.md`

## Global Constraints

- Platform: iOS and Android.
- Keep check-in data local and editable offline.
- Preserve the existing morning/evening `DailyCheckIn` shape and saved answers.
- Show tasks, habits, and routine-step occurrences for the opening date as read-only context, including completion and linked goal names.
- Keep all check-in fields and plan detail inside the bottom sheet.
- Keep the Goals footer's `Browse templates` and `Create a goal` actions full width and stacked on phones, avoiding the label wrapping shown in the supplied screenshot.
- Add no dependencies, schema changes, or task completion behavior.
- Provide scroll, safe-area padding, a visible close action, pan-down dismissal, and Android back dismissal.
- Preserve unrelated dirty worktree changes; do not stage or commit.

## File Structure

- Create `src/features/home/daily-check-in-sheet.tsx` for the date-pinned native sheet, local form state, existing local save behavior, accessible controls, and read-only plan context.
- Modify `src/features/home/home-screen.tsx` to show one check-in action, snapshot the selected date on open, mount/close the sheet, remove inline form state and rendering, and give the Goals footer actions enough width for their labels.
- Do not change `src/features/home/home-session.tsx`; its current `DailyCheckIn` and persistence contract are the source of truth.

---

### Task 1: Create the dedicated daily check-in sheet

**Files:**
- Create: `src/features/home/daily-check-in-sheet.tsx`

**Interfaces:**
- Consumes: `date: string` for the date captured when the user opened the sheet; `onClose: () => void` from `HomeScreen`.
- Reads: `visualStyle`, `checkIns`, `entries`, and `plans` from `useHomeSession()`.
- Writes: `setCheckIns()` using the existing `DailyCheckIn` shape, replacing only the target date record while preserving the other period.

- [x] Import `CommunityBottomSheet`, `BottomSheetScrollView`, and `BottomSheetView` from `@expo/ui/community/bottom-sheet`; use `useSafeAreaInsets`, `useHomeSession`, `AppTextInput`, and `AppIcon` from existing app modules.
- [x] Define `DailyCheckInSheetProps` with `date` and `onClose`; derive the saved record and all context rows from the `date` prop, not `session.selectedDate`.
- [x] Initialize the period selector to morning when saved morning data exists, otherwise evening when only evening data exists, otherwise morning. Initialize ratings and text from the saved record with the current default rating of `3` and empty strings.
- [x] Render a visible title with the formatted opening date and a close button with a 48-point minimum target. Configure the sheet at index `0`, `snapPoints={['80%', '94%']}`, `onClose={onClose}`, and `enablePanDownToClose`; put content in a scroll view with `keyboardShouldPersistTaps="handled"` and bottom padding `Math.max(insets.bottom, 20) + 20`.
- [x] Render accessible morning/evening radio choices. Keep the existing fields: morning mood, energy, sleep quality, and intention (500-character maximum); evening mood, energy, productivity, satisfaction, and reflection (1000-character maximum). Use five labeled rating choices with at least 48-point targets.
- [x] Filter `entries` to the opening `date` and exclude goal records. Render each task, habit, and routine-step row read-only with its type, completion state, and linked `plans` title when available. If no rows exist, show a short empty message while leaving the selected period's text field available.
- [x] Save only the selected morning or evening values with a new timestamp. Use a functional `setCheckIns` update that finds the existing opening-date record, preserves its other period and all other dates, and keeps the sheet open.
- [x] Style the component with current paper/surface/ink/green colors and `fontFamilyForVisualStyle`; preserve readable system text scaling and vertical scrolling.

### Task 2: Replace the inline Progress form with one date-pinned entry action

**Files:**
- Modify: `src/features/home/home-screen.tsx`

**Interfaces:**
- Produces: `openedCheckInDate: string | null`; clicking the Progress action sets it to the current `selectedDate`, and closing the child sets it back to `null`.
- Consumes: `<DailyCheckInSheet date={openedCheckInDate} onClose={...} />` while `openedCheckInDate !== null`.

- [x] Import `DailyCheckInSheet` and add only the parent state needed to represent the opening date / closed state.
- [x] Retain `checkIns` for the entry-point label and remove `setCheckIns` from `HomeScreen`'s session destructure.
- [x] Remove `checkInPeriod`, all morning/evening rating and text draft state, `activeCheckIn`, the parent `saveCheckIn`, and selected-date change reset code that existed only for check-in drafts.
- [x] Replace the Progress `progressInsightCard` form with one accessible full-width `Pressable` (minimum 48-point height). Its label is `Check in` if the selected date has neither a morning nor evening record and `Update check-in` if either record exists. Show only concise entry-point copy and a trailing affordance; do not show form fields or planned-item detail on Progress.
- [x] Mount the dedicated sheet only while an opening date is set, passing that date snapshot. Do not update the snapshot when `selectedDate` changes behind the modal.
- [x] Remove the parent-only `RatingPicker` helper and keep styles/imports that are still used elsewhere.

### Task 3: Fix the Goals footer action layout from the supplied screenshot

**Files:**
- Modify: `src/features/home/home-screen.tsx`

- [x] Change `goalFooterActions` from a side-by-side row to a vertical stack with a 10-point gap.
- [x] Give each existing `width="full"` button a `width: '100%'` style and remove its flex growth so neither full-width child is squeezed into half the row.
- [x] Keep the labels and destinations unchanged; confirm both iOS and Android share these React Native styles.

### Task 4: Run required static validation and inspect the scoped diff

**Files:**
- No additional file changes expected.

- [x] Run `npx tsc --noEmit` from `mobile-app/`; no diagnostics point to the changed files. The full project check still reports existing errors in `src/app/index.tsx`, `src/features/account/account-provider.tsx`, `src/features/account/auth-service.ts`, and `supabase/functions/delete-account/index.ts`.
- [x] Run `npx expo lint` from `mobile-app/`; the full project lint still reports an existing error in `src/features/account/account-provider.tsx`. Scoped ESLint reports no errors in the changed files; it reports three unused-variable warnings in existing `home-screen.tsx` sections outside this change.
- [x] Review the changed source. Confirm there is no inline check-in form, no changed `DailyCheckIn` shape, no plan-row mutation, the Goals footer labels have full-width buttons, and no staged/committed work.

Interactive device inspection could not be completed in this run: `adb devices` found no connected Android emulator/device, and CoreSimulator became unavailable when checking the booted iPhone simulator app list.

## Self-Review

- Spec goals map to Task 1 (sheet, preserved answers, plan context, offline save, accessibility, date pinning) and Task 2 (single Progress entry button and removal of inline details). The screenshot's Goals footer wrapping is addressed in Task 3.
- Task 4 covers repository-required TypeScript and lint checks; the request does not authorize adding or running test suites.
- The existing local session and `DailyCheckIn` data shape are unchanged; the component handles both saved and new records through one date-scoped upsert.
