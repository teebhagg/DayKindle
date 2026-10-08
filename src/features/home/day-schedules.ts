import { dateKey, type HabitDefinition, type HomeEntry, type RecurrenceRule, type TaskDefinition } from './home-session';
import { materializeOccurrences } from './occurrences';

export type DayType = 'weekday' | 'weekend';

export type DayScheduleBlock = {
  id: string;
  time: string;
  title: string;
  details: string;
  targetValue?: number;
  targetUnit?: string;
};

export type DaySchedule = {
  id: string;
  sourceTemplateId?: string;
  dayType: DayType;
  daysOfWeek?: number[];
  title: string;
  blocks: DayScheduleBlock[];
};

export const dayScheduleTemplates: DaySchedule[] = [
  {
    id: 'steady-weekday',
    dayType: 'weekday',
    title: 'A steady weekday',
    blocks: [
      { id: 'weekday-morning', time: 'Morning', title: 'Start gently', details: 'Choose one small thing that helps you begin the day with intention.' },
      { id: 'weekday-focus', time: 'Late morning', title: 'Focus on a priority', details: 'Make space for one piece of work, study, or personal progress that matters today.' },
      { id: 'weekday-pause', time: 'Midday', title: 'Pause and reset', details: 'Take a break that fits your day. Eat, move, rest, or step away for a few minutes.' },
      { id: 'weekday-flex', time: 'Afternoon', title: 'Continue at your pace', details: 'Return to a useful next step, handle practical tasks, or adjust your plan.' },
      { id: 'weekday-evening', time: 'Evening', title: 'Make room for yourself', details: 'Leave space for connection, hobbies, rest, or preparing for tomorrow.' },
    ],
  },
  {
    id: 'restful-weekend',
    dayType: 'weekend',
    title: 'A restorative weekend',
    blocks: [
      { id: 'weekend-morning', time: 'Morning', title: 'Start unhurried', details: 'Keep the start of the day open and choose what would feel useful or enjoyable.' },
      { id: 'weekend-outside', time: 'Late morning', title: 'Move or get outside', details: 'Choose a walk, stretch, activity, or a change of scenery if it suits you.' },
      { id: 'weekend-practical', time: 'Midday', title: 'Handle one practical thing', details: 'Make progress on a home, personal, or planning task. Leave room to stop.' },
      { id: 'weekend-open', time: 'Afternoon', title: 'Leave some open time', details: 'Use this time for people, hobbies, rest, or whatever feels right today.' },
      { id: 'weekend-evening', time: 'Evening', title: 'Close the day your way', details: 'Enjoy a quiet reset, connection, or an easy transition into the week ahead.' },
    ],
  },
];

export function recurrenceMatches(rule: RecurrenceRule | undefined, date: string, startDate: string, daysOfWeek?: number[]) {
  if (date < startDate || rule === 'once') return rule === 'once' && date === startDate;
  const weekday = new Date(`${date}T12:00:00`).getDay();
  if (rule === 'weekdays') return weekday >= 1 && weekday <= 5;
  if (rule === 'weekends') return weekday === 0 || weekday === 6;
  if (rule === 'selected_days') return daysOfWeek?.includes(weekday) ?? false;
  return true;
}

export function materializeDayScheduleOccurrences(entries: HomeEntry[], schedule: DaySchedule, date: string): HomeEntry[] {
  if (date < dateKey()) return entries;
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const scheduleMatchesDate = schedule.daysOfWeek ? schedule.daysOfWeek.includes(weekday) : (schedule.dayType === 'weekend') === isWeekend;
  if (!scheduleMatchesDate) return entries;
  const candidates: HomeEntry[] = schedule.blocks.map((block) => ({
    id: `schedule-${schedule.id}-${date}-${block.id}`,
    title: block.title,
    type: 'task',
    completed: false,
    status: 'planned',
    sourceType: 'routine_step',
    sourceId: schedule.id,
    occurrenceKey: block.id,
    createdAt: new Date(`${date}T00:00:00`).toISOString(),
    date,
    scheduleId: schedule.id,
    scheduleBlockId: block.id,
    targetValue: block.targetValue,
    targetUnit: block.targetUnit,
    targetValueSnapshot: block.targetValue,
    targetUnitSnapshot: block.targetUnit,
    progressValue: block.targetValue == null ? undefined : 0,
    source: schedule.title,
    time: block.time,
    details: block.details,
  }));
  return materializeOccurrences(entries, candidates);
}

export function materializeHabitOccurrences(entries: HomeEntry[], definitions: HabitDefinition[], date: string): HomeEntry[] {
  if (date < dateKey()) return entries;
  const candidates: HomeEntry[] = definitions.filter((definition) => !definition.isPaused && recurrenceMatches(definition.recurrenceRule, date, definition.startDate, definition.daysOfWeek)).map((definition) => ({
    id: `habit-${definition.id}-${date}`,
    title: definition.title,
    type: 'habit',
    completed: false,
    status: 'planned',
    sourceType: 'habit',
    sourceId: definition.id,
    occurrenceKey: 'habit-occurrence',
    createdAt: new Date(`${date}T00:00:00`).toISOString(),
    date,
    goalId: definition.goalId,
    milestoneId: definition.milestoneId,
    targetValue: definition.targetValue,
    targetUnit: definition.targetUnit,
    targetValueSnapshot: definition.targetValue,
    targetUnitSnapshot: definition.targetUnit,
    progressValue: definition.targetValue == null ? undefined : 0,
  }));
  return materializeOccurrences(entries, candidates);
}

export function materializeTaskOccurrences(entries: HomeEntry[], definitions: TaskDefinition[], date: string): HomeEntry[] {
  if (date < dateKey()) return entries;
  const candidates = definitions.filter((definition) => recurrenceMatches(definition.recurrenceRule ?? 'once', date, definition.scheduledDate, definition.daysOfWeek)).map((definition) => ({
    id: `task-${definition.id}-${date}`,
    title: definition.title,
    type: 'task' as const,
    completed: false,
    status: 'planned' as const,
    sourceType: 'task' as const,
    sourceId: definition.id,
    occurrenceKey: 'task-occurrence',
    createdAt: new Date(`${date}T00:00:00`).toISOString(),
    date,
    goalId: definition.goalId,
    milestoneId: definition.milestoneId,
    targetValue: definition.targetValue,
    targetUnit: definition.targetUnit,
    targetValueSnapshot: definition.targetValue,
    targetUnitSnapshot: definition.targetUnit,
    taskDescriptionSnapshot: definition.description,
    taskPrioritySnapshot: definition.priority ?? 'medium',
    taskDueDateSnapshot: definition.dueDate,
    taskEstimatedDurationMinutesSnapshot: definition.estimatedDurationMinutes,
    subtasksSnapshot: (definition.subtasks ?? []).map((subtask) => ({ ...subtask, completed: false })),
    progressValue: definition.targetValue == null ? undefined : 0,
  }));
  return materializeOccurrences(entries, candidates);
}
