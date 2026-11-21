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
    id: 'daily-plan',
    dayType: 'weekday',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    title: 'Daily Plan',
    blocks: [
      {
        id: 'morning-anchor',
        time: '06:30 AM – 07:15 AM',
        title: 'Morning Anchor (Spiritual & Health)',
        details: '• Devotional time: Bible reading, prayer, and quiet reflection.\n• Morning hygiene & 500ml water before anything else.',
      },
      {
        id: 'exercise-breakfast',
        time: '07:15 AM – 07:45 AM',
        title: 'Simple Exercise & Breakfast',
        details: '• 15–20 min rotation: Bodyweight circuit (push-ups, squats, plank) or a brisk walk.\n• Breakfast: Whole foods (e.g., eggs, fruit, oats/grain). Wash produce thoroughly and cook at home.',
      },
      {
        id: 'deep-work-one',
        time: '08:30 AM – 12:30 PM',
        title: 'Deep Work Block 1',
        details: '• 2x 90-minute focused work blocks (Pomodoro style: 90 min work, 15 min rest).\n• Tackle high-priority tasks first. Zero notifications during blocks.',
      },
      {
        id: 'lunch-recharge',
        time: '12:30 PM – 01:30 PM',
        title: 'Lunch & Recharge',
        details: '• Home-prepared, clean meal.\n• 20-minute step away from screens (short walk or total disconnect).',
      },
      {
        id: 'deep-work-two',
        time: '01:30 PM – 05:30 PM',
        title: 'Deep Work Block 2 & Admin',
        details: '• Execute remaining tasks, communication, and review.\n• Final 30 mins: Wrap up and plan tasks for the next day.',
      },
      {
        id: 'loved-ones',
        time: '05:30 PM – 07:30 PM',
        title: 'Loved Ones & Connection',
        details: '• Dedicated family/partner/friend time (dinner together, quality conversation).',
      },
      {
        id: 'free-time',
        time: '07:30 PM – 09:30 PM',
        title: 'Personal Free Time & Leisure',
        details: '• Open block: Play video games, watch a movie, engage in hobbies, or read.',
      },
      {
        id: 'evening-wind-down',
        time: '09:30 PM – 10:00 PM',
        title: 'Evening Wind-down',
        details: '• Gratitude/short prayer, prep workspace for tomorrow, phone away by 10:00 PM.',
      },
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
