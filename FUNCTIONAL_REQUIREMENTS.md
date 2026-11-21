# Functional Requirements Document

## 1. Document Purpose

This document defines the functional behaviour of the application.

Requirement IDs follow:

```text
AUTH
ONB
LIFE
GOAL
MILE
TASK
HAB
ROU
PLAN
COM
ACC
CHK
REV
TMP
JRN
ACH
PROG
INS
AI
REL
PART
NOT
OFF
SYNC
SET
ANA
ERR
ADM
PERF
A11Y
```

---

# 2. Authentication

## AUTH-001
The system shall allow users to create an account using email and password.

## AUTH-002
The system shall allow authentication using Google.

## AUTH-003
The system shall allow authentication using Apple.

## AUTH-004
The authentication architecture shall support passkeys in a future release.

## AUTH-005
The application shall maintain authenticated sessions securely.

## AUTH-006
Users shall be able to sign out.

## AUTH-007
Users shall be able to request account deletion.

## AUTH-008
The application shall support local-only usage where technically feasible.

---

# 3. Onboarding

## ONB-001
The application shall display onboarding after first launch.

## ONB-002
Users shall select one or more life areas.

## ONB-003
Users shall be able to select starter goals.

## ONB-004
Users shall be shown templates relevant to their selected life areas.

## ONB-005
Users shall configure reminder preferences.

## ONB-006
Users shall select an accountability style: gentle, balanced, or strict.

## ONB-007
Users shall be able to enter typical wake and sleep times.

## ONB-008
Users shall be able to skip optional onboarding questions.

## ONB-009
Onboarding should target completion within approximately 3 minutes.

---

# 4. Life Areas

## LIFE-001
Users shall be able to view default life areas.

## LIFE-002
Users shall be able to enable or disable life areas.

## LIFE-003
Users shall be able to create custom life areas.

## LIFE-004
Each life area shall display active goals.

## LIFE-005
Each life area shall expose progress metrics.

---

# 5. Goals

## GOAL-001
Users shall be able to create a goal.

## GOAL-002
A goal shall contain:

```text
id
title
description
lifeAreaId
why
priority
startDate
targetDate
targetType
targetValue
unit
status
```

## GOAL-003
Users shall be able to edit goals.

## GOAL-004
Users shall be able to pause goals.

## GOAL-005
Users shall be able to abandon goals.

## GOAL-006
Users shall be able to complete goals.

## GOAL-007
Goal progress shall be calculated automatically where possible.

## GOAL-008
Users shall be able to override progress manually for qualitative goals.

## GOAL-009
Goals shall support milestones.

## GOAL-010
Goals shall support linked tasks and habits.

## GOAL-011
Users shall be able to set an optional positive numeric target and unit on a goal, and record non-negative current progress.

## GOAL-012
For quantitative goals, the system shall derive `low`, `mid`, or `high` status from progress divided by target: at or below 30%, above 30% and below 70%, and 70% or above, respectively. Status shall be unavailable without a valid target and shall not automatically complete a goal.

## GOAL-013
Dated quantitative goal progress updates shall use the shared occurrence/event envelope and preserve the target value and unit snapshot that were in effect when progress was recorded.

---

# 6. Milestones

## MILE-001
Users shall be able to create milestones.

## MILE-002
Milestones shall belong to one goal.

## MILE-003
Milestones may contain tasks and habits.

## MILE-004
Milestones shall support due dates.

## MILE-005
Milestones shall expose completion state.

## MILE-006
Milestones shall have a title, optional local due date, and a completion state that can be updated without completing the parent goal.

## MILE-007
Tasks and habits may link to one milestone belonging to their linked goal. Removing a milestone shall clear those links without deleting the tasks, habits, or occurrences.

---

# 7. Tasks

## TASK-001
Users shall be able to create tasks.

## TASK-002
Tasks shall support:

- title
- description
- priority
- due date
- scheduled date
- estimated duration
- goal link
- milestone link

## TASK-003
Users shall be able to create subtasks.

## TASK-004
Tasks shall support one-time, daily, weekday, weekend, and selected-weekday recurrence beginning on the scheduled start date.

## TASK-005
Task states shall include planned, completed, missed, skipped, rescheduled, and cancelled.

## TASK-006
Users shall be able to swipe to complete a task.

## TASK-007
Users shall be able to swipe or open an action menu to reschedule.

## TASK-008
The system shall preserve task completion history.

## TASK-009
Users shall be able to define an optional positive numeric target and unit for a task, such as 5 cups or 5 km.

## TASK-010
Users shall be able to record a non-negative quantity against a dated task occurrence. The system shall preserve quantity history by occurrence date.

## TASK-011
For a task with a valid target, the system shall derive status from recorded quantity divided by target: `low` at or below 30%, `mid` above 30% and below 70%, and `high` at or above 70%. Status shall be unavailable when there is no valid target, and shall not implicitly complete the task.

## TASK-012
Integrations, including MCP tools, shall expose target value, unit, dated quantity progress, and derived status using stable values `low`, `mid`, and `high`. User-facing copy may map these to “Meh”, “Okay”, and “Fantastic”.

## TASK-013
Tasks, habits, and routine steps shall share a dated occurrence model while retaining feature-specific definitions.

## TASK-014
Opening a day shall create only occurrences due that day. Occurrence generation shall be idempotent per source, recurrence slot or routine step, and scheduled date; multiple distinct same-day occurrences shall be supported.

## TASK-015
An occurrence shall preserve its scheduled local date, source identity, occurrence key, status, optional progress, and target/unit snapshots where applicable. Occurrence dates shall use the device's local calendar date; timezone changes shall not rewrite dates already stored.

## TASK-016
Scheduled action occurrences shall transition from `planned` to one terminal state: `completed`, `missed`, `skipped`, `rescheduled`, or `cancelled`. Quantity progress updates while planned shall not change occurrence status. Terminal states shall not be silently overwritten.

## TASK-017
At the end of its scheduled local day, each still-planned occurrence shall become `missed`. When the app is closed, it shall reconcile overdue occurrences on next open. Reconciliation shall be idempotent and shall not alter terminal occurrences.

## TASK-018
Rescheduling before end of day shall mark the original occurrence `rescheduled` and create a linked occurrence for the replacement date. Rescheduling a previously missed occurrence shall preserve its `missed` state, record the recovery action, and create a linked occurrence for the replacement date.

## TASK-019
Definition edits shall affect occurrences generated after the edit. Already materialized planned occurrences shall retain their title, date, target, and unit snapshots unless the user explicitly edits or cancels the occurrence. Historical and terminal occurrences shall not inherit definition changes.

## TASK-020
Quantitative occurrence status shall be derived from the target/unit snapshot and recorded progress: `low` at or below 30%, `mid` above 30% and below 70%, and `high` at or above 70%. Missing or invalid targets shall produce no quantitative status. Status shall not imply completion.

---

# 8. Habits

## HAB-001
Users shall be able to create habits.

## HAB-002
Habit types shall include boolean, quantity, and duration.

## HAB-003
Habits shall support recurring schedules.

## HAB-004
The system shall calculate current streak.

## HAB-005
The system shall calculate longest streak.

## HAB-006
The system shall calculate completion percentage.

## HAB-007
The system shall calculate rolling consistency.

## HAB-008
Users shall be able to pause habits.

## HAB-009
Users shall be able to skip an occurrence.

## HAB-010
Users shall be able to reschedule an occurrence.

## HAB-011
Habits shall support boolean, quantity, or duration tracking. Quantity and duration habits may define a positive target and unit; each dated occurrence shall preserve its target, unit, and non-negative progress snapshot.

## HAB-012
Habits shall support boolean, quantity, and duration tracking. Quantity and duration habits may define a positive target and unit and shall record non-negative progress against each dated occurrence, preserving the target and unit snapshots.

## HAB-013
Habits shall support one-time, daily, weekday, weekend, and selected-weekday schedules, generated only for due dates when the user opens that date.

---

# 9. Routines

## ROU-001
Users shall be able to create routines.

## ROU-002
Routines shall contain ordered items.

## ROU-003
Routine items may reference tasks or habits.

## ROU-004
Users shall be able to start a routine.

## ROU-005
Users shall be able to complete routine items sequentially.

## ROU-006
Routine completion percentage shall be tracked.

## ROU-007
MVP routines shall support selecting any combination of weekdays and shall materialize each routine step as a dated occurrence only on selected days.

## ROU-008
Routine steps may define a positive numeric target and unit. Each generated step occurrence shall preserve that target and unit and allow non-negative dated progress to be recorded.

## ROU-009
Users shall be able to create multiple routines from a blank routine or a starter template.

---

# 10. Daily Planner

## PLAN-001
The Today screen shall display all scheduled actions for the current date.

## PLAN-002
The Today screen shall display priorities.

## PLAN-003
The Today screen shall display habits.

## PLAN-004
The Today screen shall display routines.

## PLAN-005
The Today screen shall display active commitments.

## PLAN-006
Users shall be able to change the selected day.

## PLAN-007
Users shall be able to add tasks directly from Today.

## PLAN-008
Users shall be able to complete actions without opening detail screens.

---

# 11. Commitments

## COM-001
Users shall be able to create commitments.

## COM-002
Commitments shall support target, targetCount, period, deadline, reason, reward, and consequence.

## COM-003
Commitments may reference goals.

## COM-004
Commitments may reference habits.

## COM-005
Commitment progress shall be updated automatically where possible.

## COM-006
The system shall detect commitment risk.

## COM-007
The system shall display remaining required actions.

---

# 12. Accountability

## ACC-001
The system shall detect missed scheduled actions.

## ACC-002
The system shall prompt users for a missed-action reason.

## ACC-003
Users may choose a predefined reason.

## ACC-004
Users may enter a custom reason.

## ACC-005
The system shall store missed-action reasons.

## ACC-006
The system shall use repeated reasons for future recommendations.

## ACC-007
The system shall offer recovery actions.

## ACC-008
Recovery actions shall include reschedule, skip, reduce target, pause, replace, and keep plan.

## ACC-009
The application shall avoid shame-based messaging.

## ACC-010
Accountability messaging shall respect the user's selected intensity.

---

# 13. Check-Ins

## CHK-001
Users shall be able to complete a morning check-in.

## CHK-002
Morning check-in shall support mood, energy, sleep quality, and intention.

## CHK-003
Users shall be able to complete an evening check-in.

## CHK-004
Evening check-in shall support mood, energy, productivity, satisfaction, and reflection.

## CHK-005
Check-ins shall remain optional.

## CHK-006
Check-in data shall support local-only storage.

---

# 14. Weekly Review

## REV-001
The system shall generate a weekly review.

## REV-002
The review shall include task completion, habit completion, commitments, goal progress, and selected metrics.

## REV-003
The system shall identify wins.

## REV-004
The system shall identify repeated friction.

## REV-005
Users shall be prompted to reflect.

## REV-006
Users shall be able to create adjustments directly from the review.

---

# 15. Templates

## TMP-001
The application shall include at least 65 templates.

## TMP-002
Templates shall be categorized.

## TMP-003
Each template shall contain one or more of goals, milestones, tasks, habits, routines, commitments, prompts, and review metrics.

## TMP-004
Users shall be able to preview a template.

## TMP-005
Users shall be able to customize templates before activation.

## TMP-006
Template activation shall create user-owned records.

## TMP-007
Updating a template shall not modify already activated plans.

## TMP-008
Templates shall support versioning.

---

# 16. Journaling

## JRN-001
Users shall be able to create journal entries.

## JRN-002
Journal modes shall include free, gratitude, daily reflection, weekly reflection, goal reflection, wins, and lessons.

## JRN-003
Journal entries shall remain private by default.

## JRN-004
Journal content shall not be sent to analytics platforms.

---

# 17. Achievements

## ACH-001
The system shall support achievement definitions.

## ACH-002
Achievements may trigger based on behaviour.

## ACH-003
Achievements shall include consistency, goal completion, habit completion, recovery, and milestones.

## ACH-004
Major achievements shall trigger premium visual feedback.

---

# 18. Progress and Analytics

## PROG-001
Users shall be able to view progress over 7d, 30d, 3m, 6m, and 1y.

## PROG-002
The system shall display habit consistency.

## PROG-003
The system shall display goal progress.

## PROG-004
The system shall display commitment consistency.

## PROG-005
The system shall display task completion rate.

## PROG-006
The system shall support comparison to prior periods.

---

# 19. Recommendations

## INS-001
The system shall support deterministic recommendations.

## INS-002
Recommendations may be generated from repeated missed times, repeated missed days, rescheduling frequency, overload, unusually successful times, and consistency patterns.

## INS-003
Recommendations shall identify supporting data.

## INS-004
Recommendations shall allow users to apply a suggested change.

## INS-005
Recommendations shall be dismissible.

---

# 20. AI

## AI-001
AI provider implementation shall be abstracted behind a common interface.

## AI-002
The mobile application shall not directly expose provider API keys.

## AI-003
AI requests shall be sent through secure backend functions.

## AI-004
AI-supported capabilities may include goal breakdown, weekly summaries, reflective prompts, and recommendation wording.

## AI-005
The product shall remain usable without AI.

---

# 21. Relationships

## REL-001
Users shall be able to create relationship records.

## REL-002
Relationship records may contain name, relationship type, desired contact frequency, last meaningful interaction, important dates, and goals.

## REL-003
Users shall be able to create relationship-related habits.

## REL-004
Relationship data shall remain private by default.

---

# 22. Accountability Partners

## PART-001
Users shall eventually be able to invite accountability partners.

## PART-002
The system shall use granular sharing permissions.

Possible permissions:

```text
view_goal
view_progress
view_misses
send_nudge
view_commitment
```

Sensitive content shall never be shared automatically.

---

# 23. Notifications

## NOT-001
The system shall support local notifications.

## NOT-002
Local notifications shall work without network connectivity.

## NOT-003
Remote push notifications shall be supported.

## NOT-004
Notification types shall include task, habit, routine, check-in, commitment, accountability, and partner activity.

## NOT-005
Users shall be able to configure notification categories.

## NOT-006
Users shall be able to disable notifications.

---

# 24. Offline Behaviour

## OFF-001
Core application functionality shall work offline.

## OFF-002
Offline operations shall write to SQLite.

## OFF-003
Unsynchronized mutations shall be stored in a sync queue.

## OFF-004
The application shall attempt synchronization when connectivity returns.

## OFF-005
Synchronization failures shall not result in data loss.

---

# 25. Sync

## SYNC-001
Each syncable entity shall contain synchronization metadata.

Recommended fields:

```text
id
createdAt
updatedAt
deletedAt
syncStatus
localUpdatedAt
serverUpdatedAt
```

## SYNC-002
Sync status values shall include local, pending, synced, conflict, and failed.

## SYNC-003
The system shall maintain a mutation queue.

## SYNC-004
The system shall support soft deletion.

## SYNC-005
Conflict handling shall avoid silent overwrites.

---

# 26. Settings

## SET-001
Users shall be able to configure theme, accountability style, notifications, haptics, reduced motion, privacy, and sync settings.

## SET-002
Users shall be able to export selected data in a future release.

## SET-003
Users shall be able to delete their account.

---

# 27. Analytics

## ANA-001
PostHog shall track product events.

Examples:

```text
goal_created
habit_completed
template_selected
weekly_review_completed
commitment_created
```

## ANA-002
Analytics shall not include journal content, relationship notes, or private reflections.

---

# 28. Error Monitoring

## ERR-001
Sentry shall collect application errors.

## ERR-002
Sensitive personal content shall not be attached to errors.

## ERR-003
Synchronization failures shall include diagnostic metadata where safe.

---

# 29. Admin Dashboard

## ADM-001
Administrators shall authenticate separately.

## ADM-002
Administrators shall manage templates.

## ADM-003
Administrators shall version templates.

## ADM-004
Administrators shall manage achievements.

## ADM-005
Administrators shall view non-sensitive aggregate product metrics.

## ADM-006
Administrators shall control selected feature flags.

---

# 30. Performance Requirements

## PERF-001
Local task completion should feel instantaneous.

Target: <100 ms perceived response.

## PERF-002
Normal micro-interactions should run smoothly at device refresh rate.

## PERF-003
Animations should avoid blocking the JavaScript thread.

## PERF-004
Large datasets shall use virtualized lists.

---

# 31. Accessibility

## A11Y-001
Interactive elements shall include accessibility labels.

## A11Y-002
Touch targets shall meet platform accessibility recommendations.

## A11Y-003
Reduced-motion preferences shall be respected.

## A11Y-004
Important information shall not rely solely on colour.

---

# 32. Acceptance Criteria for MVP

The MVP is functionally complete when a user can:

1. register
2. complete onboarding
3. select a template
4. create a custom goal
5. create milestones
6. create habits
7. create tasks
8. view today's plan
9. complete actions
10. miss an action
11. provide a reason
12. reschedule
13. complete a daily check-in
14. complete a weekly review
15. view progress
16. use the app offline
17. recover local data after restart
18. optionally sync data
19. receive reminders
20. manage settings
