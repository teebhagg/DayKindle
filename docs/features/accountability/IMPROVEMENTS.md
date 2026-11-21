# Accountability — improvements

**Reviewed:** 2026-11-12
**Status:** Proposals. Nothing here is implemented. The [implementation plan](IMPLEMENTATION_PLAN.md) turns the selected items into ordered work.

Priority reflects user value and how much later work depends on the item. P1 items unblock partners and the [Services-as-Software plan](../../../Services-As-Software.md).

## Solo engine

| # | Priority | Improvement | Why | Guardrail |
| --- | --- | --- | --- | --- |
| 1 | P1 | **Close commitments.** Add an outcome (`active`, `kept`, `missed`, `released`) and ask once, after the deadline, how it went. | Today a commitment never ends. "Commitments kept" is a PRD success metric (§35) and cannot be measured. | "Released" is a normal outcome, not a failure. Do not auto-mark `missed` without asking; the user may have done the work and not logged it. |
| 2 | P1 | **Detect commitment risk (COM-006).** Compare remaining required actions with the remaining scheduled opportunities before the deadline. | A user should hear "2 of 3 sessions left, 2 chances left this week" while there is still time to act. | Opportunities must come from the linked definition's recurrence rule, because future occurrences are not pre-created. Show risk as information, never as a red failure state. |
| 3 | P1 | **Extract a pure accountability module** with unit tests. | Reason, recovery, and commitment logic sits inside the ~1,500-line `home-screen.tsx` (TD-01). Partners and services need the same rules on the server side. | Behavior must not change during extraction. |
| 4 | P2 | **Use reasons in recommendations (ACC-006).** Add a recommendation when one reason dominates recent misses for one action, such as "Low energy on 3 of the last 4 evening runs". | The data is already collected but only used inside one form. | "Prefer not to say" and custom text never appear in recommendation copy; custom reasons count only as "Other". |
| 5 | P2 | **Accountability intensity (ACC-010).** Add a Profile setting: Gentle (default), Balanced, Direct. It changes prompt timing and wording, not penalties. | The type exists, and the requirement is unmet. | Rename "strict" to "Direct" in copy. No tone may shame, threaten, or use streak loss. Do not add it to onboarding (PRD §11). |
| 6 | P2 | **Weekly reflection summary.** Prefill the weekly reflection with counts: actions missed, top reason categories, recoveries chosen, commitments closed. | REV-002/REV-004 ask for repeated friction in the review. | Prefill numbers, never the user's own prior text. |
| 7 | P3 | **Recovery follow-through.** Track whether a recovery occurrence (rescheduled or reduced) was then completed. | This is the honest measure of whether recovery works: the "recovery success rate". | Count locally; send only aggregate categories to analytics. |
| 8 | P3 | **Missed-action prompt timing.** Optionally show the gentle-reset sheet once on the first open of the day, per intensity setting. | ACC-002 says the system "shall prompt". Today the prompt depends on the user noticing the list. | Gentle shows the list only, Balanced shows a sheet once a day, Direct may add a local notification. Always dismissible. |

## Accountability partners

| # | Priority | Improvement | Why | Guardrail |
| --- | --- | --- | --- | --- |
| 9 | P1 | **Invite-only partners with share previews.** A user invites a person by link, chooses exactly which commitments or goals to share, and sees a preview of what the partner will see before confirming. | PART-001/002; PRD §31 "Show which data is included". | No discovery, search, contacts upload, or public profiles (PRD §34 non-goals). |
| 10 | P1 | **Share without syncing.** The device publishes a small, permission-filtered summary. The partner never reads planner rows. | A user who keeps planner sync off can still have a partner. It also limits what the server holds for sharing. | The projection never contains reflections, check-ins, journal text, custom reasons, rewards, or consequences unless a future permission explicitly allows it. |
| 11 | P1 | **Preset nudges.** A partner sends one of a few fixed encouragements ("Thinking of you", "You've got this", "Want to talk?"). | `send_nudge` permission. Fixed text removes most harassment risk in v1. | Rate-limited, quiet hours respected, and the recipient can mute or end the partnership at any time without the partner being told why. |
| 12 | P1 | **Remote push delivery.** Store Expo push tokens server-side and send partner notifications from an Edge Function. | Required for nudges and partner activity (NOT-003/004). | Lock-screen text never includes commitment titles by default. |
| 13 | P2 | **Partner activity digest.** A weekly "how your people are doing" summary for partners. | Lets partners help without opening the app daily. | Built only from what each owner shared. |
| 14 | P2 | **Safety controls.** Block, report, and end partnership from both sides; age gate for partner features. | The app is offered to people aged 13 and older. Contact features between adults and minors need a policy. | Owner decision needed. The proposed default is to limit partners to accounts that confirm they are 18 or older until a teen policy exists. |
| 15 | P3 | **Circles.** A small group (up to about 8) sharing commitments with each other. | Common pattern for study groups, faith small groups, and teams. | Builds on the same grants. No leaderboards (PRD §34). |

## Measurement

Add these to the private dashboard as **aggregates only** (no titles, no per-user rows):

- share of missed occurrences that get a reason within 72 hours;
- share of missed occurrences that get a recovery action, and the recovery success rate;
- commitments closed by outcome (kept, released, missed);
- partner invites created and accepted, active partnerships, nudges per active partnership per week, and partnerships ended within 14 days (a harm signal).

Do not use the often-quoted "95% success with an accountability partner" statistic in copy. Its original source cannot be traced to a published study.
