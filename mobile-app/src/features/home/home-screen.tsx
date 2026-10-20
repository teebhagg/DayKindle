import { EmptyState } from '@/components/app-empty-state';
import { Feedback, type AppFeedback } from '@/components/app-feedback';
import { SquircleCard, SquirclePressable } from '@/components/squircle-card';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius } from '@/constants/theme';
import { createElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert as SystemAlert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInput as NativeTextInput,
} from 'react-native';
import { router, useNavigationContainerRef } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, FadeIn } from 'react-native-reanimated';
import { posthog } from '../../lib/posthog';
import { dateKey, deleteLocalAccountData, getGoalProgressStatus, getTaskProgressStatus, shiftDateKey, useHomeSession, type Commitment, type GoalProgressEvent, type GoalMilestone, type GoalLifecycleStatus, type HomeEntry as Entry, type HabitDefinition, type NotificationReminder, type PlannerSnapshot, type RecurrenceRule, type TaskDefinition, type TaskPriority, type TaskSubtaskDefinition } from './home-session';
import { registerPushToken, syncLocalNotifications } from './notification-service';
import { createOccurrenceId, occurrenceStatus, rescheduleOccurrence, setOccurrenceStatus, type OccurrenceStatus } from './occurrences';
import { materializeDayScheduleOccurrences, materializeHabitOccurrences, materializeTaskOccurrences } from './day-schedules';
import AnimatedCheckbox from './animated-checkbox';
import { AppIcon, TAB_ICON_SIZE } from '../../components/app-icon';
import { AppTextInput as TextInput } from '../../components/app-text-input';
import NativeActionButton from '../../components/native-action-button';
import { ProgressiveEdgeBlur } from '../../components/progressive-edge-blur';
import { APP_TAB_COMPACT_HEADER_HEIGHT, APP_TAB_COMPACT_HEADER_TITLE_LAYOUT_OFFSET } from '../../components/header-gradient-metrics';
import { ProgressiveHorizontalScrollView } from '../../components/progressive-horizontal-scroll-view';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { BottomSheet, BottomSheetScrollView, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import NativeDatePickerPopover from './native-date-picker-popover';
import { VisualStyleContext } from './visual-style-context';
import DailyCheckInSheet from './daily-check-in-sheet';
import { useAccount } from '../account/account-provider';
import GuestWorkspaceSignInTray, { type GuestWorkspaceSignInTrayHandle } from '../account/guest-workspace-sign-in-tray';
import { getProfileAvatarUri, getProfileDisplayName, getProfileProviderLabel, ProfileAvatar } from '../account/profile-identity';
import { listRecoverySnapshots, saveRecoverySnapshot, type RecoverySnapshot } from './home-storage';
import { createPlannerSnapshot } from './planner-snapshot';
import { toast } from '../../components/toast';
import { PageText } from './page-text';
import { APP_HOME_EXPANDED_HEADER_HEIGHT, APP_TAB_EXPANDED_HEADER_HEIGHT } from './layout-metrics';
import { createHomeScreenStyles } from './home-screen-styles';
import { SkiaCollapsingHeaderSurface } from './skia-collapsing-header-surface';
import { useHomeScreenModel, type ProgressRangeId } from './use-home-screen-model';
import ProgressTab from './progress-tab';

type EntryType = 'task' | 'habit' | 'goal';
type Tab = 'today' | 'goals' | 'progress' | 'profile';
type RecoveryAction = 'reschedule' | 'complete_now' | 'skip' | 'reduce_target' | 'pause' | 'replace' | 'keep_plan';
type MissedReason = 'forgot' | 'low_motivation' | 'low_energy' | 'schedule_conflict' | 'lack_of_time' | 'too_difficult' | 'illness' | 'unexpected_event' | 'deliberately_skipped' | 'prefer_not_to_say' | 'custom';
type PlanningRecommendation = { id: string; title: string; evidence: string; action: string; apply: () => void; dismiss: () => void };


const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'goals', label: 'Goals' },
  { id: 'progress', label: 'Progress' }, { id: 'profile', label: 'Profile' },
];
const TAB_BAR_FOOTER_FADE_HEIGHT = 144;
const TAB_BAR_HEIGHT = 72;
const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const isValidDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00`).getTime()) && dateKey(new Date(`${value}T12:00:00`)) === value;
const missedReasonOptions: { id: MissedReason; label: string }[] = [
  { id: 'forgot', label: 'Forgot' }, { id: 'low_motivation', label: 'Low motivation' }, { id: 'low_energy', label: 'Low energy' },
  { id: 'schedule_conflict', label: 'Schedule conflict' }, { id: 'lack_of_time', label: 'Lack of time' }, { id: 'too_difficult', label: 'Too difficult' },
  { id: 'illness', label: 'Illness' }, { id: 'unexpected_event', label: 'Unexpected event' }, { id: 'deliberately_skipped', label: 'I chose to skip' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' }, { id: 'custom', label: 'Other' },
];
const recoveryActionOptions: { id: RecoveryAction; label: string }[] = [
  { id: 'reschedule', label: 'Reschedule' }, { id: 'complete_now', label: 'Complete it now' }, { id: 'skip', label: 'Skip this one' }, { id: 'reduce_target', label: 'Reduce target' },
  { id: 'pause', label: 'Pause habit' }, { id: 'replace', label: 'Replace habit' }, { id: 'keep_plan', label: 'Keep the plan' },
];
const missedReasonLabel = (reason: string) => missedReasonOptions.find((option) => option.id === reason)?.label ?? reason;
type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  optional?: boolean;
  minimumDate?: Date;
};

function DateField({ value, onChange, placeholder, accessibilityLabel, optional = false, minimumDate }: DateFieldProps) {
  const palette = useTheme();
  const colors = palette;  const styles = useThemedStyles(createHomeScreenStyles);
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasDate = isValidDateKey(value);
  const pickerValue = hasDate ? new Date(`${value}T12:00:00`) : new Date();
  const validMinimumDate = minimumDate && Number.isFinite(minimumDate.getTime()) ? minimumDate : undefined;
  const pickerSelection = validMinimumDate && pickerValue < validMinimumDate ? validMinimumDate : pickerValue;
  const dismissPicker = () => setPickerOpen(false);
  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value,
      min: validMinimumDate ? dateKey(validMinimumDate) : undefined,
      onChange: (event) => onChange(event.currentTarget.value),
      'aria-label': accessibilityLabel,
      'aria-placeholder': placeholder,
      style: { width: '100%', height: 54, boxSizing: 'border-box', padding: '0 15px', marginBottom: 12, border: `1px solid ${colors.line}`, borderRadius: Radius.control, backgroundColor: colors.surface, color: colors.ink, fontFamily: 'Satoshi', fontSize: 15.4 },
    });
  }

  if (Platform.OS === 'ios') {
    return <View style={styles.dateFieldWrap}>
      <View style={styles.dateFieldRow}>
        <NativeDatePickerPopover
          value={pickerSelection}
          minimumDate={validMinimumDate}
          displayValue={hasDate ? pickerValue.toLocaleDateString(undefined, { dateStyle: 'medium' }) : placeholder}
          isPlaceholder={!hasDate}
          title={placeholder.replace(/\s+\(optional\)$/i, '') || 'Choose a date'}
          accessibilityLabel={accessibilityLabel}
          onChange={(selectedDate) => onChange(dateKey(selectedDate))}
        />
        {optional && hasDate && <Pressable onPress={() => { onChange(''); dismissPicker(); }} style={styles.dateFieldClear} accessibilityRole="button" accessibilityLabel={`Clear ${accessibilityLabel}`}><PageText style={styles.dateFieldClearText}>Clear</PageText></Pressable>}
      </View>
    </View>;
  }

  return <View style={styles.dateFieldWrap}>
    <View style={styles.dateFieldRow}>
      <Pressable onPress={() => setPickerOpen(true)} style={styles.dateFieldControl} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint="Opens the native date picker" accessibilityState={{ expanded: pickerOpen }}>
        <PageText style={[styles.dateFieldText, !hasDate && styles.dateFieldPlaceholder]}>{hasDate ? pickerValue.toLocaleDateString(undefined, { dateStyle: 'medium' }) : placeholder}</PageText>
        <AppIcon name="calendar" size={17} color={colors.green} />
      </Pressable>
      {optional && hasDate && <Pressable onPress={() => { onChange(''); dismissPicker(); }} style={styles.dateFieldClear} accessibilityRole="button" accessibilityLabel={`Clear ${accessibilityLabel}`}><PageText style={styles.dateFieldClearText}>Clear</PageText></Pressable>}
    </View>
    {Platform.OS === 'android' && pickerOpen ? (
      <DateTimePicker
        value={pickerValue}
        mode="date"
        display="inline"
        presentation="dialog"
        minimumDate={validMinimumDate}
        accentColor={colors.green}
        positiveButton={{ label: 'Choose' }}
        negativeButton={{ label: 'Cancel' }}
        onValueChange={(_, selectedDate) => { onChange(dateKey(selectedDate)); dismissPicker(); }}
        onDismiss={dismissPicker}
      />
    ) : null}
  </View>;
}

function EntryRow({ entry, onToggle, isLast, onEdit, onToggleSubtask }: { entry: Entry; onToggle: (id: string) => void; isLast: boolean; onEdit?: () => void; onToggleSubtask?: (entryId: string, subtaskId: string) => void }) {
  const palette = useTheme();
  const colors = palette;  const styles = useThemedStyles(createHomeScreenStyles);
  const reduceMotion = useReducedMotion();
  return (
    <View style={[styles.entryRow, { paddingTop: 4, paddingBottom: 8 }, !isLast && styles.entryRowDivider]}><Pressable onPress={() => onToggle(entry.id)} disabled={entry.status === 'missed'} accessibilityRole="checkbox" accessibilityState={{ checked: entry.completed, disabled: entry.status === 'missed' }} accessibilityLabel={`${entry.type}: ${entry.title}`} style={styles.entryToggle}>
      <AnimatedCheckbox checked={entry.completed} color={entry.completed ? colors.green : palette.controlBorder} size={28} reduceMotion={reduceMotion} />
      <View style={styles.entryCopy}>
        <PageText style={[styles.entryTitle, entry.completed && styles.entryTitleDone]}>{entry.title}</PageText>
        {entry.time || entry.source ? <PageText style={styles.entryMeta}>{entry.time ? `${entry.time}${entry.source ? ` · ${entry.source}` : ''}` : `For ${entry.source}`}</PageText> : null}
        {entry.details ? <PageText style={[styles.entryMeta, entry.completed && styles.entryTitleDone]}>{entry.details}</PageText> : null}
        {entry.type !== 'goal' && (entry.targetValueSnapshot ?? entry.targetValue) != null && (entry.targetUnitSnapshot ?? entry.targetUnit) ? <PageText style={styles.entryMeta}>{`${entry.progressValue ?? entry.progressByDate?.[entry.date] ?? 0} / ${entry.targetValueSnapshot ?? entry.targetValue} ${entry.targetUnitSnapshot ?? entry.targetUnit}${getTaskProgressStatus(entry, entry.date) ? ` · ${({ low: 'Meh', mid: 'Okay', high: 'Fantastic' } as const)[getTaskProgressStatus(entry, entry.date)!]}` : ''}`}</PageText> : null}
        {entry.type === 'task' && (entry.taskPrioritySnapshot || entry.taskDueDateSnapshot || entry.taskEstimatedDurationMinutesSnapshot) ? <PageText style={styles.entryMeta}>{[entry.taskPrioritySnapshot ? `${entry.taskPrioritySnapshot} priority` : undefined, entry.taskDueDateSnapshot ? `due ${entry.taskDueDateSnapshot}` : undefined, entry.taskEstimatedDurationMinutesSnapshot ? `${entry.taskEstimatedDurationMinutesSnapshot} min` : undefined].filter(Boolean).join(' · ')}</PageText> : null}
        {entry.status && entry.status !== 'planned' && entry.status !== 'completed' ? <PageText style={styles.entryMeta}>{entry.status[0].toUpperCase() + entry.status.slice(1)}</PageText> : null}
      </View>
    </Pressable>{onEdit && !(entry.type === "task" && entry.completed) && <NativeActionButton label="Edit" onPress={onEdit} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.entryEdit} accessibilityLabel={`Edit ${entry.title}`}><PageText style={styles.entryEditText}>Edit</PageText></NativeActionButton>}{entry.subtasksSnapshot?.length ? <View style={styles.subtaskList}><PageText style={styles.entryMeta}>{entry.subtasksSnapshot.filter((item) => item.completed).length} of {entry.subtasksSnapshot.length} steps</PageText>{entry.subtasksSnapshot.map((subtask) => <Pressable key={subtask.id} onPress={() => onToggleSubtask?.(entry.id, subtask.id)} disabled={!onToggleSubtask || occurrenceStatus(entry) !== 'planned'} style={styles.subtaskRow} accessibilityRole="checkbox" accessibilityState={{ checked: subtask.completed, disabled: !onToggleSubtask || occurrenceStatus(entry) !== 'planned' }}><View style={[styles.subtaskCheck, subtask.completed && styles.subtaskCheckDone]}>{subtask.completed && <PageText style={styles.subtaskCheckGlyph}>✓</PageText>}</View><PageText style={[styles.subtaskTitle, subtask.completed && styles.entryTitleDone]}>{subtask.title}</PageText></Pressable>)}</View> : null}</View>
  );
}

export type HomeTab = 'today' | 'goals' | 'progress' | 'profile';
type HomeScreenProps = { initialTab?: HomeTab; showTabBar?: boolean };

export default function HomeScreen({ initialTab = 'today', showTabBar = true }: HomeScreenProps) {
  const rootNavigation = useNavigationContainerRef();
  const palette = useTheme();
  const colors = palette;  const styles = useThemedStyles(createHomeScreenStyles);
  const plannerSession = useHomeSession();
  const { visualStyle, setVisualStyle, plans, setPlans, lifeAreas, setLifeAreas, entries, setEntries, taskDefinitions, setTaskDefinitions, habitDefinitions, setHabitDefinitions, goalProgressEvents, setGoalProgressEvents, selectedDate, setSelectedDate, daySchedules, setDaySchedules, reflections, setReflections, checkIns, commitments, setCommitments, reminders, setReminders, onboarding, setOnboarding, storageStatus, confirmLocalSave, retrySave, archivedGuestDataAvailable, restoreArchivedGuestData, replacePlannerData } = plannerSession;
  const account = useAccount();
  const profileName = account.user ? getProfileDisplayName(account.user) : 'Guest workspace';
  const profileAvatarUri = account.user ? getProfileAvatarUri(account.user) : null;
  const profileProviderLabel = account.user ? `${getProfileProviderLabel(account.user)} account` : 'On this device';
  const hasSyncConsent = Boolean(account.user && onboarding?.syncConsent && onboarding.syncConsentUserId === account.user.id);
  const [syncRecoverySnapshots, setSyncRecoverySnapshots] = useState<RecoverySnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<HomeTab>(initialTab);
  const [openedCheckInDate, setOpenedCheckInDate] = useState<string | null>(null);
  const [progressRangeId, setProgressRangeId] = useState<ProgressRangeId>('7d');
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<string[]>([]);
  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const guestWorkspaceSignInTrayRef = useRef<GuestWorkspaceSignInTrayHandle>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('task');
  const [draft, setDraft] = useState('');
  const [targetDraft, setTargetDraft] = useState('');
  const [unitDraft, setUnitDraft] = useState('');
  const [progressDraft, setProgressDraft] = useState('');
  const [goalLink, setGoalLink] = useState<string | undefined>();
  const [milestoneLink, setMilestoneLink] = useState<string | undefined>();
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingGoalFirstStep, setEditingGoalFirstStep] = useState('');
  const [goalDescriptionDraft, setGoalDescriptionDraft] = useState('');
  const [goalWhyDraft, setGoalWhyDraft] = useState('');
  const [goalAreaDraft, setGoalAreaDraft] = useState('');
  const [goalPriorityDraft, setGoalPriorityDraft] = useState<'low' | 'medium' | 'high'>('medium');
  const [goalStartDateDraft, setGoalStartDateDraft] = useState(dateKey());
  const [goalTargetDateDraft, setGoalTargetDateDraft] = useState('');
  const [goalTargetTypeDraft, setGoalTargetTypeDraft] = useState<'qualitative' | 'quantitative'>('qualitative');
  const [goalLifecycleDraft, setGoalLifecycleDraft] = useState<GoalLifecycleStatus>('active');
  const [manualProgressDraft, setManualProgressDraft] = useState('');
  const [areaManagerOpen, setAreaManagerOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('all');
  const [goalProgressDraft, setGoalProgressDraft] = useState('');
  const [rescheduleDateDraft, setRescheduleDateDraft] = useState('');
  const [missedReasonDraft, setMissedReasonDraft] = useState('');
  const [missedReasonOption, setMissedReasonOption] = useState<MissedReason | undefined>();
  const [recoveryActionDraft, setRecoveryActionDraft] = useState<RecoveryAction | undefined>();
  const [reducedTargetDraft, setReducedTargetDraft] = useState('');
  const [replacementHabitDraft, setReplacementHabitDraft] = useState('');
  const [habitRecurrenceDraft, setHabitRecurrenceDraft] = useState<RecurrenceRule>('daily');
  const [taskRecurrenceDraft, setTaskRecurrenceDraft] = useState<RecurrenceRule>('once');
  const [taskDescriptionDraft, setTaskDescriptionDraft] = useState('');
  const [taskPriorityDraft, setTaskPriorityDraft] = useState<TaskPriority>('medium');
  const [taskDueDateDraft, setTaskDueDateDraft] = useState('');
  const [taskDurationDraft, setTaskDurationDraft] = useState('');
  const [taskSubtasksDraft, setTaskSubtasksDraft] = useState<TaskSubtaskDefinition[]>([]);
  const [newSubtaskDraft, setNewSubtaskDraft] = useState('');
  const [recurrenceDaysDraft, setRecurrenceDaysDraft] = useState<number[]>([]);
  const [habitTrackingDraft, setHabitTrackingDraft] = useState<'boolean' | 'quantity' | 'duration'>('boolean');
  const [milestoneTitleDraft, setMilestoneTitleDraft] = useState('');
  const [milestoneDueDateDraft, setMilestoneDueDateDraft] = useState('');
  const [milestoneEditId, setMilestoneEditId] = useState<string | null>(null);
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSheetOpen, setReflectionSheetOpen] = useState(false);
  const [reflectionError, setReflectionError] = useState('');
  const [reflectionDraft, setReflectionDraft] = useState<{ weekStart: string; wentWell: string; gotInWay: string; nextAdjustment: string }>({ weekStart: '', wentWell: '', gotInWay: '', nextAdjustment: '' });
  const [accountActionDialog, setAccountActionDialog] = useState<'signOut' | 'disableSync' | 'deleteGuest' | 'deleteAccount' | null>(null);
  const [accountActionInProgress, setAccountActionInProgress] = useState<'delete' | 'signOut' | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [commitmentTitle, setCommitmentTitle] = useState('');
  const [commitmentTarget, setCommitmentTarget] = useState('');
  const [commitmentRequiredActions, setCommitmentRequiredActions] = useState('');
  const [commitmentDeadline, setCommitmentDeadline] = useState('');
  const [commitmentTimeframe, setCommitmentTimeframe] = useState('');
  const [commitmentWhy, setCommitmentWhy] = useState('');
  const [commitmentReward, setCommitmentReward] = useState('');
  const [commitmentConsequence, setCommitmentConsequence] = useState('');
  const [commitmentGoalId, setCommitmentGoalId] = useState<string | undefined>();
  const [commitmentSource, setCommitmentSource] = useState<{ id: string; type: 'task' | 'habit' } | undefined>();
  const [commitmentFormOpen, setCommitmentFormOpen] = useState(false);
  const [commitmentDetailsOpen, setCommitmentDetailsOpen] = useState(false);
  const [expandedCommitmentIds, setExpandedCommitmentIds] = useState<string[]>([]);
  const [notificationFeedback, setNotificationFeedback] = useState<AppFeedback | null>(null);
  const setNotificationStatus = (message: string, severity: AppFeedback['severity'] = 'info') => setNotificationFeedback({ message, severity });
  const [savingEntry, setSavingEntry] = useState(false);
  const [formError, setFormError] = useState('');
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const titleInput = useRef<NativeTextInput>(null);
  const targetInput = useRef<NativeTextInput>(null);
  const unitInput = useRef<NativeTextInput>(null);
  const progressInput = useRef<NativeTextInput>(null);
  const durationInput = useRef<NativeTextInput>(null);
  const rejectField = (field: string, message: string) => {
    setInvalidField(field); setFormError(message);
    ({ name: titleInput, target: targetInput, unit: unitInput, progress: progressInput, duration: durationInput }[field])?.current?.focus();
  };
  const [notificationFormOpen, setNotificationFormOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const reminderNameInput = useRef<NativeTextInput>(null);
  const reminderTimeInput = useRef<NativeTextInput>(null);
  const [notificationTime, setNotificationTime] = useState('');
  const [notificationRepeat, setNotificationRepeat] = useState<NotificationReminder['repeat']>('once');
  const [notificationDate, setNotificationDate] = useState(dateKey());
  const didSyncReminders = useRef(false);
  const { width: windowWidth, height: windowHeight, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarBottomOffset = Math.max(insets.bottom, 12);
  const tabBarContainerHeight = TAB_BAR_HEIGHT + LayoutSpacing.control + tabBarBottomOffset;
  const tabBarReservedBottomSpace = TAB_BAR_FOOTER_FADE_HEIGHT + tabBarContainerHeight;
  const scrollContentBottomPadding = showTabBar
    ? tabBarReservedBottomSpace + LayoutSpacing.section
    : insets.bottom + LayoutSpacing.section;
  const stackRecommendationActions = windowWidth < 364 || fontScale > 1.15;
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    let active = true;
    const userId = account.user?.id;
    void listRecoverySnapshots().then((snapshots) => {
      if (!active) return;
      setSyncRecoverySnapshots(snapshots.filter((item) => {
        if (!userId) return false;
        if (item.kind !== 'sync-conflict' || !item.payload || typeof item.payload !== 'object') return false;
        const payload = item.payload as { userId?: unknown; localSnapshot?: unknown; cloudSnapshot?: unknown };
        return payload.userId === userId && Boolean(payload.localSnapshot && typeof payload.localSnapshot === 'object' && payload.cloudSnapshot && typeof payload.cloudSnapshot === 'object');
      }));
    }).catch(() => { if (active) setSyncRecoverySnapshots([]); });
    return () => { active = false; };
  }, [account.user?.id, account.syncStatus]);
  const expressive = visualStyle === 'expressive';
  const scrollY = useSharedValue(0);
  const expandedContentHeaderHeight = activeTab === 'today' ? APP_HOME_EXPANDED_HEADER_HEIGHT : APP_TAB_EXPANDED_HEADER_HEIGHT;
  const expandedHeaderHeight = insets.top + expandedContentHeaderHeight;
  const collapsedHeaderHeight = insets.top + APP_TAB_COMPACT_HEADER_HEIGHT;
  const headerCollapseDistance = expandedContentHeaderHeight - APP_TAB_COMPACT_HEADER_HEIGHT;
  const headerCollapseProgress = useDerivedValue(() => interpolate(scrollY.value, [0, headerCollapseDistance], [0, 1], Extrapolation.CLAMP), [headerCollapseDistance, scrollY]);
  const compactHeaderTitleScale = 20.9 / (29.7 * (expressive ? 1.53 : 1));
  const expandedTitleLineHeight = 37.4 * (expressive ? 1.53 : 1);
  const expandedTitleCenterY = expandedHeaderHeight - (expressive ? 0 : 10) - expandedTitleLineHeight / 2;
  const collapsedTitleCenterY = insets.top + APP_TAB_COMPACT_HEADER_HEIGHT / 2 + APP_TAB_COMPACT_HEADER_TITLE_LAYOUT_OFFSET;
  const tabHeaderTitleStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [
      { translateY: (collapsedTitleCenterY - expandedTitleCenterY) * headerCollapseProgress.value },
      { scale: 1 + (compactHeaderTitleScale - 1) * headerCollapseProgress.value },
    ],
  }), [collapsedTitleCenterY, compactHeaderTitleScale, expandedTitleCenterY, headerCollapseProgress]);
  const headerBlurStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, headerCollapseDistance], [expandedHeaderHeight, collapsedHeaderHeight], Extrapolation.CLAMP),
  }), [collapsedHeaderHeight, expandedHeaderHeight, headerCollapseDistance, scrollY]);
  const todayExpandedTitleStyle = useAnimatedStyle(() => ({
    opacity: headerCollapseProgress.value < 0.5 ? 1 : 0,
    transform: [{ translateY: -32 * headerCollapseProgress.value }],
  }), [headerCollapseProgress]);
  const todayCompactTitleStyle = useAnimatedStyle(() => ({
    opacity: headerCollapseProgress.value >= 0.5 ? 1 : 0,
    transform: [
      { translateY: headerCollapseDistance * (1 - headerCollapseProgress.value) + APP_TAB_COMPACT_HEADER_TITLE_LAYOUT_OFFSET * headerCollapseProgress.value },
      { scale: 1 + (compactHeaderTitleScale - 1) * headerCollapseProgress.value },
    ],
  }), [compactHeaderTitleScale, headerCollapseDistance, headerCollapseProgress]);
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.set(event.contentOffset.y); } });
  useLayoutEffect(() => {
    // The tab key remounts its ScrollView. Reset after that new view is attached
    // so a previous tab's offset cannot leave the new header collapsed.
    scrollY.set(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeTab, scrollY]);
  const chartWidth = Math.min(windowWidth - 76, 430);
  const openProgressCheckIn = useCallback(() => setOpenedCheckInDate(selectedDate), [selectedDate]);
  const openProgressHistory = useCallback(() => { router.push('/history'); }, []);
  const openProgressReflection = useCallback(() => {
    setReflectionError('');
    setReflectionSheetOpen(true);
  }, []);
  const homeScreenModel = useHomeScreenModel({
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
  });
  const {
    selectedDateLabel,
    goalEntriesByPlan,
    selectedDateGoalIds,
    selectedWeekday,
    selectedDayType,
    todayWeekday,
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
    commitmentMetrics,
  } = homeScreenModel;
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Today';
  const selectedWeekdayNumber = selectedWeekday;
  useEffect(() => {
    if (selectedDate < dateKey()) return;
    setEntries((current) => {
      const withRoutines = daySchedulesForDate.reduce((result, schedule) => materializeDayScheduleOccurrences(result, schedule, selectedDate), current);
      return materializeTaskOccurrences(materializeHabitOccurrences(withRoutines, habitDefinitions, selectedDate), taskDefinitions, selectedDate);
    });
  }, [daySchedulesForDate, habitDefinitions, selectedDate, setEntries, taskDefinitions]);
  const editingOccurrence = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) : undefined;
  const nextValidRescheduleDate = editingOccurrence ? shiftDateKey(editingOccurrence.date, 1) : dateKey();
  const rescheduleMinimumDateKey = nextValidRescheduleDate < dateKey() ? dateKey() : nextValidRescheduleDate;
  const rescheduleMinimumDate = new Date(`${rescheduleMinimumDateKey}T00:00:00`);
  const canEditOccurrence = !editingOccurrence || occurrenceStatus(editingOccurrence) === 'planned';
  const isEditingMissedOccurrence = !!editingOccurrence && occurrenceStatus(editingOccurrence) === 'missed';
  const hasMissedReason = missedReasonOption != null && (missedReasonOption !== 'custom' || missedReasonDraft.trim().length > 0);
  const selectedMissedReason = missedReasonOption === 'custom' ? missedReasonDraft.trim() : missedReasonOption;
  const canRescheduleOccurrence = !!editingOccurrence && (occurrenceStatus(editingOccurrence) === 'planned' || occurrenceStatus(editingOccurrence) === 'missed') && (!isEditingMissedOccurrence || hasMissedReason) && /^\d{4}-\d{2}-\d{2}$/.test(rescheduleDateDraft.trim()) && rescheduleDateDraft.trim() >= dateKey() && rescheduleDateDraft.trim() > editingOccurrence.date;
  const recoveryTargetBefore = editingOccurrence?.targetValueSnapshot ?? editingOccurrence?.targetValue;
  const recoveryTargetAfter = Number(reducedTargetDraft);
  const canApplyRecovery = !!recoveryActionDraft && hasMissedReason && (recoveryActionDraft !== 'reduce_target' || (recoveryTargetBefore != null && Number.isFinite(recoveryTargetAfter) && recoveryTargetAfter > 0 && recoveryTargetAfter < recoveryTargetBefore)) && (recoveryActionDraft !== 'replace' || replacementHabitDraft.trim().length > 0);
  const repeatedReasonCount = selectedMissedReason ? entries.filter((entry) => entry.missedReason === selectedMissedReason).length : 0;
  const suggestedRecovery: RecoveryAction | undefined = selectedMissedReason === 'schedule_conflict' || selectedMissedReason === 'lack_of_time' ? 'reschedule' : ['low_energy', 'illness', 'too_difficult'].includes(selectedMissedReason ?? '') ? recoveryTargetBefore != null ? 'reduce_target' : editingOccurrence?.type === 'habit' ? 'pause' : 'keep_plan' : ['forgot', 'low_motivation', 'unexpected_event'].includes(selectedMissedReason ?? '') ? 'keep_plan' : undefined;
  const { weekdayHistory, weekdayMisses, weekdayRate, rescheduledEntries, latestCompletedDay, mostSuccessfulWeekday } = weekdaySummary;
  const recommendationCandidates: (PlanningRecommendation & { score: number })[] = [];
  if (weekdayHistory.length >= 3 && weekdayRate != null && weekdayRate < 50) {
    recommendationCandidates.push({ id: `weekday-${todayWeekday}`, title: `Make ${weekdayLabels[todayWeekday]} easier`, evidence: `${weekdayMisses.length} of ${weekdayHistory.length} recorded ${weekdayLabels[todayWeekday]} actions were missed or skipped (${weekdayRate}% completed).`, action: 'Review missed actions', score: 90, apply: () => { const missedOnWeekday = [...weekdayMisses].sort((a, b) => b.date.localeCompare(a.date))[0]; if (missedOnWeekday) openEntryEdit(missedOnWeekday); }, dismiss: () => setDismissedRecommendationIds((ids) => [...ids, `weekday-${todayWeekday}`]) });
  }
  if (rescheduledEntries.length >= 2) {
    recommendationCandidates.push({ id: 'reschedule-pattern', title: 'Choose a more realistic time', evidence: `${rescheduledEntries.length} actions have been rescheduled. A steadier time may fit your week better.`, action: 'Review your schedule', score: 80, apply: () => { const entry = [...rescheduledEntries].sort((a, b) => b.date.localeCompare(a.date))[0]; if (entry) openEntryEdit(entry); }, dismiss: () => setDismissedRecommendationIds((ids) => [...ids, 'reschedule-pattern']) });
  }
  if (dayPlanLoad >= 6) {
    recommendationCandidates.push({ id: `overload-${selectedDate}`, title: 'Lighten today’s plan', evidence: `${dayPlanLoad} planned actions are still open for ${selectedDate === dateKey() ? 'today' : selectedDateLabel}.`, action: 'Review today’s plan', score: 70, apply: () => { const nextEntry = entries.find((entry) => entry.date === selectedDate && entry.type !== 'goal' && occurrenceStatus(entry) === 'planned'); if (nextEntry) openEntryEdit(nextEntry); }, dismiss: () => setDismissedRecommendationIds((ids) => [...ids, `overload-${selectedDate}`]) });
  }
  if (mostSuccessfulWeekday && (mostSuccessfulWeekday.rate ?? 0) >= 80) {
    recommendationCandidates.push({ id: `high-success-${mostSuccessfulWeekday.weekday}`, title: 'Build on a day that works', evidence: `${mostSuccessfulWeekday.rate}% of ${mostSuccessfulWeekday.records} recorded ${weekdayLabels[mostSuccessfulWeekday.weekday]} actions were completed.`, action: 'Add a task for that day', score: 60, apply: () => { setSelectedDate(shiftDateKey(dateKey(), (mostSuccessfulWeekday.weekday - todayWeekday + 7) % 7)); openNew('task'); }, dismiss: () => setDismissedRecommendationIds((ids) => [...ids, `high-success-${mostSuccessfulWeekday.weekday}`]) });
  }
  if (latestCompletedDay && shiftDateKey(latestCompletedDay, 3) < dateKey()) {
    recommendationCandidates.push({ id: `return-${latestCompletedDay}`, title: 'Start small again', evidence: `Your last recorded completed action was ${new Date(`${latestCompletedDay}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`, action: 'Add one small task', score: 50, apply: () => openNew('task'), dismiss: () => setDismissedRecommendationIds((ids) => [...ids, `return-${latestCompletedDay}`]) });
  }
  if (dayPlanLoad >= 6) {
    const linkedGoal = plans.find((goal) => !selectedDateGoalIds.has(goal.id));
    if (linkedGoal) recommendationCandidates.push({ id: `link-goal-${selectedDate}-${linkedGoal.id}`, title: 'Connect an action to a goal', evidence: `You have ${dayPlanLoad} open actions and “${linkedGoal.title}” has no action planned for ${selectedDate === dateKey() ? 'today' : selectedDateLabel}.`, action: 'Add a goal step', score: 40, apply: () => openNew('task', linkedGoal.id), dismiss: () => setDismissedRecommendationIds((ids) => [...ids, `link-goal-${selectedDate}-${linkedGoal.id}`]) });
  }
  const recommendations = recommendationCandidates.filter((item) => !dismissedRecommendationIds.includes(item.id) && !appliedRecommendationIds.includes(item.id)).sort((a, b) => b.score - a.score).slice(0, 3);
  const recordGoalProgress = (goalId: string, progressValue: number, targetValue: number | undefined, targetUnit: string | undefined, date = selectedDate) => {
    if (targetValue == null || targetValue <= 0 || !targetUnit) return;
    const eventId = createOccurrenceId('goal-progress');
    const event: GoalProgressEvent = { id: eventId, kind: 'goal_progress', sourceType: 'goal', sourceId: goalId, occurrenceKey: eventId, date, progressValue, targetValueSnapshot: targetValue, targetUnitSnapshot: targetUnit, createdAt: new Date().toISOString() };
    setGoalProgressEvents((current) => [...current, event]);
  };
  const legacyUnitRepairGoal = editingGoalId ? plans.find((plan) => plan.id === editingGoalId) : undefined;
  const canPreserveLegacyMissingUnit = !!legacyUnitRepairGoal && legacyUnitRepairGoal.targetType === 'quantitative' && legacyUnitRepairGoal.targetValue != null && !legacyUnitRepairGoal.targetUnit?.trim() && Number(targetDraft) === legacyUnitRepairGoal.targetValue && !unitDraft.trim() && (!goalProgressDraft.trim() || Number(goalProgressDraft) === (legacyUnitRepairGoal.progressValue ?? 0));
  const [pendingEntryNotice, setPendingEntryNotice] = useState<string | null>(null);
  const finishEntrySave = async (saveNotice: string) => {
    setSavingEntry(true);
    try { await confirmLocalSave(); } catch {
      setFormError('Could not save on this device. Your edits are waiting to save. Save again before making more changes.');
      setSavingEntry(false);
      return false;
    }
    setSavingEntry(false);
    setPendingEntryNotice(null);
    setDraft(''); setTaskDescriptionDraft(''); setTaskPriorityDraft('medium'); setTaskDueDateDraft(''); setTaskDurationDraft(''); setTaskSubtasksDraft([]); setNewSubtaskDraft('');
    setGoalLink(undefined); setMilestoneLink(undefined); setEditingGoalId(null); setEditingEntryId(null);
    setTargetDraft(''); setUnitDraft(''); setProgressDraft(''); setGoalProgressDraft(''); setMilestoneTitleDraft(''); setMilestoneDueDateDraft(''); setMilestoneEditId(null); setRescheduleDateDraft(''); setMissedReasonDraft(''); setMissedReasonOption(undefined); setRecoveryActionDraft(undefined); setReducedTargetDraft(''); setReplacementHabitDraft('');
    setShowAdd(false);
    toast.success(saveNotice, { description: 'Saved on this device.' });
    return true;
  };
  const addEntry = async () => {
    if (savingEntry) return;
    setFormError(''); setInvalidField(null);
    const plannerItemSavedProperties = {
      item_type: entryType,
      action: editingGoalId || editingEntryId ? 'updated' : 'created',
      has_goal_link: Boolean(goalLink),
      has_milestone_link: Boolean(milestoneLink),
      ...(entryType === 'task' ? { recurrence: taskRecurrenceDraft } : entryType === 'habit' ? { recurrence: habitRecurrenceDraft } : {}),
    };
    if (pendingEntryNotice) {
      retrySave();
      if (await finishEntrySave(pendingEntryNotice)) posthog?.capture('planner_item_saved', plannerItemSavedProperties);
      return;
    }
    const title = draft.trim();
    if (!title) { rejectField('name', 'Enter a name.'); return; }
    const editedOccurrence = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) : undefined;
    const saveNotice = entryType === 'goal'
      ? editingGoalId ? 'Goal updated' : 'Goal added'
      : editingEntryId
        ? editedOccurrence?.sourceType === 'routine_step' ? 'Routine step updated' : entryType === 'habit' ? 'Habit updated' : 'Task updated'
        : entryType === 'habit' ? 'Habit added' : 'Task added';
    if (entryType !== 'goal') {
      if (recurrenceScheduleInvalid) { rejectField('days', 'Choose at least one repeat day.'); return; }
      if (isEditingMissedOccurrence && !hasMissedReason) { rejectField('reason', 'Choose a reason, or choose Prefer not to say.'); return; }
      if (canEditOccurrence && targetDraft.trim() && (!Number.isFinite(Number(targetDraft)) || Number(targetDraft) <= 0)) { rejectField('target', 'Enter a target greater than zero.'); return; }
      if (canEditOccurrence && targetDraft.trim() && !unitDraft.trim()) { rejectField('unit', 'Add a unit, such as pages or minutes.'); return; }
      if (canEditOccurrence && progressDraft.trim() && (!Number.isFinite(Number(progressDraft)) || Number(progressDraft) < 0)) { rejectField('progress', 'Enter progress of zero or more.'); return; }
      if (entryType === 'task' && canEditOccurrence && taskDueDateDraft.trim() && !isValidDateKey(taskDueDateDraft.trim())) { rejectField('date', 'Choose a valid due date.'); return; }
      if (entryType === 'task' && canEditOccurrence && taskDurationDraft.trim() && (!/^\d+$/.test(taskDurationDraft.trim()) || Number(taskDurationDraft) <= 0)) { rejectField('duration', 'Enter a whole number of minutes greater than zero.'); return; }
      if (taskSubtasksDraft.some((item) => !item.title.trim())) { rejectField('subtask', 'Give each subtask a name or remove it.'); return; }
    }
    if (entryType === 'goal') {
      const targetValue = targetDraft.trim() ? Number(targetDraft) : undefined;
      const progressValue = goalTargetTypeDraft === 'quantitative' ? (goalProgressDraft.trim() ? Number(goalProgressDraft) : 0) : undefined;
      const manualProgressValue = manualProgressDraft.trim() ? Number(manualProgressDraft) : undefined;
      const startDate = goalStartDateDraft.trim();
      const targetDate = goalTargetDateDraft.trim() || undefined;
      const selectedArea = lifeAreas.find((area) => area.id === goalAreaDraft);
      const unchangedDisabledArea = !!editingGoalId && plans.find((plan) => plan.id === editingGoalId)?.lifeAreaId === goalAreaDraft;
      if (!selectedArea || (!selectedArea.enabled && !unchangedDisabledArea)) { rejectField('area', 'Choose a life area for this goal.'); return; }
      if (!isValidDateKey(startDate) || targetDate && (!isValidDateKey(targetDate) || targetDate < startDate)) { rejectField('date', 'Choose valid dates. The target date must be on or after the start date.'); return; }
      if (goalTargetTypeDraft === 'quantitative' && (!Number.isFinite(targetValue) || targetValue == null || targetValue <= 0)) { rejectField('target', 'Enter a target greater than zero.'); return; }
      if (goalTargetTypeDraft === 'quantitative' && !unitDraft.trim() && !canPreserveLegacyMissingUnit) { rejectField('unit', 'Add a unit, such as pages or minutes.'); return; }
      if (manualProgressDraft.trim() && (!Number.isFinite(manualProgressValue) || manualProgressValue == null || manualProgressValue < 0 || manualProgressValue > 100)) { rejectField('progress', 'Enter a percentage between 0 and 100.'); return; }
      if (progressValue != null && (!Number.isFinite(progressValue) || progressValue < 0)) { rejectField('progress', 'Enter progress of zero or more.'); return; }
      const existingMilestone = milestoneEditId ? plans.find((plan) => plan.id === editingGoalId)?.milestones?.find((milestone) => milestone.id === milestoneEditId) : undefined;
      const newMilestone: GoalMilestone | undefined = milestoneTitleDraft.trim() ? { id: milestoneEditId ?? createOccurrenceId('milestone'), title: milestoneTitleDraft.trim(), dueDate: /^\d{4}-\d{2}-\d{2}$/.test(milestoneDueDateDraft.trim()) ? milestoneDueDateDraft.trim() : undefined, completed: existingMilestone?.completed ?? false, createdAt: existingMilestone?.createdAt ?? new Date().toISOString(), completedAt: existingMilestone?.completedAt } : undefined;
      if (editingGoalId) {
        const previous = plans.find((plan) => plan.id === editingGoalId);
        const nextProgress = progressValue ?? previous?.progressValue;
        setPlans((current) => current.map((plan) => plan.id === editingGoalId ? { ...plan, title, firstStep: editingGoalFirstStep, description: goalDescriptionDraft.trim(), lifeAreaId: goalAreaDraft, why: goalWhyDraft.trim(), priority: goalPriorityDraft, startDate, targetDate, targetType: goalTargetTypeDraft, status: goalLifecycleDraft, completedAt: goalLifecycleDraft === 'completed' ? (plan.status === 'completed' ? plan.completedAt : new Date().toISOString()) : undefined, targetValue: goalTargetTypeDraft === 'quantitative' ? targetValue : undefined, targetUnit: goalTargetTypeDraft === 'quantitative' ? unitDraft.trim() : undefined, progressValue: goalTargetTypeDraft === 'quantitative' ? nextProgress : undefined, manualProgressValue: goalTargetTypeDraft === 'qualitative' ? manualProgressValue : undefined, milestones: newMilestone ? (milestoneEditId ? (plan.milestones ?? []).map((milestone) => milestone.id === milestoneEditId ? newMilestone : milestone) : [...(plan.milestones ?? []), newMilestone]) : plan.milestones } : plan));
        if (previous && goalTargetTypeDraft === 'quantitative' && nextProgress != null && (nextProgress !== previous.progressValue || targetValue !== previous.targetValue || unitDraft.trim() !== previous.targetUnit)) recordGoalProgress(editingGoalId, nextProgress, targetValue, unitDraft.trim());
      } else {
        const id = createOccurrenceId('goal');
        const nextProgress = progressValue;
        setPlans((current) => [...current, { id, title, firstStep: editingGoalFirstStep, description: goalDescriptionDraft.trim(), lifeAreaId: goalAreaDraft, why: goalWhyDraft.trim(), priority: goalPriorityDraft, startDate, targetDate, targetType: goalTargetTypeDraft, status: goalLifecycleDraft, completedAt: goalLifecycleDraft === 'completed' ? new Date().toISOString() : undefined, targetValue: goalTargetTypeDraft === 'quantitative' ? targetValue : undefined, targetUnit: goalTargetTypeDraft === 'quantitative' ? unitDraft.trim() : undefined, progressValue: nextProgress, manualProgressValue: goalTargetTypeDraft === 'qualitative' ? manualProgressValue : undefined, milestones: newMilestone ? [newMilestone] : [] }]);
        if (nextProgress != null && goalProgressDraft.trim()) recordGoalProgress(id, nextProgress, targetValue, unitDraft.trim());
      }
    } else if (editingEntryId) {
      const editing = entries.find((entry) => entry.id === editingEntryId);
      if (editing && occurrenceStatus(editing) === 'planned') {
        if (entryType === 'habit' && editing.sourceId) setHabitDefinitions((definitions) => definitions.map((definition) => definition.id === editing.sourceId ? { ...definition, title, goalId: goalLink, milestoneId: milestoneLink, recurrenceRule: habitRecurrenceDraft, daysOfWeek: habitRecurrenceDraft === 'selected_days' ? recurrenceDaysDraft : undefined, trackingType: habitTrackingDraft, targetValue: habitTrackingDraft === 'boolean' ? undefined : targetDraft.trim() ? Number(targetDraft) : undefined, targetUnit: habitTrackingDraft === 'boolean' ? undefined : unitDraft.trim() || (habitTrackingDraft === 'duration' ? 'minutes' : undefined) } : definition));
        if (entryType === 'task' && editing.sourceId) {
          const targetValue = targetDraft.trim() ? Number(targetDraft) : undefined;
          setTaskDefinitions((definitions) => definitions.map((definition) => definition.id === editing.sourceId ? { ...definition, title, description: taskDescriptionDraft.trim() || undefined, priority: taskPriorityDraft, dueDate: taskDueDateDraft.trim() || undefined, estimatedDurationMinutes: taskDurationDraft.trim() ? Number(taskDurationDraft) : undefined, subtasks: taskSubtasksDraft.map((item, sortOrder) => ({ ...item, sortOrder })), goalId: goalLink, milestoneId: milestoneLink, recurrenceRule: taskRecurrenceDraft, daysOfWeek: taskRecurrenceDraft === 'selected_days' ? recurrenceDaysDraft : undefined, targetValue, targetUnit: targetValue == null ? undefined : unitDraft.trim() || undefined } : definition));
        }
        if (editing.sourceType === 'routine_step' && editing.scheduleId && editing.scheduleBlockId) {
          const targetValue = targetDraft.trim() ? Number(targetDraft) : undefined;
          setDaySchedules((schedules) => schedules.map((schedule) => schedule.id !== editing.scheduleId ? schedule : { ...schedule, blocks: schedule.blocks.map((block) => block.id !== editing.scheduleBlockId ? block : { ...block, title, targetValue, targetUnit: targetValue == null ? undefined : unitDraft.trim() || undefined }) }));
        }
      }
      setEntries((current) => current.map((entry) => {
        if (entry.id !== editingEntryId) return entry;
        if (occurrenceStatus(entry) === 'missed') return { ...entry, missedReason: selectedMissedReason ?? entry.missedReason, updatedAt: new Date().toISOString() };
        if (occurrenceStatus(entry) !== 'planned') return entry;
        if (entryType === 'habit') {
          const targetValue = habitTrackingDraft === 'boolean' ? undefined : targetDraft.trim() ? Number(targetDraft) : undefined;
          const targetUnit = habitTrackingDraft === 'boolean' ? undefined : unitDraft.trim() || (habitTrackingDraft === 'duration' ? 'minutes' : undefined);
          const progress = progressDraft.trim() ? Number(progressDraft) : entry.progressValue;
          return { ...entry, title, goalId: goalLink, milestoneId: milestoneLink, targetValue, targetUnit, targetValueSnapshot: targetValue, targetUnitSnapshot: targetUnit, progressValue: progress, updatedAt: new Date().toISOString() };
        }
        if (entryType !== 'task') return { ...entry, title, goalId: goalLink };
        const targetValue = targetDraft.trim() ? Number(targetDraft) : undefined;
        const progress = progressDraft.trim() ? Number(progressDraft) : undefined;
        const oldChecklist = entry.subtasksSnapshot ?? [];
        const checklist = taskSubtasksDraft.map((item, sortOrder) => ({ ...item, sortOrder, completed: oldChecklist.find((old) => old.id === item.id)?.completed ?? false }));
        return { ...entry, title, goalId: goalLink, milestoneId: milestoneLink, taskDescriptionSnapshot: taskDescriptionDraft.trim() || undefined, taskPrioritySnapshot: taskPriorityDraft, taskDueDateSnapshot: taskDueDateDraft.trim() || undefined, taskEstimatedDurationMinutesSnapshot: taskDurationDraft.trim() ? Number(taskDurationDraft) : undefined, subtasksSnapshot: checklist, targetValue, targetUnit: targetValue == null ? undefined : unitDraft.trim() || undefined, targetValueSnapshot: targetValue, targetUnitSnapshot: targetValue == null ? undefined : unitDraft.trim() || undefined, progressValue: progress ?? entry.progressValue, progressByDate: progress == null ? entry.progressByDate : { ...entry.progressByDate, [entry.date]: progress }, updatedAt: new Date().toISOString() };
      }));
    }
    else {
      const targetValue = entryType === 'habit' && habitTrackingDraft === 'boolean' ? undefined : targetDraft.trim() ? Number(targetDraft) : undefined;
      const progress = (entryType === 'task' || entryType === 'habit') && progressDraft.trim() ? Number(progressDraft) : undefined;
      const now = new Date().toISOString();
      const sourceId = createOccurrenceId(`${entryType}-definition`);
      const id = createOccurrenceId(`${entryType}-occurrence`);
      if (entryType === 'task') {
        const taskSubtasks = taskSubtasksDraft.map((item, sortOrder) => ({ ...item, sortOrder }));
        const definition: TaskDefinition = { id: sourceId, title, scheduledDate: selectedDate, recurrenceRule: taskRecurrenceDraft, daysOfWeek: taskRecurrenceDraft === 'selected_days' ? recurrenceDaysDraft : undefined, goalId: goalLink, milestoneId: milestoneLink, targetValue, targetUnit: targetValue == null ? undefined : unitDraft.trim() || undefined, description: taskDescriptionDraft.trim() || undefined, priority: taskPriorityDraft, dueDate: taskDueDateDraft.trim() || undefined, estimatedDurationMinutes: taskDurationDraft.trim() ? Number(taskDurationDraft) : undefined, subtasks: taskSubtasks, createdAt: now };
        setTaskDefinitions((definitions) => [...definitions, definition]);
      } else {
        const definition: HabitDefinition = { id: sourceId, title, startDate: selectedDate, recurrenceRule: habitRecurrenceDraft, daysOfWeek: habitRecurrenceDraft === 'selected_days' ? recurrenceDaysDraft : undefined, trackingType: habitTrackingDraft, targetValue, targetUnit: targetValue == null ? undefined : unitDraft.trim() || (habitTrackingDraft === 'duration' ? 'minutes' : undefined), goalId: goalLink, milestoneId: milestoneLink, isPaused: false, createdAt: now };
        setHabitDefinitions((definitions) => [...definitions, definition]);
      }
      setEntries((current) => [...current, { id, title, type: entryType, completed: false, status: selectedDate < dateKey() ? 'missed' : 'planned', sourceType: entryType, sourceId, occurrenceKey: entryType === 'habit' ? 'habit-occurrence' : 'task-occurrence', createdAt: now, updatedAt: now, completedDates: [], goalId: goalLink, milestoneId: milestoneLink, date: selectedDate, taskDescriptionSnapshot: entryType === 'task' ? taskDescriptionDraft.trim() || undefined : undefined, taskPrioritySnapshot: entryType === 'task' ? taskPriorityDraft : undefined, taskDueDateSnapshot: entryType === 'task' ? taskDueDateDraft.trim() || undefined : undefined, taskEstimatedDurationMinutesSnapshot: entryType === 'task' && taskDurationDraft.trim() ? Number(taskDurationDraft) : undefined, subtasksSnapshot: entryType === 'task' ? taskSubtasksDraft.map((item, sortOrder) => ({ ...item, sortOrder, completed: false })) : undefined, targetValue, targetUnit: targetValue == null ? undefined : unitDraft.trim() || (entryType === 'habit' && habitTrackingDraft === 'duration' ? 'minutes' : undefined), targetValueSnapshot: targetValue, targetUnitSnapshot: targetValue == null ? undefined : unitDraft.trim() || (entryType === 'habit' && habitTrackingDraft === 'duration' ? 'minutes' : undefined), progressValue: progress ?? (targetValue == null ? undefined : 0), progressByDate: progress == null ? undefined : { [selectedDate]: progress } }]);
    }
    setPendingEntryNotice(saveNotice);
    if (await finishEntrySave(saveNotice)) posthog?.capture('planner_item_saved', plannerItemSavedProperties);
  };
  const toggleEntry = (id: string) => {
    const entry = entries.find((item) => item.id === id) ?? scheduledEntries.find((item) => item.id === id);
    if (!entry) return;
    const currentStatus = occurrenceStatus(entry);
    const nextStatus: OccurrenceStatus = currentStatus === 'completed' ? 'planned' : 'completed';
    posthog?.capture('planner_item_completion_toggled', {
      item_type: entry.type,
      source_type: entry.sourceType ?? entry.type,
      resulting_status: nextStatus,
      completed_after_missed: currentStatus === 'missed',
    });
    setEntries((current) => {
      const existing = current.find((item) => item.id === id);
      const currentEntry = existing ?? scheduledEntries.find((item) => item.id === id);
      if (!currentEntry) return current;
      const updated = setOccurrenceStatus(currentEntry, nextStatus, new Date().toISOString(), currentStatus === 'completed' ? 'user_unchecked_completion' : currentStatus === 'missed' ? 'user_completed_after_missed' : undefined);
      if (updated === currentEntry) return current;
      const completedDates = updated.status === 'completed' ? [...new Set([...(currentEntry.completedDates ?? []), selectedDate])] : (currentEntry.completedDates ?? []).filter((value) => value !== selectedDate);
      updated.completedDates = completedDates;
      return existing ? current.map((item) => item.id === id ? updated : item) : [...current, updated];
    });
  };
  const toggleSubtask = (entryId: string, subtaskId: string) => setEntries((current) => current.map((entry) => entry.id !== entryId || occurrenceStatus(entry) !== 'planned' ? entry : { ...entry, subtasksSnapshot: entry.subtasksSnapshot?.map((subtask) => subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask) }));
  const openNew = (type: EntryType, initialGoalId?: string) => { setEntryType(type); setDraft(''); setTaskDescriptionDraft(''); setTaskPriorityDraft('medium'); setTaskDueDateDraft(''); setTaskDurationDraft(''); setTaskSubtasksDraft([]); setNewSubtaskDraft(''); setGoalLink(initialGoalId); setMilestoneLink(undefined); setEditingGoalFirstStep(''); setEditingGoalId(null); setEditingEntryId(null); setTargetDraft(''); setUnitDraft(''); setProgressDraft(''); setGoalProgressDraft(''); setHabitRecurrenceDraft('daily'); setTaskRecurrenceDraft('once'); setRecurrenceDaysDraft([]); setHabitTrackingDraft('boolean'); setMilestoneTitleDraft(''); setMilestoneDueDateDraft(''); setMilestoneEditId(null); setRescheduleDateDraft(''); setMissedReasonDraft(''); setMissedReasonOption(undefined); setRecoveryActionDraft(undefined); setReducedTargetDraft(''); setReplacementHabitDraft(''); setPendingEntryNotice(null); setFormError(''); setInvalidField(null); setShowAdd(true); };
  const openEntryEdit = (entry: Entry) => {
    if (occurrenceStatus(entry) !== 'planned' && occurrenceStatus(entry) !== 'missed') return;
    const habit = habitDefinitions.find((definition) => definition.id === entry.sourceId);
    const task = taskDefinitions.find((definition) => definition.id === entry.sourceId);
    const knownReason = missedReasonOptions.find((option) => option.id === entry.missedReason);
    setEntryType(entry.type); setDraft(entry.title); setGoalLink(entry.goalId); setMilestoneLink(entry.milestoneId); setEditingEntryId(entry.id); setEditingGoalId(null);
    setTaskDescriptionDraft(entry.taskDescriptionSnapshot ?? task?.description ?? ''); setTaskPriorityDraft(entry.taskPrioritySnapshot ?? task?.priority ?? 'medium'); setTaskDueDateDraft(entry.taskDueDateSnapshot ?? task?.dueDate ?? ''); setTaskDurationDraft((entry.taskEstimatedDurationMinutesSnapshot ?? task?.estimatedDurationMinutes) == null ? '' : String(entry.taskEstimatedDurationMinutesSnapshot ?? task?.estimatedDurationMinutes)); setTaskSubtasksDraft((entry.subtasksSnapshot ?? task?.subtasks ?? []).map(({ id, title, sortOrder }) => ({ id, title, sortOrder }))); setNewSubtaskDraft('');
    setTargetDraft(entry.targetValueSnapshot == null ? '' : String(entry.targetValueSnapshot)); setUnitDraft(entry.targetUnitSnapshot ?? ''); setProgressDraft(entry.progressValue == null ? '' : String(entry.progressValue));
    setHabitRecurrenceDraft(habit?.recurrenceRule ?? 'once'); setTaskRecurrenceDraft(task?.recurrenceRule ?? 'once'); setRecurrenceDaysDraft(habit?.daysOfWeek ?? task?.daysOfWeek ?? []); setHabitTrackingDraft(habit?.trackingType ?? 'boolean');
    setMissedReasonOption(knownReason?.id ?? (entry.missedReason ? 'custom' : undefined)); setMissedReasonDraft(knownReason ? '' : entry.missedReason ?? '');
    setRecoveryActionDraft(undefined); setReducedTargetDraft(''); setReplacementHabitDraft(''); setRescheduleDateDraft(''); setPendingEntryNotice(null); setFormError(''); setInvalidField(null); setShowAdd(true);
  };
  const rescheduleEntry = () => {
    if (!editingEntryId) return;
    const original = entries.find((entry) => entry.id === editingEntryId);
    setEntries((current) => {
      const next = rescheduleOccurrence(current, editingEntryId, rescheduleDateDraft.trim());
      return next.map((entry) => entry.id === editingEntryId ? { ...entry, missedReason: selectedMissedReason ?? entry.missedReason, recoveryAction: 'rescheduled' } : entry);
    });
    if (original) {
      posthog?.capture('recovery_action_applied', {
        item_type: original.type,
        source_type: original.sourceType ?? original.type,
        recovery_action: 'reschedule',
      });
    }
    setShowAdd(false);
  };
  const applyRecoveryAction = () => {
    const original = entries.find((entry) => entry.id === editingEntryId);
    if (!original || occurrenceStatus(original) !== 'missed' || !recoveryActionDraft || !hasMissedReason) return;
    const now = new Date().toISOString();
    const reason = selectedMissedReason;
    const markRecovery = (entry: Entry, action: RecoveryAction): Entry => ({ ...entry, missedReason: reason ?? entry.missedReason, recoveryAction: action, updatedAt: now });
    if (recoveryActionDraft === 'complete_now') {
      setEntries((current) => current.map((entry) => {
        if (entry.id !== original.id) return entry;
        const completed = setOccurrenceStatus({ ...entry, missedReason: reason ?? entry.missedReason }, 'completed', now, 'user_completed_after_missed');
        return { ...completed, recoveryAction: 'completed_after_missed' };
      }));
    } else if (recoveryActionDraft === 'skip' || recoveryActionDraft === 'keep_plan') {
      setEntries((current) => current.map((entry) => entry.id === original.id ? markRecovery(entry, recoveryActionDraft) : entry));
    } else if (recoveryActionDraft === 'pause') {
      if (original.type !== 'habit' || original.sourceType !== 'habit') return;
      setHabitDefinitions((current) => current.map((habit) => habit.id === original.sourceId ? { ...habit, isPaused: true } : habit));
      setEntries((current) => current.map((entry) => entry.id === original.id ? markRecovery(entry, 'pause') : entry));
    } else if (recoveryActionDraft === 'replace') {
      const previous = habitDefinitions.find((habit) => habit.id === original.sourceId);
      const title = replacementHabitDraft.trim();
      if (!previous || !title) return;
      const replacement: HabitDefinition = { ...previous, id: createOccurrenceId('habit-definition'), title, startDate: dateKey(), isPaused: false, createdAt: now };
      setHabitDefinitions((current) => [...current.map((habit) => habit.id === previous.id ? { ...habit, isPaused: true } : habit), replacement]);
      setEntries((current) => current.map((entry) => entry.id === original.id ? markRecovery(entry, 'replace') : entry));
      setSelectedDate(dateKey());
    } else if (recoveryActionDraft === 'reduce_target') {
      const previousTarget = original.targetValueSnapshot ?? original.targetValue;
      const target = Number(reducedTargetDraft);
      const unit = original.targetUnitSnapshot ?? original.targetUnit;
      if (previousTarget == null || !Number.isFinite(target) || target <= 0 || target >= previousTarget) return;
      if (original.sourceType === 'habit') setHabitDefinitions((current) => current.map((definition) => definition.id === original.sourceId ? { ...definition, targetValue: target, targetUnit: unit } : definition));
      else if (original.sourceType === 'task') setTaskDefinitions((current) => current.map((definition) => definition.id === original.sourceId ? { ...definition, targetValue: target, targetUnit: unit } : definition));
      else if (original.sourceType === 'routine_step' && original.scheduleId && original.scheduleBlockId) setDaySchedules((current) => current.map((schedule) => schedule.id !== original.scheduleId ? schedule : { ...schedule, blocks: schedule.blocks.map((block) => block.id !== original.scheduleBlockId ? block : { ...block, targetValue: target, targetUnit: unit ?? '' }) }));
      const recoveryId = createOccurrenceId('recovery');
      const recovery: Entry | undefined = original.sourceType === 'routine_step' ? undefined : { ...original, id: recoveryId, date: dateKey(), occurrenceKey: `${original.occurrenceKey ?? original.id}:recovery:${recoveryId}`, status: 'planned', completed: false, missedReason: undefined, recoveryAction: undefined, relatedOccurrenceId: original.id, targetValue: target, targetUnit: unit, targetValueSnapshot: target, targetUnitSnapshot: unit, progressValue: 0, completedAt: undefined, statusHistory: [], createdAt: now, updatedAt: now };
      setEntries((current) => current.map((entry) => entry.id === original.id ? markRecovery(entry, 'reduce_target') : entry).concat(recovery ? [recovery] : []));
      setSelectedDate(dateKey());
    }
    posthog?.capture('recovery_action_applied', {
      item_type: original.type,
      source_type: original.sourceType ?? original.type,
      recovery_action: recoveryActionDraft,
    });
    setShowAdd(false);
  };
  const openGoalEdit = (goal?: (typeof plans)[number]) => { setEntryType('goal'); setDraft(goal?.title ?? ''); setEditingGoalFirstStep(goal?.firstStep ?? ''); setEditingGoalId(goal?.id ?? null); setGoalDescriptionDraft(goal?.description ?? ''); setGoalWhyDraft(goal?.why ?? ''); setGoalAreaDraft(goal?.lifeAreaId ?? (selectedAreaFilter !== 'all' && enabledLifeAreas.some((area) => area.id === selectedAreaFilter) ? selectedAreaFilter : '')); setGoalPriorityDraft(goal?.priority ?? 'medium'); setGoalStartDateDraft(goal?.startDate ?? dateKey()); setGoalTargetDateDraft(goal?.targetDate ?? ''); setGoalTargetTypeDraft(goal?.targetType ?? (goal?.targetValue != null ? 'quantitative' : 'qualitative')); setGoalLifecycleDraft(goal?.status ?? 'active'); setManualProgressDraft(goal?.manualProgressValue == null ? '' : String(goal.manualProgressValue)); setTargetDraft(goal?.targetValue == null ? '' : String(goal.targetValue)); setUnitDraft(goal?.targetUnit ?? ''); setGoalProgressDraft(goal?.progressValue == null ? '' : String(goal.progressValue)); setMilestoneTitleDraft(''); setMilestoneDueDateDraft(''); setMilestoneEditId(null); setPendingEntryNotice(null); setFormError(''); setInvalidField(null); setShowAdd(true); };
  const openMilestoneEdit = (goal: (typeof plans)[number], milestone: GoalMilestone) => { openGoalEdit(goal); setMilestoneEditId(milestone.id); setMilestoneTitleDraft(milestone.title); setMilestoneDueDateDraft(milestone.dueDate ?? ''); };
  const removeMilestone = (milestoneId: string) => {
    setPlans((current) => current.map((goal) => ({ ...goal, milestones: (goal.milestones ?? []).filter((milestone) => milestone.id !== milestoneId) })));
    setTaskDefinitions((current) => current.map((definition) => definition.milestoneId === milestoneId ? { ...definition, milestoneId: undefined } : definition));
    setHabitDefinitions((current) => current.map((definition) => definition.milestoneId === milestoneId ? { ...definition, milestoneId: undefined } : definition));
  };
  const toggleMilestone = (goalId: string, milestoneId: string) => setPlans((current) => current.map((goal) => goal.id !== goalId ? goal : { ...goal, milestones: (goal.milestones ?? []).map((milestone) => milestone.id !== milestoneId ? milestone : { ...milestone, completed: !milestone.completed, completedAt: milestone.completed ? undefined : new Date().toISOString() }) }));
  const selectedGoalMilestones = plans.find((goal) => goal.id === goalLink)?.milestones ?? [];
  const selectedRecurrenceRule = entryType === 'task' ? taskRecurrenceDraft : habitRecurrenceDraft;
  const recurrenceNeedsDays = entryType === 'habit' || (entryType === 'task' && editingOccurrence?.sourceType !== 'routine_step');
  const recurrenceScheduleInvalid = recurrenceNeedsDays && selectedRecurrenceRule === 'selected_days' && recurrenceDaysDraft.length === 0;
  const editingGoalStatus = plans.find((plan) => plan.id === editingGoalId)?.status ?? 'active';
  const goalLifecycleOptions: GoalLifecycleStatus[] = !editingGoalId ? ['draft', 'active'] : editingGoalStatus === 'draft' ? ['draft', 'active', 'abandoned', 'archived'] : editingGoalStatus === 'active' ? ['active', 'paused', 'completed', 'abandoned', 'archived'] : editingGoalStatus === 'paused' ? ['paused', 'active', 'completed', 'abandoned', 'archived'] : editingGoalStatus === 'archived' ? ['archived', 'active'] : [editingGoalStatus, 'active', 'archived'];
  const recurrenceDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const updateGoalProgress = (id: string, amount: number) => {
    const goal = plans.find((item) => item.id === id);
    if (!goal) return;
    const nextProgress = Math.max(0, (goal.progressValue ?? 0) + amount);
    setPlans((current) => current.map((item) => item.id === id ? { ...item, progressValue: nextProgress } : item));
    recordGoalProgress(id, nextProgress, goal.targetValue, goal.targetUnit);
  };
  const removeGoal = (id: string) => { setPlans((current) => current.filter((goal) => goal.id !== id)); setTaskDefinitions((current) => current.map((definition) => definition.goalId === id ? { ...definition, goalId: undefined, milestoneId: undefined } : definition)); setHabitDefinitions((current) => current.map((definition) => definition.goalId === id ? { ...definition, goalId: undefined, milestoneId: undefined } : definition)); };
  const setLifeAreaEnabled = (areaId: string, enabled: boolean) => { setLifeAreas((current) => current.map((area) => area.id === areaId ? { ...area, enabled } : area)); if (!enabled && selectedAreaFilter === areaId) setSelectedAreaFilter('all'); };
  const addCustomLifeArea = () => { const label = newAreaName.trim(); if (!label) return; const id = createOccurrenceId('area'); setLifeAreas((current) => [...current, { id, label, icon: 'sparkle', enabled: true, isCustom: true, sortOrder: current.length, createdAt: new Date().toISOString() }]); setNewAreaName(''); };
  const renameLifeArea = (areaId: string, label: string) => setLifeAreas((current) => current.map((area) => area.id === areaId && label.trim() ? { ...area, label } : area));
  const changeGoalStatus = (id: string, status: GoalLifecycleStatus) => setPlans((current) => current.map((goal) => goal.id === id ? { ...goal, status, completedAt: status === 'completed' ? (goal.status === 'completed' ? goal.completedAt : new Date().toISOString()) : undefined } : goal));
  useEffect(() => {
    if (didSyncReminders.current) return;
    didSyncReminders.current = true;
    let active = true;
    void syncLocalNotifications(reminders).then((result) => {
      if (!active) return;
      if (!result.ok && result.reason === 'denied') setNotificationStatus('Allow notifications in your device settings to receive reminders.', 'warning');
      else if (result.ok && result.reason === 'scheduled') setNotificationStatus('Reminders are scheduled on this device.', 'success');
    }).catch(() => { if (active) setNotificationStatus('Could not update reminders. Try again.', 'error'); });
    return () => { active = false; };
  }, [reminders]);
  const applyNotificationReminders = async (next: NotificationReminder[], requestPermission: boolean): Promise<'failed' | 'saved' | 'scheduled'> => {
    setReminders(next);
    try {
      if (storageStatus === 'save-error') retrySave();
      await confirmLocalSave();
    } catch {
      setNotificationStatus('Could not save your reminder changes. Try saving again.', 'error');
      return 'failed';
    }
    try {
      const result = await syncLocalNotifications(next, { requestPermission });
      if (!result.ok) {
        setNotificationStatus(result.reason === 'denied' ? 'Saved on this device. Allow notifications in device settings to receive reminders.' : 'Saved on this device. Notifications require the iOS or Android app.', 'warning');
        return 'saved';
      }
      setNotificationStatus(result.reason === 'disabled' ? (next.length ? 'Saved on this device. There are no upcoming reminders.' : 'No reminders are scheduled.') : 'Reminders are scheduled on this device.', 'success');
      return result.reason === 'scheduled' ? 'scheduled' : 'saved';
    } catch {
      setNotificationStatus('Saved on this device, but notifications could not be scheduled. Try again.', 'error');
      return 'saved';
    }
  };
  const saveNotificationReminder = async () => {
    if (savingReminder) return;
    const title = notificationTitle.trim();
    if (!title) { setNotificationStatus('Add a name for this reminder.', 'error'); reminderNameInput.current?.focus(); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)) { setNotificationStatus('Enter a time such as 08:30.', 'error'); reminderTimeInput.current?.focus(); return; }
    if (notificationRepeat === 'once') {
      if (!isValidDateKey(notificationDate)) { setNotificationStatus('Choose a valid date.', 'error'); return; }
      if (new Date(`${notificationDate}T${notificationTime}:00`).getTime() <= Date.now()) { setNotificationStatus('Choose a future date and time.', 'error'); reminderTimeInput.current?.focus(); return; }
    }
    const reminder: NotificationReminder = { id: pendingReminderId ?? createOccurrenceId('reminder'), title, time: notificationTime, repeat: notificationRepeat, ...(notificationRepeat === 'once' ? { date: notificationDate } : {}) };
    setPendingReminderId(reminder.id);
    setSavingReminder(true);
    const result = await applyNotificationReminders([...reminders.filter((item) => item.id !== reminder.id), reminder], true);
    setSavingReminder(false);
    if (result === 'failed') return;
    setPendingReminderId(null);
    setNotificationFormOpen(false);
    setNotificationTitle(''); setNotificationTime(''); setNotificationRepeat('once'); setNotificationDate(dateKey());
    if (result === 'scheduled') toast.success('Reminder scheduled', { description: 'Saved on this device.' });
  };
  const removeNotificationReminder = async (id: string) => {
    if (savingReminder) return;
    setSavingReminder(true);
    const result = await applyNotificationReminders(reminders.filter((reminder) => reminder.id !== id), false);
    setSavingReminder(false);
    if (result !== 'failed') toast.success('Reminder removed', { description: 'Saved on this device.' });
  };
  const checkPushReadiness = async () => {
    setNotificationStatus('Checking push registration…');
    const result = await registerPushToken();
    if (result.ok) setNotificationStatus('This device can receive push notifications. Server delivery still needs to be connected.');
    else if (result.reason === 'project_id_missing') setNotificationStatus('Remote push delivery is not available in this app yet. Use scheduled reminders.');
    else if (result.reason === 'physical_device_required') setNotificationStatus('This check requires a physical device. Scheduled reminders still work on this device.');
    else if (result.reason === 'permission_denied') setNotificationStatus('Allow notifications in your device settings to continue push setup.');
    else setNotificationStatus('Push registration is unavailable on this platform or could not complete.');
  };
  const selectDate = (date: string) => {
    setSelectedDate(date);
  };
  const [savingCommitment, setSavingCommitment] = useState(false);
  const [commitmentError, setCommitmentError] = useState('');
  const [pendingCommitmentId, setPendingCommitmentId] = useState<string | null>(null);
  const createCommitment = async () => {
    if (savingCommitment) return;
    const title = commitmentTitle.trim(); const target = commitmentTarget.trim(); const deadline = commitmentDeadline.trim();
    const requiredActions = commitmentRequiredActions.trim() ? Number(commitmentRequiredActions) : undefined;
    if (!title || !target || !isValidDateKey(deadline) || (requiredActions != null && (!Number.isInteger(requiredActions) || requiredActions <= 0))) { setCommitmentError('Add a name, target, valid deadline, and a whole number of linked actions if used.'); return; }
    setSavingCommitment(true);
    const item: Commitment = { id: pendingCommitmentId ?? createOccurrenceId('commitment'), title, target, deadline, timeframe: commitmentTimeframe.trim(), why: commitmentWhy.trim(), goalId: commitmentGoalId, linkedSourceId: commitmentSource?.id, linkedSourceType: commitmentSource?.type, requiredActions, reward: commitmentReward.trim() || undefined, consequence: commitmentConsequence.trim() || undefined, createdAt: new Date().toISOString() };
    setPendingCommitmentId(item.id);
    setCommitments((items) => [...items.filter((current) => current.id !== item.id), item]);
    try { if (storageStatus === 'save-error') retrySave(); await confirmLocalSave(); }
    catch { setCommitmentError('Could not save on this device. Your edits are still here. Try saving again.'); setSavingCommitment(false); return; }
    setSavingCommitment(false); setPendingCommitmentId(null); setCommitmentError('');
    setCommitmentTitle(''); setCommitmentTarget(''); setCommitmentRequiredActions(''); setCommitmentDeadline(''); setCommitmentTimeframe(''); setCommitmentWhy(''); setCommitmentReward(''); setCommitmentConsequence(''); setCommitmentGoalId(undefined); setCommitmentSource(undefined); setCommitmentDetailsOpen(false); setCommitmentFormOpen(false);
    posthog?.capture('commitment_created', {
      has_goal_link: Boolean(item.goalId),
      has_linked_action: Boolean(item.linkedSourceId),
      ...(item.linkedSourceType ? { linked_action_type: item.linkedSourceType } : {}),
      has_required_actions: item.requiredActions != null,
      has_reward: Boolean(item.reward),
      has_consequence: Boolean(item.consequence),
    });
    toast.success('Commitment saved', { description: 'Saved on this device.' });
  };
  const changeTab = (tab: HomeTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };
  const resetToSignIn = () => {
    rootNavigation.resetRoot({
      index: 0,
      routes: [{ name: 'index', params: { mode: 'auth' } }],
    });
  };
  const deleteAccount = async (wasSignedIn: boolean) => {
    if (accountActionInProgress) return;
    setAccountActionInProgress('delete');
    try {
      await account.deleteCloudAccount();
      await deleteLocalAccountData();
    } catch (error) {
      console.error('Could not clear local account data:', error);
      const message = 'Please try again. Your saved data may still be on this device.';
      setAccountActionError(message);
      return;
    } finally {
      setAccountActionInProgress(null);
    }
    setAccountActionDialog(null);
    setAccountActionError(null);
    resetToSignIn();
    toast.success(wasSignedIn ? 'Account deleted' : 'Guest workspace deleted', { description: 'You can sign in or start a new planner.' });
  };
  const requestDeleteAccountConfirmation = () => {
    if (accountActionInProgress) return;
    setAccountActionError(null);
    const wasSignedIn = Boolean(account.user);
    setAccountActionDialog(wasSignedIn ? 'deleteAccount' : 'deleteGuest');
  };
  const signOut = async () => {
    if (accountActionInProgress) return;
    setAccountActionInProgress('signOut');
    setAccountActionError(null);
    try {
      await account.signOutToGuest();
      if (onboarding) setOnboarding({ ...onboarding, accountType: 'guest', syncConsent: false, syncConsentAt: null, syncConsentUserId: null });
      setAccountActionDialog(null);
      resetToSignIn();
      toast.success(account.user ? 'Signed out' : 'Guest workspace closed', { description: 'Your planner stays on this device.' });
    } catch (error) {
      console.error('Could not sign out:', error);
      const message = 'Your account is still connected. Please try again.';
      if (Platform.OS === 'ios') SystemAlert.alert('Could not sign out', message);
      else setAccountActionError(message);
    } finally {
      setAccountActionInProgress(null);
    }
  };
  const requestSignOutConfirmation = () => {
    if (accountActionInProgress) return;
    setAccountActionError(null);
    const signedIn = Boolean(account.user);
    if (Platform.OS === 'ios') {
      SystemAlert.alert(
        signedIn ? 'Sign out?' : 'Leave guest workspace?',
        signedIn ? 'Your account will be disconnected from this device. Your planner data will stay on this device.' : 'Your guest planner will stay on this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: signedIn ? 'Sign out' : 'Leave guest workspace', onPress: () => { void signOut(); } },
        ],
      );
      return;
    }
    setAccountActionDialog('signOut');
  };
  const enablePlannerSync = () => {
    SystemAlert.alert(
      'Sync your planner?',
      'Your goals, life areas, tasks, habits, routines, commitments, reminders, progress history, check-ins, and reflections will be saved to your account and available on your other signed-in devices.',
      [
        { text: 'Keep on this device', style: 'cancel' },
        {
          text: 'Sync my planner',
          onPress: () => {
            const current = onboarding ?? {
              accountType: 'google' as const,
              syncConsent: false,
              syncConsentAt: null,
              syncConsentUserId: null,
              routineTemplateIds: [],
              appearance: visualStyle,
              areas: [],
              customAreaName: '',
            };
            const provider = account.user?.app_metadata.provider === 'apple' ? 'apple' : 'google';
            setOnboarding({ ...current, accountType: current.accountType === 'guest' ? provider : current.accountType, syncConsent: true, syncConsentAt: new Date().toISOString(), syncConsentUserId: account.user?.id ?? null });
          },
        },
      ],
      { cancelable: true },
    );
  };
  const disablePlannerSync = () => {
    setAccountActionDialog('disableSync');
  };
  const confirmDisablePlannerSync = () => {
    if (onboarding) setOnboarding({ ...onboarding, syncConsent: false, syncConsentAt: null, syncConsentUserId: null });
    setAccountActionDialog(null);
  };
  const restoreGuestCopy = () => {
    SystemAlert.alert(
      'Restore your earlier guest planner?',
      'The current planner will be saved as a recoverable copy before the earlier guest data is restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore guest data',
          onPress: () => {
            void restoreArchivedGuestData().then((restored) => {
              if (!restored) SystemAlert.alert('Could not restore guest data', 'The earlier planner copy is not available in a readable format.');
            });
          },
        },
      ],
      { cancelable: true },
    );
  };
  const restoreConflictCopy = (recovery: RecoverySnapshot, source: 'localSnapshot' | 'cloudSnapshot') => {
    const payload = recovery.payload as { userId: string; localSnapshot: PlannerSnapshot; cloudSnapshot: PlannerSnapshot };
    const chosenSnapshot = payload[source];
    const copyLabel = source === 'localSnapshot' ? 'device' : 'account';
    SystemAlert.alert(
      'Restore the ' + copyLabel + ' copy?',
      'The current planner will first be saved as another recoverable copy. If sync is on, the restored version will then follow the normal revision and conflict checks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore ' + copyLabel + ' copy',
          onPress: () => {
            void (async () => {
              try {
                await saveRecoverySnapshot('sync-conflict', {
                  userId: payload.userId,
                  localSnapshot: createPlannerSnapshot(plannerSession),
                  cloudSnapshot: chosenSnapshot,
                  restoredFrom: recovery.id,
                });
                replacePlannerData(chosenSnapshot);
                const userId = account.user?.id;
                const snapshots = await listRecoverySnapshots();
                setSyncRecoverySnapshots(snapshots.filter((item) => item.kind === 'sync-conflict' && userId && (item.payload as { userId?: unknown } | null)?.userId === userId));
              } catch {
                SystemAlert.alert('Could not restore this copy', 'The active planner was left unchanged. Try restoring again.');
              }
            })();
          },
        },
      ],
      { cancelable: true },
    );
  };
  return (
    <VisualStyleContext.Provider value={visualStyle}>
    <View style={[styles.root, { minHeight: windowHeight }]}> 
      <View style={styles.tabScrollViewport}>
      <Animated.ScrollView key={activeTab} ref={scrollRef} style={styles.tabScrollView} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: expandedHeaderHeight + 16, paddingBottom: scrollContentBottomPadding }]}>
        <PageText style={styles.sectionSubtitle}>{activeTab === 'today' ? 'See your plan and record what you did.' : activeTab === 'goals' ? 'Set goals and track the steps toward them.' : activeTab === 'progress' ? 'Review recorded activity for the selected dates.' : 'Manage your account, reminders, and appearance.'}</PageText>
        {activeTab === 'today' && <Animated.View entering={FadeIn.duration(reduceMotion ? 80 : 150)} style={styles.weekStrip}>
          {days.map((day, index) => {
            const weekday = index;
            const date = shiftDateKey(weekStart, weekday);
            const dateObject = new Date(`${date}T12:00:00`);
            const isSelected = selectedDate === date;
            const isToday = date === dateKey();
            return <SquirclePressable key={`${day}-${index}`} pill onPress={() => selectDate(date)} accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={dateObject.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} style={[styles.dayPill, isSelected && styles.dayPillSelected]}>
              <PageText style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{day}</PageText>
              <PageText style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{dateObject.getDate()}</PageText>
              <View style={[styles.dayDot, isToday && styles.dayDotToday]} />
            </SquirclePressable>;
          })}
        </Animated.View>}

        {activeTab === 'today' && recommendations.length > 0 && <SquircleCard style={styles.recommendationsCard}>
          <View style={styles.chartHeading}><View><PageText style={styles.dateLabel}>BASED ON YOUR RECENT PATTERNS</PageText><PageText display style={styles.sectionTitle}>A few ideas</PageText></View><View style={styles.chartBadge}><AppIcon name="sparkle" style={visualStyle} size={16} color={colors.green} /></View></View>
          {recommendations.map((recommendation) => <View key={recommendation.id} style={styles.recommendationRow}>
            <PageText display style={styles.recommendationTitle}>{recommendation.title}</PageText>
            <PageText style={styles.sectionSubtitle}>{recommendation.evidence}</PageText>
            <View style={[styles.recommendationActions, stackRecommendationActions && styles.recommendationActionsStacked]}>
              <NativeActionButton width={stackRecommendationActions ? 'full' : 'content'} label={recommendation.action} onPress={() => { setAppliedRecommendationIds((ids) => [...ids, recommendation.id]); recommendation.apply(); }} appearance="prominent" tintColor={colors.green} labelColor={palette.onAccent} style={[styles.recommendationApply, stackRecommendationActions && styles.recommendationButtonStacked]}>
                <PageText style={styles.recommendationApplyText}>{recommendation.action}</PageText>
              </NativeActionButton>
              <NativeActionButton width={stackRecommendationActions ? 'full' : 'content'} label="Dismiss" onPress={recommendation.dismiss} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={[styles.recommendationDismiss, stackRecommendationActions && styles.recommendationButtonStacked]} accessibilityLabel={`Dismiss recommendation: ${recommendation.title}`}>
                <PageText style={styles.recommendationDismissText}>Dismiss</PageText>
              </NativeActionButton>
            </View>
          </View>)}
        </SquircleCard>}

        {activeTab === 'today' && (daySchedulesForDate.length ? <>{daySchedulesForDate.map((daySchedule) => {
          const routineEntries = scheduledEntries.filter((entry) => entry.scheduleId === daySchedule.id);
          const completedRoutineEntries = routineEntries.filter((entry) => isDone(entry)).length;
          return <View key={daySchedule.id} style={styles.dayScheduleSection}>
            <View style={styles.dayScheduleHeading}><View style={styles.entryCopy}><PageText style={styles.dateLabel}>ROUTINE</PageText><PageText display style={styles.dayScheduleTitle}>{daySchedule.title}</PageText><PageText style={styles.sectionSubtitle}>{completedRoutineEntries} of {routineEntries.length} routine steps complete</PageText></View><NativeActionButton label="" systemImage="arrow.right" appearance="plain" tintColor={colors.green} labelColor={colors.green} onPress={() => router.push({ pathname: '/day-template-detail', params: { id: daySchedule.id } })} style={styles.dayScheduleEdit} accessibilityLabel={`Edit ${daySchedule.title}`}><AppIcon name="arrow" style={visualStyle} size={17} color={colors.green} /></NativeActionButton></View>
            {routineEntries.map((entry, index) => <EntryRow key={entry.id} entry={{ ...entry, completed: isDone(entry) }} onToggle={toggleEntry} isLast={index === routineEntries.length - 1} onEdit={() => openEntryEdit(entry)} />)}
          </View>;
        })}</> : <SquirclePressable onPress={() => router.push('/templates')} style={({ pressed }) => [styles.dayScheduleEmpty, styles.flatListPrompt, pressed && { backgroundColor: palette.pressed }]} accessibilityRole="button" accessibilityLabel={`Choose a ${selectedDayType} day plan`}><View style={styles.emptyGlyph}><AppIcon name="calendar" style={visualStyle} size={19} color={colors.green} /></View><View style={styles.entryCopy}><PageText display style={styles.emptyTitle}>Add a {selectedDayType} rhythm</PageText><PageText style={styles.emptySubtitle}>A routine groups actions into a daily plan.</PageText></View><AppIcon name="arrow" style={visualStyle} size={17} color={colors.green} /></SquirclePressable>)}

        {activeTab === 'today' && unresolvedMissedEntries.length > 0 && <SquircleCard style={styles.recoveryCard}>
          <PageText style={styles.dateLabel}>A GENTLE RESET</PageText><PageText display style={styles.sectionTitle}>Plans that need a next step</PageText><PageText style={styles.sectionSubtitle}>Choose what would help now. You can reschedule, adjust, pause, or leave the plan as it is.</PageText>
          {unresolvedMissedEntries.map((entry) => <View key={entry.id} style={styles.recoveryQueueRow}>
            <View style={styles.entryCopy}><PageText style={styles.entryTitle}>{entry.title}</PageText><PageText style={styles.entryMeta}>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{entry.missedReason ? ` · ${missedReasonLabel(entry.missedReason)}` : ''}</PageText></View>
              <NativeActionButton label="Reflect" onPress={() => openEntryEdit(entry)} appearance="plain" tintColor={colors.green} labelColor={colors.green} accessibilityLabel={`Reflect and recover from missed ${entry.title}`} style={styles.entryEdit}><PageText style={styles.entryEditText}>Reflect</PageText></NativeActionButton>
          </View>)}
        </SquircleCard>}

        {activeTab === 'today' && (
          <Animated.View entering={FadeIn.duration(reduceMotion ? 100 : 190)}>
            <View style={styles.sectionHeaderCompact}>
              <View><PageText display style={styles.sectionTitle}>Things to do</PageText><PageText style={styles.sectionSubtitle}>{tasks.length ? `${completed} of ${tasks.length} completed` : 'Your daily checklist'}</PageText></View>
              <NativeActionButton label="" systemImage="plus" appearance="bordered" tintColor={colors.green} labelColor={colors.green} onPress={() => openNew('task')} accessibilityLabel="Add a task" style={styles.smallAdd}><AppIcon name="add" style={visualStyle} size={17} color={colors.green} /></NativeActionButton>
            </View>
            {tasks.length ? tasks.map((entry, index) => <EntryRow key={entry.id} entry={{ ...entry, completed: isDone(entry) }} onToggle={toggleEntry} onToggleSubtask={toggleSubtask} isLast={index === tasks.length - 1} onEdit={() => openEntryEdit(entry)} />) : <EmptyState layout="row" title="Nothing planned yet" description="Add a task and check it off when done." onPress={() => openNew('task')} actionLabel="Add a task" />}
            <View style={styles.sectionHeaderCompact}>
              <View><PageText display style={styles.sectionTitle}>Habits & practices</PageText><PageText style={styles.sectionSubtitle}>{habits.length ? 'Actions you repeat on chosen days.' : 'Add an action you want to repeat.'}</PageText></View>
              <NativeActionButton label="" systemImage="plus" appearance="bordered" tintColor={colors.green} labelColor={colors.green} onPress={() => openNew('habit')} accessibilityLabel="Add a habit" style={styles.smallAdd}><AppIcon name="add" style={visualStyle} size={17} color={colors.green} /></NativeActionButton>
            </View>
            {habits.length ? habits.map((entry, index) => <EntryRow key={entry.id} entry={{ ...entry, completed: isDone(entry) }} onToggle={toggleEntry} isLast={index === habits.length - 1} onEdit={() => openEntryEdit(entry)} />) : <EmptyState layout="row" icon="focus" title="No habits yet" description="Add a habit and choose its repeat days." onPress={() => openNew('habit')} actionLabel="Add a habit" />}


          </Animated.View>
        )}


        {activeTab === 'goals' && <View style={styles.tabPage}>
          <PageText style={styles.dateLabel}>YOUR DIRECTION</PageText><PageText display style={styles.pageHeading}>Choose your next goal.</PageText><PageText style={styles.pageIntro}>A goal is an outcome. Link tasks and habits to track your steps.</PageText>
        <SquircleCard style={styles.progressInsightCard}>
            <View style={styles.chartHeading}><View><PageText display style={styles.sectionTitle}>Commitments</PageText><PageText style={styles.sectionSubtitle}>Track a target and a deadline.</PageText></View><NativeActionButton label={commitmentFormOpen ? 'Close' : 'Add'} systemImage={commitmentFormOpen ? 'xmark' : 'plus'} appearance="plain" tintColor={colors.green} labelColor={colors.green} onPress={() => { setCommitmentFormOpen((open) => !open); setCommitmentDetailsOpen(false); }} style={styles.inlineAction}><PageText style={styles.inlineActionText}>{commitmentFormOpen ? 'Close' : 'Add'}</PageText></NativeActionButton></View>
            {commitmentMetrics.map((commitment) => {
              const linkedGoal = commitment.goalId ? plans.find((goal) => goal.id === commitment.goalId) : undefined;
              const linkedTitle = commitment.linkedSourceType === 'task' ? taskDefinitions.find((definition) => definition.id === commitment.linkedSourceId)?.title : commitment.linkedSourceType === 'habit' ? habitDefinitions.find((definition) => definition.id === commitment.linkedSourceId)?.title : undefined;
              const overdue = commitment.deadline < dateKey();
              const expanded = expandedCommitmentIds.includes(commitment.id);
              const hasDetails = Boolean(linkedGoal || linkedTitle || commitment.why || commitment.reward || commitment.consequence);
              return <View key={commitment.id} style={styles.commitmentRow}>
                <View style={styles.entryCopy}>
                  <PageText style={styles.entryTitle}>{commitment.title}</PageText>
                  <PageText style={styles.entryMeta}>{`${commitment.target}${commitment.timeframe ? ` · ${commitment.timeframe}` : ''} · due ${commitment.deadline}${overdue ? ' · past deadline' : ''}`}</PageText>
                  {commitment.percentage != null && <PageText style={styles.entryMeta}>{`${commitment.completedActions} of ${commitment.requiredActions} linked actions · ${commitment.remainingActions} remaining · ${commitment.percentage}%`}</PageText>}
                  {expanded && <View style={styles.commitmentDetails}>
                    {linkedGoal && <PageText style={styles.entryMeta}>Goal: {linkedGoal.title}</PageText>}
                    {linkedTitle && <PageText style={styles.entryMeta}>{`Linked ${commitment.linkedSourceType}: ${linkedTitle}`}</PageText>}
                    {commitment.why ? <PageText style={styles.entryMeta}>Why: {commitment.why}</PageText> : null}
                    {commitment.reward ? <PageText style={styles.entryMeta}>Reward: {commitment.reward}</PageText> : null}
                    {commitment.consequence ? <PageText style={styles.entryMeta}>Accountability: {commitment.consequence}</PageText> : null}
                  </View>}
                </View>
                <View style={styles.commitmentActions}>
                  {hasDetails && <NativeActionButton label={expanded ? 'Less' : 'Details'} onPress={() => setExpandedCommitmentIds((current) => expanded ? current.filter((id) => id !== commitment.id) : [...current, commitment.id])} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.entryEdit}><PageText style={styles.entryEditText}>{expanded ? 'Less' : 'Details'}</PageText></NativeActionButton>}
                  <NativeActionButton label="Remove" systemImage="trash" appearance="plain" tintColor={palette.muted} labelColor={palette.muted} onPress={() => { setCommitments((items) => items.filter((candidate) => candidate.id !== commitment.id)); setExpandedCommitmentIds((current) => current.filter((id) => id !== commitment.id)); }} accessibilityLabel={`Remove commitment ${commitment.title}`} style={styles.entryEdit}><PageText style={styles.entryEditText}>Remove</PageText></NativeActionButton>
                </View>
              </View>;
            })}
          </SquircleCard>

          <View style={styles.areaHeadingRow}><PageText display style={styles.sectionTitle}>Life areas</PageText><NativeActionButton label="Manage" onPress={() => setAreaManagerOpen(true)} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.inlineAction}><PageText style={styles.inlineActionText}>Manage</PageText></NativeActionButton></View>
          {enabledLifeAreas.length ? <ProgressiveHorizontalScrollView showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaSummaryRow}>
            {enabledLifeAreas.map((area) => { const summary = getGoalAreaSummary(area.id); return <SquirclePressable exactSquircle key={area.id} onPress={() => setSelectedAreaFilter(selectedAreaFilter === area.id ? 'all' : area.id)} style={[styles.areaSummaryCard, selectedAreaFilter === area.id && styles.areaSummaryCardSelected]} accessibilityRole="button" accessibilityState={{ selected: selectedAreaFilter === area.id }}><View style={styles.areaSummaryIcon}><AppIcon name={area.icon} style={visualStyle} size={15} color={colors.green} /></View><PageText style={styles.areaSummaryTitle}>{area.label}</PageText><PageText style={styles.areaSummaryCaption}>{summary.activeCount} active · {summary.completedCount} done</PageText>{summary.average != null && <PageText style={styles.areaSummaryProgress}>{summary.average}% average progress</PageText>}</SquirclePressable>; })}
          </ProgressiveHorizontalScrollView> : <SquircleCard style={styles.emptyAreaState}>
            <PageText display style={styles.emptyAreaTitle}>No life areas selected</PageText>
            <PageText style={styles.emptyAreaHint}>Choose an area or add one that fits your life.</PageText>
            <NativeActionButton label="Choose or add a life area" systemImage="plus" onPress={() => setAreaManagerOpen(true)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.emptyAreaButton}><PageText style={styles.goalActionText}>Choose or add a life area</PageText></NativeActionButton>
          </SquircleCard>}
          <View style={styles.areaHeadingRow}>
            <PageText display style={styles.sectionTitle}>{selectedAreaFilter === 'all' ? 'Your goals' : lifeAreas.find((area) => area.id === selectedAreaFilter)?.label ?? 'Your goals'}</PageText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: LayoutSpacing.control }}>
              {selectedAreaFilter !== 'all' && <NativeActionButton label="Show all" onPress={() => setSelectedAreaFilter('all')} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.inlineAction}><PageText style={styles.inlineActionText}>Show all</PageText></NativeActionButton>}
              <SquirclePressable onPress={() => openGoalEdit()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Add a goal"><AppIcon name="add" style={visualStyle} size={18} color={colors.green} /></SquirclePressable>
            </View>
          </View>
          {visibleGoalPlans.length ? visibleGoalPlans.map((plan) => { const related = goalEntriesByPlan.get(plan.id) ?? []; const checked = related.filter((entry) => isDone(entry)).length; const goalStatus = getGoalProgressStatus(plan); const statusLabel = goalStatus ? ({ low: 'Meh', mid: 'Okay', high: 'Fantastic' } as const)[goalStatus] : undefined; const status = plan.status ?? 'active'; const completedGoal = status === 'completed'; const qualitativeProgress = getQualitativeProgress(plan); const area = lifeAreas.find((item) => item.id === plan.lifeAreaId); const allowed: GoalLifecycleStatus[] = status === 'draft' ? ['active', 'abandoned', 'archived'] : status === 'active' ? ['paused', 'completed', 'abandoned', 'archived'] : status === 'paused' ? ['active', 'completed', 'abandoned', 'archived'] : status === 'archived' ? ['active'] : ['active', 'archived']; return <SquircleCard key={plan.id} style={styles.goalCard}><View style={styles.goalCardHeading}><View style={styles.goalNudgeIcon}><AppIcon name="goals" style={visualStyle} size={19} color={colors.green} /></View><View style={styles.entryCopy}><PageText display style={[styles.goalCardTitle, completedGoal && styles.entryTitleDone]}>{plan.title}</PageText><PageText style={styles.emptySubtitle}>{area?.label ?? 'Unassigned area'} · {status[0].toUpperCase() + status.slice(1)} · {plan.priority ?? 'medium'} priority</PageText>{plan.description ? <PageText style={[styles.emptySubtitle, completedGoal && styles.entryTitleDone]}>{plan.description}</PageText> : null}{plan.firstStep ? <PageText style={styles.emptySubtitle}>First step: {plan.firstStep}</PageText> : null}</View></View>{plan.why ? <PageText style={styles.goalProgress}>Why this matters: {plan.why}</PageText> : null}{plan.targetType === 'quantitative' && plan.targetValue != null ? <><PageText style={styles.goalProgress}>{`${plan.progressValue ?? 0} / ${plan.targetValue} ${plan.targetUnit || 'unit needed'}${statusLabel ? ` · ${statusLabel}` : ''}`}</PageText>{plan.targetUnit && <View style={styles.goalActions}><NativeActionButton label="" systemImage="minus" onPress={() => updateGoalProgress(plan.id, -1)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction} accessibilityLabel="Decrease goal progress"><PageText style={styles.goalActionText}>−</PageText></NativeActionButton><NativeActionButton label={`+1 ${plan.targetUnit}`} onPress={() => updateGoalProgress(plan.id, 1)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction} accessibilityLabel="Increase goal progress"><PageText style={styles.goalActionText}>+1 {plan.targetUnit}</PageText></NativeActionButton></View>}</> : <PageText style={styles.goalProgress}>{qualitativeProgress == null ? 'Qualitative goal · add milestones or a progress estimate' : `Qualitative progress · ${qualitativeProgress}%`}</PageText>}<PageText style={styles.goalProgress}>{plan.startDate ? `Started ${plan.startDate}` : ''}{plan.targetDate ? ` · Target ${plan.targetDate}` : ''}</PageText><PageText style={styles.goalProgress}>{related.length ? `${checked} of ${related.length} linked actions done on ${selectedDate === dateKey() ? 'today' : selectedDateLabel}` : 'No actions linked yet'}</PageText>{(plan.milestones ?? []).map((milestone) => <View key={milestone.id} style={styles.milestoneRow}><Pressable onPress={() => toggleMilestone(plan.id, milestone.id)} style={styles.milestoneCheck} accessibilityRole="checkbox" accessibilityState={{ checked: milestone.completed }}><PageText style={styles.goalActionText}>{milestone.completed ? '✓ ' : '○ '}{milestone.title}{milestone.dueDate ? ` · due ${milestone.dueDate}` : ''}</PageText></Pressable><NativeActionButton label="Edit" onPress={() => openMilestoneEdit(plan, milestone)} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.milestoneEdit} accessibilityLabel={`Edit milestone ${milestone.title}`}><PageText style={styles.entryEditText}>Edit</PageText></NativeActionButton><NativeActionButton label="Remove" systemImage="trash" onPress={() => removeMilestone(milestone.id)} appearance="plain" tintColor={palette.muted} labelColor={palette.muted} style={styles.milestoneEdit} accessibilityLabel={`Remove milestone ${milestone.title}`}><PageText style={styles.entryEditText}>Remove</PageText></NativeActionButton></View>)}{related.slice(0, 4).map((entry) => <EntryRow key={entry.id} entry={{ ...entry, completed: isDone(entry) }} onToggle={toggleEntry} isLast={false} onEdit={() => openEntryEdit(entry)} />)}<View style={styles.goalActions}><NativeActionButton label="Edit goal" onPress={() => openGoalEdit(plan)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction}><PageText style={styles.goalActionText}>Edit goal</PageText></NativeActionButton><NativeActionButton label="Remove" systemImage="trash" onPress={() => removeGoal(plan.id)} appearance="bordered" tintColor={palette.muted} labelColor={palette.muted} style={styles.goalAction}><PageText style={styles.goalActionText}>Remove</PageText></NativeActionButton><NativeActionButton label="Add milestone" systemImage="plus" onPress={() => openGoalEdit(plan)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction}><PageText style={styles.goalActionText}>Add milestone</PageText></NativeActionButton><NativeActionButton label="Add action" systemImage="plus" onPress={() => openNew('task', plan.id)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction}><PageText style={styles.goalActionText}>Add action</PageText></NativeActionButton>{allowed.map((nextStatus) => <NativeActionButton key={nextStatus} label={nextStatus === 'active' ? status === 'completed' || status === 'abandoned' || status === 'archived' ? 'Reopen' : 'Resume' : nextStatus[0].toUpperCase() + nextStatus.slice(1)} onPress={() => changeGoalStatus(plan.id, nextStatus)} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction}><PageText style={styles.goalActionText}>{nextStatus === 'active' ? status === 'completed' || status === 'abandoned' || status === 'archived' ? 'Reopen' : 'Resume' : nextStatus[0].toUpperCase() + nextStatus.slice(1)}</PageText></NativeActionButton>)}</View></SquircleCard>; }) : <SquircleCard exactSquircle style={styles.emptyPlan}><View style={styles.emptyGlyph}><AppIcon name="goal" style={visualStyle} size={19} color={colors.green} /></View><View style={styles.emptyPlanCopy}><PageText display style={styles.emptyTitle}>{selectedAreaFilter === 'all' ? 'No goals yet' : 'No goals in this area yet.'}</PageText><PageText style={styles.emptySubtitle}>Choose an area that matters and add one clear next step.</PageText></View></SquircleCard>}
          <View style={styles.goalFooterActions}>
            <NativeActionButton label="Browse templates" systemImage="arrow.right" appearance="bordered" tintColor={colors.green} labelFontSize={13.2} onPress={() => router.push('/templates')} width="full" style={[styles.templateButton, styles.goalFooterButton]}><PageText style={styles.templateButtonText}>Browse templates</PageText><AppIcon name="arrow" style={visualStyle} size={17} /></NativeActionButton>
          </View>

        </View>}

        {activeTab === 'progress' && <ProgressTab
          model={homeScreenModel.progressModel}
          styles={styles}
          selectedDate={selectedDate}
          progressRangeId={progressRangeId}
          onProgressRangeChange={setProgressRangeId}
          showAllAchievements={showAllAchievements}
          onShowAllAchievementsChange={setShowAllAchievements}
          chartWidth={chartWidth}
          onOpenCheckIn={openProgressCheckIn}
          onOpenHistory={openProgressHistory}
          onOpenReflection={openProgressReflection}
        />}

        {activeTab === 'profile' && <View style={styles.tabPage}>
          <PageText style={styles.dateLabel}>YOUR SPACE</PageText><PageText display style={styles.pageHeading}>Make it feel like yours.</PageText><PageText style={[styles.pageIntro, styles.profileHighContrastCopy]}>{account.user ? 'Your planner stays on this device. Choose whether to sync it to your account.' : 'Your planner stays on this device. Sign in if you want to sync it.'}</PageText>
          <SquircleCard style={styles.profileAccountCard}>
            <SquircleCard exactSquircle style={styles.profileIdentityHeader}>
              <View style={styles.profileAvatarRing}>
                <ProfileAvatar name={profileName} uri={profileAvatarUri} />
              </View>
              <PageText display style={styles.profileIdentityName}>{profileName}</PageText>
              <PageText style={styles.profileIdentitySubtitle}>
              {account.user ? account.user.email ?? 'Your planner account' : 'Your planner stays on this device.'}
              </PageText>
              <View style={styles.profileProviderBadge}>
                <PageText style={styles.profileProviderText}>{profileProviderLabel}</PageText>
              </View>
            </SquircleCard>
            <View style={styles.profileAccountBody}>
              {account.user ? <>
                <PageText style={[styles.profileDetailLabel, styles.profileCenteredText]}>PLANNER SYNC</PageText>
                {!hasSyncConsent ? <>
                  <PageText style={[styles.sectionSubtitle, styles.profileHighContrastCopy, styles.profileCenteredText]}>Your planner stays on this device until you give one-time consent to sync goals, life areas, tasks, habits, routines, commitments, reminders, progress history, check-ins, and reflections.</PageText>
                  <Pressable
                    onPress={enablePlannerSync}
                    style={({ pressed }) => [styles.profilePrimaryAction, pressed && styles.profileButtonPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Turn on planner sync"
                    accessibilityHint="Sync your planner with this account."
                  >
                    <PageText style={styles.profilePrimaryActionText}>Turn on sync</PageText>
                  </Pressable>
                </> : <>
                  <PageText style={[styles.profileSyncStatus, styles.profileCenteredText]}>{account.syncStatus === 'syncing' ? 'Syncing planner…' : account.syncStatus === 'synced' ? 'Your planner is up to date.' : account.syncStatus === 'offline' ? 'Offline. Changes will sync when you reconnect.' : account.syncStatus === 'conflict' ? 'A device and account copy need your choice.' : account.syncStatus === 'error' ? 'Sync could not finish. Your local planner is still available.' : 'Sync is on. Your planner will sync when this device is online.'}</PageText>
                  <Pressable
                    onPress={() => void account.syncNow(true)}
                    disabled={account.syncStatus === 'syncing'}
                    style={({ pressed }) => [styles.profilePrimaryAction, account.syncStatus === 'syncing' && styles.profileActionDisabled, pressed && account.syncStatus !== 'syncing' && styles.profileButtonPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Sync planner now"
                    accessibilityState={{ disabled: account.syncStatus === 'syncing', busy: account.syncStatus === 'syncing' }}
                  >
                    <PageText style={styles.profilePrimaryActionText}>{account.syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}</PageText>
                  </Pressable>
                  <Pressable
                    onPress={disablePlannerSync}
                    style={({ pressed }) => [styles.profileSecondaryAction, pressed && styles.profileButtonPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Turn off planner sync"
                  >
                    <PageText style={styles.profileSecondaryActionText}>Turn off sync</PageText>
                  </Pressable>
                </>}
                <Pressable
                  onPress={requestSignOutConfirmation}
                  disabled={accountActionInProgress !== null}
                  style={({ pressed }) => [styles.profileSignOutAction, accountActionInProgress !== null && styles.profileActionDisabled, pressed && accountActionInProgress === null && styles.profileButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  accessibilityState={{ disabled: accountActionInProgress !== null }}
                >
                  <PageText style={styles.signOutActionText}>Sign out</PageText>
                </Pressable>
              </> : account.loading ? (
                <PageText style={[styles.sectionSubtitle, styles.profileHighContrastCopy, styles.profileCenteredText]}>Checking your account…</PageText>
              ) : <>
                <PageText style={[styles.sectionSubtitle, styles.profileHighContrastCopy, styles.profileCenteredText]}>{account.configured ? 'Keep using this guest workspace, or sign in to sync it. Your existing guest data will be kept safe while you choose what to do.' : 'Your guest planner stays on this device. Sign-in options will appear in the next step when account services are available.'}</PageText>
                <Pressable
                  onPress={() => guestWorkspaceSignInTrayRef.current?.open()}
                  style={({ pressed }) => [styles.profilePrimaryAction, pressed && styles.profileButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in to sync this guest workspace"
                >
                  <PageText style={styles.profilePrimaryActionText}>Sign in</PageText>
                </Pressable>
                <Pressable
                  onPress={requestSignOutConfirmation}
                  disabled={accountActionInProgress !== null}
                  style={({ pressed }) => [styles.profileSignOutAction, accountActionInProgress !== null && styles.profileActionDisabled, pressed && accountActionInProgress === null && styles.profileButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Leave guest workspace"
                  accessibilityState={{ disabled: accountActionInProgress !== null }}
                >
                  <PageText style={styles.signOutActionText}>Leave guest workspace</PageText>
                </Pressable>
              </>}
              {account.syncError ? <Feedback severity="error" message="Could not sync your planner. Your local data is still available." action={{ label: 'Try sync again', onPress: () => { void account.syncNow(); } }} /> : null}
            </View>
          </SquircleCard>
          {onboarding?.areas.length ? <SquircleCard style={styles.onboardingCard}>
            <View style={styles.onboardingCardHeading}><AppIcon name="focus" style={visualStyle} size={19} color={colors.green} /><PageText display style={styles.onboardingCardTitle}>Your starting point</PageText></View>
            <PageText style={styles.profileDetailLabel}>LIFE AREAS</PageText>
            <PageText style={styles.profileDetail}>{onboarding.areas.map((area) => area.label).join(' · ')}</PageText>
          </SquircleCard> : null}
          {archivedGuestDataAvailable && <SquircleCard style={styles.onboardingCard}>
            <View style={styles.onboardingCardHeading}><AppIcon name="progress" style={visualStyle} size={19} color={colors.green} /><PageText display style={styles.onboardingCardTitle}>Earlier guest data</PageText></View>
            <PageText style={styles.sectionSubtitle}>A previous guest planner was preserved on this device. You can restore it; the current planner will first be saved as another recoverable copy.</PageText>
            <SquirclePressable onPress={restoreGuestCopy} style={[styles.goalAction, styles.profileCenteredAction, { marginTop: 14 }]} accessibilityRole="button"><PageText style={[styles.goalActionText, styles.profileActionLabel]}>Restore earlier planner</PageText></SquirclePressable>
          </SquircleCard>}
          {syncRecoverySnapshots.map((recovery) => <SquircleCard key={recovery.id} style={styles.onboardingCard}>
            <View style={styles.onboardingCardHeading}><AppIcon name="progress" style={visualStyle} size={19} color={colors.green} /><PageText display style={styles.onboardingCardTitle}>Planner conflict backup</PageText></View>
            <PageText style={styles.sectionSubtitle}>Saved {new Date(recovery.createdAt).toLocaleString()}. Both copies are preserved on this device.</PageText>
            <View style={[styles.goalActions, styles.profileActionGroup, { marginTop: 14 }]}>
              <SquirclePressable onPress={() => restoreConflictCopy(recovery, 'localSnapshot')} style={[styles.goalAction, styles.profileCenteredAction]} accessibilityRole="button" accessibilityLabel="Restore the device copy from this conflict backup"><PageText style={[styles.goalActionText, styles.profileActionLabel]}>Restore device copy</PageText></SquirclePressable>
              <SquirclePressable onPress={() => restoreConflictCopy(recovery, 'cloudSnapshot')} style={[styles.goalAction, styles.profileCenteredAction]} accessibilityRole="button" accessibilityLabel="Restore the account copy from this conflict backup"><PageText style={[styles.goalActionText, styles.profileActionLabel]}>Restore account copy</PageText></SquirclePressable>
            </View>
          </SquircleCard>)}
          <SquircleCard style={styles.onboardingCard}>
            <View style={styles.profileReminderHeading}>
              <View style={[styles.onboardingCardHeading, styles.profileReminderTitle]}><AppIcon name="clock" style={visualStyle} size={19} color={colors.green} /><PageText display style={styles.onboardingCardTitle}>Reminders</PageText></View>
              <NativeActionButton label={notificationFormOpen ? 'Close reminder form' : 'Add reminder'} systemImage={notificationFormOpen ? 'xmark' : 'plus'} onPress={() => { setNotificationFormOpen((open) => !open); setNotificationStatus(''); }} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={[styles.inlineAction, styles.profileCenteredInlineAction]}><PageText style={styles.inlineActionText}>{notificationFormOpen ? 'Close' : 'Add'}</PageText></NativeActionButton>
            </View>
            <PageText style={[styles.sectionSubtitle, styles.profileHighContrastCopy]}>Set one-time or daily reminders in your local time.</PageText>
            {reminders.length ? reminders.map((reminder) => <View key={reminder.id} style={styles.notificationRow}>
              <View style={styles.entryCopy}>
                <PageText style={styles.profileDetail}>{reminder.title}</PageText>
                <PageText style={styles.entryMeta}>{reminder.repeat === 'daily' ? `Repeats daily · ${reminder.time}` : `One time · ${new Date(`${reminder.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${reminder.time}`}</PageText>
              </View>
              <NativeActionButton label={`Remove ${reminder.title}`} onPress={() => removeNotificationReminder(reminder.id)} appearance="plain" tintColor={palette.error} labelColor={palette.error} style={styles.entryEdit}><PageText style={[styles.entryEditText, { color: palette.error }]}>Remove</PageText></NativeActionButton>
            </View>) : <PageText style={[styles.sectionSubtitle, styles.profileHighContrastCopy]}>No reminders added yet. Add one when you want a nudge.</PageText>}
            {notificationFeedback ? <Feedback {...notificationFeedback} action={notificationFeedback.severity === 'error' || notificationFeedback.severity === 'warning' ? { label: 'Try reminders again', onPress: () => void applyNotificationReminders(reminders, true), disabled: savingReminder } : undefined} /> : null}
            <PageText style={styles.profileDetailLabel}>PUSH NOTIFICATIONS</PageText>
            <PageText style={[styles.sectionSubtitle, styles.profileHighContrastCopy]}>Push delivery requires an EAS project and a server to register devices and send messages.</PageText>
            <NativeActionButton label="Check push setup" systemImage="bell.badge" onPress={() => void checkPushReadiness()} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={[styles.goalAction, styles.profileCenteredAction]}><PageText style={[styles.goalActionText, styles.profileActionLabel]}>Check push setup</PageText></NativeActionButton>
          </SquircleCard>
          {(['formal', 'expressive'] as const).map((style) => <SquirclePressable exactSquircle key={style} onPress={() => { setVisualStyle(style); toast.success('Appearance updated', { description: style === 'formal' ? 'Refined uses clear text and simple icons.' : 'Expressive uses handwritten text and icons.' }); }} style={[styles.styleCard, visualStyle === style && styles.styleCardSelected]} accessibilityRole="radio" accessibilityState={{ selected: visualStyle === style }}><View style={styles.styleIcon}><AppIcon name={style === 'formal' ? 'progress' : 'sparkle'} style={style} size={22} /></View><View style={styles.entryCopy}><PageText display style={styles.styleName}>{style === 'formal' ? 'Refined' : 'Expressive'}</PageText><PageText style={[styles.emptySubtitle, styles.profileHighContrastCopy]}>{style === 'formal' ? 'Clear text and simple icons' : 'Handwritten text and icons'}</PageText></View><View style={[styles.radio, visualStyle === style && styles.radioSelected]}>{visualStyle === style && <View style={styles.radioDot} />}</View></SquirclePressable>)}
          <SquircleCard exactSquircle style={styles.profileNote}><AppIcon name="focus" style={visualStyle} size={18} /><PageText style={[styles.emptySubtitle, styles.profileHighContrastCopy, styles.profileCenteredText]}>Your appearance choice is saved on this device.</PageText></SquircleCard>
          <SquirclePressable onPress={requestDeleteAccountConfirmation} disabled={account.loading || accountActionInProgress !== null} style={[styles.deleteAccountButton, (account.loading || accountActionInProgress !== null) && { opacity: 0.5 }]} accessibilityRole="button" accessibilityState={{ disabled: account.loading || accountActionInProgress !== null }} accessibilityLabel={account.user ? 'Delete my account and data' : 'Erase my planner data'}><PageText style={[styles.deleteAccountTitle, styles.profileCenteredText]}>{account.user ? 'Delete my account and data' : 'Erase my planner data'}</PageText><PageText style={[styles.deleteAccountBody, styles.profileCenteredText]}>{account.user ? 'Permanently delete your account and planner data from the server and this device.' : 'Permanently erase your goals, tasks, habits, routines, and progress from this device.'}</PageText></SquirclePressable>
        </View>}
      </Animated.ScrollView>
      </View>
      {!showTabBar && <ProgressiveEdgeBlur edge="bottom" surfaceColor={colors.paper} style={styles.bottomEdgeFade} />}
      {Platform.OS !== 'android' && <Animated.View collapsable={false} pointerEvents="none" style={[styles.topBlur, headerBlurStyle]}>
        <ProgressiveEdgeBlur
          edge="top"
          surfaceColor={colors.paper}
          tintColor={`${colors.paper}1A`}
          tint="systemUltraThinMaterial"
          intensity={88}
          startOffset={0}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>}
      {/* Keep the paper wash inside the morphing header as its height changes. */}
      <Animated.View pointerEvents="none" style={[styles.headerSurface, { height: expandedHeaderHeight }]}>
        <SkiaCollapsingHeaderSurface width={windowWidth} expandedHeight={expandedHeaderHeight} collapsedHeight={collapsedHeaderHeight} surfaceColor={colors.paper} collapseProgress={headerCollapseProgress} />
      </Animated.View>
      <Animated.View pointerEvents="box-none" style={[styles.headerOverlay, { height: expandedHeaderHeight }]}>
        <View style={styles.header}>
          {activeTab === 'today' ? <>
            <Animated.View style={[styles.expandedHeaderCopy, expressive && styles.expandedHeaderCopyExpressive, todayExpandedTitleStyle]}><PageText style={styles.dateLabel}>{selectedDateLabel.toUpperCase()}</PageText><PageText display style={[styles.greeting, expressive && styles.greetingExpressive]}>{currentGreeting},</PageText><PageText display style={[styles.greetingSecond, expressive && styles.greetingSecondExpressive]}>let’s find your rhythm.</PageText></Animated.View>
            <Animated.View style={[styles.compactHeaderTitle, styles.compactHeaderTitleScale, { top: insets.top, height: APP_TAB_COMPACT_HEADER_HEIGHT }, todayCompactTitleStyle]}><PageText display style={styles.screenHeaderTitle}>Today</PageText></Animated.View>
          </> : <Animated.View key="tab-header-title" style={[styles.expandedHeaderCopy, styles.expandedHeaderCopyFull, styles.compactHeaderTitleScale, tabHeaderTitleStyle]}><PageText display style={styles.screenHeaderTitle}>{activeTabLabel}</PageText></Animated.View>}
        </View>
      </Animated.View>

      {showTabBar && <View pointerEvents="box-none" style={[styles.tabBarFooter, { height: tabBarReservedBottomSpace }]}>
        <ProgressiveEdgeBlur
          edge="bottom"
          surfaceColor={colors.paper}
          gradientOnly
          style={[styles.mainFooterFade, { height: TAB_BAR_FOOTER_FADE_HEIGHT }]}
        />
        <View style={[styles.tabBarWrap, { marginBottom: tabBarBottomOffset, zIndex: 20 }]}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return <Pressable key={tab.id} onPress={() => changeTab(tab.id)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={tab.label} style={({ pressed }) => [styles.tabButton, selected && styles.tabButtonSelected, pressed && { backgroundColor: palette.pressed }]}>
              <View style={styles.tabIconWrap}><AppIcon name={tab.id} style={visualStyle} size={TAB_ICON_SIZE} color={selected ? colors.green : palette.muted} /></View><PageText style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</PageText>
            </Pressable>;
          })}
        </View>
        </View>
      </View>}

      <BottomSheet index={reflectionSheetOpen ? 0 : -1} onClose={() => setReflectionSheetOpen(false)} enablePanDownToClose snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: colors.paper }}>
        <BottomSheetView style={{ flex: 1, backgroundColor: colors.paper, overflow: 'hidden' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
              <View style={styles.reflectionSheetHeading}>
                <PageText style={styles.dateLabel}>WEEK OF {new Date(`${selectedWeekStart}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toUpperCase()}</PageText>
                <View style={styles.sheetTitleRow}>
                  <PageText display style={[styles.sheetTitle, styles.reflectionSheetTitle]}>A moment to reflect</PageText>
                  <NativeActionButton label="" onPress={() => setReflectionSheetOpen(false)} appearance="plain" tintColor={colors.ink} labelColor={colors.ink} style={styles.closeButton} accessibilityLabel="Close reflection"><PageText style={styles.closeGlyph}>×</PageText></NativeActionButton>
                </View>
                <PageText style={styles.sectionSubtitle}>Note what helped, what got in the way, and what to change next.</PageText>
              </View>
              <PageText style={styles.reflectionLabel}>WHAT WENT WELL?</PageText>
              <TextInput hideLabel value={activeReflectionDraft.wentWell} onChangeText={(value) => setReflectionDraft((current) => ({ ...activeReflectionDraft, wentWell: value }))} placeholder="A small win, moment, or choice..." multiline style={styles.reflectionInput} accessibilityLabel="What went well this week" maxLength={500} />
              <PageText style={styles.reflectionLabel}>WHAT GOT IN THE WAY?</PageText>
              <TextInput hideLabel value={activeReflectionDraft.gotInWay} onChangeText={(value) => setReflectionDraft((current) => ({ ...activeReflectionDraft, gotInWay: value }))} placeholder="Anything that made it harder..." multiline style={styles.reflectionInput} accessibilityLabel="What got in the way this week" maxLength={500} />
              <PageText style={styles.reflectionLabel}>ONE ADJUSTMENT FOR NEXT WEEK</PageText>
              <TextInput hideLabel value={activeReflectionDraft.nextAdjustment} onChangeText={(value) => setReflectionDraft((current) => ({ ...activeReflectionDraft, nextAdjustment: value }))} placeholder="Make the next step a little easier..." multiline style={styles.reflectionInput} accessibilityLabel="One adjustment for next week" maxLength={500} />
              {reflectionError ? <Feedback severity="error" message={reflectionError} /> : null}
              <NativeActionButton label={savedReflection ? 'Update reflection' : 'Save reflection'} systemImage="checkmark" disabled={savingReflection} onPress={() => {
                if (savingReflection) return;
                setSavingReflection(true);
                const record = { weekStart: selectedWeekStart, wentWell: activeReflectionDraft.wentWell, gotInWay: activeReflectionDraft.gotInWay, nextAdjustment: activeReflectionDraft.nextAdjustment, updatedAt: new Date().toISOString() };
                setReflections((current) => [...current.filter((item) => item.weekStart !== selectedWeekStart), record]);
                if (storageStatus === 'save-error') retrySave();
                void confirmLocalSave().then(() => { posthog?.capture('weekly_reflection_saved', { action: savedReflection ? 'updated' : 'created' }); setReflectionError(''); setReflectionSheetOpen(false); toast.success('Reflection saved', { description: 'Saved on this device.' }); }).catch(() => setReflectionError('Could not save your reflection. Your edits are still here. Try again.')).finally(() => setSavingReflection(false));
              }} style={styles.primaryButton}><PageText style={styles.primaryButtonText}>{savedReflection ? 'Update reflection' : 'Save reflection'}</PageText><AppIcon name="check" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>
              {savedReflection && <PageText style={styles.sectionSubtitle}>Saved on this device · {new Date(savedReflection.updatedAt).toLocaleDateString()}</PageText>}
            </BottomSheetScrollView>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet index={areaManagerOpen ? 0 : -1} onClose={() => setAreaManagerOpen(false)} enablePanDownToClose snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: colors.paper }}>
        <BottomSheetView style={{ flex: 1, backgroundColor: colors.paper, overflow: 'hidden' }}>
          <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <View style={styles.sheetHeading}><View style={styles.sheetHeadingCopy}><PageText display style={styles.sheetTitle}>Life areas</PageText><PageText style={styles.sectionSubtitle}>Choose which areas appear in your overview and goal form.</PageText></View><NativeActionButton label="" onPress={() => setAreaManagerOpen(false)} appearance="plain" tintColor={colors.ink} labelColor={colors.ink} style={styles.closeButton} accessibilityLabel="Close life areas"><PageText style={styles.closeGlyph}>×</PageText></NativeActionButton></View>
            <View>
              <PageText style={styles.sectionSubtitle}>Disabling an area keeps its goals and history.</PageText>
              {lifeAreas.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((area) => <View key={area.id} style={styles.areaManageRow}><View style={styles.entryCopy}>{area.isCustom ? <TextInput value={area.label} onChangeText={(value) => renameLifeArea(area.id, value)} style={styles.areaRenameInput} accessibilityLabel={`Rename ${area.label}`} maxLength={45} /> : <PageText style={styles.profileDetail}>{area.label}</PageText>}</View>{!area.enabled && plans.some((plan) => plan.lifeAreaId === area.id) && <NativeActionButton label="View goals" onPress={() => { setSelectedAreaFilter(area.id); setAreaManagerOpen(false); }} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.inlineAction}><PageText style={styles.inlineActionText}>View goals</PageText></NativeActionButton>}<Switch value={area.enabled} onValueChange={(value) => setLifeAreaEnabled(area.id, value)} accessibilityLabel={`${area.enabled ? 'Disable' : 'Enable'} ${area.label}`} /></View>)}
              <View style={styles.areaAddRow}><TextInput value={newAreaName} onChangeText={setNewAreaName} placeholder="Add a custom life area" placeholderTextColor={palette.muted} style={[styles.measureInput, styles.areaAddInput]} maxLength={45} accessibilityLabel="New life area name" /><NativeActionButton label="Add area" systemImage="plus" appearance="bordered" tintColor={colors.green} onPress={addCustomLifeArea} disabled={!newAreaName.trim()} style={[styles.goalAction, !newAreaName.trim() && styles.primaryButtonDisabled]}><PageText style={styles.goalActionText}>Add area</PageText></NativeActionButton></View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet index={showAdd ? 0 : -1} onClose={() => setShowAdd(false)} enablePanDownToClose snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: colors.paper }}>
        <BottomSheetView style={{ flex: 1, backgroundColor: colors.paper, overflow: 'hidden' }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
          <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <View style={styles.sheetHeading}><View style={styles.sheetHeadingCopy}><PageText display style={styles.sheetTitle}>{editingGoalId ? 'Edit your goal' : editingEntryId ? 'Edit your task' : 'Make a little space'}</PageText><PageText style={styles.sectionSubtitle}>{editingGoalId ? 'Keep the direction meaningful to you.' : 'Add one thing you want to return to.'}</PageText></View><NativeActionButton label="" onPress={() => setShowAdd(false)} appearance="plain" tintColor={colors.ink} labelColor={colors.ink} style={styles.closeButton} accessibilityLabel="Close"><PageText style={styles.closeGlyph}>×</PageText></NativeActionButton></View>
            {formError ? <Feedback severity="error" message={formError} /> : null}
            <PageText style={styles.emptySubtitle}>{entryType === 'goal' ? 'A goal is an outcome you want to reach.' : entryType === 'habit' ? 'A habit is an action you repeat on chosen days.' : 'A task is an action you plan to finish.'}</PageText>
            {!editingGoalId && <View style={styles.typeSelector}>{(['task', 'habit', 'goal'] as EntryType[]).map((type) => <SquirclePressable key={type} onPress={() => setEntryType(type)} style={[styles.typePill, entryType === type && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: entryType === type }}><PageText style={[styles.typePillText, entryType === type && styles.typePillTextSelected]}>{type === 'task' ? 'Task' : type === 'habit' ? 'Habit' : 'Goal'}</PageText></SquirclePressable>)}</View>}
            <View pointerEvents={savingEntry || pendingEntryNotice ? "none" : "auto"} style={{ gap: 12 }}>
            <TextInput ref={titleInput} label="Name" error={invalidField === 'name' ? formError : undefined} value={draft} editable={canEditOccurrence} onChangeText={setDraft} placeholder={entryType === 'task' ? 'What would you like to do?' : entryType === 'habit' ? 'What would you like to practice?' : 'What would you like to work toward?'} placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} returnKeyType="done" onSubmitEditing={addEntry} accessibilityLabel={entryType === 'task' ? 'Task title' : entryType === 'habit' ? 'Habit name' : 'Goal title'} maxLength={90} />
            {entryType === 'task' && canEditOccurrence && <>
              <TextInput value={taskDescriptionDraft} onChangeText={setTaskDescriptionDraft} placeholder="Description (optional)" placeholderTextColor={palette.muted} multiline maxLength={500} style={[styles.addInput, { minHeight: 72, paddingTop: 14, fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Task description" />
              <PageText style={styles.goalPickerLabel}>PRIORITY</PageText><View style={styles.typeSelector}>{([['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] as const).map(([priority, label]) => <SquirclePressable key={priority} onPress={() => setTaskPriorityDraft(priority)} style={[styles.typePill, taskPriorityDraft === priority && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: taskPriorityDraft === priority }}><PageText style={[styles.typePillText, taskPriorityDraft === priority && styles.typePillTextSelected]}>{label}</PageText></SquirclePressable>)}</View>
              <DateField value={taskDueDateDraft} onChange={setTaskDueDateDraft} placeholder="Due date (optional)" accessibilityLabel="Task due date" optional />
              <TextInput ref={durationInput} error={invalidField === "duration" ? formError : undefined} value={taskDurationDraft} onChangeText={setTaskDurationDraft} placeholder="Minutes" keyboardType="number-pad" placeholderTextColor={palette.muted} style={[styles.measureInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Estimated task minutes" />
              <PageText style={styles.goalPickerLabel}>SUBTASKS · OPTIONAL</PageText>
              {taskSubtasksDraft.map((subtask) => <View key={subtask.id} style={styles.subtaskEditRow}><TextInput value={subtask.title} onChangeText={(value) => setTaskSubtasksDraft((items) => items.map((item) => item.id === subtask.id ? { ...item, title: value } : item))} placeholder="Subtask" placeholderTextColor={palette.muted} maxLength={120} style={[styles.measureInput, { marginBottom: 0, fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Edit subtask" /><NativeActionButton label="Remove" systemImage="trash" onPress={() => setTaskSubtasksDraft((items) => items.filter((item) => item.id !== subtask.id))} appearance="plain" tintColor={colors.muted} labelColor={colors.muted} style={styles.entryEdit} accessibilityLabel={`Remove subtask ${subtask.title}`}><PageText style={styles.entryEditText}>Remove</PageText></NativeActionButton></View>)}
              <View style={styles.subtaskEditRow}><TextInput value={newSubtaskDraft} onChangeText={setNewSubtaskDraft} placeholder="Add a step" placeholderTextColor={palette.muted} maxLength={120} style={[styles.measureInput, { marginBottom: 0, fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="New subtask" /><NativeActionButton label="Add" systemImage="plus" onPress={() => { const value = newSubtaskDraft.trim(); if (!value) return; setTaskSubtasksDraft((items) => [...items, { id: createOccurrenceId('subtask'), title: value, sortOrder: items.length }]); setNewSubtaskDraft(''); }} disabled={!newSubtaskDraft.trim()} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={[styles.goalAction, !newSubtaskDraft.trim() && styles.primaryButtonDisabled]}><PageText style={styles.goalActionText}>Add</PageText></NativeActionButton></View>
            </>}
            {(entryType === 'goal' || editingGoalId) && <>
              <TextInput value={goalDescriptionDraft} onChangeText={setGoalDescriptionDraft} placeholder="Description (optional)" placeholderTextColor={palette.muted} multiline style={[styles.addInput, { minHeight: 76, paddingTop: 14, fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Goal description" maxLength={400} />
              <PageText style={styles.goalPickerLabel}>LIFE AREA · REQUIRED</PageText>
              <ProgressiveHorizontalScrollView showEdgeFade={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalPicker}>{lifeAreas.filter((area) => area.enabled || area.id === goalAreaDraft).map((area) => <SquirclePressable key={area.id} onPress={() => setGoalAreaDraft(area.id)} style={[styles.typePill, goalAreaDraft === area.id && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: goalAreaDraft === area.id }}><PageText style={[styles.typePillText, goalAreaDraft === area.id && styles.typePillTextSelected]}>{area.label}{area.enabled ? '' : ' · paused'}</PageText></SquirclePressable>)}</ProgressiveHorizontalScrollView>
              <TextInput value={goalWhyDraft} onChangeText={setGoalWhyDraft} placeholder="Why does this matter to you? (optional)" placeholderTextColor={palette.muted} multiline style={[styles.addInput, { minHeight: 66, paddingTop: 14, fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Why this goal matters" maxLength={300} />
              <PageText style={styles.goalPickerLabel}>PRIORITY</PageText><View style={styles.typeSelector}>{([['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] as const).map(([priority, label]) => <SquirclePressable key={priority} onPress={() => setGoalPriorityDraft(priority)} style={[styles.typePill, goalPriorityDraft === priority && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: goalPriorityDraft === priority }}><PageText style={[styles.typePillText, goalPriorityDraft === priority && styles.typePillTextSelected]}>{label}</PageText></SquirclePressable>)}</View>
              <DateField value={goalStartDateDraft} onChange={setGoalStartDateDraft} placeholder="Start date" accessibilityLabel="Goal start date" />
              <DateField value={goalTargetDateDraft} onChange={setGoalTargetDateDraft} placeholder="Target date (optional)" accessibilityLabel="Goal target date" optional minimumDate={new Date(`${goalStartDateDraft}T00:00:00`)} />
              <PageText style={styles.goalPickerLabel}>HOW WILL YOU TRACK IT?</PageText><View style={styles.typeSelector}>{([['qualitative', 'Qualitative'], ['quantitative', 'Quantitative']] as const).map(([type, label]) => <SquirclePressable key={type} onPress={() => { setGoalTargetTypeDraft(type); if (type === 'qualitative') { setTargetDraft(''); setUnitDraft(''); setGoalProgressDraft(''); } }} style={[styles.typePill, goalTargetTypeDraft === type && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: goalTargetTypeDraft === type }}><PageText style={[styles.typePillText, goalTargetTypeDraft === type && styles.typePillTextSelected]}>{label}</PageText></SquirclePressable>)}</View>
              {goalTargetTypeDraft === 'quantitative' ? <><PageText style={styles.goalPickerLabel}>TARGET AND UNIT · REQUIRED</PageText><View style={styles.measureRow}><TextInput ref={targetInput} label="Target" error={invalidField === 'target' ? formError : undefined} value={targetDraft} onChangeText={setTargetDraft} placeholder="Target" keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.measureInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Goal target amount" /><TextInput ref={unitInput} label="Unit" error={invalidField === 'unit' ? formError : undefined} value={unitDraft} onChangeText={setUnitDraft} placeholder="Unit (km, books)" placeholderTextColor={palette.muted} style={[styles.measureInput, styles.measureUnit, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Goal target unit" maxLength={24} /></View>{targetDraft.trim() !== '' && !unitDraft.trim() && <PageText style={styles.sectionSubtitle}>This saved goal needs a unit before you can record progress.</PageText>}<TextInput ref={progressInput} label="Progress" error={invalidField === 'progress' ? formError : undefined} value={goalProgressDraft} editable={!!unitDraft.trim()} onChangeText={setGoalProgressDraft} placeholder="Current progress" keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }, !unitDraft.trim() && { opacity: 0.55 }]} accessibilityLabel="Goal current progress" /><PageText style={styles.sectionSubtitle}>Progress status is automatic and never completes the goal for you.</PageText></> : <TextInput ref={progressInput} error={invalidField === "progress" ? formError : undefined} value={manualProgressDraft} onChangeText={setManualProgressDraft} placeholder="Progress estimate (0–100, optional)" keyboardType="number-pad" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Qualitative goal progress estimate" />}
              <PageText style={styles.goalPickerLabel}>STATUS</PageText><View style={styles.typeSelector}>{goalLifecycleOptions.map((status) => <SquirclePressable key={status} onPress={() => setGoalLifecycleDraft(status)} style={[styles.typePill, goalLifecycleDraft === status && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: goalLifecycleDraft === status }}><PageText style={[styles.typePillText, goalLifecycleDraft === status && styles.typePillTextSelected]}>{status[0].toUpperCase() + status.slice(1)}</PageText></SquirclePressable>)}</View>
              <TextInput value={editingGoalFirstStep} onChangeText={setEditingGoalFirstStep} placeholder="Optional first step" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Goal first step" maxLength={120} />
              <PageText style={styles.goalPickerLabel}>ADD MILESTONE · OPTIONAL</PageText><TextInput hideLabel value={milestoneTitleDraft} onChangeText={setMilestoneTitleDraft} placeholder="Milestone title" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Milestone title" maxLength={90} /><DateField value={milestoneDueDateDraft} onChange={setMilestoneDueDateDraft} placeholder="Due date (optional)" accessibilityLabel="Milestone due date" optional />
            </>}
            {(entryType === 'habit' || entryType === 'task' && editingOccurrence?.sourceType !== 'routine_step') && canEditOccurrence && <><PageText style={styles.goalPickerLabel}>REPEATS</PageText><ProgressiveHorizontalScrollView showEdgeFade={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalPicker}>{([['once', 'One time'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends'], ['selected_days', 'Selected days']] as const).map(([rule, label]) => <SquirclePressable key={rule} onPress={() => { if (entryType === 'task') setTaskRecurrenceDraft(rule); else setHabitRecurrenceDraft(rule); if (rule === 'selected_days' && recurrenceDaysDraft.length === 0) setRecurrenceDaysDraft([selectedWeekdayNumber]); }} style={[styles.typePill, (entryType === 'task' ? taskRecurrenceDraft : habitRecurrenceDraft) === rule && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: (entryType === 'task' ? taskRecurrenceDraft : habitRecurrenceDraft) === rule }}><PageText style={[styles.typePillText, (entryType === 'task' ? taskRecurrenceDraft : habitRecurrenceDraft) === rule && styles.typePillTextSelected]}>{label}</PageText></SquirclePressable>)}</ProgressiveHorizontalScrollView>{(entryType === 'task' ? taskRecurrenceDraft : habitRecurrenceDraft) === 'selected_days' && <ProgressiveHorizontalScrollView showEdgeFade={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalPicker}>{recurrenceDayNames.map((name, day) => { const selected = recurrenceDaysDraft.includes(day); return <SquirclePressable key={name} onPress={() => setRecurrenceDaysDraft((current) => selected ? current.filter((item) => item !== day) : [...current, day].sort())} style={[styles.typePill, selected && styles.typePillSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><PageText style={[styles.typePillText, selected && styles.typePillTextSelected]}>{name}</PageText></SquirclePressable>; })}</ProgressiveHorizontalScrollView>}</>}
            {entryType === 'habit' && canEditOccurrence && <><PageText style={styles.goalPickerLabel}>TRACKING</PageText><ProgressiveHorizontalScrollView showEdgeFade={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalPicker}>{([['boolean', 'Done / not done'], ['quantity', 'Quantity'], ['duration', 'Duration']] as const).map(([kind, label]) => <SquirclePressable key={kind} onPress={() => { setHabitTrackingDraft(kind); if (kind === 'boolean') { setTargetDraft(''); setUnitDraft(''); setProgressDraft(''); } else if (kind === 'duration' && !unitDraft.trim()) setUnitDraft('minutes'); }} style={[styles.typePill, habitTrackingDraft === kind && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: habitTrackingDraft === kind }}><PageText style={[styles.typePillText, habitTrackingDraft === kind && styles.typePillTextSelected]}>{label}</PageText></SquirclePressable>)}</ProgressiveHorizontalScrollView></>}
            {(entryType === 'task' || entryType === 'habit' && habitTrackingDraft !== 'boolean') && canEditOccurrence && <><PageText style={styles.goalPickerLabel}>MEASURABLE TARGET · OPTIONAL</PageText><View style={styles.measureRow}><TextInput ref={targetInput} label="Target" error={invalidField === 'target' ? formError : undefined} value={targetDraft} onChangeText={setTargetDraft} placeholder="Target" keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.measureInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel={`${entryType} target amount`} /><TextInput ref={unitInput} label="Unit" error={invalidField === 'unit' ? formError : undefined} value={unitDraft} onChangeText={setUnitDraft} placeholder={entryType === 'habit' && habitTrackingDraft === 'duration' ? 'Unit (minutes)' : 'Unit (cups, km)'} placeholderTextColor={palette.muted} style={[styles.measureInput, styles.measureUnit, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel={`${entryType} target unit`} maxLength={24} /></View><TextInput ref={progressInput} label="Progress" error={invalidField === 'progress' ? formError : undefined} value={progressDraft} onChangeText={setProgressDraft} placeholder={`Progress for ${selectedDate}`} keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel={`${entryType} progress for selected date`} /><PageText style={styles.sectionSubtitle}>Status is automatic: Meh at or below 30%, Okay above 30% and below 70%, Fantastic at 70% or more.</PageText></>}
            {isEditingMissedOccurrence && <View>
              <PageText style={styles.goalPickerLabel}>WHAT GOT IN THE WAY?</PageText>
              <View style={styles.recoveryChoiceWrap}>{missedReasonOptions.map((option) => <SquirclePressable key={option.id} onPress={() => setMissedReasonOption(option.id)} style={[styles.recoveryChoice, missedReasonOption === option.id && styles.recoveryChoiceSelected]} accessibilityRole="radio" accessibilityState={{ selected: missedReasonOption === option.id }}><PageText style={[styles.recoveryChoiceText, missedReasonOption === option.id && styles.recoveryChoiceTextSelected]}>{option.label}</PageText></SquirclePressable>)}</View>
              {missedReasonOption === 'custom' && <TextInput value={missedReasonDraft} onChangeText={setMissedReasonDraft} placeholder="Add your own reason" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Custom reason this occurrence was missed" maxLength={180} />}
              {repeatedReasonCount > 1 && suggestedRecovery && <SquircleCard style={styles.recoverySuggestion}><PageText style={styles.entryMeta}>You’ve noted this reason before. A small adjustment may make the next step easier.</PageText><NativeActionButton label={suggestedRecovery === 'reschedule' ? 'Try another day' : suggestedRecovery === 'reduce_target' ? 'Make the target smaller' : suggestedRecovery === 'pause' ? 'Pause this habit' : 'Keep the plan for now'} systemImage="arrow.right" onPress={() => { setRecoveryActionDraft(suggestedRecovery); if (suggestedRecovery === 'reduce_target' && recoveryTargetBefore != null) setReducedTargetDraft(String(Number((recoveryTargetBefore * 0.7).toFixed(2)))); }} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={styles.goalAction}><PageText style={styles.goalActionText}>{suggestedRecovery === 'reschedule' ? 'Try another day' : suggestedRecovery === 'reduce_target' ? 'Make the target smaller' : suggestedRecovery === 'pause' ? 'Pause this habit' : 'Keep the plan for now'}</PageText></NativeActionButton></SquircleCard>}
              <PageText style={[styles.goalPickerLabel, { marginTop: 13 }]}>WHAT WOULD HELP NOW?</PageText>
              <View style={styles.recoveryChoiceWrap}>{recoveryActionOptions.filter((option) => (!['pause', 'replace'].includes(option.id) || editingOccurrence?.type === 'habit' && editingOccurrence.sourceType === 'habit') && (option.id !== 'reduce_target' || recoveryTargetBefore != null)).map((option) => <SquirclePressable key={option.id} onPress={() => { setRecoveryActionDraft(option.id); if (option.id === 'reduce_target' && recoveryTargetBefore != null) setReducedTargetDraft(String(Number((recoveryTargetBefore * 0.7).toFixed(2)))); }} style={[styles.recoveryChoice, recoveryActionDraft === option.id && styles.recoveryChoiceSelected]} accessibilityRole="radio" accessibilityState={{ selected: recoveryActionDraft === option.id }}><PageText style={[styles.recoveryChoiceText, recoveryActionDraft === option.id && styles.recoveryChoiceTextSelected]}>{option.label}</PageText></SquirclePressable>)}</View>
              {recoveryActionDraft === 'reduce_target' && <TextInput value={reducedTargetDraft} onChangeText={setReducedTargetDraft} placeholder="New smaller target" keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Reduced target amount" />}
              {recoveryActionDraft === 'replace' && <TextInput value={replacementHabitDraft} onChangeText={setReplacementHabitDraft} placeholder="What would you like to practice instead?" placeholderTextColor={palette.muted} style={[styles.addInput, { fontFamily: expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Replacement habit name" maxLength={90} />}
              {recoveryActionDraft === 'reschedule' && <><DateField value={rescheduleDateDraft} onChange={setRescheduleDateDraft} placeholder="New date" accessibilityLabel="Reschedule occurrence to date" minimumDate={rescheduleMinimumDate} /><NativeActionButton label="Reschedule this action" systemImage="calendar" onPress={rescheduleEntry} disabled={!canRescheduleOccurrence} appearance="bordered" tintColor={colors.green} labelColor={colors.green} style={[styles.goalAction, !canRescheduleOccurrence && styles.primaryButtonDisabled]}><PageText style={styles.goalActionText}>Reschedule this action</PageText></NativeActionButton></>}
            {recoveryActionDraft && recoveryActionDraft !== 'reschedule' && <NativeActionButton label="Save reflection and recovery choice" systemImage="checkmark" onPress={applyRecoveryAction} disabled={!canApplyRecovery} style={[styles.primaryButton, !canApplyRecovery && styles.primaryButtonDisabled]}><PageText style={styles.primaryButtonText}>Save reflection and recovery choice</PageText><AppIcon name="check" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>}
            </View>}
            {editingOccurrence && occurrenceStatus(editingOccurrence) === 'planned' && <><PageText style={styles.goalPickerLabel}>RESCHEDULE · OPTIONAL</PageText><DateField value={rescheduleDateDraft} onChange={setRescheduleDateDraft} placeholder="New date" accessibilityLabel="Reschedule occurrence to date" minimumDate={rescheduleMinimumDate} /><NativeActionButton label="Move to new date" systemImage="calendar.badge.clock" appearance="bordered" tintColor={colors.green} onPress={rescheduleEntry} disabled={!canRescheduleOccurrence} style={[styles.goalAction, !canRescheduleOccurrence && styles.primaryButtonDisabled]}><PageText style={styles.goalActionText}>Move to new date</PageText></NativeActionButton></>}
            {(entryType === 'task' || entryType === 'habit') && plans.length > 0 && <View><PageText style={styles.goalPickerLabel}>LINK TO A GOAL · OPTIONAL</PageText><ProgressiveHorizontalScrollView showEdgeFade={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalPicker}>{plans.map((goal) => <SquirclePressable key={goal.id} onPress={() => { const next = goalLink === goal.id ? undefined : goal.id; setGoalLink(next); setMilestoneLink(undefined); }} style={[styles.typePill, goalLink === goal.id && styles.typePillSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: goalLink === goal.id }}><PageText style={[styles.typePillText, goalLink === goal.id && styles.typePillTextSelected]}>{goal.title}</PageText></SquirclePressable>)}</ProgressiveHorizontalScrollView></View>}
            {selectedGoalMilestones.length > 0 && (entryType === 'task' || entryType === 'habit') && <View><PageText style={styles.goalPickerLabel}>LINK TO MILESTONE · OPTIONAL</PageText><ProgressiveHorizontalScrollView showEdgeFade={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalPicker}>{selectedGoalMilestones.map((milestone) => <SquirclePressable key={milestone.id} onPress={() => setMilestoneLink(milestoneLink === milestone.id ? undefined : milestone.id)} style={[styles.typePill, milestoneLink === milestone.id && styles.typePillSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: milestoneLink === milestone.id }}><PageText style={[styles.typePillText, milestoneLink === milestone.id && styles.typePillTextSelected]}>{milestone.title}</PageText></SquirclePressable>)}</ProgressiveHorizontalScrollView></View>}
            {storageStatus !== 'ready' && <PageText style={styles.saveError}>Couldn’t confirm that your changes were saved. Use “Save again” above before closing.</PageText>}
            </View>
            {(!isEditingMissedOccurrence || recoveryActionDraft === undefined) && <NativeActionButton label={editingGoalId ? 'Save goal' : isEditingMissedOccurrence ? 'Save reflection' : editingEntryId ? 'Save task' : `Add ${entryType}`} systemImage="arrow.right" onPress={() => void addEntry()} disabled={savingEntry} style={[styles.primaryButton, savingEntry && styles.primaryButtonDisabled]}><PageText style={styles.primaryButtonText}>{editingGoalId ? 'Save goal' : isEditingMissedOccurrence ? 'Save reflection' : editingEntryId ? 'Save task' : `Add ${entryType}`}</PageText><AppIcon name="arrow" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>}
          </BottomSheetScrollView>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet index={commitmentFormOpen ? 0 : -1} onClose={() => { setCommitmentFormOpen(false); setCommitmentDetailsOpen(false); }} enablePanDownToClose snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: colors.paper }}>
        <BottomSheetView style={{ flex: 1, backgroundColor: colors.paper, overflow: 'hidden' }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <View style={styles.sheetHeading}>
              <View style={styles.sheetHeadingCopy}><PageText display style={styles.sheetTitle}>Add a commitment</PageText><PageText style={styles.sectionSubtitle}>Choose what you’re committing to and when.</PageText></View>
              <NativeActionButton label="Close commitment form" onPress={() => { setCommitmentFormOpen(false); setCommitmentDetailsOpen(false); }} appearance="plain" tintColor={colors.ink} labelColor={colors.ink} style={styles.closeButton} accessibilityLabel="Close"><PageText style={styles.closeGlyph}>×</PageText></NativeActionButton>
            </View>
            <TextInput value={commitmentTitle} onChangeText={setCommitmentTitle} placeholder="What will you do?" placeholderTextColor={palette.muted} style={styles.addInput} accessibilityLabel="Commitment title" maxLength={100} />
            <TextInput value={commitmentTarget} onChangeText={setCommitmentTarget} placeholder="Target" placeholderTextColor={palette.muted} style={styles.addInput} accessibilityLabel="Commitment target" maxLength={140} />
            <DateField value={commitmentDeadline} onChange={setCommitmentDeadline} placeholder="Deadline" accessibilityLabel="Commitment deadline" />
            <NativeActionButton label={commitmentDetailsOpen ? 'Hide optional details' : 'Add optional details'} onPress={() => setCommitmentDetailsOpen((open) => !open)} appearance="plain" tintColor={colors.green} labelColor={colors.green} style={styles.inlineAction}><PageText style={styles.inlineActionText}>{commitmentDetailsOpen ? 'Hide optional details' : 'Add optional details'}</PageText></NativeActionButton>
            {commitmentDetailsOpen && <View style={styles.commitmentDetails}>
              <TextInput value={commitmentRequiredActions} onChangeText={setCommitmentRequiredActions} placeholder="Linked actions to track (optional)" placeholderTextColor={palette.muted} keyboardType="number-pad" style={styles.addInput} accessibilityLabel="Required linked actions" maxLength={4} />
              <TextInput value={commitmentTimeframe} onChangeText={setCommitmentTimeframe} placeholder="Timeframe (optional)" placeholderTextColor={palette.muted} style={styles.addInput} accessibilityLabel="Commitment timeframe" maxLength={80} />
              <TextInput value={commitmentWhy} onChangeText={setCommitmentWhy} placeholder="Why it matters (optional)" placeholderTextColor={palette.muted} multiline style={styles.reflectionInput} accessibilityLabel="Why this commitment matters" maxLength={500} />
              <TextInput value={commitmentReward} onChangeText={setCommitmentReward} placeholder="Reward (optional)" placeholderTextColor={palette.muted} style={styles.addInput} accessibilityLabel="Commitment reward" maxLength={120} />
              <TextInput value={commitmentConsequence} onChangeText={setCommitmentConsequence} placeholder="Accountability rule (optional)" placeholderTextColor={palette.muted} style={styles.addInput} accessibilityLabel="Commitment accountability rule" maxLength={160} />
              {[...taskDefinitions.map((definition) => ({ id: definition.id, title: definition.title, type: 'task' as const })), ...habitDefinitions.map((definition) => ({ id: definition.id, title: definition.title, type: 'habit' as const }))].length > 0 && <><PageText style={styles.reflectionLabel}>LINK A TASK OR HABIT · OPTIONAL</PageText><View style={styles.goalActions}>{[...taskDefinitions.map((definition) => ({ id: definition.id, title: definition.title, type: 'task' as const })), ...habitDefinitions.map((definition) => ({ id: definition.id, title: definition.title, type: 'habit' as const }))].map((source) => <SquirclePressable key={source.type + source.id} onPress={() => setCommitmentSource(commitmentSource?.id === source.id ? undefined : { id: source.id, type: source.type })} style={[styles.goalAction, commitmentSource?.id === source.id && { backgroundColor: colors.lightGreen }]} accessibilityRole="button" accessibilityState={{ selected: commitmentSource?.id === source.id }}><PageText style={styles.goalActionText}>{source.type}: {source.title}</PageText></SquirclePressable>)}</View></>}
              {plans.length > 0 && <><PageText style={styles.reflectionLabel}>LINK A GOAL · OPTIONAL</PageText><View style={styles.goalActions}>{plans.map((goal) => <SquirclePressable key={goal.id} onPress={() => setCommitmentGoalId(commitmentGoalId === goal.id ? undefined : goal.id)} style={[styles.goalAction, commitmentGoalId === goal.id && { backgroundColor: colors.lightGreen }]} accessibilityRole="button" accessibilityState={{ selected: commitmentGoalId === goal.id }}><PageText style={styles.goalActionText}>{goal.title}</PageText></SquirclePressable>)}</View></>}
            </View>}
            {commitmentError ? <Feedback severity="error" message={commitmentError} /> : null}
            <NativeActionButton label="Save commitment" systemImage="checkmark" onPress={() => void createCommitment()} disabled={savingCommitment} style={styles.primaryButton}><PageText style={styles.primaryButtonText}>Save commitment</PageText><AppIcon name="check" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>
          </BottomSheetScrollView></KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet index={notificationFormOpen ? 0 : -1} onClose={() => setNotificationFormOpen(false)} enablePanDownToClose snapPoints={['70%', '90%']} backgroundStyle={{ backgroundColor: colors.paper }}>
        <BottomSheetView style={{ flex: 1, backgroundColor: colors.paper }}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.addSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
          <View style={styles.sheetHeading}>
            <View style={styles.sheetHeadingCopy}><PageText display style={styles.sheetTitle}>Add a reminder</PageText><PageText style={styles.sectionSubtitle}>Choose what to remember and when.</PageText></View>
            <NativeActionButton label="" onPress={() => setNotificationFormOpen(false)} appearance="plain" tintColor={colors.ink} labelColor={colors.ink} style={styles.closeButton} accessibilityLabel="Close"><PageText style={styles.closeGlyph}>×</PageText></NativeActionButton>
          </View>
          <PageText style={styles.profileDetailLabel}>REMINDER NAME</PageText>
          <TextInput hideLabel ref={reminderNameInput} editable={!savingReminder} value={notificationTitle} onChangeText={setNotificationTitle} placeholder="For example, Take a short walk" placeholderTextColor={palette.muted} style={styles.addInput} accessibilityLabel="Reminder name" maxLength={80} returnKeyType="done" />
          <PageText style={styles.profileDetailLabel}>WHEN</PageText>
          <View style={styles.typeSelector} accessibilityRole="radiogroup" accessibilityLabel="Reminder frequency">
            {([{ id: 'once', label: 'One time' }, { id: 'daily', label: 'Repeat daily' }] as const).map((option) => <SquirclePressable key={option.id} onPress={() => setNotificationRepeat(option.id)} style={[styles.typePill, notificationRepeat === option.id && styles.typePillSelected]} accessibilityRole="radio" accessibilityState={{ selected: notificationRepeat === option.id }}><PageText style={[styles.typePillText, notificationRepeat === option.id && styles.typePillTextSelected]}>{option.label}</PageText></SquirclePressable>)}
          </View>
          {notificationRepeat === 'once' && <>
            <PageText style={styles.profileDetailLabel}>DATE</PageText>
            <DateField value={notificationDate} onChange={setNotificationDate} placeholder="Choose a date" accessibilityLabel="One-time reminder date" minimumDate={new Date(`${dateKey()}T00:00:00`)} />
          </>}
          <PageText style={styles.profileDetailLabel}>TIME · 24-HOUR FORMAT</PageText>
          <TextInput hideLabel ref={reminderTimeInput} editable={!savingReminder} value={notificationTime} onChangeText={setNotificationTime} placeholder="HH:MM" placeholderTextColor={palette.muted} keyboardType="numbers-and-punctuation" maxLength={5} style={styles.addInput} accessibilityLabel="Reminder time" />
          {notificationFeedback ? <Feedback {...notificationFeedback} action={notificationFeedback.severity === 'error' || notificationFeedback.severity === 'warning' ? { label: 'Try reminders again', onPress: () => void applyNotificationReminders(reminders, true), disabled: savingReminder } : undefined} /> : null}
          <NativeActionButton label="Save reminder" systemImage="checkmark" onPress={() => void saveNotificationReminder()} disabled={savingReminder} style={styles.primaryButton}><PageText style={styles.primaryButtonText}>Save reminder</PageText><AppIcon name="check" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>
        </BottomSheetScrollView></KeyboardAvoidingView></BottomSheetView>
      </BottomSheet>

      {openedCheckInDate && <DailyCheckInSheet date={openedCheckInDate} onClose={() => setOpenedCheckInDate(null)} />}

      {(accountActionDialog === 'disableSync' || (Platform.OS === 'ios' && (accountActionDialog === 'deleteGuest' || accountActionDialog === 'deleteAccount'))) && <Modal
        visible
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => { if (accountActionInProgress === null) { setAccountActionDialog(null); setAccountActionError(null); } }}
      >
        <View style={styles.accountAlertBackdrop}>
          <SquircleCard style={styles.accountAlertCard} accessibilityViewIsModal>
            <PageText display style={styles.accountActionTitle}>{accountActionDialog === 'disableSync' ? 'Turn off planner sync?' : accountActionDialog === 'deleteGuest' ? 'Erase your planner data?' : 'Delete your account?'}</PageText>
            <PageText style={styles.accountActionDescription}>{accountActionDialog === 'disableSync'
              ? 'This device will stop syncing changes. The copy already saved to your account will remain there.'
              : accountActionDialog === 'deleteGuest'
                ? 'This erases your goals, tasks, habits, routines, and progress from this device. You’ll return to sign-in. You can’t undo this.'
                : 'This deletes your account and planner data from the server and this device. You’ll return to sign-in. You can’t undo this.'}</PageText>
            {accountActionError ? <SquircleCard style={styles.accountActionErrorContainer}><PageText style={styles.accountActionError}>{accountActionError}</PageText></SquircleCard> : null}
            <SquirclePressable
              onPress={() => accountActionDialog === 'disableSync' ? confirmDisablePlannerSync() : void deleteAccount(accountActionDialog === 'deleteAccount')}
              disabled={accountActionInProgress !== null}
              style={[accountActionDialog === 'disableSync' ? styles.accountActionConfirm : styles.accountAlertConfirm, accountActionInProgress !== null && styles.accountActionDisabled]}
              accessibilityRole="button"
              accessibilityLabel={accountActionDialog === 'disableSync' ? 'Turn off planner sync' : accountActionDialog === 'deleteGuest' ? 'Erase my data' : 'Delete account and data'}
              accessibilityState={{ disabled: accountActionInProgress !== null, busy: accountActionInProgress !== null }}
            >
              {accountActionInProgress === 'delete' ? <ActivityIndicator color={palette.onInk} size="small" /> : null}
              <PageText style={styles.accountAlertConfirmText}>{accountActionDialog === 'disableSync' ? 'Turn off sync' : accountActionInProgress === 'delete' ? 'Deleting…' : accountActionDialog === 'deleteGuest' ? 'Erase my data' : 'Delete account and data'}</PageText>
            </SquirclePressable>
            <Pressable
              onPress={() => { setAccountActionDialog(null); setAccountActionError(null); }}
              disabled={accountActionInProgress !== null}
              style={[styles.accountActionCancel, accountActionInProgress !== null && styles.accountActionDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: accountActionInProgress !== null }}
            >
              <PageText style={styles.accountActionCancelText}>Cancel</PageText>
            </Pressable>
          </SquircleCard>
        </View>
      </Modal>}

      {Platform.OS !== 'ios' && <BottomSheet
        index={accountActionDialog === 'signOut' || accountActionDialog === 'deleteGuest' || accountActionDialog === 'deleteAccount' ? 0 : -1}
        onClose={() => { if (accountActionInProgress === null) setAccountActionDialog(null); }}
        enableDynamicSizing
        enablePanDownToClose={accountActionInProgress === null}
        backgroundStyle={{ backgroundColor: colors.paper }}
      >
        {accountActionDialog === 'signOut' && <BottomSheetView style={[styles.accountActionSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}> 
          <PageText display style={styles.accountActionTitle}>{account.user ? 'Sign out?' : 'Leave guest workspace?'}</PageText>
          <PageText style={styles.accountActionDescription}>{account.user ? 'Your account will be disconnected from this device. Your planner data will stay on this device.' : 'Your guest planner will stay on this device.'}</PageText>
          {accountActionError ? <SquircleCard style={styles.accountActionErrorContainer}><PageText style={styles.accountActionError}>{accountActionError}</PageText></SquircleCard> : null}
          <SquirclePressable
            onPress={() => void signOut()}
            disabled={accountActionInProgress !== null}
            style={[styles.accountActionConfirm, accountActionInProgress !== null && styles.accountActionDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: accountActionInProgress !== null, busy: accountActionInProgress !== null }}
          >
            {accountActionInProgress === 'signOut' ? <ActivityIndicator color={palette.onInk} size="small" /> : null}
            <PageText style={styles.accountActionConfirmText}>{accountActionInProgress === 'signOut' ? (account.user ? 'Signing out…' : 'Leaving…') : account.user ? 'Sign out' : 'Leave guest workspace'}</PageText>
          </SquirclePressable>
          <Pressable
            onPress={() => { setAccountActionDialog(null); setAccountActionError(null); }}
            disabled={accountActionInProgress !== null}
            style={[styles.accountActionCancel, accountActionInProgress !== null && styles.accountActionDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: accountActionInProgress !== null }}
          >
            <PageText style={styles.accountActionCancelText}>Cancel</PageText>
          </Pressable>
        </BottomSheetView>}
        {(accountActionDialog === 'deleteGuest' || accountActionDialog === 'deleteAccount') && <BottomSheetView style={[styles.accountActionSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
          <PageText display style={styles.accountActionTitle}>{accountActionDialog === 'deleteGuest' ? 'Erase your planner data?' : 'Delete your account?'}</PageText>
          <PageText style={styles.accountActionDescription}>{accountActionDialog === 'deleteGuest'
            ? 'This erases your goals, tasks, habits, routines, and progress from this device. You’ll return to sign-in. You can’t undo this.'
            : 'This deletes your account and planner data from the server and this device. You’ll return to sign-in. You can’t undo this.'}</PageText>
          {accountActionError ? <SquircleCard style={styles.accountActionErrorContainer}><PageText style={styles.accountActionError}>{accountActionError}</PageText></SquircleCard> : null}
          <SquirclePressable
            onPress={() => void deleteAccount(accountActionDialog === 'deleteAccount')}
            disabled={accountActionInProgress !== null}
            style={[styles.accountActionConfirm, styles.accountActionDelete, accountActionInProgress !== null && styles.accountActionDisabled]}
            accessibilityRole="button"
            accessibilityLabel={accountActionDialog === 'deleteGuest' ? 'Erase my data' : 'Delete account and data'}
            accessibilityState={{ disabled: accountActionInProgress !== null, busy: accountActionInProgress !== null }}
          >
            {accountActionInProgress === 'delete' ? <ActivityIndicator color={palette.onInk} size="small" /> : null}
            <PageText style={styles.accountActionConfirmText}>{accountActionInProgress === 'delete' ? 'Deleting…' : accountActionDialog === 'deleteGuest' ? 'Erase my data' : 'Delete account and data'}</PageText>
          </SquirclePressable>
          <Pressable
            onPress={() => { setAccountActionDialog(null); setAccountActionError(null); }}
            disabled={accountActionInProgress !== null}
            style={[styles.accountActionCancel, accountActionInProgress !== null && styles.accountActionDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: accountActionInProgress !== null }}
          >
            <PageText style={styles.accountActionCancelText}>Cancel</PageText>
          </Pressable>
        </BottomSheetView>}
      </BottomSheet>}
      <GuestWorkspaceSignInTray ref={guestWorkspaceSignInTrayRef} />
    </View>
    </VisualStyleContext.Provider>
  );
}
