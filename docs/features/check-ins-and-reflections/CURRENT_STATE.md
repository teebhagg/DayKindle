# Check-ins, reflections and commitments — current state

**Reviewed:** 2026-11-13
**Status:** Source-reviewed in the current working tree, which includes uncommitted changes. No check-in, reflection, or commitment was saved on a device in this pass.
**Evidence labels:** **Verified** (read in source), **Inferred** (reasoned from source, not measured), **Needs Validation** (needs a device, deployment, or provider check), **Not found** (absent from the reviewed source).

## 1. Purpose and problem solved

Plans alone do not explain why a day went the way it did. Daily check-ins capture how a person felt at the start and end of a day; weekly reflections ask what helped, what got in the way, and one adjustment; commitments turn an intention into a target with a deadline. Together they give the person their own context for the next plan.

## 2. Target user and expected outcome

People who want to notice patterns in energy, mood and follow-through, and people who want a stated promise to themselves. Expected outcome: a short morning or evening note in under a minute, a weekly review in a few minutes, and visible progress on commitments linked to real actions.

## 3. Current capabilities and user journey

| Capability | Status | Evidence |
| --- | --- | --- |
| Morning check-in: mood, energy, sleep quality (1–5), intention (500 characters) | **Verified** | `daily-check-in-sheet.tsx`. |
| Evening check-in: mood, energy, productivity, satisfaction (1–5), reflection (1,000 characters) | **Verified** | Same sheet; period toggle; one period saved per tap. |
| The sheet shows that date's planned items and their state | **Verified** | `plannedEntries` list; "Nothing planned for this date. You can still leave a reflection." A check-in never completes items (copy and code). |
| Open a check-in | **Verified** | Progress tab "Daily check-in" card for the selected date (`openProgressCheckIn`). No entry point on Today. |
| Weekly reflection: what went well, what got in the way, one adjustment (500 characters each) | **Verified** | "A moment to reflect" sheet in `home-screen.tsx`, opened from Progress. Keyed by the Monday of the selected date's week. |
| Edit an earlier reflection | **Verified, indirect** | Select a date in that week, then open the sheet ("Update reflection"). |
| Browse past check-ins or reflections | **Not found** | History shows completions and goal events only. |
| Create a commitment: title, target, deadline (required); linked actions count, timeframe, why, reward, "Accountability rule (optional)", goal, linked task or habit | **Verified** | Commitments section on the **Goals** tab (`createCommitment()`). |
| Commitment progress | **Verified** | "N of M linked actions · R remaining · P%" from completed linked occurrences between creation and deadline (`commitmentMetrics`). |
| Edit, close, or delete a commitment | **Not found** | `setCommitments` is only called to add. |
| Check-in reminders from Profile wake and sleep times (daily, morning and evening) | **Source configured; Needs Validation** (updated 2026-11-21) | Opening a reminder opens the matching check-in sheet. See [reminders](../reminders/CURRENT_STATE.md). |

Requirement-level status of commitments and recovery is in [accountability](../accountability/CURRENT_STATE.md).

## 4. Screens, components, state and persistence

- **Components:** `features/home/daily-check-in-sheet.tsx` (check-ins); reflection sheet, commitment form and cards in `features/home/home-screen.tsx`; Progress cards in `progress-tab.tsx`.
- **Types (`home-session.tsx`):** `DailyCheckIn { date, morning?, evening? }`, `WeeklyReflection { weekStart, wentWell, gotInWay, nextAdjustment, updatedAt }`, `Commitment { id, title, target, deadline, timeframe, why, goalId?, linkedSourceId?, linkedSourceType?, requiredActions?, reward?, consequence?, createdAt }`.
- **Persistence:** SQLite `daily_check_ins` (row id = date), `weekly_reflections` (row id = week start), `commitments`. Synced as `checkIns`, `reflections`, `commitments` when sync is on.
- **Analytics:** `daily_check_in_saved { period }`, `weekly_reflection_saved { action }`, `commitment_created { has_goal_link, has_linked_action, linked_action_type?, has_required_actions, has_reward, has_consequence }`. No scores and no text. **Verified.**

## 5. Business rules, validation and calculations

- **Check-in (Verified):** scores default to 3; text is trimmed; morning and evening are stored independently on the same date record, each with its own `updatedAt`. No field is required.
- **Reflection (Verified):** week start = the Monday on or before the selected date. Saving replaces that week's record. Empty reflections can be saved.
- **Commitment (Verified):** title, target and a valid date are required; linked actions must be a whole number > 0 if given. The deadline may be in the past. Metrics count only occurrences whose `sourceId` matches the linked task or habit, dated from the commitment's creation date to the deadline.
- **Save confirmation (Verified):** all three wait for `confirmLocalSave()` before closing and showing a toast; a failure keeps the sheet and the text.

## 6. Loading, empty, success, error and offline states

- **Empty:** check-in sheet with nothing planned: "Nothing planned for this date…"; Progress card label switches between "Start" and "Update". **Verified.**
- **Success:** "Morning check-in saved", "Reflection saved", "Commitment saved", each "Saved on this device." **Verified.**
- **Error:** "Could not save your reflection. Your edits are still here. Try again."; "Could not save on this device. Your edits are still here. Try saving again." (commitments). The check-in sheet stops the spinner on failure and shows no message of its own. **Verified.**
- **Offline:** fully local. **Verified.**

## 7. Dependencies

Planner session and storage; daily planning (planned items, linked occurrences); goals (commitment link); Progress tab (entry points); entity sync; PostHog.

## 8. Functional limitations and confusing flows

- A check-in can only be started from Progress, for whatever date is selected there. A person who wants a morning check-in from Today has to switch tabs. **Verified.**
- There is no list of past check-ins or reflections, and the 1–5 scores are never charted or summarized anywhere. Data is collected but not shown back. **Verified.**
- Commitments live on the Goals tab, while the inventory and some docs place them under Progress. **Verified** in source (Goals tab section).
- A commitment cannot be corrected after saving; a typo in the deadline is permanent. **Verified.**
- A past-dated deadline is accepted without warning. **Verified.**

## 9. Defects and failure modes

- **Verified:** commitments never end. There is no outcome, and expired commitments stay in the list (see accountability COM-006 and outcome rows).
- **Verified:** the check-in sheet shows no inline error when the local save fails; the spinner stops and the sheet stays open.
- **Needs Validation:** keyboard avoidance and scroll in the reflection and check-in sheets with large text.
- **Inferred:** check-in and reflection text is the most sensitive data in the app; it syncs in plain `jsonb` when sync is on (not end-to-end encrypted).

## 10. Performance, accessibility, security and testability

- **Accessibility:** score buttons are labeled with the field and value; multiline inputs have labels ("What went well this week"); close buttons are labeled. Screen-reader behavior is **Needs Validation**.
- **Privacy:** analytics never include scores or text. **Verified.** The Profile sync consent copy names check-ins and reflections explicitly. **Verified.**
- **Testability:** week-start and commitment-metric calculations are inline in the model hook and screen; no tests.

## 11. Missing capabilities and requirements to confirm

- A journal view: past check-ins and reflections by date.
- Trends: average mood and energy by week, and their relation to completion (shown only to the person).
- Edit, close (kept / released / missed), and delete for commitments.
- A Today entry point for the check-in, optionally time-aware (morning vs evening).
- A reflection prefill with the week's counts (accountability improvement 6).

## 12. Proposed improvements

See [improvements](IMPROVEMENTS.md): a Today entry point, a journal and trend view, commitment edit and close-out, inline save errors, and tests.

## Source map

- [Daily check-in sheet](../../../mobile-app/src/features/home/daily-check-in-sheet.tsx)
- [Reflection sheet, commitment form and cards](../../../mobile-app/src/features/home/home-screen.tsx)
- [Week start, saved reflection, commitment metrics](../../../mobile-app/src/features/home/use-home-screen-model.ts)
- [Progress entry points](../../../mobile-app/src/features/home/progress-tab.tsx)
- [Types](../../../mobile-app/src/features/home/home-session.tsx)

## Related pages

[Improvements](IMPROVEMENTS.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Accountability](../accountability/CURRENT_STATE.md) · [Progress and history](../progress-and-history/CURRENT_STATE.md)
