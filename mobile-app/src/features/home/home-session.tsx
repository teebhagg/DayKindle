import { LocalSaveConfirmations, confirmSavedWrite } from './local-save-confirmation';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';
import { Pressable, Text, View } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { DaySchedule } from './day-schedules';
import { clearLegacySnapshots, clearLocalStorage, getLegacyQuarantine, getLegacySnapshots, listRecoverySnapshots, readSnapshot, saveRecoverySnapshot, writeLegacyQuarantine, writeSnapshot } from './home-storage';
import { reconcileOverdue, type OccurrenceFields, type OccurrenceStatus } from './occurrences';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle } from './visual-style-context';
import { AnimatedSplash } from './animated-splash';
import { SplashTargetContext, SplashStatusTransitionContext, type SplashTarget } from './splash-transition-context';

export type VisualStyle = 'formal' | 'expressive';
export type EntryType = 'task' | 'habit' | 'goal';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSubtaskDefinition = { id: string; title: string; sortOrder: number };
export type TaskSubtaskSnapshot = TaskSubtaskDefinition & { completed: boolean };
export type HomeEntry = OccurrenceFields & { id: string; title: string; type: EntryType; completed: boolean; completedDates?: string[]; targetValue?: number; targetUnit?: string; progressByDate?: Record<string, number>; goalId?: string; milestoneId?: string; source?: string; date: string; scheduleId?: string; scheduleBlockId?: string; time?: string; details?: string; taskDescriptionSnapshot?: string; taskPrioritySnapshot?: TaskPriority; taskDueDateSnapshot?: string; taskEstimatedDurationMinutesSnapshot?: number; subtasksSnapshot?: TaskSubtaskSnapshot[] };
export type GoalProgressEvent = { id: string; kind: 'goal_progress'; sourceType: 'goal'; sourceId: string; occurrenceKey: string; date: string; progressValue: number; targetValueSnapshot: number; targetUnitSnapshot: string; createdAt: string };
export type RecurrenceRule = 'daily' | 'weekdays' | 'weekends' | 'selected_days' | 'once';
export type HabitTrackingType = 'boolean' | 'quantity' | 'duration';
export type TaskDefinition = { id: string; title: string; scheduledDate: string; recurrenceRule?: RecurrenceRule; daysOfWeek?: number[]; goalId?: string; milestoneId?: string; targetValue?: number; targetUnit?: string; description?: string; priority?: TaskPriority; dueDate?: string; estimatedDurationMinutes?: number; subtasks?: TaskSubtaskDefinition[]; createdAt: string };
export type HabitDefinition = { id: string; title: string; startDate: string; recurrenceRule: RecurrenceRule; daysOfWeek?: number[]; trackingType: HabitTrackingType; targetValue?: number; targetUnit?: string; goalId?: string; milestoneId?: string; sourceTemplateId?: string; isPaused: boolean; createdAt: string };
export type GoalMilestone = { id: string; title: string; dueDate?: string; completed: boolean; createdAt: string; completedAt?: string };
export type TaskProgressStatus = 'low' | 'mid' | 'high';
export function getTaskProgressStatus(entry: HomeEntry, date: string): TaskProgressStatus | undefined {
  const target = entry.targetValueSnapshot ?? entry.targetValue;
  const progress = entry.progressValue ?? entry.progressByDate?.[date];
  if (entry.type === 'goal' || !Number.isFinite(target) || target == null || target <= 0 || !Number.isFinite(progress) || progress == null || progress < 0) return undefined;
  const ratio = progress / target;
  return ratio <= 0.3 ? 'low' : ratio < 0.7 ? 'mid' : 'high';
}
export type GoalLifecycleStatus = 'draft' | 'active' | 'paused' | 'completed' | 'abandoned' | 'archived';
export type LifeArea = { id: string; label: string; icon: 'health' | 'fitness' | 'sleep' | 'work' | 'money' | 'goal' | 'relationships' | 'clock' | 'sparkle' | 'mind' | 'home'; enabled: boolean; isCustom: boolean; sortOrder: number; createdAt: string };
export type StarterPlan = { id: string; title: string; firstStep: string; description?: string; lifeAreaId?: string; why?: string; priority?: 'low' | 'medium' | 'high'; startDate?: string; targetDate?: string; targetType?: 'qualitative' | 'quantitative'; status?: GoalLifecycleStatus; completedAt?: string; manualProgressValue?: number; targetValue?: number; targetUnit?: string; progressValue?: number; milestones?: GoalMilestone[]; sourceTemplateId?: string };
export function getGoalProgressStatus(goal: StarterPlan): TaskProgressStatus | undefined {
  if (goal.targetType === 'qualitative' || !goal.targetUnit?.trim() || !Number.isFinite(goal.targetValue) || goal.targetValue == null || goal.targetValue <= 0 || !Number.isFinite(goal.progressValue) || goal.progressValue == null || goal.progressValue < 0) return undefined;
  const ratio = goal.progressValue / goal.targetValue;
  return ratio <= 0.3 ? 'low' : ratio < 0.7 ? 'mid' : 'high';
}
export type WeeklyReflection = { weekStart: string; wentWell: string; gotInWay: string; nextAdjustment: string; updatedAt: string };
export type DailyCheckIn = { date: string; morning?: { mood: number; energy: number; sleepQuality: number; intention: string; updatedAt: string }; evening?: { mood: number; energy: number; productivity: number; satisfaction: number; reflection: string; updatedAt: string } };
export type Commitment = { id: string; title: string; target: string; deadline: string; timeframe: string; why: string; goalId?: string; linkedSourceId?: string; linkedSourceType?: 'task' | 'habit'; requiredActions?: number; reward?: string; consequence?: string; createdAt: string };
export type NotificationReminder = { id: string; title: string; time: string; repeat: 'once' | 'daily'; date?: string };
export type AccountType = 'guest' | 'google' | 'apple';
export type OnboardingProfile = {
  accountType: AccountType; syncConsent: boolean; syncConsentAt: string | null; syncConsentUserId: string | null; routineTemplateIds: string[]; accountabilityEnabled?: false; appearance: VisualStyle;
  areas: { id: string; label: string }[]; customAreaName: string;
  accountabilityStyle?: 'gentle' | 'balanced' | 'strict' | null; wakeTime?: string; sleepTime?: string;
  focusWindow?: string;
};
type StorageStatus = 'ready' | 'save-error' | 'recovery' | 'recovery-blocked';
export type HomeSessionState = { visualStyle: VisualStyle; plans: StarterPlan[]; lifeAreas: LifeArea[]; entries: HomeEntry[]; taskDefinitions: TaskDefinition[]; habitDefinitions: HabitDefinition[]; goalProgressEvents: GoalProgressEvent[]; selectedDate: string; daySchedules: DaySchedule[]; reflections: WeeklyReflection[]; checkIns: DailyCheckIn[]; commitments: Commitment[]; reminders: NotificationReminder[]; onboarding: OnboardingProfile | null; onboardingCompleted: boolean; storageStatus: StorageStatus };
export type PlannerSnapshot = Omit<HomeSessionState, 'storageStatus'>;
type SessionState = HomeSessionState;
type SessionContextValue = SessionState & {
  setPlans: Dispatch<SetStateAction<StarterPlan[]>>; setLifeAreas: Dispatch<SetStateAction<LifeArea[]>>; setVisualStyle: Dispatch<SetStateAction<VisualStyle>>;
  setEntries: Dispatch<SetStateAction<HomeEntry[]>>; setTaskDefinitions: Dispatch<SetStateAction<TaskDefinition[]>>; setHabitDefinitions: Dispatch<SetStateAction<HabitDefinition[]>>; setGoalProgressEvents: Dispatch<SetStateAction<GoalProgressEvent[]>>; setSelectedDate: Dispatch<SetStateAction<string>>;
  setDaySchedules: Dispatch<SetStateAction<DaySchedule[]>>; setReflections: Dispatch<SetStateAction<WeeklyReflection[]>>; setCheckIns: Dispatch<SetStateAction<DailyCheckIn[]>>; setCommitments: Dispatch<SetStateAction<Commitment[]>>; setReminders: Dispatch<SetStateAction<NotificationReminder[]>>; setOnboarding: Dispatch<SetStateAction<OnboardingProfile | null>>; setOnboardingCompleted: Dispatch<SetStateAction<boolean>>; confirmLocalSave: () => Promise<void>; retrySave: () => void; retryLoad: () => void; startFreshGuestData: () => Promise<boolean>; restoreArchivedGuestData: () => Promise<boolean>; archivedGuestDataAvailable: boolean; replacePlannerData: (snapshot: PlannerSnapshot) => void;
};

export const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const shiftDateKey = (value: string, amount: number) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount); return dateKey(date); };
const today = () => dateKey();
const initialState = (): SessionState => ({ visualStyle: 'formal', plans: [], lifeAreas: [], entries: [], taskDefinitions: [], habitDefinitions: [], goalProgressEvents: [], selectedDate: today(), daySchedules: [], reflections: [], checkIns: [], commitments: [], reminders: [], onboarding: null, onboardingCompleted: false, storageStatus: 'ready' });
let sessionSnapshot: SessionState = initialState();
const subscribers = new Set<(session: SessionState) => void>();
const SessionContext = createContext<SessionContextValue | null>(null);
const SESSION_STORAGE_KEY = 'daymark.home-session.v1';
const SESSION_BACKUP_KEY = 'daymark.home-session.backup.v1';
const SESSION_QUARANTINE_KEY = 'daymark.home-session.unreadable.v1';
const SCHEMA_VERSION = 9;
let writeQueue = Promise.resolve();
let writesPaused = false;

function serializeSnapshot(snapshot: SessionState) {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: { ...snapshot, storageStatus: 'ready' as const } });
}

function parseStoredSnapshot(raw: string): SessionState | null {
  const decoded = JSON.parse(raw) as { schemaVersion?: number; data?: Partial<SessionState> } & Partial<SessionState>;
  if ([SCHEMA_VERSION, 8, 7, 6, 5, 4, 3, 2].includes(decoded.schemaVersion ?? -1) && decoded.data) return normalizeSession(decoded.data);
  // The original v1 key stored a bare session object. Keep its supported migration path.
  if (decoded.schemaVersion === undefined) return normalizeSession(decoded);
  return null;
}
function snapshotVersion(raw: string) {
  try { return (JSON.parse(raw) as { schemaVersion?: number }).schemaVersion ?? 1; } catch { return 0; }
}
async function persistVerifiedMigration(sourceRaw: string, normalized: SessionState) {
  await writeSnapshot(SESSION_BACKUP_KEY, sourceRaw);
  const targetRaw = serializeSnapshot(normalized);
  await writeSnapshot(SESSION_STORAGE_KEY, targetRaw);
  const copied = await readSnapshot(SESSION_STORAGE_KEY);
  const verified = copied ? parseStoredSnapshot(copied) : null;
  if (!verified || JSON.stringify(verified) !== JSON.stringify(normalized)) throw new Error('Saved data migration did not verify.');
}

function enqueueSave(serializedSnapshot: string) {
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const previous = await readSnapshot(SESSION_STORAGE_KEY);
    if (previous) {
      try { if (parseStoredSnapshot(previous)) await writeSnapshot(SESSION_BACKUP_KEY, previous); }
      catch { await writeLegacyQuarantine(previous); }
    }
    await writeSnapshot(SESSION_STORAGE_KEY, serializedSnapshot);
  });
  return writeQueue;
}

function normalizeSession(parsed: Partial<SessionState> & { selectedDay?: number }): SessionState | null {
  if ((parsed.visualStyle !== 'formal' && parsed.visualStyle !== 'expressive') || !Array.isArray(parsed.plans) || !Array.isArray(parsed.entries) || !Array.isArray(parsed.daySchedules) || typeof parsed.onboardingCompleted !== 'boolean') return null;
  if (parsed.plans.some((plan) => !plan || typeof plan.id !== 'string' || typeof plan.title !== 'string' || typeof plan.firstStep !== 'string' || (plan.targetValue != null && (typeof plan.targetValue !== 'number' || !Number.isFinite(plan.targetValue) || plan.targetValue <= 0)) || (plan.targetUnit != null && typeof plan.targetUnit !== 'string') || (plan.progressValue != null && (typeof plan.progressValue !== 'number' || !Number.isFinite(plan.progressValue) || plan.progressValue < 0)) || (plan.milestones != null && (!Array.isArray(plan.milestones) || plan.milestones.some((milestone) => !milestone || typeof milestone.id !== 'string' || typeof milestone.title !== 'string' || typeof milestone.completed !== 'boolean' || (milestone.dueDate != null && (typeof milestone.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(milestone.dueDate)))))))) return null;
  if (parsed.entries.some((entry) => !entry || typeof entry.id !== 'string' || typeof entry.title !== 'string' || !['task', 'habit', 'goal'].includes(entry.type) || typeof entry.completed !== 'boolean' || (entry.date != null && (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))) || (entry.targetValue != null && (typeof entry.targetValue !== 'number' || !Number.isFinite(entry.targetValue) || entry.targetValue <= 0)) || (entry.targetUnit != null && typeof entry.targetUnit !== 'string') || (entry.progressByDate != null && (typeof entry.progressByDate !== 'object' || Array.isArray(entry.progressByDate) || Object.entries(entry.progressByDate).some(([date, value]) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof value !== 'number' || !Number.isFinite(value) || value < 0))))) return null;
  if (parsed.daySchedules.some((schedule) => !schedule || typeof schedule.id !== 'string' || typeof schedule.title !== 'string' || !['weekday', 'weekend'].includes(schedule.dayType) || (schedule.daysOfWeek != null && (!Array.isArray(schedule.daysOfWeek) || schedule.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6))) || !Array.isArray(schedule.blocks) || schedule.blocks.some((block) => !block || typeof block.id !== 'string' || typeof block.title !== 'string' || typeof block.time !== 'string' || typeof block.details !== 'string' || (block.targetValue != null && (typeof block.targetValue !== 'number' || !Number.isFinite(block.targetValue) || block.targetValue <= 0)) || (block.targetUnit != null && typeof block.targetUnit !== 'string')))) return null;
  if (parsed.selectedDate != null && (typeof parsed.selectedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.selectedDate))) return null;
  const now = new Date();
  const goalStatuses: GoalLifecycleStatus[] = ['draft', 'active', 'paused', 'completed', 'abandoned', 'archived'];
  const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const migratedPlans: StarterPlan[] = parsed.plans.map((plan) => ({
    ...plan,
    description: typeof plan.description === 'string' ? plan.description : '',
    why: typeof plan.why === 'string' ? plan.why : '',
    priority: plan.priority && ['low', 'medium', 'high'].includes(plan.priority) ? plan.priority : 'medium',
    startDate: validDate(plan.startDate) ? plan.startDate : today(),
    targetDate: validDate(plan.targetDate) ? plan.targetDate : undefined,
    targetType: plan.targetType === 'quantitative' || plan.targetValue != null ? 'quantitative' : 'qualitative',
    status: plan.status && goalStatuses.includes(plan.status) ? plan.status : 'active',
    manualProgressValue: typeof plan.manualProgressValue === 'number' && Number.isFinite(plan.manualProgressValue) ? Math.max(0, Math.min(100, plan.manualProgressValue)) : (plan.targetValue == null && typeof plan.progressValue === 'number' && plan.progressValue >= 0 && plan.progressValue <= 100 ? plan.progressValue : undefined),
  }));
  const iconById: Record<string, LifeArea['icon']> = { health: 'health', fitness: 'fitness', sleep: 'sleep', career: 'work', finance: 'money', learning: 'goal', relationships: 'relationships', family: 'relationships', social: 'relationships', productivity: 'clock', personal_development: 'sparkle', mental_wellbeing: 'mind', spirituality: 'sparkle', lifestyle: 'home', custom: 'sparkle' };
  const selectedAreaIds = new Set(onboardingAreaIds(parsed.onboarding));
  const savedAreas = Array.isArray(parsed.lifeAreas) ? parsed.lifeAreas.filter((area) => area && typeof area.id === 'string' && typeof area.label === 'string') : [];
  const nowIso = now.toISOString();
  const areas: LifeArea[] = savedAreas.map((area, index) => ({ id: area.id, label: area.label, icon: typeof area.icon === 'string' && ['health', 'fitness', 'sleep', 'work', 'money', 'goal', 'relationships', 'clock', 'sparkle', 'mind', 'home'].includes(area.icon) ? area.icon as LifeArea['icon'] : iconById[area.id] as LifeArea['icon'] ?? 'sparkle', enabled: typeof area.enabled === 'boolean' ? area.enabled : selectedAreaIds.has(area.id), isCustom: typeof area.isCustom === 'boolean' ? area.isCustom : !Object.prototype.hasOwnProperty.call(iconById, area.id), sortOrder: Number.isInteger(area.sortOrder) ? area.sortOrder : index, createdAt: typeof area.createdAt === 'string' ? area.createdAt : nowIso }));
  const knownAreas = [
    ['health', 'Health'], ['fitness', 'Fitness'], ['sleep', 'Sleep'], ['career', 'Career'], ['finance', 'Money'], ['learning', 'Learning'], ['relationships', 'Relationships'], ['family', 'Family'], ['social', 'Social'], ['productivity', 'Productivity'], ['personal_development', 'Personal development'], ['mental_wellbeing', 'Mental wellbeing'], ['spirituality', 'Spirituality'], ['lifestyle', 'Lifestyle'], ['custom', 'Something else'],
  ] as const;
  const lifeAreas = areas.length ? areas : knownAreas.map(([id, label], sortOrder) => ({ id, label: id === 'custom' && parsed.onboarding?.customAreaName?.trim() ? parsed.onboarding.customAreaName.trim() : label, icon: iconById[id], enabled: selectedAreaIds.has(id), isCustom: id === 'custom', sortOrder, createdAt: nowIso }));
  const migratedEntries = parsed.entries.map((entry) => {
    const legacy = entry as HomeEntry & { day?: number; completedDates?: string[] };
    const legacyDate = Number.isInteger(legacy.day) ? (() => { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() - (legacy.day as number) + 7) % 7)); return dateKey(d); })() : today();
    const date = typeof legacy.date === 'string' ? legacy.date : legacyDate;
    const completedDates = Array.isArray(legacy.completedDates) ? legacy.completedDates.filter((v) => typeof v === 'string') : legacy.completed ? [today()] : [];
    const completed = legacy.status ? legacy.status === 'completed' : completedDates.includes(date);
    const sourceType = legacy.sourceType ?? (legacy.scheduleId ? 'routine_step' : legacy.type === 'task' || legacy.type === 'habit' ? legacy.type : undefined);
    const progressValue = typeof legacy.progressValue === 'number' ? legacy.progressValue : legacy.progressByDate?.[date];
    return { ...legacy, date, completedDates, completed, status: legacy.status ?? (completed ? 'completed' as OccurrenceStatus : 'planned' as OccurrenceStatus), sourceType, sourceId: legacy.sourceId ?? legacy.scheduleId ?? legacy.id, occurrenceKey: legacy.occurrenceKey ?? legacy.scheduleBlockId ?? legacy.id, createdAt: legacy.createdAt ?? new Date(`${date}T00:00:00`).toISOString(), targetValueSnapshot: legacy.targetValueSnapshot ?? legacy.targetValue, targetUnitSnapshot: legacy.targetUnitSnapshot ?? legacy.targetUnit, progressValue, statusHistory: Array.isArray(legacy.statusHistory) ? legacy.statusHistory : [], goalId: legacy.goalId };
  }).filter((entry) => ['task', 'habit', 'goal'].includes(entry.type) && typeof entry.id === 'string' && typeof entry.title === 'string');
  const legacyOnboarding = parsed.onboarding ? { ...parsed.onboarding } as OnboardingProfile & { reminders?: boolean | null; reminderWindows?: string[] } : null;
  if (legacyOnboarding) { delete legacyOnboarding.reminders; delete legacyOnboarding.reminderWindows; }
  const onboarding = legacyOnboarding ? {
    ...legacyOnboarding,
    accountType: ['guest', 'google', 'apple'].includes(legacyOnboarding.accountType) ? legacyOnboarding.accountType : 'guest',
    syncConsent: legacyOnboarding.syncConsent === true,
    syncConsentAt: typeof legacyOnboarding.syncConsentAt === 'string' ? legacyOnboarding.syncConsentAt : null,
    syncConsentUserId: typeof legacyOnboarding.syncConsentUserId === 'string' ? legacyOnboarding.syncConsentUserId : null,
    routineTemplateIds: Array.isArray(legacyOnboarding.routineTemplateIds) ? legacyOnboarding.routineTemplateIds.filter((id): id is string => typeof id === 'string') : [],
    appearance: legacyOnboarding.appearance === 'expressive' ? 'expressive' : parsed.visualStyle,
  } as OnboardingProfile : null;
  const taskDefinitions: TaskDefinition[] = Array.isArray(parsed.taskDefinitions) ? parsed.taskDefinitions.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.scheduledDate === 'string' && (item.recurrenceRule == null || ['daily', 'weekdays', 'weekends', 'selected_days', 'once'].includes(item.recurrenceRule))).map((item) => ({ ...item, recurrenceRule: item.recurrenceRule ?? 'once' as const, priority: item.priority && ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium', subtasks: Array.isArray(item.subtasks) ? item.subtasks.filter((subtask) => subtask && typeof subtask.id === 'string' && typeof subtask.title === 'string' && Number.isInteger(subtask.sortOrder)) : [] })) : migratedEntries.filter((entry) => entry.type === 'task' && entry.sourceType === 'task').map((entry) => ({ id: entry.sourceId ?? entry.id, title: entry.title, scheduledDate: entry.date, recurrenceRule: 'once' as const, goalId: entry.goalId, milestoneId: entry.milestoneId, targetValue: entry.targetValueSnapshot ?? entry.targetValue, targetUnit: entry.targetUnitSnapshot ?? entry.targetUnit, priority: 'medium' as const, subtasks: [], createdAt: entry.createdAt ?? new Date().toISOString() }));
  const habitDefinitions = Array.isArray(parsed.habitDefinitions) ? parsed.habitDefinitions.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.startDate === 'string' && ['daily', 'weekdays', 'weekends', 'selected_days', 'once'].includes(item.recurrenceRule) && typeof item.isPaused === 'boolean' && (item.trackingType == null || ['boolean', 'quantity', 'duration'].includes(item.trackingType))).map((item) => ({ ...item, trackingType: item.trackingType ?? 'boolean' as const })) : migratedEntries.filter((entry) => entry.type === 'habit' && entry.sourceType === 'habit').map((entry) => ({ id: entry.sourceId ?? entry.id, title: entry.title, startDate: entry.date, recurrenceRule: 'once' as const, trackingType: 'boolean' as const, goalId: entry.goalId, milestoneId: entry.milestoneId, isPaused: false, createdAt: entry.createdAt ?? new Date().toISOString() }));
  const goalProgressEvents = Array.isArray(parsed.goalProgressEvents) ? parsed.goalProgressEvents.filter((event) => event && typeof event.id === 'string' && typeof event.sourceId === 'string' && typeof event.date === 'string' && typeof event.progressValue === 'number') : [];
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns.filter((item) => item && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) : [];
  const commitments = Array.isArray(parsed.commitments) ? parsed.commitments.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.target === 'string' && typeof item.deadline === 'string') : [];
  const reminders: NotificationReminder[] = Array.isArray(parsed.reminders) ? parsed.reminders.filter((item): item is NotificationReminder => item != null && typeof item.id === 'string' && typeof item.title === 'string' && Boolean(item.title.trim()) && typeof item.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) && (item.repeat === 'daily' || (item.repeat === 'once' && validDate(item.date)))) : [];
  return { visualStyle: parsed.visualStyle, plans: migratedPlans, lifeAreas, entries: migratedEntries, taskDefinitions, habitDefinitions, goalProgressEvents, selectedDate: typeof parsed.selectedDate === 'string' ? parsed.selectedDate : today(), daySchedules: parsed.daySchedules, reflections: Array.isArray(parsed.reflections) ? parsed.reflections.filter((item) => item && typeof item.weekStart === 'string') : [], checkIns, commitments, reminders, onboarding, onboardingCompleted: parsed.onboardingCompleted, storageStatus: 'ready' };
}

function onboardingAreaIds(onboarding: OnboardingProfile | null | undefined) {
  return (onboarding?.areas ?? []).map((area) => area.id);
}

function buildLifeAreas(onboarding: OnboardingProfile): LifeArea[] {
  const iconById: Record<string, LifeArea['icon']> = { health: 'health', fitness: 'fitness', sleep: 'sleep', career: 'work', finance: 'money', learning: 'goal', relationships: 'relationships', family: 'relationships', social: 'relationships', productivity: 'clock', personal_development: 'sparkle', mental_wellbeing: 'mind', spirituality: 'sparkle', lifestyle: 'home', custom: 'sparkle' };
  const labels = new Map(onboarding.areas.map((area) => [area.id, area.label]));
  const known = [['health', 'Health'], ['fitness', 'Fitness'], ['sleep', 'Sleep'], ['career', 'Career'], ['finance', 'Money'], ['learning', 'Learning'], ['relationships', 'Relationships'], ['family', 'Family'], ['social', 'Social'], ['productivity', 'Productivity'], ['personal_development', 'Personal development'], ['mental_wellbeing', 'Mental wellbeing'], ['spirituality', 'Spirituality'], ['lifestyle', 'Lifestyle'], ['custom', 'Something else']] as const;
  const ids = new Set(onboarding.areas.map((area) => area.id));
  return known.map(([id, label], sortOrder) => ({ id, label: labels.get(id) ?? (id === 'custom' && onboarding.customAreaName.trim() ? onboarding.customAreaName.trim() : label), icon: iconById[id] as LifeArea['icon'], enabled: ids.has(id), isCustom: id === 'custom', sortOrder, createdAt: new Date().toISOString() }));
}

export function seedHomeSession(visualStyle: VisualStyle, plans: StarterPlan[], onboarding: OnboardingProfile, schedules: DaySchedule[] = []) {
  writesPaused = false;
  sessionSnapshot = { ...sessionSnapshot, visualStyle, plans: plans.map((plan) => ({ ...plan, startDate: plan.startDate ?? today(), status: plan.status ?? 'active', priority: plan.priority ?? 'medium', targetType: plan.targetType ?? (plan.targetValue != null ? 'quantitative' : 'qualitative') })), lifeAreas: buildLifeAreas(onboarding), onboarding, daySchedules: schedules.map((schedule) => ({ ...schedule, blocks: schedule.blocks.map((block) => ({ ...block })) })), entries: [], taskDefinitions: [], habitDefinitions: [], goalProgressEvents: [], selectedDate: today(), onboardingCompleted: true };
  subscribers.forEach((notify) => notify(sessionSnapshot));
}

export async function deleteLocalAccountData() {
  writesPaused = true;
  const emptySession = initialState(); sessionSnapshot = emptySession; subscribers.forEach((notify) => notify(emptySession));
  writeQueue = writeQueue.catch(() => undefined).then(() => clearLocalStorage({ preserveRecovery: false }));
  await writeQueue;
}

export function HomeSessionProvider({ children }: { children: ReactNode }) {
  const palette = useTheme();
  const [session, setSession] = useState(sessionSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [initialBootComplete, setInitialBootComplete] = useState(false);
  const [splashRevealCompleted, setSplashRevealCompleted] = useState(false);
  const [splashTransitionReady, setSplashTransitionReady] = useState(false);
  const [splashScreenRevealing, setSplashScreenRevealing] = useState(false);
  const [splashTarget, setSplashTarget] = useState<SplashTarget | null>(null);
  const [splashTargetDecision, setSplashTargetDecision] = useState<'pending' | 'target' | 'no-target'>('pending');
  const splashTargetDecisionRef = useRef<'pending' | 'target' | 'no-target'>('pending');
  const onSplashRevealComplete = useCallback(() => setSplashRevealCompleted(true), []);
  const onSplashScreenRevealStart = useCallback(() => setSplashScreenRevealing(true), []);
  const onSplashTransitionComplete = useCallback(() => setInitialBootComplete(true), []);
  const reportSplashTarget = useCallback((target: SplashTarget) => {
    if (splashTargetDecisionRef.current === 'no-target') return;
    splashTargetDecisionRef.current = 'target';
    setSplashTargetDecision('target');
    setSplashTarget((current) => current && Math.abs(current.x - target.x) < 0.5 && Math.abs(current.y - target.y) < 0.5 && Math.abs(current.width - target.width) < 0.5 && Math.abs(current.height - target.height) < 0.5 ? current : target);
  }, []);
  const reportNoSplashTarget = useCallback(() => {
    if (splashTargetDecisionRef.current !== 'pending') return;
    splashTargetDecisionRef.current = 'no-target';
    setSplashTargetDecision('no-target');
  }, []);
  const splashTargetReporter = useMemo(() => ({ reportTarget: reportSplashTarget, reportNoTarget: reportNoSplashTarget }), [reportNoSplashTarget, reportSplashTarget]);
  const [retryToken, setRetryToken] = useState(0);
  const [confirmationToken, setConfirmationToken] = useState(0);
  const confirmations = useRef(new LocalSaveConfirmations());
  const confirmLocalSave = useCallback(() => {
    if (!hydrated || session.storageStatus === 'recovery-blocked' || writesPaused) return Promise.reject(new Error('Local saving is unavailable.'));
    const pending = confirmations.current.request();
    setConfirmationToken((value) => value + 1);
    return pending;
  }, [hydrated, session.storageStatus]);
  const [loadRetry, setLoadRetry] = useState(0);
  const [archivedGuestDataAvailable, setArchivedGuestDataAvailable] = useState(false);
  const writesBlocked = useRef(false);
  const lastAttempt = useRef('');
  useEffect(() => {
    if (!hydrated || !splashRevealCompleted || splashTargetDecision === 'pending') return;
    const timer = setTimeout(() => setSplashTransitionReady(true), 80);
    return () => clearTimeout(timer);
  }, [hydrated, splashRevealCompleted, splashTargetDecision]);
  useEffect(() => {
    if (!hydrated || !splashRevealCompleted || splashTargetDecision !== 'pending') return;
    const timer = setTimeout(reportNoSplashTarget, 250);
    return () => clearTimeout(timer);
  }, [hydrated, reportNoSplashTarget, splashRevealCompleted, splashTargetDecision]);
  useEffect(() => { const syncSession = (next: SessionState) => setSession(next); subscribers.add(syncSession); return () => { subscribers.delete(syncSession); }; }, []);
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        let [stored, backup] = await Promise.all([readSnapshot(SESSION_STORAGE_KEY), readSnapshot(SESSION_BACKUP_KEY)]);
        let migratingLegacy = false;
        if (!stored && !backup) {
          [stored, backup] = await getLegacySnapshots();
          migratingLegacy = Boolean(stored || backup);
        }
        if (stored) {
          let normalized: SessionState | null = null;
          try { normalized = parseStoredSnapshot(stored); } catch { await writeLegacyQuarantine(stored); }
          if (normalized) {
            if (migratingLegacy || snapshotVersion(stored) < SCHEMA_VERSION) {
              await persistVerifiedMigration(stored, normalized);
            }
            if (migratingLegacy) {
              const oldQuarantine = await getLegacyQuarantine();
              if (oldQuarantine) await writeSnapshot(SESSION_QUARANTINE_KEY, oldQuarantine);
              await clearLegacySnapshots();
            }
            sessionSnapshot = normalized; if (active) setSession(normalized);
          }
          else if (backup) {
            try { normalized = parseStoredSnapshot(backup); } catch { normalized = null; }
            if (normalized) {
              if (migratingLegacy || snapshotVersion(backup) < SCHEMA_VERSION) {
                if (stored) await writeLegacyQuarantine(stored);
                await persistVerifiedMigration(backup, normalized);
                const oldQuarantine = await getLegacyQuarantine();
                if (oldQuarantine) await writeSnapshot(SESSION_QUARANTINE_KEY, oldQuarantine);
                if (migratingLegacy) await clearLegacySnapshots();
              }
              sessionSnapshot = normalized;
              if (active) setSession({ ...normalized, storageStatus: 'recovery' });
            } else { writesBlocked.current = true; if (active) setSession((previous) => ({ ...previous, storageStatus: 'recovery-blocked' })); }
          } else { writesBlocked.current = true; if (active) setSession((previous) => ({ ...previous, storageStatus: 'recovery-blocked' })); }
        } else if (backup) {
          let normalized: SessionState | null = null;
          try { normalized = parseStoredSnapshot(backup); } catch { normalized = null; }
          if (normalized) {
            if (migratingLegacy || snapshotVersion(backup) < SCHEMA_VERSION) {
              await persistVerifiedMigration(backup, normalized);
              const oldQuarantine = await getLegacyQuarantine();
              if (oldQuarantine) await writeSnapshot(SESSION_QUARANTINE_KEY, oldQuarantine);
              if (migratingLegacy) await clearLegacySnapshots();
            }
            sessionSnapshot = normalized; if (active) setSession({ ...normalized, storageStatus: 'recovery' });
          }
          else { writesBlocked.current = true; if (active) setSession((previous) => ({ ...previous, storageStatus: 'recovery-blocked' })); }
        }
      }
      catch { writesBlocked.current = true; if (active) setSession((previous) => ({ ...previous, storageStatus: 'recovery-blocked' })); }
      finally {
        if (active) {
          setHydrated(true);
        }
      }
    };
    void hydrate(); return () => { active = false; };
  }, [loadRetry]);
  useEffect(() => {
    if (!hydrated) return;
    void listRecoverySnapshots().then((snapshots) => setArchivedGuestDataAvailable(snapshots.some((item) => {
      const payload = item.payload as { data?: unknown } | null;
      return item.kind === 'fresh-guest' && Boolean(payload?.data && typeof payload.data === 'object');
    }))).catch(() => setArchivedGuestDataAvailable(false));
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated || writesBlocked.current || writesPaused) return;
    const { storageStatus: _status, ...data } = session;
    const snapshot = { ...data, storageStatus: 'ready' as const };
    const fingerprint = serializeSnapshot(snapshot);
    const batch = confirmations.current.takePending();
    const unchanged = fingerprint === lastAttempt.current;
    lastAttempt.current = fingerprint;
    sessionSnapshot = snapshot;
    void confirmSavedWrite(unchanged ? writeQueue : enqueueSave(fingerprint), batch).then(() => {
      if (lastAttempt.current !== fingerprint) return;
      setSession((current) => current.storageStatus === 'ready' ? current : { ...current, storageStatus: 'ready' });
    }).catch(() => {
      if (lastAttempt.current !== fingerprint) return;
      setSession((current) => current.storageStatus === 'save-error' ? current : { ...current, storageStatus: 'save-error' });
    });
  }, [hydrated, session, retryToken, confirmationToken]);
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout>;
    const reconcileAndSchedule = () => {
      const nextEntries = reconcileOverdue(sessionSnapshot.entries, today());
      if (nextEntries !== sessionSnapshot.entries) {
        sessionSnapshot = { ...sessionSnapshot, entries: nextEntries };
        subscribers.forEach((notify) => notify(sessionSnapshot));
      }
      const now = new Date();
      const nextLocalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(reconcileAndSchedule, Math.max(1000, nextLocalDay.getTime() - now.getTime()));
    };
    reconcileAndSchedule();
    return () => clearTimeout(timer);
  }, [hydrated]);
  const update = useCallback(<K extends keyof SessionState>(key: K, value: SetStateAction<SessionState[K]>) => {
    setSession((previous) => { const next = { ...previous, [key]: typeof value === 'function' ? (value as (prev: SessionState[K]) => SessionState[K])(previous[key]) : value }; sessionSnapshot = next; return next; });
  }, []);
  const setPlans = useCallback<Dispatch<SetStateAction<StarterPlan[]>>>((value) => update('plans', value), [update]);
  const setLifeAreas = useCallback<Dispatch<SetStateAction<LifeArea[]>>>((value) => update('lifeAreas', value), [update]);
  const setVisualStyle = useCallback<Dispatch<SetStateAction<VisualStyle>>>((value) => update('visualStyle', value), [update]);
  const setEntries = useCallback<Dispatch<SetStateAction<HomeEntry[]>>>((value) => update('entries', (previous) => reconcileOverdue(typeof value === 'function' ? value(previous) : value, today())), [update]);
  const setTaskDefinitions = useCallback<Dispatch<SetStateAction<TaskDefinition[]>>>((value) => update('taskDefinitions', value), [update]);
  const setHabitDefinitions = useCallback<Dispatch<SetStateAction<HabitDefinition[]>>>((value) => update('habitDefinitions', value), [update]);
  const setGoalProgressEvents = useCallback<Dispatch<SetStateAction<GoalProgressEvent[]>>>((value) => update('goalProgressEvents', value), [update]);
  const setSelectedDate = useCallback<Dispatch<SetStateAction<string>>>((value) => update('selectedDate', value), [update]);
  const setDaySchedules = useCallback<Dispatch<SetStateAction<DaySchedule[]>>>((value) => update('daySchedules', value), [update]);
  const setReflections = useCallback<Dispatch<SetStateAction<WeeklyReflection[]>>>((value) => update('reflections', value), [update]);
  const setCheckIns = useCallback<Dispatch<SetStateAction<DailyCheckIn[]>>>((value) => update('checkIns', value), [update]);
  const setCommitments = useCallback<Dispatch<SetStateAction<Commitment[]>>>((value) => update('commitments', value), [update]);
  const setReminders = useCallback<Dispatch<SetStateAction<NotificationReminder[]>>>((value) => update('reminders', value), [update]);
  const setOnboarding = useCallback<Dispatch<SetStateAction<OnboardingProfile | null>>>((value) => update('onboarding', value), [update]);
  const setOnboardingCompleted = useCallback<Dispatch<SetStateAction<boolean>>>((value) => update('onboardingCompleted', value), [update]);
  const retrySave = useCallback(() => { lastAttempt.current = ''; setRetryToken((current) => current + 1); }, []);
  const retryLoad = useCallback(() => { writesBlocked.current = false; setHydrated(false); setLoadRetry((current) => current + 1); }, []);
  const startFreshGuestData = useCallback(async () => {
    try {
      await writeQueue.catch(() => undefined);
      const snapshot = { ...sessionSnapshot, storageStatus: 'ready' as const };
      if (snapshot.plans.length || snapshot.lifeAreas.some((area) => area.enabled) || snapshot.entries.length || snapshot.taskDefinitions.length || snapshot.habitDefinitions.length || snapshot.daySchedules.length || snapshot.reflections.length || snapshot.checkIns.length || snapshot.commitments.length || snapshot.reminders.length || snapshot.onboarding) {
        await saveRecoverySnapshot('fresh-guest', { schemaVersion: SCHEMA_VERSION, data: snapshot });
        setArchivedGuestDataAvailable(true);
      }
      const unreadable = await getLegacyQuarantine();
      if (unreadable) await saveRecoverySnapshot('fresh-guest', { unreadableSnapshot: unreadable });
      writesPaused = true;
      await clearLocalStorage({ preserveRecovery: true });
      writesBlocked.current = false;
      lastAttempt.current = '';
      const fresh = { ...initialState(), onboardingCompleted: true };
      sessionSnapshot = fresh; setSession(fresh); setRetryToken((current) => current + 1);
      writesPaused = false;
      return true;
    } catch { writesPaused = false; setSession((current) => ({ ...current, storageStatus: 'recovery-blocked' })); return false; }
  }, []);
  const restoreArchivedGuestData = useCallback(async () => {
    try {
      await writeQueue.catch(() => undefined);
      const archive = (await listRecoverySnapshots()).find((item) => item.kind === 'fresh-guest' && typeof (item.payload as { data?: unknown })?.data === 'object');
      if (!archive) return false;
      const payload = archive.payload as { schemaVersion: number; data: Partial<SessionState> };
      const restored = normalizeSession(payload.data);
      if (!restored) return false;
      const current = { ...sessionSnapshot, storageStatus: 'ready' as const };
      if (current.plans.length || current.lifeAreas.some((area) => area.enabled) || current.entries.length || current.daySchedules.length || current.reflections.length || current.checkIns.length || current.commitments.length || current.reminders.length || current.onboarding) {
        await saveRecoverySnapshot('fresh-guest', { schemaVersion: SCHEMA_VERSION, data: current });
      }
      writesPaused = true;
      await clearLocalStorage({ preserveRecovery: true });
      const raw = serializeSnapshot(restored);
      await writeSnapshot(SESSION_STORAGE_KEY, raw);
      writesBlocked.current = false;
      lastAttempt.current = raw;
      sessionSnapshot = restored;
      setSession(restored);
      writesPaused = false;
      setArchivedGuestDataAvailable(true);
      return true;
    } catch { writesPaused = false; return false; }
  }, []);
  const replacePlannerData = useCallback((snapshot: PlannerSnapshot) => {
    const normalized = normalizeSession({ ...snapshot, onboardingCompleted: true, storageStatus: 'ready' });
    if (!normalized) throw new Error('The cloud copy could not be read as planner data.');
    sessionSnapshot = normalized;
    lastAttempt.current = '';
    setSession(normalized);
  }, []);
  const value = useMemo(() => ({ ...session, setPlans, setLifeAreas, setVisualStyle, setEntries, setTaskDefinitions, setHabitDefinitions, setGoalProgressEvents, setSelectedDate, setDaySchedules, setReflections, setCheckIns, setCommitments, setReminders, setOnboarding, setOnboardingCompleted, confirmLocalSave, retrySave, retryLoad, startFreshGuestData, restoreArchivedGuestData, archivedGuestDataAvailable, replacePlannerData }), [session, setPlans, setLifeAreas, setVisualStyle, setEntries, setTaskDefinitions, setHabitDefinitions, setGoalProgressEvents, setSelectedDate, setDaySchedules, setReflections, setCheckIns, setCommitments, setReminders, setOnboarding, setOnboardingCompleted, confirmLocalSave, retrySave, retryLoad, startFreshGuestData, restoreArchivedGuestData, archivedGuestDataAvailable, replacePlannerData]);
  return (
    <SessionContext.Provider value={value}>
      <SplashTargetContext.Provider value={splashTargetReporter}>
        <SplashStatusTransitionContext.Provider value={splashScreenRevealing}>
        {hydrated ? session.storageStatus === "recovery-blocked" ? (
          <View style={{ flex: 1, justifyContent: "center", padding: 28, backgroundColor: palette.paper }}>
            <Text style={[{ color: palette.ink, fontSize: session.visualStyle === 'expressive' ? 27.5 * 0.9 : 27.5, lineHeight: session.visualStyle === 'expressive' ? 35.2 * 0.9 : 35.2, fontWeight: "600" }, textStyleForVisualStyle(session.visualStyle)]}>Your saved data needs attention.</Text>
            <Text style={[{ color: palette.muted, fontSize: session.visualStyle === 'expressive' ? 15.4 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 15.4, lineHeight: session.visualStyle === 'expressive' ? 24.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 24.2, marginTop: 12 }, textStyleForVisualStyle(session.visualStyle)]}>Could not read your saved planner. Your saved copy is untouched. Try loading it again, or start fresh.</Text>
            <Pressable onPress={retryLoad} style={{ minHeight: 52, borderRadius: Radius.pill, borderCurve: 'circular', backgroundColor: palette.green, alignItems: "center", justifyContent: "center", marginTop: 20 }}>
              <Text style={[{ color: palette.onAccent, fontSize: session.visualStyle === 'expressive' ? 15.4 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 15.4, fontWeight: "600" }, textStyleForVisualStyle(session.visualStyle)]}>Try reading saved data again</Text>
            </Pressable>
            <Pressable onPress={() => void startFreshGuestData()} style={{ minHeight: 48, borderRadius: Radius.pill, borderCurve: 'circular', backgroundColor: palette.lightGreen, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 14, marginTop: 8 }}>
              <Text style={[{ color: palette.green, fontSize: session.visualStyle === 'expressive' ? 14.3 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 14.3, fontWeight: "600" }, textStyleForVisualStyle(session.visualStyle)]}>Start fresh on this device</Text>
            </Pressable>
          </View>
        ) : children : null}
        {!initialBootComplete && <AnimatedSplash
          readyToTransition={splashTransitionReady}
          target={splashTarget}
          onRevealComplete={onSplashRevealComplete}
          onScreenRevealStart={onSplashScreenRevealStart}
          onTransitionComplete={onSplashTransitionComplete}
        />}
        </SplashStatusTransitionContext.Provider>
      </SplashTargetContext.Provider>
    </SessionContext.Provider>
  );
}

export function useHomeSession() { const value = useContext(SessionContext); if (!value) throw new Error('useHomeSession must be used inside HomeSessionProvider'); return value; }
