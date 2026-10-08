import { memo, useContext, type Dispatch, type SetStateAction } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, LinearTransition, ZoomIn, ZoomOut, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '../../components/app-icon';
import { SquirclePressable } from '../../components/squircle-card';
import { SquircleSurface } from '../../components/squircle-surface';
import { PageText } from './page-text';
import { dateKey } from './home-session';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, VisualStyleContext } from './visual-style-context';
import { progressRanges, visibleAchievementCount, type ProgressRangeId, type ProgressTabModel } from './use-home-screen-model';
import type { HomeScreenStyles } from './home-screen-styles';

const achievementStaggerMs = 75;
const achievementAnimationDurationMs = 220;

type ProgressTabProps = {
  model: ProgressTabModel;
  styles: HomeScreenStyles;
  selectedDate: string;
  progressRangeId: ProgressRangeId;
  onProgressRangeChange: (rangeId: ProgressRangeId) => void;
  showAllAchievements: boolean;
  onShowAllAchievementsChange: Dispatch<SetStateAction<boolean>>;
  chartWidth: number;
  onOpenCheckIn: () => void;
  onOpenHistory: () => void;
  onOpenReflection: () => void;
};

function ProgressTab({
  model,
  styles,
  selectedDate,
  progressRangeId,
  onProgressRangeChange,
  showAllAchievements,
  onShowAllAchievementsChange,
  chartWidth,
  onOpenCheckIn,
  onOpenHistory,
  onOpenReflection,
}: ProgressTabProps) {
  const palette = useTheme();
  const colors = palette;
  const visualStyle = useContext(VisualStyleContext);
  const expressive = visualStyle === 'expressive';
  const reduceMotion = useReducedMotion();
  const achievementLayout = reduceMotion
    ? LinearTransition.duration(100).easing(Easing.linear)
    : LinearTransition.duration(600).easing(Easing.linear);

  return <View style={[styles.tabPage, styles.progressPage]}>
    <View style={styles.progressIntro}>
      <PageText style={styles.dateLabel}>LOOKING BACK</PageText><PageText display style={[styles.pageHeading, styles.progressHeading]}>Review your activity.</PageText><PageText style={[styles.pageIntro, styles.progressIntroCopy]}>Choose a date range to compare completed tasks and habits.</PageText>
    </View>
    <View style={styles.progressActionRow}>
      <SquirclePressable
        radiusRatio={0.5}
        exactSquircle
        onPress={onOpenCheckIn}
        style={({ pressed }) => [styles.checkInEntryButton, pressed && { backgroundColor: palette.pressed }]}
        accessibilityRole="button"
        accessibilityLabel={`${model.selectedDateHasCheckIn ? 'Update' : 'Start'} Daily check-in for ${model.selectedDateLabel}`}
        accessibilityHint="Opens your daily ratings and notes"
      >
        <View style={styles.checkInEntryIcon}><AppIcon name="calendar" style={visualStyle} size={18} color={colors.green} /></View>
        <View style={styles.progressActionArrow}><AppIcon name="arrow" style={visualStyle} size={15} color={colors.green} /></View>
        <PageText style={styles.checkInEntryTitle}>Daily check-in</PageText>
        <PageText style={styles.checkInEntrySubtitle}>{selectedDate === dateKey() ? 'Today · ratings & notes' : `${model.selectedDateLabel} · ratings & notes`}</PageText>
      </SquirclePressable>

      <SquirclePressable
        radiusRatio={0.5}
        exactSquircle
        onPress={onOpenHistory}
        style={({ pressed }) => [styles.progressHistoryLink, pressed && { backgroundColor: palette.pressed }]}
        accessibilityRole="button"
        accessibilityLabel="History, browse activity by month, week, or day"
        accessibilityHint="Opens the full-screen activity calendar"
      >
        <View style={styles.progressHistoryLinkIcon}><AppIcon name="calendar" style={visualStyle} size={18} color={colors.green} /></View>
        <View style={styles.progressActionArrow}><AppIcon name="arrow" style={visualStyle} size={15} color={colors.green} /></View>
        <PageText style={styles.progressHistoryLinkTitle}>History</PageText>
        <PageText style={styles.progressHistoryLinkSubtitle}>Browse past activity</PageText>
      </SquirclePressable>
    </View>

    <View style={styles.progressRangeSection}>
      <View style={styles.progressRangeRow} accessibilityRole="radiogroup" accessibilityLabel="Progress date range">{progressRanges.map((range) => <Pressable key={range.id} onPress={() => onProgressRangeChange(range.id)} style={[styles.progressRangeButton, progressRangeId === range.id && styles.progressRangeButtonSelected]} accessibilityRole="radio" accessibilityState={{ selected: progressRangeId === range.id }}><PageText style={[styles.progressRangeText, progressRangeId === range.id && styles.progressRangeTextSelected]}>{range.label}</PageText></Pressable>)}</View>
      <PageText style={[styles.sectionSubtitle, styles.progressRangeHint]}>{model.progressStart} to {model.progressEnd}. Task completion includes routine actions. Habit consistency counts completed habits. Percentages use recorded actions; no records show —.</PageText>
    </View>
    <SquircleSurface style={styles.progressCard}><View style={styles.chartHeading}><View><PageText display style={styles.sectionTitle}>Action completion</PageText><PageText style={styles.sectionSubtitle}>Completed task and routine actions by {model.progressRange.unit}</PageText></View><View style={styles.chartBadge}><AppIcon name="progress" style={visualStyle} size={14} /></View></View><Chart values={model.progressBuckets.map((bucket) => bucket.value)} labels={model.progressBuckets.map((bucket) => bucket.label)} expressive={expressive} width={chartWidth} /><PageText style={styles.chartNote}>{model.taskCompletionRate == null ? 'No recorded actions for this range yet.' : `${model.completedTaskCount} of ${model.taskEntryCount} recorded actions completed.`}</PageText></SquircleSurface>
    <View style={styles.progressMetrics}>
      <View style={styles.metricRow}><SquircleSurface style={styles.metricCard}><PageText style={styles.metricLabel}>TASK COMPLETION</PageText><PageText display style={styles.metricValue}>{model.taskCompletionRate == null ? '—' : `${model.taskCompletionRate}%`}</PageText><PageText style={styles.metricCaption}>{model.comparisonText(model.taskCompletionRate, model.priorTaskCompletionRate)}</PageText></SquircleSurface><SquircleSurface style={styles.metricCard}><PageText style={styles.metricLabel}>HABIT CONSISTENCY</PageText><PageText display style={styles.metricValue}>{model.habitConsistency == null ? '—' : `${model.habitConsistency}%`}</PageText><PageText style={styles.metricCaption}>{model.comparisonText(model.habitConsistency, model.priorHabitConsistency)}</PageText></SquircleSurface></View>
      <View style={styles.metricRow}><SquircleSurface style={styles.metricCard}><PageText style={styles.metricLabel}>GOAL PROGRESS</PageText><PageText display style={styles.metricValue}>{model.planCount ? `${model.measurableGoalCount}` : '—'}</PageText><PageText style={styles.metricCaption}>{model.rangeGoalEventCount ? `${model.rangeGoalEventCount} progress updates in range` : 'measurable goals'}</PageText></SquircleSurface><SquircleSurface style={styles.metricCard}><PageText style={styles.metricLabel}>ROUTINE STEPS</PageText><PageText display style={styles.metricValue}>{model.routineEntryCount ? `${model.completedRoutineCount}/${model.routineEntryCount}` : '—'}</PageText><PageText style={styles.metricCaption}>recorded in range</PageText></SquircleSurface></View>
    </View>

    <Animated.View layout={achievementLayout} style={styles.achievementsSection}>
      <View style={styles.chartHeading}>
        <PageText display style={styles.sectionTitle}>Achievements</PageText>
        <PageText style={styles.sectionSubtitle}>{model.earnedAchievementCount} of {model.achievements.length} earned</PageText>
      </View>
      {model.visibleAchievements.map((achievement, index) => <Animated.View
        key={achievement.id}
        layout={achievementLayout}
        entering={ZoomIn
          .duration(reduceMotion ? 0 : achievementAnimationDurationMs)
          .delay(reduceMotion ? 0 : index * achievementStaggerMs)
          .easing(Easing.out(Easing.cubic))}
        exiting={ZoomOut
          .duration(reduceMotion ? 0 : achievementAnimationDurationMs)
          .delay(reduceMotion ? 0 : (model.visibleAchievements.length - index - 1) * achievementStaggerMs)
          .easing(Easing.in(Easing.cubic))}
        style={[styles.achievementRow, !achievement.isEarned && styles.achievementRowLocked]}
      >
        <View style={[styles.achievementIcon, achievement.isEarned && styles.achievementIconEarned]}><AppIcon name={achievement.icon} style={visualStyle} size={18} color={achievement.isEarned ? colors.green : colors.muted} /></View>
        <View style={styles.entryCopy}><PageText style={styles.achievementTitle}>{achievement.title}</PageText><PageText style={styles.emptySubtitle}>{achievement.detail}</PageText></View>
        <PageText style={styles.achievementState}>{achievement.isEarned ? 'Earned' : 'In progress'}</PageText>
      </Animated.View>)}
      {model.achievements.length > visibleAchievementCount && <Animated.View layout={achievementLayout}>
        <Pressable
          onPress={() => onShowAllAchievementsChange((expanded) => !expanded)}
          style={({ pressed }) => [styles.achievementToggle, pressed && styles.achievementTogglePressed]}
          accessibilityRole="button"
          accessibilityLabel={showAllAchievements ? 'See fewer achievements' : 'See more achievements'}
          accessibilityState={{ expanded: showAllAchievements }}
        >
          <PageText style={styles.achievementToggleText}>{showAllAchievements ? 'See fewer achievements' : 'See more achievements'}</PageText>
        </Pressable>
      </Animated.View>}
    </Animated.View>

    <Animated.View layout={achievementLayout}>
      <SquirclePressable radiusRatio={0.5} exactSquircle onPress={onOpenReflection} style={({ pressed }) => [styles.habitPrompt, pressed && { backgroundColor: palette.pressed }]} accessibilityRole="button" accessibilityLabel="A moment to reflect" accessibilityHint="Opens your weekly reflection form">
        <View style={styles.habitMark}><AppIcon name="progress" style={visualStyle} size={18} color={colors.green} /></View>
        <View style={styles.entryCopy}><PageText display style={styles.emptyTitle}>A moment to reflect</PageText><PageText style={styles.emptySubtitle}>{model.savedReflection ? 'Your reflection is saved for this week.' : 'Note what helped, what got in the way, and what to change next.'}</PageText></View>
        <AppIcon name="arrow" style={visualStyle} size={17} color={colors.green} />
      </SquirclePressable>
    </Animated.View>
  </View>;
}

export default memo(ProgressTab);

function Chart({ values, labels, expressive, width }: { values: number[]; labels: string[]; expressive: boolean; width: number }) {
  const palette = useTheme();
  const colors = palette;
  const height = 144;
  const left = 15;
  const right = width - 14;
  const top = 14;
  const bottom = 112;
  const step = (right - left) / (values.length - 1);
  const points = values.map((value, index) => `${left + index * step},${bottom - Math.max(0, value) * (bottom - top)}`);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point}`).join(' ');
  const latestIndex = values.length - 1;
  const barWidth = Math.min(22, step * 0.52);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.5, 1].map((fraction) => <Line key={fraction} x1={left} x2={right} y1={bottom - fraction * (bottom - top)} y2={bottom - fraction * (bottom - top)} stroke={palette.line} strokeWidth={1} strokeDasharray={expressive ? '2 4' : undefined} />)}
      {expressive ? (
        <>
          <Path d={`${path} L${right},${bottom} L${left},${bottom} Z`} fill={palette.lightGreen} opacity={0.42} />
          <Path d={path} fill="none" stroke={colors.green} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={points.map((point, index) => { const [x, y] = point.split(',').map(Number); return `${index ? 'L' : 'M'}${x + (index % 2 ? 1 : -1)},${y + (index % 3 ? 1 : -1)}`; }).join(' ')} fill="none" stroke={colors.green} strokeWidth={1.2} strokeLinecap="round" opacity={0.58} />
          {values.map((value, index) => <Circle key={index} cx={left + index * step} cy={bottom - value * (bottom - top)} r={index === latestIndex ? 4.2 : 2.5} fill={index === latestIndex ? colors.clay : colors.green} />)}
        </>
      ) : (
        values.map((value, index) => {
          const x = left + index * step - barWidth / 2;
          const barHeight = value === 0 ? 3 : Math.max(5, value * (bottom - top));
          return <Rect key={index} x={x} y={bottom - barHeight} width={barWidth} height={barHeight} rx={barWidth / 2} fill={index === latestIndex ? colors.green : palette.chartSecondary} />;
        })
      )}
      {labels.map((label, index) => <SvgText key={index} x={left + index * step} y={137} textAnchor="middle" fontSize={expressive ? 11 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 11} fontFamily={expressive ? 'DeliciousHandrawn-Regular' : 'Satoshi'} fill={index === latestIndex ? colors.ink : palette.muted}>{label}</SvgText>)}
    </Svg>
  );
}
