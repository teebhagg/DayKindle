# Check-ins, reflections and commitments — improvements

**Reviewed:** 2026-11-13
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) orders the selected items. Commitment outcome, pace and reason-summary work is specified in the [accountability plan](../accountability/IMPLEMENTATION_PLAN.md) Stage A and is referenced, not repeated, here.
**Evidence basis:** [current state](CURRENT_STATE.md) and the source paths it lists.

Priority: **P1** fixes a silent failure or a dead end; **P2** shows people the value of what they wrote; **P3** is an enhancement. Effort: S, M, L.

## A. Fix defects

### A1. Show an inline error when a check-in fails to save — P1, S

- **Evidence:** **Verified** — the catch block in `saveCheckIn()` only stops the spinner.
- **Approach:** reuse the reflection wording: "Could not save your check-in. Your answers are still here. Try again." with a retry button.
- **Tests:** forced save failure shows the message and keeps values; retry succeeds.

### A2. Edit and delete commitments — P1, S

- **Evidence:** **Verified** — commitments can only be added.
- **Approach:** "Edit" reopens the form with values; "Delete" asks for confirmation. Outcome and close-out follow accountability A2.
- **Tests:** edit keeps `id` and `createdAt`; delete removes and syncs a tombstone.

### A3. Warn on a past deadline — P2, S

- **Evidence:** **Verified** — any valid date is accepted.
- **Approach:** set the date picker's minimum to today for new commitments; allow past dates only when editing an existing one.

## B. Refine existing capabilities

### B1. Check in from Today — P2, S

- **Evidence:** **Verified** — the only entry point is the Progress card.
- **Approach:** a compact card on Today: "Morning check-in" before 12:00, "Evening check-in" after 17:00, hidden once that period is saved. Opens the existing sheet on that period.
- **Guardrail:** dismissible for the day; never a modal.

### B2. Reflection prefill with the week's numbers — P2, M

- Same as accountability improvement 6: completed, missed, rescheduled counts and top reason categories for the week, shown above the three fields. Never prefill earlier text.

### B3. Avoid saving empty reflections — P3, S

- **Evidence:** **Verified** — an all-empty reflection saves and counts as "reflection adoption" in the dashboard.
- **Approach:** require at least one non-empty field; keep the button disabled otherwise.

## C. New capabilities

### C1. Journal view — P2, M

- **Why:** people write check-ins and reflections but cannot read them back.
- **Approach:** a "Journal" screen from Progress (and History) listing dates with a check-in or reflection, newest first, with the scores as small dots and the text. Filter: check-ins, reflections, both.
- **Privacy:** on-device rendering only; no analytics beyond `journal_opened`.

### C2. Personal trends — P3, M

- **Approach:** in Progress, a "How you've felt" card with weekly average mood and energy for the selected range, and the completion rate on high-energy vs low-energy days. Show only with at least 5 check-ins in range. Plain-language caption; no diagnosis.
- **Guardrail:** wording avoids clinical claims ("You tended to complete more on days you rated energy 4–5").

### C3. Optional check-in reminder — P3, S

- A preset in the reminders form ("Evening check-in at 21:00") that opens the sheet from the notification. Depends on notification deep links (see [reminders](../reminders/IMPLEMENTATION_PLAN.md)).

### C4. Tests for week and metric rules — P1, S

- Move week-start and `commitmentMetrics` into pure functions (the accountability plan's `accountability.ts` covers commitments) and test: Sunday/Monday boundaries, year end, and linked counts at the creation date and deadline.

## Measurement

Aggregates only: share of active users with any check-in in a week; morning vs evening split; reflection saves per active user per month (non-empty only, after B3); commitments created, edited, and closed by outcome. Never scores or text.
