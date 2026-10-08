export type OccurrenceStatus = 'planned' | 'completed' | 'missed' | 'skipped' | 'rescheduled' | 'cancelled';
export type OccurrenceSourceType = 'task' | 'habit' | 'routine_step';
export type OccurrenceStatusEvent = {
  from: OccurrenceStatus;
  to: OccurrenceStatus;
  at: string;
  reason?: string;
};

export function createOccurrenceId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type OccurrenceFields = {
  sourceType?: OccurrenceSourceType;
  sourceId?: string;
  occurrenceKey?: string;
  status?: OccurrenceStatus;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  missedReason?: string;
  recoveryAction?: string;
  relatedOccurrenceId?: string;
  statusHistory?: OccurrenceStatusEvent[];
  progressValue?: number;
  targetValueSnapshot?: number;
  targetUnitSnapshot?: string;
};

export type OccurrenceRecord<T extends OccurrenceFields> = T & {
  id: string;
  date: string;
};

const terminalStatuses = new Set<OccurrenceStatus>(['completed', 'missed', 'skipped', 'rescheduled', 'cancelled']);

export function occurrenceStatus<T extends OccurrenceFields & { completed: boolean }>(record: T): OccurrenceStatus {
  return record.status ?? (record.completed ? 'completed' : 'planned');
}

export function setOccurrenceStatus<T extends OccurrenceFields & { completed: boolean }>(
  record: T,
  next: OccurrenceStatus,
  at = new Date().toISOString(),
  correctionReason?: string,
): T {
  const current = occurrenceStatus(record);
  if (current === next) return record;
  if (terminalStatuses.has(current) && !correctionReason) return record;
  const history = record.statusHistory ?? [];
  return {
    ...record,
    status: next,
    completed: next === 'completed',
    completedAt: next === 'completed' ? at : undefined,
    updatedAt: at,
    statusHistory: [...history, { from: current, to: next, at, ...(correctionReason ? { reason: correctionReason } : {}) }],
  };
}

export function occurrenceIsTerminal(status: OccurrenceStatus) {
  return terminalStatuses.has(status);
}

export function reconcileOverdue<T extends OccurrenceFields & { completed: boolean; date: string }>(records: T[], today: string, at = new Date().toISOString()): T[] {
  let changed = false;
  const next = records.map((record) => {
    if (record.date >= today || occurrenceStatus(record) !== 'planned') return record;
    changed = true;
    return setOccurrenceStatus(record, 'missed', at);
  });
  return changed ? next : records;
}

export function materializeOccurrences<T extends OccurrenceFields & { completed: boolean; id: string; date: string }>(existing: T[], candidates: T[]): T[] {
  const known = new Set(existing.map((record) => `${record.sourceType ?? ''}:${record.sourceId ?? ''}:${record.occurrenceKey ?? ''}:${record.date}`));
  const additions = candidates.filter((record) => {
    const key = `${record.sourceType ?? ''}:${record.sourceId ?? ''}:${record.occurrenceKey ?? ''}:${record.date}`;
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  return additions.length ? [...existing, ...additions] : existing;
}

export function rescheduleOccurrence<T extends OccurrenceFields & { completed: boolean; id: string; date: string; title: string }>(
  records: T[],
  id: string,
  replacementDate: string,
  at = new Date().toISOString(),
): T[] {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(replacementDate) || replacementDate < today) return records;
  const original = records.find((record) => record.id === id);
  if (!original || (occurrenceStatus(original) !== 'planned' && occurrenceStatus(original) !== 'missed') || replacementDate <= original.date) return records;
  const duplicate = records.find((record) => record.sourceType === original.sourceType && record.sourceId === original.sourceId && record.occurrenceKey === original.occurrenceKey && record.date === replacementDate);
  if (duplicate) return records;
  const status = occurrenceStatus(original);
  const markedOriginal = status === 'planned'
    ? { ...setOccurrenceStatus(original, 'rescheduled', at), recoveryAction: 'rescheduled' }
    : { ...original, recoveryAction: 'rescheduled', updatedAt: at, statusHistory: [...(original.statusHistory ?? []), { from: 'missed' as const, to: 'missed' as const, at, reason: 'rescheduled_after_missed' }] };
  const replacement = {
    ...original,
    id: `${original.id}:rescheduled:${replacementDate}`,
    date: replacementDate,
    status: 'planned' as const,
    completed: false,
    completedAt: undefined,
    missedReason: undefined,
    recoveryAction: undefined,
    relatedOccurrenceId: original.id,
    progressValue: 0,
    progressByDate: undefined,
    completedDates: [],
    createdAt: at,
    updatedAt: at,
    statusHistory: [],
  };
  return records.map((record) => record.id === id ? markedOriginal : record).concat(replacement as T);
}
