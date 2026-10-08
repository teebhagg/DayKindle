# DayKindle

Plan personal goals and daily actions. Review what happened and adjust as you go.

## App description

DayKindle helps you plan goals, tasks, habits, and routines. Use Today to see scheduled actions and record what happened. Mark actions complete, missed, or skipped. Reschedule an action or revise a plan when your day changes. Progress and History summarize your recorded activity. Weekly reflections give you space to note what worked and what you want to change.

Start with a Guest workspace and keep planner data on your device. You can set one-time or daily reminders. Delivery depends on your device's notification permissions and settings.

## Short description

Plan goals and routines. Track daily actions and adjust as you go.

## Product purpose

DayKindle is a personal planning app for people who want to follow through on goals and recurring actions. It brings goals, tasks, habits, and routines into a daily plan, then lets users review recorded activity and update plans that no longer fit.

The app should help people resume after a missed action. It should not treat missed plans as failure or imply that tracking alone changes behavior.

## Users

Adults who want a practical way to plan personal goals and recurring actions. DayKindle is designed for individual use on a phone.

## Implementation and release scope

- The current source implements a local Guest workspace for goals, milestones, tasks, habits, routines, check-ins, progress, history, weekly reflections, and reminders.
- Progress and History summarize activity the user records. They do not predict outcomes or diagnose behavior.
- Reminders are scheduled on the device and require notification permission. Delivery follows the device's notification settings.
- Source coverage is not release sign-off. Verify Guest data persistence and recovery, planning flows, Progress, History, and reminder delivery on supported iOS and Android builds before publication.
- Sign-in and optional cloud sync require a configured Supabase project, provider credentials, and verified account and recovery flows. Do not advertise these as available until they pass release testing in the production configuration.
- Do not claim coaching, social accountability, automatic behavior tracking, or guaranteed outcomes. Those claims are not supported by the current app.

## Brand voice

Warm, calm, direct, and practical. Tell users what they can do. Use neutral language for missed or skipped actions. Avoid guilt, pressure, exaggerated outcomes, and claims that the app will change someone's life.

## Design principles

- Keep Today focused on scheduled actions.
- Make it straightforward to complete, reschedule, or revise a plan.
- Explain progress using recorded activity and clear dates.
- Keep the core planner available offline.
- Apply the selected visual style consistently across text, icons, charts, and motion.

## Accessibility checks for release

Verify VoiceOver and TalkBack labels, scalable text, reduced motion, color contrast, and touch targets on supported devices. Routine actions must not depend on gestures alone. Describe accessibility support publicly only after these checks pass.
