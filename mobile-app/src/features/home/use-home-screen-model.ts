import { useMemo } from 'react';
import type { DaySchedule, DayType } from './day-schedules';
import {
  dateKey,
  shiftDateKey,
  type Commitment,
  type DailyCheckIn,
  type GoalProgressEvent,
  type HomeEntry,
  type LifeArea,
  type StarterPlan,
  type WeeklyReflection,
} from './home-session';
import { isTerminalProgressStatus, percent, summarizePlannerHistory } from './history-analytics';
import { occurrenceStatus } from './occurrences';
import type { AppIconName } from '../../components/app-icon';

export const progressRanges = [
  { id: '7d', label: '7D', days: 7, buckets: 7, unit: 'day' },
  { id: '30d', label: '30D', days: 30, buckets: 6, unit: '5 days' },
  { id: '3m', label: '3M', days: 90, buckets: 12, unit: 'week' },
  { id: '6m', label: '6M', days: 180, buckets: 6, unit: 'month' },
  { id: '1y', label: '1Y', days: 365, buckets: 12, unit: 'month' },
] as const;

export type ProgressRangeId = (typeof progressRanges)[number]['id'];
export const visibleAchievementCount = 3;
const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type ProgressAchievement = {
  id: string;
  title: string;
  detail: string;
  icon: AppIconName;
  isEarned: boolean;
};

export type ProgressTabModel = {
  selectedDateLabel: string;
  selectedDateHasCheckIn: boolean;
  progressRange: (typeof progressRanges)[number];
  progressStart: string;
  progressEnd: string;
  progressBuckets: { value: number; label: string }[];
  taskCompletionRate: number | undefined;
  completedTaskCount: number;
  taskEntryCount: number;
  priorTaskCompletionRate: number | undefined;
  habitConsistency: number | undefined;
  priorHabitConsistency: number | undefined;
  comparisonText: typeof formatProgressComparison;
  rangeGoalEventCount: number;
  routineEntryCount: number;
  completedRoutineCount: number;
  planCount: number;
  measurableGoalCount: number;
  achievements: ProgressAchievement[];
  earnedAchievementCount: number;
  visibleAchievements: ProgressAchievement[];
  savedReflection: WeeklyReflection | undefined;
};

const formatProgressComparison = (value: number | undefined, prior: number | undefined) =>
  value == null ? 'No recorded actions yet' : prior == null ? `${value}% · no previous data` : `${value >= prior ? '+' : ''}${value - prior} points vs prior period`;

const achievementDefinitions = [
  { id: 'first-step', title: 'First step', detail: 'Complete your first planned action.', icon: 'check' as const, earned: (entries: HomeEntry[]) => entries.some((entry) => occurrenceStatus(entry) === 'completed') },
  { id: 'ten-habits', title: 'Showing up', detail: 'Complete 10 habit check-ins.', icon: 'focus' as const, earned: (entries: HomeEntry[]) => entries.filter((entry) => entry.type === 'habit' && occurrenceStatus(entry) === 'completed').length >= 10 },
  { id: 'first-goal', title: 'A goal reached', detail: 'Reach a measurable goal or complete every milestone.', icon: 'goals' as const, earned: (_entries: HomeEntry[], plans: StarterPlan[]) => plans.some((plan) => (plan.targetValue != null && plan.targetValue > 0 && (plan.progressValue ?? 0) >= plan.targetValue) || (!!plan.milestones?.length && plan.milestones.every((milestone) => milestone.completed))) },
  { id: 'milestone', title: 'Milestone moment', detail: 'Complete your first goal milestone.', icon: 'sparkle' as const, earned: (_entries: HomeEntry[], plans: StarterPlan[]) => plans.some((plan) => plan.milestones?.some((milestone) => milestone.completed)) },
  { id: 'recovery', title: 'A fresh start', detail: 'Choose a recovery action after a missed day.', icon: 'progress' as const, earned: (entries: HomeEntry[]) => entries.some((entry) => entry.recoveryAction != null) },
  { id: 'fifty-actions', title: 'Steady practice', detail: 'Complete 50 planned actions.', icon: 'sparkle' as const, earned: (entries: HomeEntry[]) => entries.filter((entry) => occurrenceStatus(entry) === 'completed').length >= 50 },
];

type HomeScreenModelInput = {
  entries: HomeEntry[];
  plans: StarterPlan[];
  lifeAreas: LifeArea[];
  checkIns: DailyCheckIn[];
  daySchedules: DaySchedule[];
  goalProgressEvents: GoalProgressEvent[];
  commitments: Commitment[];
  reflections: WeeklyReflection[];
  selectedDate: string;
  selectedAreaFilter: string;
  progressRangeId: ProgressRangeId;
  showAllAchievements: boolean;
  reflectionDraft: Omit<WeeklyReflection, 'updatedAt'> | { weekStart: string; wentWell: string; gotInWay: string; nextAdjustment: string };
};

function dateOrdinal(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / millisecondsPerDay);
}

export function isEntryDone(entry: HomeEntry, date: string) {
  return entry.status ? entry.status === 'completed' : entry.completedDates?.includes(date) ?? entry.completed;
}

export function getQualitativeProgress(goal: StarterPlan) {
  if (goal.manualProgressValue != null) return goal.manualProgressValue;
  if (goal.milestones?.length) return Math.round(goal.milestones.filter((milestone) => milestone.completed).length / goal.milestones.length * 100);
  return undefined;
}

export function useHomeScreenModel({
  entries,
  plans,
  lifeAreas,
  checkIns,
  daySchedules,
  goalProgressEvents,
  commitments,
  reflections,
  selectedDate,
  selectedAreaFilter,
  progressRangeId,
  showAllAchievements,
  reflectionDraft,
}: HomeScreenModelInput) {
  const todayKey = dateKey();
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
  const selectedDateLabel = selectedDateObject.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const selectedWeekday = selectedDateObject.getDay();
  const selectedDayType: DayType = selectedWeekday === 0 || selectedWeekday === 6 ? 'weekend' : 'weekday';
  const todayWeekday = new Date(`${todayKey}T12:00:00`).getDay();

  const dayEntries = useMemo(() => entries.filter((entry) => entry.date === selectedDate && entry.type !== 'goal'), [entries, selectedDate]);
  const goalEntriesByPlan = useMemo(() => {
    const grouped = new Map<string, HomeEntry[]>();
    for (const entry of entries) {
      if (entry.type === 'goal' || entry.goalId == null) continue;
      const related = grouped.get(entry.goalId);
      if (related) related.push(entry);
      else grouped.set(entry.goalId, [entry]);
    }
    return grouped;
  }, [entries]);
  const selectedDateGoalIds = useMemo(() => new Set(entries
    .filter((entry) => entry.date === selectedDate && entry.goalId != null)
    .map((entry) => entry.goalId)), [entries, selectedDate]);
  const selectedDateHasCheckIn = useMemo(() => checkIns.some((item) => item.date === selectedDate && Boolean(item.morning || item.evening)), [checkIns, selectedDate]);
  const tasks = useMemo(() => dayEntries.filter((entry) => entry.type === 'task' && entry.sourceType !== 'routine_step'), [dayEntries]);
  const habits = useMemo(() => dayEntries.filter((entry) => entry.type === 'habit'), [dayEntries]);
  const isDone = (entry: HomeEntry, date = selectedDate) => isEntryDone(entry, date);
  const completed = useMemo(() => tasks.filter((entry) => isEntryDone(entry, selectedDate)).length, [tasks, selectedDate]);
  const enabledLifeAreas = useMemo(() => lifeAreas.filter((area) => area.enabled).sort((a, b) => a.sortOrder - b.sortOrder), [lifeAreas]);
  const enabledAreaIds = useMemo(() => new Set(enabledLifeAreas.map((area) => area.id)), [enabledLifeAreas]);
  const lifeAreaIds = useMemo(() => new Set(lifeAreas.map((area) => area.id)), [lifeAreas]);
  const visibleGoalPlans = useMemo(() => plans.filter((plan) => selectedAreaFilter === 'all'
    ? (!plan.lifeAreaId || enabledAreaIds.has(plan.lifeAreaId) || !lifeAreaIds.has(plan.lifeAreaId))
    : plan.lifeAreaId === selectedAreaFilter), [plans, selectedAreaFilter, enabledAreaIds, lifeAreaIds]);
  const goalsByLifeArea = useMemo(() => {
    const grouped = new Map<string, StarterPlan[]>();
    for (const plan of plans) {
      if (!plan.lifeAreaId) continue;
      const goals = grouped.get(plan.lifeAreaId);
      if (goals) goals.push(plan);
      else grouped.set(plan.lifeAreaId, [plan]);
    }
    return grouped;
  }, [plans]);
  const getGoalAreaSummary = (areaId: string) => {
    const areaGoals = goalsByLifeArea.get(areaId) ?? [];
    const activeGoals = areaGoals.filter((goal) => (goal.status ?? 'active') === 'active');
    const completedGoals = areaGoals.filter((goal) => goal.status === 'completed');
    const measurable = activeGoals.filter((goal) => goal.targetValue != null && goal.targetValue > 0 && goal.targetUnit?.trim());
    const average = measurable.length ? Math.round(measurable.reduce((sum, goal) => sum + Math.min(1, (goal.progressValue ?? 0) / goal.targetValue!) * 100, 0) / measurable.length) : undefined;
    return { activeCount: activeGoals.length, completedCount: completedGoals.length, average };
  };

  const unresolvedMissedEntries = useMemo(() => entries.filter((entry) => occurrenceStatus(entry) === 'missed' && !entry.recoveryAction), [entries]);
  const daySchedulesForDate = useMemo(() => daySchedules.filter((schedule) => schedule.daysOfWeek
    ? schedule.daysOfWeek.includes(selectedWeekday)
    : schedule.dayType === selectedDayType), [daySchedules, selectedDayType, selectedWeekday]);
  const scheduledEntries = useMemo(() => {
    if (selectedDate < todayKey) {
      const scheduleIds = new Set(daySchedulesForDate.map((schedule) => schedule.id));
      return entries.filter((entry) => entry.scheduleId && scheduleIds.has(entry.scheduleId) && entry.date === selectedDate);
    }

    const entriesBySchedule = new Map<string, Map<string, HomeEntry>>();
    for (const entry of entries) {
      if (entry.date !== selectedDate || !entry.scheduleId || !entry.scheduleBlockId) continue;
      let blocks = entriesBySchedule.get(entry.scheduleId);
      if (!blocks) {
        blocks = new Map<string, HomeEntry>();
        entriesBySchedule.set(entry.scheduleId, blocks);
      }
      if (!blocks.has(entry.scheduleBlockId)) blocks.set(entry.scheduleBlockId, entry);
    }

    return daySchedulesForDate.flatMap((daySchedule) => daySchedule.blocks.map((block) => entriesBySchedule.get(daySchedule.id)?.get(block.id) ?? {
      id: `schedule-${daySchedule.id}-${selectedDate}-${block.id}`,
      title: block.title,
      type: 'task' as const,
      completed: false,
      status: 'planned' as const,
      sourceType: 'routine_step' as const,
      sourceId: daySchedule.id,
      occurrenceKey: block.id,
      date: selectedDate,
      source: daySchedule.title,
      scheduleId: daySchedule.id,
      scheduleBlockId: block.id,
      time: block.time,
      details: block.details,
      targetValue: block.targetValue,
      targetUnit: block.targetUnit,
      targetValueSnapshot: block.targetValue,
      targetUnitSnapshot: block.targetUnit,
      progressValue: block.targetValue == null ? undefined : 0,
    }).filter((entry): entry is HomeEntry => Boolean(entry)));
  }, [selectedDate, todayKey, entries, daySchedulesForDate]);

  const weekdaySummary = useMemo(() => summarizePlannerHistory(entries, todayWeekday), [entries, todayWeekday]);
  const dayPlanLoad = useMemo(() => entries.filter((entry) => entry.date === selectedDate && entry.type !== 'goal' && occurrenceStatus(entry) === 'planned').length, [entries, selectedDate]);
  const selectedWeekStart = shiftDateKey(selectedDate, -((selectedWeekday + 6) % 7));
  const savedReflection = reflections.find((item) => item.weekStart === selectedWeekStart);
  const weekStart = shiftDateKey(dateKey(), -((new Date().getDay() + 6) % 7));
  const activeReflectionDraft = reflectionDraft.weekStart === selectedWeekStart
    ? reflectionDraft
    : { weekStart: selectedWeekStart, wentWell: savedReflection?.wentWell ?? '', gotInWay: savedReflection?.gotInWay ?? '', nextAdjustment: savedReflection?.nextAdjustment ?? '' };
  const currentGreeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const progressRange = progressRanges.find((range) => range.id === progressRangeId) ?? progressRanges[0];
  const progressEnd = todayKey;
  const progressStart = shiftDateKey(progressEnd, -(progressRange.days - 1));
  const previousStart = shiftDateKey(progressStart, -progressRange.days);
  const previousEnd = shiftDateKey(progressStart, -1);
  const progressEntries = useMemo(() => entries.filter((entry) => entry.date >= progressStart && entry.date <= progressEnd && entry.type !== 'goal' && isTerminalProgressStatus(occurrenceStatus(entry))), [entries, progressStart, progressEnd]);
  const previousEntries = useMemo(() => entries.filter((entry) => entry.date >= previousStart && entry.date <= previousEnd && entry.type !== 'goal' && isTerminalProgressStatus(occurrenceStatus(entry))), [entries, previousStart, previousEnd]);
  const taskEntries = useMemo(() => progressEntries.filter((entry) => entry.sourceType !== 'habit'), [progressEntries]);
  const priorTaskEntries = useMemo(() => previousEntries.filter((entry) => entry.sourceType !== 'habit'), [previousEntries]);
  const habitEntries = useMemo(() => progressEntries.filter((entry) => entry.type === 'habit' || entry.sourceType === 'habit'), [progressEntries]);
  const priorHabitEntries = useMemo(() => previousEntries.filter((entry) => entry.type === 'habit' || entry.sourceType === 'habit'), [previousEntries]);
  const completedTaskCount = useMemo(() => taskEntries.filter((entry) => occurrenceStatus(entry) === 'completed').length, [taskEntries]);
  const taskCompletionRate = useMemo(() => percent(completedTaskCount, taskEntries.length), [completedTaskCount, taskEntries.length]);
  const priorTaskCompletionRate = useMemo(() => percent(priorTaskEntries.filter((entry) => occurrenceStatus(entry) === 'completed').length, priorTaskEntries.length), [priorTaskEntries]);
  const completedHabitCount = useMemo(() => habitEntries.filter((entry) => occurrenceStatus(entry) === 'completed').length, [habitEntries]);
  const habitConsistency = useMemo(() => percent(completedHabitCount, habitEntries.length), [completedHabitCount, habitEntries.length]);
  const priorHabitConsistency = useMemo(() => percent(priorHabitEntries.filter((entry) => occurrenceStatus(entry) === 'completed').length, priorHabitEntries.length), [priorHabitEntries]);
  const progressBuckets = useMemo(() => {
    const buckets = Array.from({ length: progressRange.buckets }, (_, index) => {
      const endOffset = Math.floor((index + 1) * progressRange.days / progressRange.buckets) - 1;
      const end = shiftDateKey(progressStart, endOffset);
      const labelDate = new Date(`${end}T12:00:00`);
      const label = progressRange.unit === 'day' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][labelDate.getDay()] : progressRange.unit === '5 days' ? `${index * 5 + 1}` : progressRange.unit === 'week' ? `${index + 1}` : labelDate.toLocaleDateString(undefined, { month: 'short' });
      return { completed: 0, records: 0, label };
    });
    const startOrdinal = dateOrdinal(progressStart);
    for (const entry of progressEntries) {
      if (entry.sourceType === 'habit') continue;
      const offset = dateOrdinal(entry.date) - startOrdinal;
      if (offset < 0 || offset >= progressRange.days) continue;
      const index = Math.floor(((offset + 1) * progressRange.buckets - 1) / progressRange.days);
      const bucket = buckets[index];
      if (!bucket) continue;
      bucket.records += 1;
      if (occurrenceStatus(entry) === 'completed') bucket.completed += 1;
    }
    return buckets.map(({ completed: completedCount, records, label }) => ({ value: records ? completedCount / records : 0, label }));
  }, [progressRange, progressStart, progressEntries]);
  const rangeGoalEvents = useMemo(() => goalProgressEvents.filter((event) => event.date >= progressStart && event.date <= progressEnd), [goalProgressEvents, progressStart, progressEnd]);
  const rangeRoutineEntries = useMemo(() => progressEntries.filter((entry) => entry.sourceType === 'routine_step'), [progressEntries]);
  const completedRoutineCount = useMemo(() => rangeRoutineEntries.filter((entry) => occurrenceStatus(entry) === 'completed').length, [rangeRoutineEntries]);
  const measurableGoalCount = useMemo(() => plans.filter((plan) => plan.targetValue != null && plan.targetValue > 0).length, [plans]);
  const achievements = useMemo(() => achievementDefinitions.map((achievement) => ({ ...achievement, isEarned: achievement.earned(entries, plans) })), [entries, plans]);
  const visibleAchievements = useMemo(() => showAllAchievements ? achievements : achievements.slice(0, visibleAchievementCount), [showAllAchievements, achievements]);
  const earnedAchievementCount = useMemo(() => achievements.filter((achievement) => achievement.isEarned).length, [achievements]);
  const progressModel = useMemo<ProgressTabModel>(() => ({
    selectedDateLabel,
    selectedDateHasCheckIn,
    progressRange,
    progressStart,
    progressEnd,
    progressBuckets,
    taskCompletionRate,
    completedTaskCount,
    taskEntryCount: taskEntries.length,
    priorTaskCompletionRate,
    habitConsistency,
    priorHabitConsistency,
    comparisonText: formatProgressComparison,
    rangeGoalEventCount: rangeGoalEvents.length,
    routineEntryCount: rangeRoutineEntries.length,
    completedRoutineCount,
    planCount: plans.length,
    measurableGoalCount,
    achievements,
    earnedAchievementCount,
    visibleAchievements,
    savedReflection,
  }), [
    selectedDateLabel,
    selectedDateHasCheckIn,
    progressRange,
    progressStart,
    progressEnd,
    progressBuckets,
    taskCompletionRate,
    completedTaskCount,
    taskEntries.length,
    priorTaskCompletionRate,
    habitConsistency,
    priorHabitConsistency,
    rangeGoalEvents.length,
    rangeRoutineEntries.length,
    completedRoutineCount,
    plans.length,
    measurableGoalCount,
    achievements,
    earnedAchievementCount,
    visibleAchievements,
    savedReflection,
  ]);
  const commitmentMetrics = useMemo(() => {
    const entriesBySourceId = new Map<string, HomeEntry[]>();
    for (const entry of entries) {
      if (!entry.sourceId) continue;
      const linked = entriesBySourceId.get(entry.sourceId);
      if (linked) linked.push(entry);
      else entriesBySourceId.set(entry.sourceId, [entry]);
    }
    return commitments.map((commitment) => {
      const linkedEntries = commitment.linkedSourceId
        ? (entriesBySourceId.get(commitment.linkedSourceId) ?? []).filter((entry) => entry.date >= commitment.createdAt.slice(0, 10) && entry.date <= commitment.deadline)
        : [];
      const completedActions = linkedEntries.filter((entry) => occurrenceStatus(entry) === 'completed').length;
      const percentage = commitment.requiredActions ? Math.min(100, Math.round(completedActions / commitment.requiredActions * 100)) : undefined;
      const remainingActions = commitment.requiredActions ? Math.max(0, commitment.requiredActions - completedActions) : undefined;
      return { ...commitment, completedActions, percentage, remainingActions };
    });
  }, [commitments, entries]);

  return {
    selectedDateLabel,
    selectedWeekday,
    selectedDayType,
    todayWeekday,
    selectedDateHasCheckIn,
    goalEntriesByPlan,
    selectedDateGoalIds,
    tasks,
    habits,
    completed,
    isDone,
    enabledLifeAreas,
    visibleGoalPlans,
    getGoalAreaSummary,
    getQualitativeProgress,
    unresolvedMissedEntries,
    daySchedulesForDate,
    scheduledEntries,
    weekdayLabels,
    weekdaySummary,
    dayPlanLoad,
    weekStart,
    selectedWeekStart,
    savedReflection,
    activeReflectionDraft,
    currentGreeting,
    progressRange,
    progressEnd,
    progressStart,
    taskEntries,
    completedTaskCount,
    taskCompletionRate,
    priorTaskCompletionRate,
    habitConsistency,
    priorHabitConsistency,
    progressModel,
    progressBuckets,
    rangeGoalEvents,
    rangeRoutineEntries,
    completedRoutineCount,
    planCount: plans.length,
    measurableGoalCount,
    achievements,
    earnedAchievementCount,
    visibleAchievements,
    commitmentMetrics,
  };
}
