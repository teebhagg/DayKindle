# PostHog analytics

The Expo app uses `posthog-react-native` with the public project token and EU ingestion host from `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN` and `EXPO_PUBLIC_POSTHOG_HOST`. These values are embedded in the client. Never put a secret or service-role key in either variable.

## Event rules

- Capture only after the action has saved locally when the action changes planner data.
- Send event names and structural properties only. Do not send names, email addresses, plan titles, reflection text, check-in ratings, dates, or route parameters.
- Guest activity uses PostHog's anonymous distinct ID. Signed-in users are identified by their Supabase user ID without person properties; sign-out resets that identity.
- Screen tracking uses a small list of static route names. Touch autocapture and session replay are off.
- GeoIP enrichment is disabled in the SDK configuration.
- Every event carries `app_environment` (`development` or `production`). Filter development events out before reporting production metrics, or use a separate PostHog project for release builds.

## Event catalog

| Event | Trigger | Useful properties |
| --- | --- | --- |
| `onboarding_completed` | Initial setup saved locally | `account_type`, `starter_plan_count`, `has_routine` |
| `planner_item_saved` | Task, habit, or goal saved locally | `item_type`, `action`, links and recurrence flags |
| `planner_item_completion_toggled` | Completion changed in local state | `item_type`, `resulting_status`, `completed_after_missed` |
| `daily_check_in_saved` | Check-in saved locally | `period` |
| `weekly_reflection_saved` | Reflection saved locally | `action` |
| `template_added` | Template saved locally | Template kind and category |
| `routine_saved` | Day routine saved locally | Action, source, and block count |
| `commitment_created` | Commitment saved locally | Structural commitment properties |
| `recovery_action_applied` | Recovery action selected | Item type and action |

`planner_item_completion_toggled` and `recovery_action_applied` currently record the in-app action before durable storage confirmation. Treat them as interaction signals until they are moved behind a confirmed save. Do not sum `template_added`, `routine_saved`, and `planner_item_saved` as unique planner items; one flow can emit more than one event.

## First dashboard: five weekly metrics

1. **Activation:** distinct new users who save a first task, habit, or goal within seven days of `onboarding_completed`, divided by distinct users who completed onboarding. Count `planner_item_saved` with `action = created`; report mature seven-day cohorts only.
2. **Weekly engaged users:** distinct users with a completed planner item, a saved check-in, or a saved weekly reflection in a calendar week. Completion is `planner_item_completion_toggled` with `resulting_status = completed`; label this provisional until save confirmation is tracked.
3. **Week-one retained users:** activated users who return in the following week for a completion, check-in, or reflection, divided by activated users whose following week has ended.
4. **Follow-through:** weekly engaged users with completed planner items on at least three separate days, divided by weekly engaged users. This requires reliable event timestamps and completion confirmation.
5. **Reflection adoption:** weekly engaged users with `weekly_reflection_saved`, divided by weekly engaged users.

Use PostHog trends for weekly user counts, a funnel for onboarding to first save, and retention for return behavior. Show cohort sizes next to every percentage. These are definitions, not observed results or target claims; establish a production baseline before setting 30/60/90-day targets.
