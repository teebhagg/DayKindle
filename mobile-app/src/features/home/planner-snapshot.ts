import type { HomeSessionState, PlannerSnapshot } from './home-session';

export function createPlannerSnapshot(session: HomeSessionState): PlannerSnapshot {
  return {
    visualStyle: session.visualStyle,
    plans: session.plans,
    lifeAreas: session.lifeAreas,
    entries: session.entries,
    taskDefinitions: session.taskDefinitions,
    habitDefinitions: session.habitDefinitions,
    goalProgressEvents: session.goalProgressEvents,
    selectedDate: session.selectedDate,
    daySchedules: session.daySchedules,
    reflections: session.reflections,
    checkIns: session.checkIns,
    commitments: session.commitments,
    reminders: session.reminders,
    onboarding: session.onboarding,
    onboardingCompleted: session.onboardingCompleted,
  };
}
