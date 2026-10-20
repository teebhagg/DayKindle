import { SquircleCard, SquirclePressable } from '@/components/squircle-card';
import { EmptyState } from '@/components/app-empty-state';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { AppIcon } from '../../components/app-icon';
import NativeActionButton from '../../components/native-action-button';
import { ProgressiveEdgeBlur } from '../../components/progressive-edge-blur';
import { APP_HEADER_FADE_CONTENT_HEIGHT, APP_NON_TAB_HEADER_HEIGHT, topHeaderBlurHeight } from '../../components/header-gradient-metrics';
import { MaskedTabBar } from '../../shared/components/organisms/masked-tab-bar';
import { dateKey, shiftDateKey, useHomeSession, type HomeEntry, type StarterPlan } from './home-session';
import { occurrenceStatus } from './occurrences';
import { textStyleForVisualStyle, VisualStyleContext } from './visual-style-context';
import { NON_TAB_HEADER_TITLE_SCALE } from './layout-metrics';
import { PageText } from './page-text';

type CalendarView = 'month' | 'week' | 'day';
type HistoryItem = {
  id: string;
  date: string;
  title: string;
  kind: string;
  detail?: string;
  timestamp?: string;
};


const viewOptions: { id: CalendarView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const Text = PageText;

function startOfWeek(date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return shiftDateKey(date, -((weekday + 6) % 7));
}

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(date: string, months: number) {
  const current = new Date(`${date}T12:00:00`);
  const targetMonth = new Date(current.getFullYear(), current.getMonth() + months, 1, 12);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 12).getDate();
  return dateKey(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(current.getDate(), lastDay), 12));
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
}

function completionDate(entry: HomeEntry) {
  const savedTimestamp = entry.completedAt ?? [...(entry.statusHistory ?? [])].reverse().find((event) => event.to === 'completed')?.at;
  const parsed = savedTimestamp ? new Date(savedTimestamp) : undefined;
  return parsed && Number.isFinite(parsed.getTime()) ? dateKey(parsed) : entry.date;
}

function buildHistoryItems(entries: HomeEntry[], plans: StarterPlan[], progressEvents: ReturnType<typeof useHomeSession>['goalProgressEvents']) {
  const items: HistoryItem[] = entries.flatMap((entry) => {
    if (entry.type === 'goal' || occurrenceStatus(entry) !== 'completed') return [];
    const kind = entry.sourceType === 'routine_step'
      ? 'Routine step completed'
      : entry.type === 'habit' || entry.sourceType === 'habit'
        ? 'Habit completed'
        : 'Task completed';
    const timestamp = entry.completedAt ?? [...(entry.statusHistory ?? [])].reverse().find((event) => event.to === 'completed')?.at;
    return [{ id: `entry-${entry.id}`, date: completionDate(entry), title: entry.title, kind, timestamp }];
  });
  for (const plan of plans) {
    if (plan.status === 'completed' && plan.completedAt) {
      const completedAt = new Date(plan.completedAt);
      if (Number.isFinite(completedAt.getTime())) {
        items.push({ id: `goal-${plan.id}`, date: dateKey(completedAt), title: plan.title, kind: 'Goal completed', timestamp: plan.completedAt });
      }
    }
    for (const milestone of plan.milestones ?? []) {
      if (!milestone.completed || !milestone.completedAt) continue;
      const completedAt = new Date(milestone.completedAt);
      if (!Number.isFinite(completedAt.getTime())) continue;
      items.push({ id: `milestone-${milestone.id}`, date: dateKey(completedAt), title: `${plan.title} · ${milestone.title}`, kind: 'Milestone reached', timestamp: milestone.completedAt });
    }
  }

  const goalsById = new Map(plans.map((plan) => [plan.id, plan.title]));
  for (const event of progressEvents) {
    items.push({
      id: `goal-progress-${event.id}`,
      date: event.date,
      title: goalsById.get(event.sourceId) ?? 'Goal progress updated',
      kind: 'Goal progress',
      detail: `${event.progressValue} / ${event.targetValueSnapshot} ${event.targetUnitSnapshot}`,
      timestamp: event.createdAt,
    });
  }

  return items.sort((left, right) => left.date.localeCompare(right.date)
    || (left.timestamp ?? '').localeCompare(right.timestamp ?? '')
    || left.title.localeCompare(right.title));
}

export default function HistoryScreen() {
  const palette = useTheme();   const styles = useThemedStyles(createStyles);
  const { entries, plans, goalProgressEvents, visualStyle } = useHomeSession();
  const textStyle = textStyleForVisualStyle(visualStyle);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const today = dateKey();
  const isWide = width >= 600;
  const headerHeight = insets.top + APP_NON_TAB_HEADER_HEIGHT;
  const headerFadeHeight = insets.top + APP_HEADER_FADE_CONTENT_HEIGHT;
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const historyItems = useMemo(() => buildHistoryItems(entries, plans, goalProgressEvents), [entries, plans, goalProgressEvents]);
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, HistoryItem[]>();
    for (const item of historyItems) grouped.set(item.date, [...(grouped.get(item.date) ?? []), item]);
    return grouped;
  }, [historyItems]);
  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const currentMonth = startOfMonth(selectedDate);
  const monthStart = startOfMonth(selectedDate);
  const monthOffset = (new Date(`${monthStart}T12:00:00`).getDay() + 6) % 7;
  const monthDates = useMemo(() => Array.from({ length: 42 }, (_, index) => shiftDateKey(monthStart, index - monthOffset)), [monthStart, monthOffset]);
  const weekStart = startOfWeek(selectedDate);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDateKey(weekStart, index)), [weekStart]);
  const nextDate = view === 'month' ? shiftMonth(selectedDate, 1) : shiftDateKey(selectedDate, view === 'week' ? 7 : 1);
  const canMoveForward = view === 'month'
    ? startOfMonth(nextDate) <= startOfMonth(today)
    : view === 'week'
      ? startOfWeek(nextDate) <= today
      : nextDate <= today;
  const periodTitle = view === 'month'
    ? dateLabel(selectedDate, { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${dateLabel(weekStart, { month: 'short', day: 'numeric' })} – ${dateLabel(weekDates[6], { month: 'short', day: 'numeric', year: 'numeric' })}`
      : dateLabel(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const movePeriod = (amount: number) => setSelectedDate(view === 'month'
    ? shiftMonth(selectedDate, amount)
    : shiftDateKey(selectedDate, amount * (view === 'week' ? 7 : 1)));
  const dateButton = (date: string, compact = false) => {
    const selected = date === selectedDate;
    const isToday = date === today;
    const isFuture = date > today;
    const inMonth = date.slice(0, 7) === currentMonth.slice(0, 7);
    const count = itemsByDate.get(date)?.length ?? 0;
    const label = `${dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${count ? `, ${count} ${count === 1 ? 'activity' : 'activities'}` : ', no recorded activity'}${isToday ? ', today' : ''}${selected ? ', selected' : ''}`;
    return <SquirclePressable
      pill
      key={date}
      disabled={isFuture}
      onPress={() => setSelectedDate(date)}
      style={({ pressed }) => [compact ? styles.weekDateButton : styles.monthDateButton, selected && styles.dateButtonSelected, !selected && isToday && styles.dateButtonToday, isFuture && styles.dateButtonFuture, !compact && !inMonth && styles.dateButtonOutsideMonth, pressed && !isFuture && !selected && styles.dateButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: isFuture }}
    >
      {compact ? <>
        <View style={styles.weekDateCopy}>
          <Text style={[styles.weekdayLabel, textStyle, selected && styles.selectedDateText]}>{dateLabel(date, { weekday: 'long' })}</Text>
          <Text style={[styles.weekDateMeta, textStyle, selected && styles.selectedWeekDateMeta]}>{dateLabel(date, { month: 'short', day: 'numeric' })} · {count ? `${count} ${count === 1 ? 'activity' : 'activities'}` : 'No activity'}</Text>
        </View>
        <View style={[styles.dateNumberCircle, selected && styles.dateNumberCircleSelected]}>
          <Text style={[styles.dateNumber, textStyle, selected && styles.selectedDateText, isFuture && styles.futureText]}>{Number(date.slice(8, 10))}</Text>
        </View>
        <View style={styles.activityDots} accessibilityElementsHidden>
          {count > 0 && Array.from({ length: Math.min(count, 3) }, (_, index) => <View key={`${date}-dot-${index}`} style={[styles.activityDot, selected && styles.activityDotSelected]} />)}
        </View>
      </> : <>
        <View style={[styles.dateNumberCircle, selected && styles.dateNumberCircleSelected]}>
          <Text style={[styles.dateNumber, textStyle, selected && styles.selectedDateText, !inMonth && styles.outsideMonthText, isFuture && styles.futureText]}>{Number(date.slice(8, 10))}</Text>
        </View>
        <View style={styles.activityDots} accessibilityElementsHidden>
          {count > 0 && Array.from({ length: Math.min(count, 3) }, (_, index) => <View key={`${date}-dot-${index}`} style={[styles.activityDot, selected && styles.activityDotSelected]} />)}
        </View>
      </>}
    </SquirclePressable>;
  };
  const listHeader = <View style={[styles.content, isWide && styles.contentWide]}>
    <Text style={[styles.screenSubtitle, textStyle]}>Review completed activity and goal progress by date.</Text>

    <MaskedTabBar
      value={view}
      onValueChange={(nextView) => {
        if (nextView === 'month' || nextView === 'week' || nextView === 'day') setView(nextView);
      }}
      accessibilityLabel="Calendar view"
      height={48}
      radius={24}
      padding={3}
      gap={3}
      fontSize={13}
      fontWeight="500"
      palette={{ track: palette.lightGreen, pill: palette.surface, inactive: palette.muted, active: palette.ink }}
      style={styles.viewSelector}
    >
      <MaskedTabBar.List>
        {viewOptions.map((option) => <MaskedTabBar.Trigger key={option.id} value={option.id} accessibilityLabel={option.label}>
          <MaskedTabBar.Label style={textStyle}>{option.label}</MaskedTabBar.Label>
        </MaskedTabBar.Trigger>)}
      </MaskedTabBar.List>
    </MaskedTabBar>

    <SquircleCard style={styles.calendarCard}>
      <View style={styles.periodHeader}>
        <View style={styles.periodHeadingCopy}>
          <Text style={[styles.periodTitle, textStyle]}>{periodTitle}</Text>
          <Text style={[styles.periodSubtitle, textStyle]}>{view === 'month' ? 'Select a date to see what you completed' : `${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'} on the selected date`}</Text>
        </View>
        <View style={styles.calendarActions}>
          <SquirclePressable pill onPress={() => setSelectedDate(today)} style={styles.todayButton} accessibilityRole="button" accessibilityLabel="Go to today">
            <Text style={[styles.todayButtonText, textStyle]}>Today</Text>
          </SquirclePressable>
          <SquirclePressable pill onPress={() => movePeriod(-1)} style={styles.arrowButton} accessibilityRole="button" accessibilityLabel={`Previous ${view}`}>
            <AppIcon name="back" style={visualStyle} size={17} color={palette.green} />
          </SquirclePressable>
          <SquirclePressable pill onPress={() => movePeriod(1)} disabled={!canMoveForward} style={[styles.arrowButton, !canMoveForward && styles.arrowButtonDisabled]} accessibilityRole="button" accessibilityLabel={`Next ${view}`} accessibilityState={{ disabled: !canMoveForward }}>
            <AppIcon name="arrow" style={visualStyle} size={17} color={canMoveForward ? palette.green : palette.muted} />
          </SquirclePressable>
        </View>
      </View>

      {view === 'month' && <>
        <View style={styles.weekdayHeader}>{weekDays.map((day, index) => <Text key={`${day}-${index}`} style={[styles.weekdayHeaderText, textStyle]}>{day}</Text>)}</View>
        <View style={styles.monthGrid}>{monthDates.map((date) => dateButton(date))}</View>
      </>}
      {view === 'week' && <View style={styles.weekList}>{weekDates.map((date) => dateButton(date, true))}</View>}
      {view === 'day' && <View style={styles.daySummary}>
        <View style={styles.daySummaryNumber}><Text style={[styles.daySummaryNumberText, textStyle]}>{Number(selectedDate.slice(8, 10))}</Text></View>
        <View style={styles.daySummaryCopy}>
          <Text style={[styles.daySummaryTitle, textStyle]}>{dateLabel(selectedDate, { weekday: 'long' })}</Text>
          <Text style={[styles.daySummarySubtitle, textStyle]}>{selectedItems.length ? `${selectedItems.length} completed ${selectedItems.length === 1 ? 'activity' : 'activities'}` : 'No recorded activity'}</Text>
        </View>
      </View>}
    </SquircleCard>

    <View style={styles.activityHeading}>
      <View>
        <Text style={[styles.activityHeadingTitle, textStyle]}>Activity</Text>
        <Text style={[styles.activityHeadingDate, textStyle]}>{dateLabel(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      </View>
      <View style={styles.activityCount}><Text style={[styles.activityCountText, textStyle]}>{selectedItems.length}</Text></View>
    </View>
  </View>;
  return <VisualStyleContext.Provider value={visualStyle}>
    <View style={styles.screen}>
      <Animated.FlatList
        data={selectedItems}
        extraData={selectedDate}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState title="No recorded activity" description="Completed actions and recorded goal progress appear here by date." style={isWide ? styles.contentWide : undefined} />}
        renderItem={({ item }) => {
          const icon = item.kind === 'Goal completed' || item.kind === 'Milestone reached'
            ? 'goal'
            : item.kind === 'Goal progress'
              ? 'progress'
              : item.kind === 'Habit completed'
                ? 'focus'
                : item.kind === 'Routine step completed'
                  ? 'clock'
                  : 'check';
          return <View style={[styles.activityRow, isWide && styles.contentWide]}>
            <View style={styles.activityIcon}><AppIcon name={icon} style={visualStyle} size={17} color={palette.green} /></View>
            <View style={styles.activityCopy}>
              <Text style={[styles.activityTitle, textStyle]}>{item.title}</Text>
              <Text style={[styles.activityMeta, textStyle]}>{item.kind}{item.detail ? ` · ${item.detail}` : ''}</Text>
            </View>
            <View style={styles.activityMarker} />
          </View>;
        }}
        ItemSeparatorComponent={() => <View style={[styles.listSeparator, isWide && styles.contentWide]} />}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16, paddingBottom: Math.max(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
      />
      <ProgressiveEdgeBlur edge="bottom" surfaceColor={palette.paper} style={{ zIndex: 8 }} />
      <View pointerEvents="none" style={[styles.topBlur, { height: topHeaderBlurHeight(headerFadeHeight) }]}>
        <ProgressiveEdgeBlur edge="top" surfaceColor={palette.paper} startOffset={0.8} scrollProgress={scrollY} revealDistance={headerFadeHeight} style={styles.topBlurContent} />
      </View>
      <View pointerEvents="box-none" collapsable={false} renderToHardwareTextureAndroid style={[styles.headerOverlay, { height: headerHeight }]}>
        <View style={[styles.topBar, { height: APP_NON_TAB_HEADER_HEIGHT, marginTop: insets.top }]}>
          <NativeActionButton label="Back" systemImage="chevron.left" iconPlacement="leading" appearance="plain" tintColor={palette.ink} labelColor={palette.ink} onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
            <AppIcon name="back" style={visualStyle} size={18} color={palette.ink} /><PageText style={styles.backLabel}>Back</PageText>
          </NativeActionButton>
          <View style={styles.topBarBalance} />
          </View>
          <View pointerEvents="none" style={[styles.headerTitle, { top: insets.top, height: APP_NON_TAB_HEADER_HEIGHT }]}><PageText style={styles.collapsedTitle}>History</PageText></View>
      </View>
    </View>
  </VisualStyleContext.Provider>;
}

const createStyles = (palette: AppTheme) => {   return StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  listContent: { flexGrow: 1, paddingBottom: 24 },
  topBlur: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 },
  topBlurContent: { height: '100%', opacity: 0.95 },
  content: { width: '100%', alignSelf: 'center', paddingHorizontal: LayoutSpacing.screenInset },
  contentWide: { maxWidth: 700 },
  headerOverlay: { position: 'absolute', zIndex: 20, top: 0, left: 0, right: 0, overflow: 'hidden' },
  topBar: { paddingHorizontal: LayoutSpacing.screenInset, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { position: 'absolute', zIndex: 1, left: 0, right: 0, paddingHorizontal: 88, alignItems: 'center', justifyContent: 'center' },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backLabel: { color: palette.ink, fontSize: 13.2, fontWeight: '600' },
  collapsedTitle: { width: '100%', color: palette.ink, fontSize: 20.9 * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 27.5 * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '600', textAlign: 'center' },
  topBarBalance: { width: 78 },
  screenSubtitle: { color: palette.muted, fontSize: 14.3, lineHeight: 22, marginBottom: LayoutSpacing.group },
  viewSelector: { marginBottom: LayoutSpacing.group },
  calendarCard: { padding: 15, borderRadius: Radius.card, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface },
  periodHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginBottom: 11 },
  periodHeadingCopy: { flex: 1, gap: 3 },
  periodTitle: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  periodSubtitle: { color: palette.muted, fontSize: 10.5, lineHeight: 15 },
  calendarActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  todayButton: { minWidth: 52, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, borderCurve: 'circular', backgroundColor: palette.lightGreen },
  todayButtonText: { color: palette.green, fontSize: 11, fontWeight: '700' },
  arrowButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, borderCurve: 'circular' },
  arrowButtonDisabled: { opacity: 0.42 },
  weekdayHeader: { height: 31, flexDirection: 'row', alignItems: 'center' },
  weekdayHeaderText: { width: '14.2857%', color: palette.muted, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDateButton: { width: '14.2857%', height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, borderCurve: 'circular' },
  weekList: { gap: LayoutSpacing.control },
  weekDateButton: { width: '100%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 11, borderRadius: Radius.pill, borderCurve: 'circular' },
  weekDateCopy: { flex: 1, gap: 2 },
  weekdayLabel: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  weekDateMeta: { color: palette.muted, fontSize: 10.5, lineHeight: 15 },
  selectedWeekDateMeta: { color: palette.onAccent },
  dateButtonSelected: { backgroundColor: palette.green },
  dateButtonToday: { borderWidth: 1, borderColor: palette.chartSecondary },
  dateButtonFuture: {},
  dateButtonOutsideMonth: {},
  dateButtonPressed: { backgroundColor: palette.lightGreen },
  dateNumberCircle: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill},
  dateNumberCircleSelected: {},
  dateNumber: { color: palette.ink, fontSize: 12, fontWeight: '500' },
  selectedDateText: { color: palette.onAccent },
  outsideMonthText: { color: palette.muted },
  futureText: { color: palette.muted },
  activityDots: { height: 5, minWidth: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  activityDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.green },
  activityDotSelected: { backgroundColor: palette.onAccent },
  daySummary: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 5, paddingVertical: 8 },
  daySummaryNumber: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.control, backgroundColor: palette.lightGreen },
  daySummaryNumberText: { color: palette.green, fontSize: 23, fontWeight: '600' },
  daySummaryCopy: { flex: 1, gap: 3 },
  daySummaryTitle: { color: palette.ink, fontSize: 16, fontWeight: '600' },
  daySummarySubtitle: { color: palette.muted, fontSize: 12 },
  activityHeading: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 },
  activityHeadingTitle: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  activityHeadingDate: { color: palette.muted, fontSize: 11, marginTop: 3 },
  activityCount: { minWidth: 30, height: 30, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: palette.lightGreen },
  activityCountText: { color: palette.green, fontSize: 12, fontWeight: '700' },
  activityRow: { width: '100%', minHeight: 69, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  activityIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, backgroundColor: palette.lightGreen },
  activityCopy: { flex: 1, gap: 3 },
  activityTitle: { color: palette.ink, fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
  activityMeta: { color: palette.muted, fontSize: 10.5, lineHeight: 15 },
  activityMarker: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.green },
  listSeparator: { height: StyleSheet.hairlineWidth, maxWidth: 660, width: '100%', alignSelf: 'center', backgroundColor: palette.line },
  emptyState: { width: '100%', alignSelf: 'center', alignItems: 'center', paddingHorizontal: 34, paddingTop: 27, gap: 9 },
  emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.control, backgroundColor: palette.lightGreen },
  emptyTitle: { color: palette.ink, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { color: palette.muted, fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
}); };
