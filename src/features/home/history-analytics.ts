import type { HomeEntry } from './home-session';
import { occurrenceStatus, type OccurrenceStatus } from './occurrences';

export const isTerminalProgressStatus = (status: OccurrenceStatus) => ['completed', 'missed', 'skipped'].includes(status);
export const percent = (completedCount: number, total: number) => total ? Math.round(completedCount / total * 100) : undefined;

type WeekdayAggregate = { records: number; completed: number };

export type PlannerHistorySummary = {
  weekdayHistory: HomeEntry[];
  weekdayMisses: HomeEntry[];
  weekdayRate: number | undefined;
  rescheduledEntries: HomeEntry[];
  latestCompletedDay: string | undefined;
  mostSuccessfulWeekday: { weekday: number; records: number; rate: number | undefined } | undefined;
};

export function summarizePlannerHistory(entries: readonly HomeEntry[], todayWeekday: number): PlannerHistorySummary {
  const weekdayAggregates: WeekdayAggregate[] = Array.from({ length: 7 }, () => ({ records: 0, completed: 0 }));
  const weekdayHistory: HomeEntry[] = [];
  const weekdayMisses: HomeEntry[] = [];
  const rescheduledEntries: HomeEntry[] = [];
  let latestCompletedDay: string | undefined;

  for (const entry of entries) {
    const status = occurrenceStatus(entry);
    if (status === 'completed' && (!latestCompletedDay || entry.date > latestCompletedDay)) {
      latestCompletedDay = entry.date;
    }
    if (entry.recoveryAction === 'rescheduled' || entry.statusHistory?.some((event) => event.reason === 'rescheduled_after_missed')) {
      rescheduledEntries.push(entry);
    }
    if (!isTerminalProgressStatus(status)) continue;

    const weekday = new Date(`${entry.date}T12:00:00`).getDay();
    const aggregate = weekdayAggregates[weekday];
    if (aggregate) {
      aggregate.records += 1;
      if (status === 'completed') aggregate.completed += 1;
    }
    if (weekday === todayWeekday) {
      weekdayHistory.push(entry);
      if (status === 'missed' || status === 'skipped') weekdayMisses.push(entry);
    }
  }

  const mostSuccessfulWeekday = weekdayAggregates
    .map((aggregate, weekday) => ({ weekday, records: aggregate.records, rate: percent(aggregate.completed, aggregate.records) }))
    .filter((item) => item.records >= 3 && item.rate != null)
    .sort((left, right) => (right.rate ?? 0) - (left.rate ?? 0))[0];

  return {
    weekdayHistory,
    weekdayMisses,
    weekdayRate: percent(weekdayHistory.length - weekdayMisses.length, weekdayHistory.length),
    rescheduledEntries,
    latestCompletedDay,
    mostSuccessfulWeekday,
  };
}
