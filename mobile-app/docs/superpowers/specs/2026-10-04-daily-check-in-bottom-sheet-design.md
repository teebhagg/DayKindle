# Daily Check-in Bottom Sheet

## Status

Design approved for iOS and Android on 2026-10-04. Implementation pending.

## Context

The Progress tab currently renders the daily check-in form inline in its insight card. The form includes a morning/evening selector, several ratings, an intention or reflection field, and a save button. Its draft state lives in `HomeScreen` and is reset when the selected date changes. This adds a long form to the Progress page and mixes check-in controls with the progress dashboard.

The app already uses `@expo/ui/community/bottom-sheet` for native sheets on both platforms. Daily check-ins are stored locally by date using the existing `DailyCheckIn` shape. Dated task, habit, and routine occurrences can be associated with active goals.

## Goals

- Leave one clear daily check-in button on the Progress page in place of the inline form.
- Put all check-in details, draft state, save behavior, and day-plan context in a dedicated component outside `src/app/`.
- Show the selected date's planned tasks, habits, and routine steps, with linked goal names and completion state as read-only context.
- Preserve existing morning/evening answers and saved records without a schema migration.
- Keep the flow usable offline on iOS and Android.

## Approaches Considered

1. Move the existing form into a sheet unchanged. This preserves behavior but gives no context about the selected day's plan.
2. Replace check-in with a plan checklist. This is shorter but changes task completion behavior and abandons the current check-in answers.
3. **Recommended:** move the existing form into a dedicated sheet and add a concise, read-only summary of the selected day's planned items and linked goals. This reduces the Progress page, provides day-specific context, and preserves saved data and task completion semantics.

## Design

### Progress entry point

Replace the inline check-in card with a single accessible action. Label it **Check in** when the selected date has neither a saved morning record nor a saved evening record; label it **Update check-in** when either record exists, including when it contains ratings but no text answer. The Progress page does not render check-in fields, ratings, text input, plan detail, or save controls.

### Dedicated sheet component

Create `src/features/home/daily-check-in-sheet.tsx`. It owns the selected date's check-in draft, morning/evening selector, all existing rating and text controls, plan summary, and save action. Keep the existing morning intention and evening reflection fields, alongside their current ratings, as persisted answers. The parent snapshots the currently selected date when opening the sheet and passes that date to the component; it otherwise controls only whether the sheet is open. The sheet reads that date's `DailyCheckIn`, dated entries, and goals from `useHomeSession`.

Use the existing Expo community bottom-sheet package. Give the sheet a scrollable content area, safe-area-aware bottom padding, a visible close button, pan-down dismissal, and native platform back dismissal. Keep controls at or above the platform's minimum touch size and label rating choices for VoiceOver and TalkBack.

The plan context includes the selected date's task, habit, and routine-step occurrences. Each item shows its type, completion state, and linked goal when present. If the selected date has no planned items, show a short empty state and keep the current period's text field available. These rows do not toggle or otherwise mutate task, habit, routine, or goal data.

### State and persistence

Initialize the sheet draft from the existing check-in record for the date passed when the sheet opens. Pin the sheet's displayed date, saved record, plan context, and save target to this opening-date snapshot, even if the selected date behind the sheet changes while it is open. Saving upserts the same morning or evening fields into that date's existing record through `setCheckIns`. Preserve the other period and all existing saved fields. Keep the sheet open after saving, matching current behavior; users can close it explicitly.

Closing without saving discards only the current draft. Reopening restores the saved record. There is no network call or new storage layer. Existing session persistence and storage-recovery feedback remain authoritative.

### Boundaries

- `HomeScreen`: render the CTA, hold sheet-open state, and remove check-in-only draft state and date-reset logic.
- `DailyCheckInSheet`: own check-in presentation, local draft state, plan context, and save/close interactions.
- `home-session.tsx`: retain the current data model and persistence contract; no changes are expected.

## Mobile Checkpoint

**Platform:** iOS and Android.  
**Framework:** Expo SDK 57, React Native, TypeScript.  
**Navigation:** existing Expo Router tab navigation; the sheet stays within the current Progress tab.  
**Offline:** local-only check-in data remains editable offline.  
**Device scope:** phone layouts, with scroll and safe-area handling for short screens and large text.

**MFRI:** platform clarity 5 + accessibility readiness 4 − interaction complexity 2 − performance risk 1 − offline dependence 1 = **5 (moderate)**.

Principles to apply:

1. Keep the main page to one discoverable, accessible entry point; provide a visible close control in addition to gestures.
2. Keep day-specific local persistence and existing saved-answer compatibility.
3. Keep the sheet content scrollable, safe-area-aware, and platform-native.

Avoid:

1. Leaving a long form inline on Progress or rendering a duplicate check-in form.
2. Making sheet dismissal gesture-only or changing planned-item completion from a reflection action.

## Error Handling and Accessibility

- The sheet uses the current local session write path; no remote failure state is introduced.
- If session persistence is in a recovery/error state, preserve the existing app-level recovery message and actions.
- Give the CTA, close control, period choices, rating controls, and inputs meaningful accessibility labels and states.
- Maintain readable text at larger system text sizes and permit vertical scrolling without hiding the save action.
- Ensure Android system back closes the sheet and iOS pan-down dismissal remains available alongside the explicit close button.

## Scope and Non-goals

- No changes to the check-in data shape, task completion rules, weekly reflection, progress analytics, or navigation.
- No new dependency.
- No new test suite or backend work.

## Validation

- Run the repository-required TypeScript and lint checks.
- Manually inspect opening, scrolling, saving, reopening, changing selected dates, and dismissing on iOS and Android.
- Confirm the Progress page shows only the compact check-in entry point and that saved check-ins remain date-specific.
- Preserve all unrelated dirty worktree changes; do not stage or commit without explicit approval.
