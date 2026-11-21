# Product Requirements Document

## 1. Document Information

**Product Name:** TBD  
**Working Category:** Personal Growth Operating System  
**Platforms:** iOS and Android  
**Primary Framework:** React Native + Expo  
**Document Type:** Product Requirements Document  
**Status:** Draft v1.0

---

# 2. Product Overview

## 2.1 Product Vision

The application is a personal growth operating system designed to help users intentionally improve their lives through planning, execution, tracking, accountability, reflection, and continuous adjustment.

The product combines:

- goal planning
- habit tracking
- task management
- routines
- personal accountability
- lifestyle improvement
- progress analytics
- journaling
- interpersonal development
- achievement tracking
- intelligent recommendations

The core value proposition is not simply helping users record what they intend to do.

The application should continuously compare:

> What the user intended to do

against:

> What the user actually did

and use that gap to help the user improve future behaviour.

---

# 3. Product Philosophy

The product follows the behavioural loop:

```text
DEFINE
↓
PLAN
↓
COMMIT
↓
ACT
↓
TRACK
↓
REFLECT
↓
ADJUST
↓
IMPROVE
```

The product should behave as both:

1. a planning tool
2. an accountability partner

The application should avoid becoming:

- a generic to-do application
- a simple streak tracker
- an overly gamified productivity application
- a judgmental life scoring system
- a generic AI chatbot
- a social network

---

# 4. Product Goals

## 4.1 Primary Goals

The product must allow users to:

1. define areas of life they want to improve
2. create measurable goals
3. break goals into milestones
4. create tasks, habits, and routines
5. schedule actions
6. make explicit commitments
7. track execution
8. record reasons for missed actions
9. recover from missed plans
10. review progress regularly
11. receive actionable recommendations
12. observe long-term personal development

## 4.2 Secondary Goals

The product should eventually help users:

- identify behavioural patterns
- improve interpersonal relationships
- maintain accountability with friends or colleagues
- receive intelligent coaching
- automatically track selected behaviours
- visualize life progress over months and years

---

# 5. Core Product Differentiator

The core differentiator is the **Accountability and Adaptation Engine**.

Most productivity tools support:

```text
Plan → Track
```

This product supports:

```text
Plan
↓
Commit
↓
Execute
↓
Measure
↓
Explain Success or Failure
↓
Adjust Behaviour
↓
Measure Again
```

The application should gradually learn:

> What works for this specific user?

---

# 6. Target Users

## 6.1 Primary Persona

A self-directed adult who wants to intentionally improve multiple areas of life.

Typical characteristics:

- goal-oriented
- uses productivity tools
- struggles with consistency
- wants accountability
- values personal growth
- wants a central place for life goals
- prefers mobile-first interaction

## 6.2 Secondary Personas

### Professionals
- career development
- certifications
- job search
- deep work
- networking

### Students
- study schedules
- assignments
- exams
- skill development

### Fitness-focused users
- workouts
- sleep
- movement
- routines
- consistency

### Relationship-focused users
- communication
- family contact
- relationship habits
- social goals

### Personal development users
- discipline
- consistency
- confidence
- learning
- mindfulness

---

# 7. Life Areas

The application must support predefined and custom life areas.

Default areas:

1. Health
2. Fitness
3. Sleep & Recovery
4. Career
5. Finance
6. Learning
7. Relationships
8. Family
9. Social
10. Productivity
11. Personal Development
12. Mental Wellbeing
13. Spirituality
14. Lifestyle
15. Custom

---

# 8. Product Navigation

Primary bottom navigation:

```text
Today
Goals
Progress
Coach
Profile
```

Possible floating action control:

```text
        Habit
          ↑

Task ←    +    → Goal

          ↓
       Journal
```

---

# 9. MVP Scope

The MVP must include:

1. authentication
2. onboarding
3. life areas
4. goals
5. milestones
6. tasks
7. habits
8. routines
9. daily planner
10. commitments
11. reminders
12. daily check-ins
13. missed-action reflection
14. recovery/replanning
15. weekly review
16. progress dashboard
17. journaling
18. achievements
19. starter templates
20. offline-first storage
21. optional cloud synchronization
22. push notifications
23. local notifications
24. privacy settings
25. basic recommendation engine

## MVP delivery foundation: shared dated occurrences

Tasks, habits, and routine steps shall use a shared dated occurrence history. Their definitions remain feature-specific. Goals remain outcome records; dated goal progress updates use the same event envelope without scheduled-action statuses.

- Create occurrences on demand when a user opens a day; do not pre-create future recurring occurrences.
- Occurrence generation must be idempotent per source, recurrence slot/step, and scheduled date, including multiple valid actions on one day.
- Use the device's local calendar date and timezone for scheduling. Preserve dates already assigned to historical occurrences if the timezone changes.
- Mark still-planned occurrences missed at the end of their scheduled local day. If the app was closed, reconcile overdue occurrences the next time it opens.
- Keep the original occurrence when it is missed, skipped, or rescheduled. Rescheduling creates a linked occurrence on the replacement date. Rescheduling before day end marks the original rescheduled; rescheduling after it is missed keeps its missed state and records the recovery action.
- Definition edits apply to future occurrences. Existing planned occurrences change only through an explicit occurrence edit; terminal/history records do not silently inherit new definition values.
- Keep quantitative status derived from the target snapshot in effect when progress was recorded: Meh at or below 30%, Okay above 30% and below 70%, Fantastic at or above 70%.

---

# 10. MVP User Journey

```text
Install
↓
Intro slides
↓
Choose Google, Apple, Guest, or Skip
↓
Short onboarding (about 60 seconds)
↓
Today Dashboard
↓
Plan and review
```

Intro **Let’s begin** and **Skip** both continue to the account-choice screen. Google, Apple, and Guest continue to onboarding. Account-choice **Skip** opens Home as a fresh Guest with no previous guest data loaded; the prior local session must be retained separately so it can be restored.

---

# 11. Onboarding Requirements

Setup after account choice should take about 60 seconds. Keep all selections optional and limit setup to three screens:

1. Choose life areas and, optionally, one matching starter goal. The starter goal becomes a Goal and keeps its first-step description.
2. Choose a visual style. If skipped, use the Refined (formal) style.
3. Optionally choose a neutral weekday or weekend routine template. Apply it to matching days and let the user customize it later in Templates.

Do not ask for wake time, bedtime, work/study windows, or accountability tone during onboarding unless those answers change app behavior. Do not add a separate onboarding recap screen.

Guest data stays on the device. Signed-in users must make an explicit choice before planner data—including life areas, goals, tasks, habits, routines, commitments, reminders, progress history, check-ins, and reflections—can sync. A user may keep an account while keeping planner data local.

When a guest connects an account, import the device copy when the cloud copy is empty. If both copies contain data, ask which copy to use, preserve both until confirmed, and use revision checks to prevent silent overwrites.

---

# 12. Goal Management

Users must be able to create goals.

Each goal may contain:

```text
title
description
lifeArea
whyItMatters
priority
startDate
targetDate
targetType
targetValue
unit
status
progress
milestones
tasks
habits
commitments
```

Goal statuses:

```text
draft
active
paused
completed
abandoned
archived
```

For quantitative goals, users can set a positive numeric target and unit, such as running 100 km or reading 12 books, and record current progress. Show status from progress divided by target: low (Meh) at or below 30%, mid (Okay) above 30% and below 70%, and high (Fantastic) at 70% or above. Status is descriptive and does not automatically complete a goal.

---

# 13. Goal Hierarchy

The domain hierarchy should be:

```text
Life Area
    ↓
Goal
    ↓
Milestone
    ↓
Task / Habit / Routine
```

---

# 14. Milestones

Milestones represent intermediate progress.

Milestones should support:

- title
- description
- due date
- status
- progress
- goal association
- dependent tasks
- dependent habits

---

# 15. Task Management

Tasks should support:

- title
- description
- priority
- scheduled date
- due date
- estimated duration
- one-time, daily, weekday, or weekend recurrence starting on the scheduled date
- subtasks
- associated goal
- associated milestone
- reminders
- optional measurable target (target value and unit), such as 5 cups of water or 5 km
- dated quantity progress toward that target
- an automatically derived qualitative status: low, mid, or high

For measurable tasks, progress is the amount recorded for the selected task occurrence. Status is derived from progress as a fraction of the target: low (Meh) is at or below 30%, mid (Okay) is above 30% and below 70%, and high (Fantastic) is 70% or more. A missing target or invalid/non-positive target has no quantitative status. Status is descriptive and must not change whether a task is marked complete.

Task states:

```text
planned
completed
missed
skipped
rescheduled
cancelled
```

---

# 16. Habit Management

Habits must support boolean, quantity, and duration tracking.

Quantity and duration habits may define a positive target and unit. Record non-negative progress for each dated occurrence, preserve target/unit snapshots, and show the shared qualitative status thresholds without auto-completing the occurrence.

Frequency rules:

- daily
- weekdays
- weekends
- selected days
- X times/week
- X times/month
- custom

Track:

- completion rate
- current streak
- longest streak
- rolling consistency
- planned occurrences
- completed occurrences
- skipped occurrences
- missed occurrences

Consistency percentage should be prioritized over streak length.

---

# 17. Routines

A routine is a collection of sequential activities.

Routine features:

- create multiple routines from a blank routine or a starter template
- ordered items
- expected duration
- recurring schedule on selected weekdays
- optional measurable target and unit per step, with progress saved against each dated step occurrence
- completion percentage
- start/stop tracking

For MVP scheduling, habit/task recurrence supports one-time, daily, weekdays, weekends, and selected weekdays. Occurrences are generated when the user opens a due date, and each occurrence retains the target and unit values in effect when it was created.

---

# 18. Today Dashboard

The Today screen is the primary daily interaction surface.

It should show:

- current date
- greeting
- today's focus
- top priorities
- scheduled tasks
- habits
- routines
- commitments
- progress
- check-in status

The page should remain visually calm and avoid excessive cards.

---

# 19. Commitments

Commitments represent explicit promises.

Commitments should support:

- target
- deadline
- timeframe
- why it matters
- linked goal
- linked habit/task
- reward
- optional consequence
- accountability rules

---

# 20. Accountability Engine

The accountability flow:

```text
Commitment
↓
Scheduled Action
↓
Outcome
↓
Miss Detection
↓
Reason
↓
Suggested Adjustment
↓
Recovery Plan
```

Reasons may include:

- forgot
- low motivation
- low energy
- schedule conflict
- lack of time
- task too difficult
- illness
- unexpected event
- deliberately skipped
- custom

---

# 21. Recovery and Replanning

When a task or habit is missed, the user should be able to:

- reschedule
- reduce target
- skip occurrence
- pause habit
- replace habit
- keep current plan

The application should encourage recovery instead of failure accumulation.

---

# 22. Daily Check-In

Morning check-in may include:

- mood
- energy
- sleep quality
- top priority
- intention

Evening check-in may include:

- mood
- energy
- productivity
- satisfaction
- reflection

Target completion time: 20–30 seconds.

---

# 23. Weekly Review

Weekly review should summarize:

- commitments completed
- task completion
- habit consistency
- goal progress
- exercise
- reading
- sleep
- selected metrics

Sections:

```text
Wins
Friction
Misses
Patterns
Lessons
Next Week
```

---

# 24. Progress Dashboard

Supported ranges:

```text
7 days
30 days
3 months
6 months
1 year
```

Metrics may include:

- habit consistency
- goal progress
- tasks completed
- commitments kept
- routines completed
- journal frequency
- personal bests

---

# 25. Journaling

Journal types:

- free form
- gratitude
- daily reflection
- weekly reflection
- lessons
- wins
- goal reflection

Journal content should remain private by default.

---

# 26. Achievement System

Achievements should reward meaningful behaviour.

Examples:

- 30 consistent days
- 80% consistency for 4 weeks
- first completed major goal
- successful return after inactivity
- 50 workouts
- 100 study sessions

Avoid meaningless XP farming.

---

# 27. Templates

The MVP must launch with at least 65 templates.

| Category | Minimum Templates |
|---|---:|
| Health & Fitness | 5 |
| Sleep & Recovery | 5 |
| Productivity | 5 |
| Career | 5 |
| Learning | 5 |
| Finance | 5 |
| Relationships | 5 |
| Personal Development | 5 |
| Mental Wellbeing | 5 |
| Social Development | 5 |
| Lifestyle | 5 |
| Reading | 5 |
| General Goals | 5 |

Total: **65 templates minimum**

Templates should contain:

- goal
- milestones
- tasks
- habits
- routines
- suggested schedule
- commitments
- check-in prompts
- review metrics

Users must be able to customize templates before activation.

Full-day starter schedules must be neutral, flexible, and non-prescriptive. Avoid assuming religious practice, diet, work hours, or a fixed sleep schedule. Keep onboarding routine choices short and offer only a weekday or weekend starting point.

---

# 28. Basic Recommendation Engine

Initial recommendations should be deterministic.

Example:

```text
IF
Monday workout completion < 50%

THEN
Suggest moving workout
```

Other patterns:

- consistently missed times
- repeated rescheduling
- overload
- high-success days
- low-success time slots
- excessive weekly commitments

---

# 29. AI Features

AI is not required for basic MVP functionality.

Initial AI uses:

- goal decomposition
- weekly summary wording
- recommendation explanation
- reflective prompts
- planning suggestions

AI must remain provider-independent.

---

# 30. Interpersonal Development

The product should support:

- relationship goals
- contact frequency
- important dates
- interaction tracking
- communication habits
- relationship reflections

Users should control exactly what relationship information is synced.

---

# 31. Privacy

Privacy is a first-class requirement.

Sensitive data includes:

- journals
- moods
- relationship notes
- reflections
- private goals

These must remain local unless the user has explicitly opted into planner synchronization. Show which data is included before the first sync. Account deletion must remove the cloud account data and the active local planner data; retained recovery copies must also be deleted by an explicit account-deletion action.

---

# 32. Offline-First Requirement

The app must remain usable without internet.

Offline-supported actions include:

- create goal
- create task
- create habit
- complete habit
- reschedule
- journal
- check-in
- review history

All changes should sync later when enabled.

For signed-in users who consent to sync, persist a revision baseline per account and compare it with the remote revision before writing. If both the device and cloud copies changed, ask the user which copy to use and save a recoverable copy of both before applying the choice.

---

# 33. Notifications

### Local
- habit reminder
- task reminder
- routine reminder
- evening reflection
- daily planning

### Remote
- accountability partner activity
- shared commitments
- backend-generated accountability prompts
- important server events

---

# 34. Non-Goals for Initial MVP

Exclude from early MVP:

- public social feeds
- large communities
- public leaderboards
- coach marketplace
- therapist marketplace
- monetary punishments
- banking integrations
- complex wearable support
- public profile system
- developer API
- desktop app
- advanced AI prediction

---

# 35. Success Metrics

### Activation
- onboarding completion within about 60 seconds after account choice
- first goal created
- first template activated
- first habit completed

### Engagement
- DAU
- WAU
- weekly check-ins
- weekly reviews
- goals updated
- habits completed

### Retention
- D1
- D7
- D30
- week-4 retention

### Accountability
- commitments created
- commitments completed
- recovery actions
- missed actions reflected upon

### Quality
- crash-free sessions
- sync failure rate
- notification delivery rate

---

# 36. Product Principles

The application should be:

- personal
- responsive
- supportive
- intentional
- private
- fast
- adaptive
- calm

The app should never feel:

- shame-based
- punitive
- overly gamified
- cluttered
- corporate
- clinical
- manipulative
