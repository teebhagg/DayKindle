import { SquircleCard, SquirclePressable } from '@/components/squircle-card';
import { Feedback } from '@/components/app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { AppIcon } from '../components/app-icon';
import { PageText } from '../features/home/page-text';
import { NON_TAB_HEADER_TITLE_SCALE, PAGE_HEADING_SCALE } from '../features/home/layout-metrics';
import { VisualStyleContext } from '../features/home/visual-style-context';
import { dateKey, useHomeSession, type HabitTrackingType, type RecurrenceRule } from '../features/home/home-session';
import { allGoalAndHabitTemplates, categoryIcons, type GoalTemplate, type HabitTemplate } from '../features/templates/catalog';
import { createOccurrenceId } from '../features/home/occurrences';
import NativeActionButton from '../components/native-action-button';
import { AppTextInput as TextInput } from '../components/app-text-input';
import { ProgressiveEdgeBlur } from '../components/progressive-edge-blur';
import { APP_HEADER_FADE_CONTENT_HEIGHT, APP_NON_TAB_HEADER_HEIGHT, topHeaderBlurHeight } from '../components/header-gradient-metrics';
import { posthog } from '../lib/posthog';





const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TemplateDetailScreen() {
  const palette = useTheme();  const { ink } = palette; const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = allGoalAndHabitTemplates.find((item) => item.id === id);
  if (!template) {
    return <View style={styles.root}><PageText display style={styles.title}>Template not found</PageText><NativeActionButton label="Go back" onPress={() => router.back()} appearance="plain" tintColor={ink} labelColor={ink} style={styles.backButton}><PageText style={styles.backText}>Go back</PageText></NativeActionButton></View>;
  }
  return <TemplateSetup key={template.id} template={template} />;
}

function TemplateSetup({ template }: { template: GoalTemplate | HabitTemplate }) {
  const palette = useTheme();  const { ink, muted, green, paper } = palette; const styles = useThemedStyles(createStyles);
  const { visualStyle, plans, setPlans, habitDefinitions, setHabitDefinitions, confirmLocalSave, storageStatus, retrySave } = useHomeSession();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const headerHeight = insets.top + APP_NON_TAB_HEADER_HEIGHT;
  const headerFadeHeight = insets.top + APP_HEADER_FADE_CONTENT_HEIGHT;
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [pendingSave, setPendingSave] = useState(false);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const nameInput = useRef<import('react-native').TextInput>(null);
  const stepInput = useRef<import('react-native').TextInput>(null);
  const amountInput = useRef<import('react-native').TextInput>(null);
  const unitInput = useRef<import('react-native').TextInput>(null);
  const [title, setTitle] = useState(template.title);
  const [firstStep, setFirstStep] = useState(template.kind === 'goal' ? template.firstStep : '');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(template.kind === 'habit' ? template.suggestedRecurrence : 'daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(template.kind === 'habit' ? template.suggestedDaysOfWeek ?? [1, 3, 5] : [1, 3, 5]);
  const [trackingType, setTrackingType] = useState<HabitTrackingType>(template.kind === 'habit' ? template.trackingType : 'boolean');
  const [targetValue, setTargetValue] = useState(template.kind === 'habit' && template.targetValue != null ? String(template.targetValue) : '');
  const [targetUnit, setTargetUnit] = useState(template.kind === 'habit' ? template.targetUnit ?? '' : '');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalUnit, setGoalUnit] = useState('');
  const added = template.kind === 'goal'
    ? plans.some((plan) => plan.sourceTemplateId === template.id || plan.id === template.id)
    : template.kind === 'habit'
      ? habitDefinitions.some((habit) => habit.sourceTemplateId === template.id)
      : false;
  const parsedGoalTarget = goalTarget.trim() ? Number(goalTarget) : undefined;
  const parsedHabitTarget = targetValue.trim() ? Number(targetValue) : undefined;
  const targetInvalid = template.kind === 'goal'
    ? goalTarget.trim() !== '' && (!Number.isFinite(parsedGoalTarget) || (parsedGoalTarget ?? 0) <= 0)
    : targetValue.trim() !== '' && (!Number.isFinite(parsedHabitTarget) || (parsedHabitTarget ?? 0) <= 0);
  const selectedDayMissing = template.kind === 'habit' && recurrence === 'selected_days' && daysOfWeek.length === 0;
  const targetUnitMissing = template.kind === 'goal' ? !!goalTarget.trim() && !goalUnit.trim() : trackingType === 'quantity' && !!targetValue.trim() && !targetUnit.trim();
  const canSave = !added && !targetUnitMissing && title.trim().length > 0 && (template.kind !== 'goal' || firstStep.trim().length > 0) && !targetInvalid && !selectedDayMissing;
  const toggleDay = (day: number) => setDaysOfWeek((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort());
  const save = async () => {
    if (saving) return;
    if (!canSave && !pendingSave) {
      const field = !title.trim() ? 'name' : template.kind === 'goal' && !firstStep.trim() ? 'step' : targetInvalid ? 'amount' : targetUnitMissing ? 'unit' : 'days';
      setInvalidField(field);
      setSaveError(field === 'name' ? 'Enter a name.' : field === 'step' ? 'Add a first step.' : field === 'amount' ? 'Enter a target greater than zero.' : field === 'unit' ? 'Add a unit, such as pages or minutes.' : 'Choose at least one repeat day.');
      ({ name: nameInput, step: stepInput, amount: amountInput, unit: unitInput, days: null }[field])?.current?.focus();
      return;
    }
    setSaving(true);
    if (pendingSave) {
      retrySave();
      try { await confirmLocalSave(); } catch { setSaveError('Could not save on this device. Try saving again.'); setSaving(false); return; }
      setSaving(false); router.back(); return;
    }
    setPendingSave(true);
    if (template.kind === 'goal') {
      const quantitative = parsedGoalTarget != null && Number.isFinite(parsedGoalTarget) && parsedGoalTarget > 0 && goalUnit.trim().length > 0;
      setPlans((current) => current.some((plan) => plan.sourceTemplateId === template.id)
        ? current
        : [...current, {
          id: createOccurrenceId('goal'), sourceTemplateId: template.id, title: title.trim(), firstStep: firstStep.trim(), description: template.description,
          lifeAreaId: lifeAreaIdForCategory(template.category), startDate: dateKey(), status: 'active', priority: 'medium',
          targetType: quantitative ? 'quantitative' : 'qualitative', targetValue: quantitative ? parsedGoalTarget : undefined,
          targetUnit: quantitative ? goalUnit.trim() : undefined, progressValue: quantitative ? 0 : undefined, milestones: [],
        }]);
    } else {
      const now = new Date().toISOString();
      setHabitDefinitions((current) => current.some((habit) => habit.sourceTemplateId === template.id)
        ? current
        : [...current, {
          id: createOccurrenceId('habit-definition'), sourceTemplateId: template.id, title: title.trim(), startDate: dateKey(),
          recurrenceRule: recurrence, daysOfWeek: recurrence === 'selected_days' ? daysOfWeek : undefined, trackingType,
          targetValue: trackingType === 'boolean' || parsedHabitTarget == null || !Number.isFinite(parsedHabitTarget) || parsedHabitTarget <= 0 ? undefined : parsedHabitTarget,
          targetUnit: trackingType === 'boolean' ? undefined : targetUnit.trim() || (trackingType === 'duration' ? 'minutes' : undefined),
          isPaused: false, createdAt: now,
        }]);
    }
    try {
      if (storageStatus === 'save-error') retrySave();
      await confirmLocalSave();
    } catch {
      setSaveError('Could not save on this device. Your edits are waiting to save. Save again before making more changes.');
      setSaving(false);
      return;
    }
    setSaving(false);
    posthog?.capture('template_added', {
      template_kind: template.kind,
      template_category: template.category,
      has_quantitative_target: template.kind === 'goal' ? Boolean(parsedGoalTarget) : Boolean(parsedHabitTarget),
      ...(template.kind === 'habit' ? { tracking_type: trackingType } : {}),
    });
    router.back();
  };
  const goal = template.kind === 'goal' ? template as GoalTemplate : undefined;
  const habit = template.kind === 'habit' ? template as HabitTemplate : undefined;
  return (
    <VisualStyleContext.Provider value={visualStyle}>
      <View style={styles.root}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: headerHeight, paddingBottom: Math.max(insets.bottom, 20) + 26 }]}>
          <Link.AppleZoomTarget><View collapsable={false} style={styles.hero}>
            <View style={styles.heroIcon}><AppIcon name={categoryIcons[template.category]} style={visualStyle} size={31} color={green} /></View>
            <View><PageText style={styles.eyebrow}>{template.category.toUpperCase()}</PageText><PageText style={styles.kindLabel}>{template.kind.toUpperCase()} TEMPLATE</PageText></View>
          </View></Link.AppleZoomTarget>
          <PageText display style={styles.title}>{template.title}</PageText>
          <PageText style={styles.description}>{template.description}</PageText>
          <SquircleCard style={styles.contextCard}><View style={styles.contextIcon}><AppIcon name="sparkle" style={visualStyle} size={17} color={green} /></View><View style={styles.contextCopy}><PageText style={styles.contextLabel}>A FLEXIBLE STARTING POINT</PageText><PageText style={styles.contextText}>{template.context}</PageText></View></SquircleCard>

          <PageText style={styles.sectionLabel}>NAME</PageText>
          <TextInput hideLabel editable={!pendingSave && !saving} ref={nameInput} error={invalidField === "name" ? saveError : undefined} value={title} onChangeText={setTitle} placeholder="Name this goal or habit" placeholderTextColor={palette.muted} maxLength={100} style={styles.field} accessibilityLabel="Goal or habit title" />
          {goal ? <>
            <PageText style={styles.fieldLabel}>FIRST STEP</PageText>
            <TextInput hideLabel editable={!pendingSave && !saving} ref={stepInput} error={invalidField === "step" ? saveError : undefined} value={firstStep} onChangeText={setFirstStep} placeholder="Choose a small first step" placeholderTextColor={palette.muted} maxLength={180} style={[styles.field, styles.multilineField]} multiline textAlignVertical="top" accessibilityLabel="First step" />
            <PageText style={styles.fieldLabel}>OPTIONAL TARGET</PageText>
            <View style={styles.measureRow}><TextInput editable={!pendingSave && !saving} label="Target" ref={amountInput} error={invalidField === "amount" ? saveError : undefined} value={goalTarget} onChangeText={setGoalTarget} placeholder="Amount" keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.field, styles.measureField]} accessibilityLabel="Optional goal target" /><TextInput editable={!pendingSave && !saving} label="Unit" ref={unitInput} error={invalidField === "unit" ? saveError : undefined} value={goalUnit} onChangeText={setGoalUnit} placeholder="Unit" placeholderTextColor={palette.muted} style={[styles.field, styles.measureField]} accessibilityLabel="Optional goal target unit" /></View>
            <PageText style={styles.helper}>Leave both target fields empty for an open-ended goal.</PageText>
          </> : habit ? <>
            <PageText style={styles.fieldLabel}>WHEN WOULD YOU LIKE TO REPEAT IT?</PageText>
            <View style={styles.optionRow}>{(['daily', 'weekdays', 'weekends', 'selected_days'] as const).map((value) => {
              const selected = recurrence === value;
              const label = value === 'selected_days' ? 'Choose days' : value[0].toUpperCase() + value.slice(1);
              return <SquirclePressable pill disabled={pendingSave || saving} key={value} onPress={() => setRecurrence(value)} style={[styles.option, selected && styles.optionSelected]} accessibilityRole="button" accessibilityState={{ selected }}><PageText style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</PageText></SquirclePressable>;
            })}</View>
            {recurrence === 'selected_days' && <View style={styles.daysRow}>{weekdayNames.map((name, day) => {
              const selected = daysOfWeek.includes(day);
              return <SquirclePressable pill disabled={pendingSave || saving} key={name} onPress={() => toggleDay(day)} style={[styles.dayChip, selected && styles.dayChipSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><PageText style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{name}</PageText></SquirclePressable>;
            })}</View>}
            <PageText style={styles.fieldLabel}>HOW WOULD YOU LIKE TO TRACK IT?</PageText>
            <View style={styles.optionRow}>{([{ value: 'boolean', label: 'Done or not done' }, { value: 'quantity', label: 'Amount' }, { value: 'duration', label: 'Duration' }] as const).map(({ value, label }) => {
              const selected = trackingType === value;
              return <SquirclePressable pill disabled={pendingSave || saving} key={value} onPress={() => setTrackingType(value)} style={[styles.option, selected && styles.optionSelected]} accessibilityRole="button" accessibilityState={{ selected }}><PageText style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</PageText></SquirclePressable>;
            })}</View>
            {trackingType !== 'boolean' && <>
              <PageText style={styles.fieldLabel}>OPTIONAL TRACKING TARGET</PageText>
              <View style={styles.measureRow}><TextInput editable={!pendingSave && !saving} label="Target" ref={amountInput} error={invalidField === "amount" ? saveError : undefined} value={targetValue} onChangeText={setTargetValue} placeholder="Amount" keyboardType="decimal-pad" placeholderTextColor={palette.muted} style={[styles.field, styles.measureField]} accessibilityLabel="Optional habit target" /><TextInput editable={!pendingSave && !saving} label="Unit" ref={unitInput} error={invalidField === "unit" ? saveError : undefined} value={targetUnit} onChangeText={setTargetUnit} placeholder={trackingType === 'duration' ? 'Minutes' : 'Unit'} placeholderTextColor={palette.muted} style={[styles.field, styles.measureField]} accessibilityLabel="Optional habit target unit" /></View>
            </>}
            <PageText style={styles.helper}>Recurrence and tracking stay editable from your routine list.</PageText>
          </> : null}

          {saveError ? <Feedback severity="error" message={saveError} /> : null}
          <NativeActionButton label={added ? `Already added to your ${template.kind === 'goal' ? 'goals' : 'habits'}` : `Save to my ${template.kind === 'goal' ? 'goals' : 'habits'}`} systemImage={added ? 'checkmark' : 'arrow.right'} onPress={() => void save()} disabled={saving || added && !pendingSave} style={[styles.action, (saving || added && !pendingSave) && styles.actionDisabled]}>
            <PageText style={styles.actionText}>{added ? 'Already in your routines' : `Save to my ${template.kind === 'goal' ? 'goals' : 'habits'}`}</PageText>
            <AppIcon name={added ? 'check' : 'arrow'} style={visualStyle} size={18} color={added ? green : palette.onInk} />
          </NativeActionButton>
          <NativeActionButton label="Cancel" onPress={() => router.back()} appearance="plain" tintColor={muted} labelColor={muted} style={styles.cancelButton}><PageText style={styles.cancelText}>Cancel</PageText></NativeActionButton>
        </Animated.ScrollView>
        <ProgressiveEdgeBlur edge="bottom" surfaceColor={paper} style={{ zIndex: 8 }} />
        <ProgressiveEdgeBlur edge="top" surfaceColor={paper} startOffset={0.8} scrollProgress={scrollY} revealDistance={headerFadeHeight} style={{ height: topHeaderBlurHeight(headerFadeHeight), zIndex: 9, opacity: 0.95 }} />
        <View pointerEvents="box-none" collapsable={false} renderToHardwareTextureAndroid style={[styles.headerOverlay, { height: headerHeight }]}>
          <View style={[styles.topBar, { marginTop: insets.top }]}>
            <NativeActionButton label="Back" systemImage="chevron.left" iconPlacement="leading" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back"><AppIcon name="back" style={visualStyle} size={19} color={ink} /><PageText style={styles.backText}>Back</PageText></NativeActionButton>
            <View style={styles.topBarBalance} />
          </View>
          <View pointerEvents="none" style={[styles.collapsedPageTitle, { top: insets.top, height: APP_NON_TAB_HEADER_HEIGHT }]}><PageText style={styles.collapsedTitle} numberOfLines={1}>{template.title}</PageText></View>
        </View>
      </View>
    </VisualStyleContext.Provider>
  );
}

function lifeAreaIdForCategory(category: GoalTemplate['category']) {
  const areaIds: Partial<Record<GoalTemplate['category'], string>> = {
    'Health & Fitness': 'health', 'Sleep & Recovery': 'sleep', Productivity: 'productivity', Career: 'career', Learning: 'learning', Finance: 'finance',
    Relationships: 'relationships', 'Personal Development': 'personal_development', 'Mental Wellbeing': 'mental_wellbeing', 'Social Development': 'social', Lifestyle: 'lifestyle', Reading: 'learning',
  };
  return areaIds[category];
}

const createStyles = (palette: AppTheme) => {  const { ink, muted, green, paper } = palette; return StyleSheet.create({
  root: { flex: 1, backgroundColor: paper },
  headerOverlay: { position: 'absolute', zIndex: 20, top: 0, left: 0, right: 0, overflow: 'hidden' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: LayoutSpacing.screenInset },
  topBar: { height: APP_NON_TAB_HEADER_HEIGHT, paddingHorizontal: LayoutSpacing.screenInset, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  backText: { color: ink, fontSize: 13.2, fontWeight: '600' },
  collapsedPageTitle: { position: 'absolute', zIndex: 1, left: 0, right: 0, paddingHorizontal: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  collapsedTitle: { width: '100%', color: ink, fontSize: 20.9 * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 27.5 * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '600', textAlign: 'center' },
  topBarBalance: { width: 78 },
  hero: { minHeight: 102, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 88, height: 88, borderRadius: Radius.hero, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: green, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  kindLabel: { color: muted, fontSize: 9.9, fontWeight: '700', letterSpacing: 1.1, marginTop: 6 },
  title: { color: ink, fontSize: 33 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 40.7 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '500', marginTop: 20 },
  description: { color: muted, fontSize: 16.5, lineHeight: 25.3, marginTop: 9 },
  contextCard: { flexDirection: 'row', gap: LayoutSpacing.related, padding: LayoutSpacing.cardInset, marginTop: LayoutSpacing.section, borderRadius: Radius.card, backgroundColor: palette.warmSurface },
  contextIcon: { width: 34, height: 34, borderRadius: 999, backgroundColor: palette.warmSurface, alignItems: 'center', justifyContent: 'center' },
  contextCopy: { flex: 1, gap: 7 },
  contextLabel: { color: green, fontSize: 9.9, fontWeight: '700', letterSpacing: 1.1 },
  contextText: { color: ink, fontSize: 14.3, lineHeight: 22 },
  sectionLabel: { color: green, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, marginTop: LayoutSpacing.section, marginBottom: LayoutSpacing.control },
  fieldLabel: { color: green, fontSize: 9.9, fontWeight: '700', letterSpacing: 1.1, marginTop: 15, marginBottom: 7 },
  field: { minHeight: 48, paddingHorizontal: 13, borderRadius: Radius.control, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, color: ink, fontSize: 14.3 },
  multilineField: { minHeight: 78, paddingTop: 12, lineHeight: 20 },
  measureRow: { flexDirection: 'row', gap: 8 },
  measureField: { flex: 1 },
  helper: { color: muted, fontSize: 11.5, lineHeight: 17, marginTop: 7 },
  optionRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  option: { minHeight: 38, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: palette.lightGreen },
  optionSelected: { backgroundColor: palette.green },
  optionText: { color: muted, fontSize: 11.5, fontWeight: '500' },
  optionTextSelected: { color: palette.onAccent },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  dayChip: { minWidth: 40, minHeight: 44, paddingHorizontal: 8, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.lightGreen },
  dayChipSelected: { backgroundColor: palette.green },
  dayChipText: { color: muted, fontSize: 11.5, fontWeight: '500' },
  dayChipTextSelected: { color: palette.onAccent },
  action: { minHeight: 54, marginTop: 22, paddingHorizontal: 18, borderRadius: 999, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionDisabled: { opacity: 0.48 },
  actionText: { color: palette.onAccent, fontSize: 14.3, fontWeight: '600' },
  cancelButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: muted, fontSize: 13.2 },
}); };
