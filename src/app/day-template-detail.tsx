import { Feedback } from '@/components/app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, type AppTheme } from '@/constants/theme';
import { useMemo, useState, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { AppIcon } from '../components/app-icon';
import { PageText } from '../features/home/page-text';
import { NON_TAB_HEADER_TITLE_SCALE, PAGE_HEADING_SCALE } from '../features/home/layout-metrics';
import { VisualStyleContext } from '../features/home/visual-style-context';
import { useHomeSession } from '../features/home/home-session';
import { type DaySchedule, type DayScheduleBlock } from '../features/home/day-schedules';
import { scheduleTemplates } from '../features/templates/catalog';
import { createOccurrenceId } from '../features/home/occurrences';
import NativeActionButton from '../components/native-action-button';
import { AppTextInput as TextInput } from '../components/app-text-input';
import { ProgressiveEdgeBlur } from '../components/progressive-edge-blur';
import { APP_STANDARD_HEADER_HEIGHT, scaleHeaderBlurIntensity, scaleHeaderGradientHeight } from '../components/header-gradient-metrics';
import { posthog } from '../lib/posthog';






export default function DayTemplateDetailScreen() {
  const palette = useTheme();  const { ink, muted, green, paper } = palette; const styles = useThemedStyles(createStyles);
  const { id, routineId } = useLocalSearchParams<{ id: string; routineId?: string }>();
  const { visualStyle, daySchedules, setDaySchedules, confirmLocalSave, storageStatus, retrySave } = useHomeSession();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const headerHeight = insets.top + APP_STANDARD_HEADER_HEIGHT;
  const collapseDistance = 42;
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const expandedTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseDistance * 0.6, collapseDistance], [1, 0.45, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, collapseDistance], [0, -6], Extrapolation.CLAMP) }],
  }), [collapseDistance]);
  const collapsedTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapseDistance * 0.4, collapseDistance * 0.8, collapseDistance], [0, 0.75, 1], Extrapolation.CLAMP),
  }), [collapseDistance]);
  const base = useMemo(() => scheduleTemplates.find((item) => item.id === id), [id]);
  const [newSchedule] = useState<DaySchedule>(() => { const weekday = new Date().getDay(); const weekend = weekday === 0 || weekday === 6; return { id: `routine-${Date.now()}`, dayType: weekend ? 'weekend' : 'weekday', daysOfWeek: [weekday], title: 'My routine', blocks: [] }; });
  const existingRoutine = daySchedules.find((item) => item.id === routineId)
    ?? daySchedules.find((item) => item.sourceTemplateId === id)
    ?? daySchedules.find((item) => item.id === id);
  const schedule = existingRoutine ?? (base ? { ...base, daysOfWeek: base.daysOfWeek ?? (base.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]) } : id === 'new' ? newSchedule : undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [invalidField, setInvalidField] = useState('');
  const titleInput = useRef<import('react-native').TextInput>(null);
  const blockInputs = useRef<Record<string, import('react-native').TextInput | null>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DaySchedule | null>(id === 'new' ? newSchedule : null);
  const [editing, setEditing] = useState(id === 'new');
  const isNewRoutine = id === 'new';
  const isTemplateRoutine = Boolean(base && id !== 'new');
  const applied = Boolean(schedule && daySchedules.some((item) => item.id === schedule.id));
  if (!schedule) return <View style={styles.root}><PageText display style={styles.title}>Routine not found</PageText><NativeActionButton label="Go back" onPress={() => router.back()} appearance="plain" tintColor={ink} labelColor={ink} style={styles.backButton}><PageText style={styles.backText}>Go back</PageText></NativeActionButton></View>;
  const activeSchedule = editing && draft ? draft : schedule;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activeDays = activeSchedule.daysOfWeek ?? (activeSchedule.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]);
  const dayLabel = activeDays.map((day) => dayNames[day]).join(' · ') || 'No days selected';
  const canApply = activeSchedule.title.trim().length > 0 && activeDays.length > 0 && activeSchedule.blocks.length > 0 && activeSchedule.blocks.every((block) => block.title.trim().length > 0 && (block.targetValue == null || (Number.isFinite(block.targetValue) && block.targetValue > 0 && !!block.targetUnit?.trim())));
  const startEditing = () => {
    setDraft({ ...schedule, daysOfWeek: schedule.daysOfWeek ?? (schedule.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]), blocks: schedule.blocks.map((block) => ({ ...block })) });
    setEditing(true);
  };
  const updateBlock = (blockId: string, field: keyof DayScheduleBlock, value: string) => {
    setDraft((current) => current ? { ...current, blocks: current.blocks.map((block) => block.id === blockId ? { ...block, [field]: field === 'targetValue' ? (value.trim() ? Number(value) : undefined) : value } : block) } : current);
  };
  const toggleScheduleDay = (day: number) => setDraft((current) => current ? { ...current, daysOfWeek: (current.daysOfWeek ?? []).includes(day) ? current.daysOfWeek!.filter((item) => item !== day) : [...(current.daysOfWeek ?? []), day].sort() } : current);
  const addBlock = () => setDraft((current) => current ? { ...current, blocks: [...current.blocks, { id: `custom-${Date.now()}`, time: '', title: '', details: '' }] } : current);
  const removeBlock = (blockId: string) => setDraft((current) => current ? { ...current, blocks: current.blocks.filter((block) => block.id !== blockId) } : current);
  const cancelEditing = () => { setDraft(null); setEditing(false); };
  const apply = async () => {
    if (saving) return;
    if (!canApply) {
      const invalidBlock = activeSchedule.blocks.find((block) => !block.title.trim() || block.targetValue != null && (!Number.isFinite(block.targetValue) || block.targetValue <= 0 || !block.targetUnit?.trim()));
      const field = !activeSchedule.title.trim() ? 'title' : !activeDays.length ? 'days' : !activeSchedule.blocks.length ? 'blocks' : invalidBlock ? `${invalidBlock.id}-${!invalidBlock.title.trim() ? 'title' : !Number.isFinite(invalidBlock.targetValue) || (invalidBlock.targetValue ?? 0) <= 0 ? 'target' : 'unit'}` : 'blocks';
      setInvalidField(field);
      setSaveError(field === 'title' ? 'Enter a routine name.' : field === 'days' ? 'Choose at least one repeat day.' : field === 'blocks' ? 'Add at least one action.' : field.endsWith('-title') ? 'Give this action a name.' : field.endsWith('-target') ? 'Enter a target greater than zero.' : 'Add a unit, such as pages or minutes.');
      if (field === 'title') titleInput.current?.focus();
      else blockInputs.current[field]?.focus();
      return;
    }
    setInvalidField(''); setSaveError('');
    setSaving(true);
    const selectedSchedule = editing && draft ? draft : schedule;
    const savedSchedule: DaySchedule = {
      ...selectedSchedule,
      id: isNewRoutine ? selectedSchedule.id : isTemplateRoutine ? existingRoutine?.id ?? pendingId ?? createOccurrenceId('routine') : selectedSchedule.id,
      sourceTemplateId: isTemplateRoutine ? base?.id : selectedSchedule.sourceTemplateId,
      daysOfWeek: selectedSchedule.daysOfWeek ?? (selectedSchedule.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]),
      blocks: selectedSchedule.blocks.map((block) => ({ ...block })),
    };
    setPendingId(savedSchedule.id);
    setDaySchedules((current) => [...current.filter((item) => item.id !== savedSchedule.id), savedSchedule]);
    try {
      if (storageStatus === 'save-error') retrySave();
      await confirmLocalSave();
    } catch {
      setSaveError('Could not save on this device. Your edits are still here. Try saving again.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setDraft(null);
    setEditing(false);
    posthog?.capture('routine_saved', {
      action: isNewRoutine ? 'created' : applied ? 'updated' : 'added',
      source: isTemplateRoutine ? 'template' : 'custom',
      day_type: savedSchedule.dayType,
      block_count: savedSchedule.blocks.length,
      scheduled_day_count: savedSchedule.daysOfWeek?.length ?? 0,
    });
    router.back();
  };
  return (
    <VisualStyleContext.Provider value={visualStyle}>
      <View style={styles.root}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: headerHeight, paddingBottom: Math.max(insets.bottom, 20) + 28 }]}>
          <Link.AppleZoomTarget><View collapsable={false} style={styles.hero}><View style={styles.heroIcon}><AppIcon name={activeSchedule.dayType === 'weekday' ? 'clock' : 'sun'} style={visualStyle} size={31} color={green} /></View><PageText style={styles.eyebrow}>{dayLabel}</PageText></View></Link.AppleZoomTarget>
          {editing && draft ? <TextInput ref={titleInput} error={invalidField === "title" ? saveError : undefined} editable={!saving} value={draft.title} onChangeText={(value) => setDraft((current) => current ? { ...current, title: value } : current)} placeholder="Name this routine" placeholderTextColor={muted} style={styles.titleInput} accessibilityLabel="Routine title" /> : <PageText display style={styles.title}>{activeSchedule.title}</PageText>}
          <PageText style={styles.intro}>This routine repeats on {dayLabel}. Edit its actions before saving.</PageText>
          {editing && draft && <View style={styles.daysEditor}><PageText style={styles.blockNumber}>REPEATS ON</PageText><View style={styles.daysRow}>{dayNames.map((name, index) => { const selected = activeDays.includes(index); return <Pressable disabled={saving} key={name} onPress={() => toggleScheduleDay(index)} style={[styles.dayChip, selected && styles.dayChipSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><PageText style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{name}</PageText></Pressable>; })}</View></View>}
          <View style={styles.blocks}>{activeSchedule.blocks.map((block, index) => <View key={block.id} style={[styles.block, index === activeSchedule.blocks.length - 1 && styles.blockLast]}>
            {editing ? <View style={styles.editBlock}>
              <View style={styles.editBlockHeading}><PageText style={styles.blockNumber}>BLOCK {index + 1}</PageText><NativeActionButton label="Remove" systemImage="trash" onPress={() => removeBlock(block.id)} appearance="plain" tintColor={muted} labelColor={muted} accessibilityLabel={`Remove ${block.title || `block ${index + 1}`}`}><PageText style={styles.removeText}>Remove</PageText></NativeActionButton></View>
              <TextInput editable={!saving} value={block.time} onChangeText={(value) => updateBlock(block.id, 'time', value)} placeholder="Time range" placeholderTextColor={muted} style={styles.timeInput} accessibilityLabel={`Time for block ${index + 1}`} />
              <TextInput ref={(input) => { blockInputs.current[`${block.id}-title`] = input; }} error={invalidField === `${block.id}-title` ? saveError : undefined} editable={!saving} value={block.title} onChangeText={(value) => updateBlock(block.id, 'title', value)} placeholder="Activity" placeholderTextColor={muted} style={styles.activityInput} accessibilityLabel={`Activity for block ${index + 1}`} />
              <TextInput editable={!saving} value={block.details} onChangeText={(value) => updateBlock(block.id, 'details', value)} placeholder="Details or notes" placeholderTextColor={muted} multiline textAlignVertical="top" style={styles.detailsInput} accessibilityLabel={`Details for block ${index + 1}`} />
              <View style={styles.measureRow}><TextInput ref={(input) => { blockInputs.current[`${block.id}-target`] = input; }} error={invalidField === `${block.id}-target` ? saveError : undefined} editable={!saving} value={block.targetValue == null ? '' : String(block.targetValue)} onChangeText={(value) => updateBlock(block.id, 'targetValue', value)} placeholder="Target (optional)" keyboardType="decimal-pad" placeholderTextColor={muted} style={styles.metricInput} accessibilityLabel={`Target for ${block.title}`} /><TextInput ref={(input) => { blockInputs.current[`${block.id}-unit`] = input; }} error={invalidField === `${block.id}-unit` ? saveError : undefined} editable={!saving} value={block.targetUnit ?? ''} onChangeText={(value) => updateBlock(block.id, 'targetUnit', value)} placeholder="Unit (cups, km)" placeholderTextColor={muted} style={styles.metricInput} accessibilityLabel={`Target unit for ${block.title}`} /></View>
            </View> : <><PageText style={styles.time}>{block.time}</PageText><View style={styles.divider} /><View style={styles.blockCopy}><PageText display style={styles.blockTitle}>{block.title}</PageText><PageText style={styles.details}>{block.details}</PageText></View></>}
          </View>)}</View>
          {editing ? <NativeActionButton label="Add a time block" systemImage="plus" iconPlacement="leading" appearance="bordered" tintColor={green} labelColor={green} onPress={addBlock} style={styles.addBlockButton}><AppIcon name="add" style={visualStyle} size={17} color={green} /><PageText style={styles.editButtonText}>Add a time block</PageText></NativeActionButton> : <NativeActionButton label="Edit this routine" systemImage="calendar" iconPlacement="leading" appearance="plain" tintColor={green} labelColor={green} onPress={startEditing} style={styles.editButton}><AppIcon name="calendar" style={visualStyle} size={17} color={green} /><PageText style={styles.editButtonText}>Edit this routine</PageText></NativeActionButton>}
          {editing && <NativeActionButton label="Cancel edits" onPress={cancelEditing} appearance="plain" tintColor={muted} labelColor={muted} style={styles.cancelButton}><PageText style={styles.cancelText}>Cancel edits</PageText></NativeActionButton>}
          {saveError ? <Feedback severity="error" message={saveError} /> : null}
          <NativeActionButton label={isNewRoutine ? 'Create routine' : applied ? 'Save routine changes' : isTemplateRoutine ? 'Save this routine' : 'Use routine & add checklist'} systemImage="checkmark" onPress={() => void apply()} disabled={saving} style={[styles.action, applied && styles.actionAdded, saving && styles.disabledAction]}><PageText style={[styles.actionText, applied && styles.actionTextAdded]}>{isNewRoutine ? 'Create routine' : applied ? 'Save routine changes' : isTemplateRoutine ? 'Save this routine' : 'Use routine & add checklist'}</PageText><AppIcon name="check" style={visualStyle} size={18} color={applied ? green : palette.onInk} /></NativeActionButton>
        </Animated.ScrollView>
        <ProgressiveEdgeBlur edge="top" surfaceColor={paper} intensity={scaleHeaderBlurIntensity(75)} style={{ height: scaleHeaderGradientHeight(headerHeight + 40), zIndex: 9, opacity: 0.95 }} />
        <View pointerEvents="box-none" style={[styles.headerOverlay, { height: headerHeight }]}>
          <View style={[styles.topBar, { marginTop: insets.top }]}>
            <NativeActionButton label="Back" systemImage="chevron.left" iconPlacement="leading" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back"><AppIcon name="back" style={visualStyle} size={19} color={ink} /><PageText style={styles.backText}>Back</PageText></NativeActionButton>
            <Animated.View pointerEvents="none" style={[styles.expandedPageTitle, expandedTitleStyle]}><PageText preserveDisplaySize style={styles.topBarTitle}>FULL-DAY RHYTHM</PageText></Animated.View>
            <Animated.View pointerEvents="none" style={[styles.collapsedPageTitle, collapsedTitleStyle]}><PageText preserveDisplaySize style={styles.collapsedTitle} numberOfLines={1}>{activeSchedule.title}</PageText></Animated.View>
            <View style={styles.topBarBalance} />
          </View>
        </View>
      </View>
    </VisualStyleContext.Provider>
  );
}

const createStyles = (palette: AppTheme) => {  const { ink, muted, green, paper } = palette; return StyleSheet.create({
  root: { flex: 1, backgroundColor: paper },
  headerOverlay: { position: 'absolute', zIndex: 10, top: 0, left: 0, right: 0, overflow: 'hidden' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: LayoutSpacing.screenInset },
  topBar: { height: APP_STANDARD_HEADER_HEIGHT, paddingHorizontal: LayoutSpacing.screenInset, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  backText: { color: ink, fontSize: 13.2, fontWeight: '600' },
  expandedPageTitle: { position: 'absolute', left: 94, right: 94, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  collapsedPageTitle: { position: 'absolute', left: 94, right: 94, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { color: muted, fontFamily: 'Satoshi', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  collapsedTitle: { color: ink, fontSize: 20.9 * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 27.5 * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '600' },
  topBarBalance: { width: 78 },
  hero: { minHeight: 102, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 88, height: 88, borderRadius: 27, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: green, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  title: { color: ink, fontSize: 33 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 40.7 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '500', marginTop: 20 },
  titleInput: { minHeight: 58, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, color: ink, fontSize: 24.2 * NON_TAB_HEADER_TITLE_SCALE, marginTop: 20 },
  intro: { color: muted, fontSize: 14.3, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  blocks: { paddingHorizontal: 0 },
  daysEditor: { marginBottom: 16, paddingVertical: 10, gap: 10 },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, dayChip: { minWidth: 41, minHeight: 44, paddingHorizontal: 8, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.lightGreen }, dayChipSelected: { backgroundColor: palette.green }, dayChipText: { color: muted, fontSize: 12.1, fontWeight: '500' }, dayChipTextSelected: { color: palette.onAccent },
  block: { minHeight: 78, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  blockLast: { borderBottomWidth: 0 },
  time: { width: 90, color: green, fontSize: 9.9, lineHeight: 16.5, fontWeight: '600' },
  divider: { width: 3, minHeight: 45, borderRadius: 99, backgroundColor: palette.lightGreen },
  blockCopy: { flex: 1, gap: 4 },
  blockTitle: { color: ink, fontSize: 15.4, lineHeight: 20.9, fontWeight: '500' },
  details: { color: muted, fontSize: 12.1, lineHeight: 17.6 },
  editBlock: { flex: 1, gap: 8 },
  editBlockHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockNumber: { color: green, fontSize: 9.9, fontWeight: '700', letterSpacing: 1.1 },
  removeText: { color: palette.muted, fontSize: 12.1 },
  timeInput: { minHeight: 42, paddingHorizontal: 11, borderRadius: 12, backgroundColor: palette.lightGreen, color: muted, fontSize: 13.2 },
  activityInput: { minHeight: 46, paddingHorizontal: 11, borderRadius: 12, backgroundColor: palette.lightGreen, color: ink, fontSize: 16.5 },
  detailsInput: { minHeight: 76, paddingHorizontal: 11, paddingTop: 10, borderRadius: 12, backgroundColor: palette.lightGreen, color: muted, fontSize: 13.2, lineHeight: 19.8 },
  measureRow: { flexDirection: 'row', gap: 8 }, metricInput: { flex: 1, minHeight: 44, paddingHorizontal: 11, borderRadius: 12, backgroundColor: palette.lightGreen, color: ink, fontSize: 13.2 },
  editButton: { minHeight: 48, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBlockButton: { minHeight: 48, marginTop: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButtonText: { color: green, fontSize: 13.2, fontWeight: '600' },
  cancelButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: muted, fontSize: 13.2 },
  action: { minHeight: 54, marginTop: 20, paddingHorizontal: 18, borderRadius: 999, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disabledAction: { opacity: 0.45 },
  actionAdded: { backgroundColor: palette.lightGreen },
  actionText: { color: palette.onAccent, fontSize: 14.3, fontWeight: '600' },
  actionTextAdded: { color: green },
}); };
