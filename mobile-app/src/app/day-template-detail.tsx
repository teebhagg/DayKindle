import { Feedback } from '@/components/app-feedback';
import { SHEET_SNAP_POINTS } from '@/components/sheet-snap-points';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { useMemo, useState, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { BottomSheet, BottomSheetScrollView, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, LinearTransition, useAnimatedScrollHandler, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { AppIcon } from '../components/app-icon';
import { AnimatedSquircleView, SquirclePressable, SquircleView } from '../components/squircle-card';
import { PageText } from '../features/home/page-text';
import { NON_TAB_HEADER_TITLE_SCALE, PAGE_HEADING_SCALE } from '../features/home/layout-metrics';
import { VisualStyleContext } from '../features/home/visual-style-context';
import { useHomeSession } from '../features/home/home-session';
import { type DaySchedule, type DayScheduleBlock } from '../features/home/day-schedules';
import { useDailyPlanTemplates } from '../features/home/daily-plan-provider';
import { createOccurrenceId } from '../features/home/occurrences';
import { AI_ROUTINE_PROMPT, parseAiRoutineResponse } from '../features/home/ai-routine-import';
import NativeActionButton from '../components/native-action-button';
import { AppTextInput as TextInput } from '../components/app-text-input';
import { ProgressiveEdgeBlur } from '../components/progressive-edge-blur';
import { APP_HEADER_FADE_CONTENT_HEIGHT, APP_NON_TAB_HEADER_HEIGHT, APP_HEADER_BAR_HEIGHT, IOS_TITLE_OPTICAL_PADDING_BOTTOM, topHeaderBlurHeight } from '../components/header-gradient-metrics';
import { posthog } from '../lib/posthog';
import { UI_MOTION } from '../constants/motion';






type RoutineBlockEditor = {
  id: string;
  mode: 'add' | 'edit';
  time: string;
  title: string;
  details: string;
  targetValue: string;
  targetUnit: string;
};

function createRoutineBlockEditor(block?: DayScheduleBlock): RoutineBlockEditor {
  return {
    id: block?.id ?? createOccurrenceId('routine-block'),
    mode: block ? 'edit' : 'add',
    time: block?.time ?? '',
    title: block?.title ?? '',
    details: block?.details ?? '',
    targetValue: block?.targetValue == null ? '' : String(block.targetValue),
    targetUnit: block?.targetUnit ?? '',
  };
}

export default function DayTemplateDetailScreen() {
  const palette = useTheme();  const { ink, muted, green, paper } = palette; const styles = useThemedStyles(createStyles);
  const { id, routineId } = useLocalSearchParams<{ id: string; routineId?: string }>();
  const { visualStyle, daySchedules, setDaySchedules, confirmLocalSave, storageStatus, retrySave } = useHomeSession();
  const scheduleTemplates = useDailyPlanTemplates();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const blockLayout = LinearTransition.duration(reduceMotion ? 0 : UI_MOTION.layoutMs).easing(Easing.out(Easing.cubic));
  const headerHeight = insets.top + APP_NON_TAB_HEADER_HEIGHT;
  const headerFadeHeight = insets.top + APP_HEADER_FADE_CONTENT_HEIGHT;
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const base = useMemo(() => scheduleTemplates.find((item) => item.id === id), [id, scheduleTemplates]);
  const [newSchedule] = useState<DaySchedule>(() => { const weekday = new Date().getDay(); const weekend = weekday === 0 || weekday === 6; return { id: `routine-${Date.now()}`, dayType: weekend ? 'weekend' : 'weekday', daysOfWeek: [weekday], title: 'My routine', blocks: [] }; });
  const existingRoutine = daySchedules.find((item) => item.id === routineId)
    ?? daySchedules.find((item) => item.sourceTemplateId === id)
    ?? daySchedules.find((item) => item.id === id);
  const schedule = existingRoutine ?? (base ? { ...base, daysOfWeek: base.daysOfWeek ?? (base.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]) } : id === 'new' ? newSchedule : undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [invalidField, setInvalidField] = useState('');
  const titleInput = useRef<import('react-native').TextInput>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DaySchedule | null>(id === 'new' ? newSchedule : null);
  const [editing, setEditing] = useState(id === 'new');
  const [blockEditor, setBlockEditor] = useState<RoutineBlockEditor | null>(null);
  const [blockEditorError, setBlockEditorError] = useState('');
  const [generatedRoutineText, setGeneratedRoutineText] = useState('');
  const [routineImportError, setRoutineImportError] = useState('');
  const [routineImportNotice, setRoutineImportNotice] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPromptExample, setShowPromptExample] = useState(false);
  const isNewRoutine = id === 'new';
  const isTemplateRoutine = Boolean(base && id !== 'new');
  const applied = Boolean(schedule && daySchedules.some((item) => item.id === schedule.id));
  if (!schedule) return <SquircleView style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: LayoutSpacing.screenInset }]}><PageText display heading style={styles.title}>Routine not found</PageText><NativeActionButton label="Go back" onPress={() => router.back()} appearance="plain" tintColor={ink} labelColor={ink} style={styles.backButton}><PageText style={styles.backText}>Go back</PageText></NativeActionButton></SquircleView>;
  const activeSchedule = editing && draft ? draft : schedule;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activeDays = activeSchedule.daysOfWeek ?? (activeSchedule.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]);
  const dayLabel = activeDays.length === 7 && new Set(activeDays).size === 7 ? 'Every day' : activeDays.map((day) => dayNames[day]).join(' · ') || 'No days selected';
  const canApply = activeSchedule.title.trim().length > 0 && activeDays.length > 0 && activeSchedule.blocks.length > 0 && activeSchedule.blocks.every((block) => block.title.trim().length > 0 && (block.targetValue == null || (Number.isFinite(block.targetValue) && block.targetValue > 0 && !!block.targetUnit?.trim())));
  const copyAiRoutinePrompt = async () => {
    try {
      await Clipboard.setStringAsync(AI_ROUTINE_PROMPT);
      setPromptCopied(true);
      setRoutineImportError('');
      setRoutineImportNotice('Prompt copied. Add your details in your AI assistant, then paste its JSON reply here.');
    } catch {
      setRoutineImportError('Could not copy the prompt. You can show it below and copy the text manually.');
    }
  };
  const importAiRoutine = () => {
    const result = parseAiRoutineResponse(generatedRoutineText);
    if (!result.ok) {
      setRoutineImportError(result.message);
      setRoutineImportNotice('');
      return;
    }
    setDraft((current) => current ? {
      ...current,
      title: result.routine.title,
      dayType: result.routine.dayType,
      daysOfWeek: [...result.routine.daysOfWeek],
      blocks: result.routine.blocks.map((block) => ({ ...block, id: createOccurrenceId('routine-block') })),
    } : current);
    setGeneratedRoutineText('');
    setRoutineImportError('');
    setRoutineImportNotice(`${result.routine.blocks.length} routine blocks added. Review and edit them below before saving.`);
  };
  const startEditing = () => {
    setDraft({ ...schedule, daysOfWeek: schedule.daysOfWeek ?? (schedule.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]), blocks: schedule.blocks.map((block) => ({ ...block })) });
    setEditing(true);
  };
  const openAddBlock = () => {
    setBlockEditorError('');
    setSaveError('');
    setInvalidField('');
    setBlockEditor(createRoutineBlockEditor());
  };
  const openEditBlock = (block: DayScheduleBlock) => {
    setBlockEditorError('');
    setSaveError('');
    setInvalidField('');
    setBlockEditor(createRoutineBlockEditor(block));
  };
  const closeBlockEditor = () => {
    setBlockEditor(null);
    setBlockEditorError('');
  };
  const updateBlockEditor = (field: 'time' | 'title' | 'details' | 'targetValue' | 'targetUnit', value: string) => {
    setBlockEditor((current) => current ? { ...current, [field]: value } : current);
    setBlockEditorError('');
  };
  const saveBlockEditor = () => {
    if (!blockEditor || !draft) return;
    const title = blockEditor.title.trim();
    if (!title) {
      setBlockEditorError('Give this activity a name.');
      return;
    }
    const targetValueText = blockEditor.targetValue.trim();
    const targetValue = targetValueText ? Number(targetValueText) : undefined;
    if (targetValue != null && (!Number.isFinite(targetValue) || targetValue <= 0)) {
      setBlockEditorError('Enter a target greater than zero.');
      return;
    }
    const targetUnit = blockEditor.targetUnit.trim();
    if (targetValue != null && !targetUnit) {
      setBlockEditorError('Add a unit for this target.');
      return;
    }
    const savedBlock: DayScheduleBlock = {
      id: blockEditor.id,
      time: blockEditor.time.trim(),
      title,
      details: blockEditor.details.trim(),
      targetValue,
      targetUnit: targetValue == null ? undefined : targetUnit,
    };
    setDraft((current) => current ? {
      ...current,
      blocks: blockEditor.mode === 'edit'
        ? current.blocks.map((block) => block.id === savedBlock.id ? savedBlock : block)
        : [...current.blocks, savedBlock],
    } : current);
    setInvalidField('');
    setSaveError('');
    closeBlockEditor();
  };
  const toggleScheduleDay = (day: number) => setDraft((current) => current ? { ...current, daysOfWeek: (current.daysOfWeek ?? []).includes(day) ? current.daysOfWeek!.filter((item) => item !== day) : [...(current.daysOfWeek ?? []), day].sort() } : current);
  const removeBlock = (blockId: string) => setDraft((current) => current ? { ...current, blocks: current.blocks.filter((block) => block.id !== blockId) } : current);
  const cancelEditing = () => { closeBlockEditor(); setDraft(null); setEditing(false); };
  const apply = async () => {
    if (saving) return;
    if (!canApply) {
      const invalidBlock = activeSchedule.blocks.find((block) => !block.title.trim() || block.targetValue != null && (!Number.isFinite(block.targetValue) || block.targetValue <= 0 || !block.targetUnit?.trim()));
      if (!activeSchedule.title.trim()) {
        setInvalidField('title');
        setSaveError('Enter a routine name.');
        titleInput.current?.focus();
      } else if (!activeDays.length) {
        setInvalidField('days');
        setSaveError('Choose at least one repeat day.');
      } else if (!activeSchedule.blocks.length) {
        openAddBlock();
      } else if (invalidBlock) {
        setSaveError('');
        setBlockEditor(createRoutineBlockEditor(invalidBlock));
        setBlockEditorError(!invalidBlock.title.trim()
          ? 'Give this activity a name.'
          : !Number.isFinite(invalidBlock.targetValue) || (invalidBlock.targetValue ?? 0) <= 0
            ? 'Enter a target greater than zero.'
            : 'Add a unit for this target.');
      }
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
      <SquircleView style={styles.root}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: headerHeight, paddingBottom: Math.max(insets.bottom, 20) + 28 }]}>
          <Link.AppleZoomTarget><SquircleView collapsable={false} style={styles.hero}><SquircleView style={styles.heroIcon}><AppIcon name={activeSchedule.dayType === 'weekday' ? 'clock' : 'sun'} style={visualStyle} size={31} color={green} /></SquircleView><PageText style={styles.eyebrow}>{dayLabel}</PageText></SquircleView></Link.AppleZoomTarget>
          {editing && draft ? <TextInput ref={titleInput} error={invalidField === "title" ? saveError : undefined} editable={!saving} value={draft.title} onChangeText={(value) => setDraft((current) => current ? { ...current, title: value } : current)} placeholder="Name this routine" placeholderTextColor={muted} style={styles.titleInput} accessibilityLabel="Routine title" /> : <PageText display heading style={styles.title}>{activeSchedule.title}</PageText>}
          <PageText style={styles.intro}>This routine repeats on {dayLabel}. Edit its actions before saving.</PageText>
          {isNewRoutine && editing && <SquircleView style={styles.aiRoutineSection}>
            <SquircleView style={styles.aiRoutineHeading}><AppIcon name="sparkle" style={visualStyle} size={17} color={green} /><PageText style={styles.aiRoutineEyebrow}>OPTIONAL · ANY AI ASSISTANT</PageText></SquircleView>
            <PageText display heading={false} style={styles.aiRoutineTitle}>Build a routine from your day</PageText>
            <PageText style={styles.aiRoutineDescription}>Copy the prompt, add your details in your AI assistant, then paste its JSON reply below. You can edit every block before saving.</PageText>
            <SquircleView style={styles.aiRoutineActions}>
              <NativeActionButton label={promptCopied ? 'Prompt copied' : 'Copy prompt'} onPress={() => void copyAiRoutinePrompt()} appearance="bordered" tintColor={green} labelColor={green} style={styles.aiRoutineButton}><PageText style={styles.aiRoutineButtonText}>{promptCopied ? 'Prompt copied' : 'Copy prompt'}</PageText></NativeActionButton>
              <NativeActionButton label={showPromptExample ? 'Hide example' : 'View example'} onPress={() => setShowPromptExample((visible) => !visible)} appearance="plain" tintColor={green} labelColor={green} style={styles.aiRoutineButton}><PageText style={styles.aiRoutineButtonText}>{showPromptExample ? 'Hide example' : 'View example'}</PageText></NativeActionButton>
            </SquircleView>
            {showPromptExample && <SquircleView style={styles.aiPromptSurface}><PageText selectable style={styles.aiPromptExample}>{AI_ROUTINE_PROMPT}</PageText></SquircleView>}
            <PageText style={styles.blockNumber}>PASTE THE AI RESPONSE</PageText>
            <TextInput multiline value={generatedRoutineText} onChangeText={(value) => { setGeneratedRoutineText(value); setRoutineImportError(''); setRoutineImportNotice(''); }} placeholder="Paste the JSON response here" placeholderTextColor={muted} textAlignVertical="top" autoCapitalize="none" autoCorrect={false} maxLength={24000} style={styles.aiRoutineInput} accessibilityLabel="Paste AI generated routine JSON" />
            <NativeActionButton label="Build my routine" onPress={importAiRoutine} disabled={!generatedRoutineText.trim()} appearance="prominent" tintColor={green} labelColor={palette.onAccent} style={[styles.aiRoutineSubmit, !generatedRoutineText.trim() && styles.aiRoutineSubmitDisabled]}><PageText style={styles.aiRoutineSubmitText}>Build my routine</PageText></NativeActionButton>
            {routineImportError ? <Feedback severity="error" message={routineImportError} /> : null}
            {routineImportNotice ? <PageText style={styles.aiRoutineNotice}>{routineImportNotice}</PageText> : null}
          </SquircleView>}
          {editing && draft && <SquircleView style={styles.daysEditor}><PageText style={styles.blockNumber}>REPEATS ON</PageText><SquircleView style={styles.daysRow}>{dayNames.map((name, index) => { const selected = activeDays.includes(index); return <SquirclePressable disabled={saving} key={name} onPress={() => toggleScheduleDay(index)} style={[styles.dayChip, selected && styles.dayChipSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><PageText style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{name}</PageText></SquirclePressable>; })}</SquircleView></SquircleView>}
          <SquircleView style={[styles.blocks, editing && styles.editBlocks]}>
            {editing && <SquircleView style={styles.blockListHeading}><PageText style={styles.blockNumber}>TIME BLOCKS</PageText><PageText style={styles.blockCount}>{activeSchedule.blocks.length} added</PageText></SquircleView>}
            {editing && activeSchedule.blocks.length === 0 && <SquircleView style={styles.emptyBlocks}><PageText style={styles.emptyBlocksTitle}>No time blocks yet</PageText><PageText style={styles.emptyBlocksDescription}>Add a time and activity to start shaping this routine.</PageText></SquircleView>}
            {activeSchedule.blocks.map((block, index) => editing ? (
              <AnimatedSquircleView key={block.id} entering={reduceMotion ? FadeIn.duration(0) : FadeInUp.duration(UI_MOTION.contentEnterMs).withInitialValues({ opacity: 0.82, transform: [{ translateY: 3 }] })} exiting={reduceMotion ? FadeOut.duration(0) : FadeOut.duration(UI_MOTION.contentExitMs)} layout={blockLayout} style={styles.editBlockCard}>
                <SquircleView style={styles.editBlockCardCopy}>
                  <PageText style={styles.editBlockTime}>{block.time.trim() || 'Flexible time'}</PageText>
                  <PageText display heading={false} style={styles.editBlockTitle} numberOfLines={2}>{block.title}</PageText>
                  {block.details.trim() ? <PageText style={styles.editBlockDetails} numberOfLines={2}>{block.details}</PageText> : null}
                  {block.targetValue != null ? <PageText style={styles.editBlockTarget}>Target: {block.targetValue} {block.targetUnit}</PageText> : null}
                </SquircleView>
                <SquircleView style={styles.blockCardActions}>
                  <NativeActionButton label="Edit block" onPress={() => openEditBlock(block)} appearance="plain" tintColor={green} labelColor={green} style={styles.blockCardAction} accessibilityLabel={`Edit ${block.title}`}><PageText style={styles.blockCardEditText}>Edit</PageText></NativeActionButton>
                  <NativeActionButton label="Remove block" onPress={() => removeBlock(block.id)} appearance="plain" tintColor={muted} labelColor={muted} style={styles.blockCardAction} accessibilityLabel={`Remove ${block.title}`}><PageText style={styles.removeText}>Remove</PageText></NativeActionButton>
                </SquircleView>
              </AnimatedSquircleView>
            ) : (
              <AnimatedSquircleView key={block.id} entering={reduceMotion ? FadeIn.duration(0) : FadeInUp.duration(UI_MOTION.contentEnterMs).withInitialValues({ opacity: 0.82, transform: [{ translateY: 3 }] })} exiting={reduceMotion ? FadeOut.duration(0) : FadeOut.duration(UI_MOTION.contentExitMs)} layout={blockLayout} style={[styles.block, index === activeSchedule.blocks.length - 1 && styles.blockLast]}><PageText style={styles.time}>{block.time}</PageText><SquircleView style={styles.divider} /><SquircleView style={styles.blockCopy}><PageText display heading={false} style={styles.blockTitle}>{block.title}</PageText><PageText style={styles.details}>{block.details}</PageText></SquircleView></AnimatedSquircleView>
            ))}
          </SquircleView>
          {editing ? <NativeActionButton label="Add a time block" systemImage="plus" iconPlacement="leading" appearance="bordered" tintColor={green} labelColor={green} onPress={openAddBlock} style={styles.addBlockButton}><AppIcon name="add" style={visualStyle} size={17} color={green} /><PageText style={styles.editButtonText}>Add a time block</PageText></NativeActionButton> : <NativeActionButton label="Edit this routine" systemImage="calendar" iconPlacement="leading" appearance="plain" tintColor={green} labelColor={green} onPress={startEditing} style={styles.editButton}><AppIcon name="calendar" style={visualStyle} size={17} color={green} /><PageText style={styles.editButtonText}>Edit this routine</PageText></NativeActionButton>}
          {editing && <NativeActionButton label="Cancel edits" onPress={cancelEditing} appearance="plain" tintColor={muted} labelColor={muted} style={styles.cancelButton}><PageText style={styles.cancelText}>Cancel edits</PageText></NativeActionButton>}
          {saveError ? <Feedback severity="error" message={saveError} /> : null}
          <NativeActionButton label={isNewRoutine ? 'Create routine' : applied ? 'Save routine changes' : isTemplateRoutine ? 'Save this routine' : 'Use routine & add checklist'} systemImage="checkmark" onPress={() => void apply()} disabled={saving} style={[styles.action, applied && styles.actionAdded, saving && styles.disabledAction]}><PageText style={[styles.actionText, applied && styles.actionTextAdded]}>{isNewRoutine ? 'Create routine' : applied ? 'Save routine changes' : isTemplateRoutine ? 'Save this routine' : 'Use routine & add checklist'}</PageText><AppIcon name="check" style={visualStyle} size={18} color={applied ? green : palette.onInk} /></NativeActionButton>
        </Animated.ScrollView>
        <ProgressiveEdgeBlur edge="bottom" surfaceColor={paper} style={{ zIndex: 8 }} />
        <ProgressiveEdgeBlur edge="top" surfaceColor={paper} startOffset={0.8} scrollProgress={scrollY} revealDistance={headerFadeHeight} style={{ height: topHeaderBlurHeight(headerFadeHeight), zIndex: 9, opacity: 0.95 }} />
        <SquircleView pointerEvents="auto" collapsable={false} renderToHardwareTextureAndroid style={[styles.headerOverlay, { height: headerHeight }]}>
          <SquircleView style={[styles.topBar, { marginTop: insets.top }]}>
            <NativeActionButton label="Back" systemImage="chevron.left" iconPlacement="leading" iosHeaderStyle="back" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back"><AppIcon name="back" style={visualStyle} size={19} color={ink} /><PageText style={styles.backText}>Back</PageText></NativeActionButton>
            <SquircleView style={styles.topBarBalance} />
          </SquircleView>
          <SquircleView pointerEvents="none" style={[styles.collapsedPageTitle, { top: insets.top, height: APP_HEADER_BAR_HEIGHT }]}><PageText heading style={styles.collapsedTitle} numberOfLines={1}>{activeSchedule.title}</PageText></SquircleView>
        </SquircleView>
        <BottomSheet index={blockEditor ? 0 : -1} onClose={closeBlockEditor} enablePanDownToClose snapPoints={SHEET_SNAP_POINTS} backgroundStyle={{ backgroundColor: paper }}>
          <BottomSheetView style={{ flex: 1, backgroundColor: paper, overflow: 'hidden' }}>
            {blockEditor && <BottomSheetScrollView style={{ flex: 1, marginBottom: Platform.OS === 'ios' ? -insets.bottom : 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.blockSheetContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
              <SquircleView style={styles.blockSheetHeader}>
                <SquircleView style={styles.blockSheetHeadingCopy}>
                  <PageText display heading style={styles.blockSheetTitle}>{blockEditor.mode === 'add' ? 'Add a time block' : 'Edit time block'}</PageText>
                  <PageText style={styles.blockSheetDescription}>Add the block here, then save the routine when you are ready.</PageText>
                </SquircleView>
                <NativeActionButton label="Cancel" onPress={closeBlockEditor} appearance="plain" tintColor={muted} labelColor={muted} style={styles.blockSheetCancel}><PageText style={styles.cancelText}>Cancel</PageText></NativeActionButton>
              </SquircleView>
              <SquircleView style={styles.blockSheetField}>
                <PageText style={styles.blockFieldLabel}>TIME (OPTIONAL)</PageText>
                <TextInput value={blockEditor.time} onChangeText={(value) => updateBlockEditor('time', value)} placeholder="Time or part of day" placeholderTextColor={muted} style={styles.timeInput} accessibilityLabel="Time or part of day" />
              </SquircleView>
              <SquircleView style={styles.blockSheetField}>
                <PageText style={styles.blockFieldLabel}>ACTIVITY</PageText>
                <TextInput value={blockEditor.title} onChangeText={(value) => updateBlockEditor('title', value)} placeholder="What will you do?" placeholderTextColor={muted} style={styles.activityInput} accessibilityLabel="Activity name" />
              </SquircleView>
              <SquircleView style={styles.blockSheetField}>
                <PageText style={styles.blockFieldLabel}>NOTES (OPTIONAL)</PageText>
                <TextInput value={blockEditor.details} onChangeText={(value) => updateBlockEditor('details', value)} placeholder="Add a reminder or a little context" placeholderTextColor={muted} multiline textAlignVertical="top" style={styles.detailsInput} accessibilityLabel="Notes for this time block" />
              </SquircleView>
              <SquircleView style={styles.blockSheetField}>
                <PageText style={styles.blockFieldLabel}>TARGET (OPTIONAL)</PageText>
                <SquircleView style={styles.measureRow}>
                  <TextInput value={blockEditor.targetValue} onChangeText={(value) => updateBlockEditor('targetValue', value)} placeholder="Amount" keyboardType="decimal-pad" placeholderTextColor={muted} style={styles.metricInput} accessibilityLabel="Target amount" />
                  <TextInput value={blockEditor.targetUnit} onChangeText={(value) => updateBlockEditor('targetUnit', value)} placeholder="Unit" placeholderTextColor={muted} style={styles.metricInput} accessibilityLabel="Target unit" />
                </SquircleView>
                <PageText style={styles.blockFieldHint}>For example, pages or minutes.</PageText>
              </SquircleView>
              {blockEditorError ? <Feedback severity="error" message={blockEditorError} /> : null}
              <NativeActionButton label={blockEditor.mode === 'add' ? 'Add block' : 'Save block'} systemImage="checkmark" onPress={saveBlockEditor} appearance="prominent" tintColor={green} labelColor={palette.onAccent} style={styles.blockSheetSubmit}><PageText style={styles.blockSheetSubmitText}>{blockEditor.mode === 'add' ? 'Add block' : 'Save block'}</PageText><AppIcon name="check" style={visualStyle} size={17} color={palette.onAccent} /></NativeActionButton>
            </BottomSheetScrollView>}
          </BottomSheetView>
        </BottomSheet>
      </SquircleView>
    </VisualStyleContext.Provider>
  );
}

const createStyles = (palette: AppTheme) => {  const { ink, muted, green, paper } = palette; return StyleSheet.create({
  root: { flex: 1, backgroundColor: paper },
  headerOverlay: { position: 'absolute', zIndex: 20, top: 0, left: 0, right: 0, overflow: 'hidden' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: LayoutSpacing.screenInset },
  topBar: { height: APP_HEADER_BAR_HEIGHT, paddingHorizontal: LayoutSpacing.screenInset, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  backText: { color: ink, fontSize: 13.2, fontWeight: '400' },
  collapsedPageTitle: { position: 'absolute', zIndex: 1, left: 0, right: 0, paddingHorizontal: 88, paddingBottom: IOS_TITLE_OPTICAL_PADDING_BOTTOM, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  collapsedTitle: { width: '100%', color: ink, fontSize: 20.9 * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 27.5 * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '600', textAlign: 'center' },
  topBarBalance: { width: 78 },
  hero: { minHeight: 102, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 88, height: 88, borderRadius: Radius.hero, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: green, fontSize: 11, fontWeight: '400', letterSpacing: 1.3 },
  title: { color: ink, fontSize: 33 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 40.7 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '500', marginTop: 20 },
  titleInput: { minHeight: 58, paddingHorizontal: 14, borderRadius: Radius.control, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, color: ink, fontSize: 24.2 * NON_TAB_HEADER_TITLE_SCALE, marginTop: 20 },
  intro: { color: muted, fontSize: 14.3, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  aiRoutineSection: { padding: 15, marginBottom: 18, gap: 10, borderRadius: Radius.card, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface },
  aiRoutineHeading: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 7 },
  aiRoutineEyebrow: { color: green, fontSize: 9.9, fontWeight: '400', letterSpacing: 0.8 },
  aiRoutineTitle: { color: ink, fontSize: 18.7, lineHeight: 24, fontWeight: '400' },
  aiRoutineDescription: { color: muted, fontSize: 12.7, lineHeight: 19 },
  aiRoutineActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  aiRoutineButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 99, backgroundColor: palette.lightGreen },
  aiRoutineButtonText: { color: green, fontSize: 12.1, fontWeight: '400' },
  aiPromptSurface: { padding: 11, borderRadius: Radius.small, backgroundColor: palette.lightGreen },
  aiPromptExample: { color: ink, fontSize: 11.5, lineHeight: 17 },
  aiRoutineInput: { minHeight: 128, paddingHorizontal: 11, paddingVertical: 10, borderRadius: Radius.small, backgroundColor: palette.lightGreen, color: ink, fontSize: 12.7, lineHeight: 19 },
  aiRoutineSubmit: { minHeight: 46, paddingHorizontal: 14, borderRadius: 99, backgroundColor: palette.green },
  aiRoutineSubmitDisabled: { opacity: 0.5 },
  aiRoutineSubmitText: { color: palette.onAccent, fontSize: 13.2, fontWeight: '400' },
  aiRoutineNotice: { color: green, fontSize: 12.1, lineHeight: 18 },
  blocks: { paddingHorizontal: 0 },
  editBlocks: { gap: 8 },
  blockListHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  blockCount: { color: muted, fontSize: 12.1, lineHeight: 17.6 },
  emptyBlocks: { padding: 14, gap: 4, borderWidth: 1, borderColor: palette.line, borderRadius: Radius.card, backgroundColor: palette.surface },
  emptyBlocksTitle: { color: ink, fontSize: 14.3, lineHeight: 19.8, fontWeight: '400' },
  emptyBlocksDescription: { color: muted, fontSize: 12.1, lineHeight: 17.6 },
  editBlockCard: { minHeight: 78, paddingVertical: 9, paddingLeft: 12, paddingRight: 5, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: palette.line, borderRadius: Radius.card, backgroundColor: palette.surface },
  editBlockCardCopy: { flex: 1, minWidth: 0, gap: 2 },
  editBlockTime: { color: green, fontSize: 10.5, lineHeight: 14.3, fontWeight: '400' },
  editBlockTitle: { color: ink, fontSize: 14.3, lineHeight: 18.7, fontWeight: '400' },
  editBlockDetails: { color: muted, fontSize: 11.5, lineHeight: 16.5 },
  editBlockTarget: { color: muted, fontSize: 11, lineHeight: 15.4, fontWeight: '400' },
  blockCardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockCardAction: { minHeight: 44, paddingHorizontal: 5, justifyContent: 'center' },
  blockCardEditText: { color: green, fontSize: 11.5, fontWeight: '400' },
  daysEditor: { marginBottom: 16, paddingVertical: 10, gap: 10 },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, dayChip: { minWidth: 41, minHeight: 44, paddingHorizontal: 8, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.lightGreen }, dayChipSelected: { backgroundColor: palette.green }, dayChipText: { color: muted, fontSize: 12.1, fontWeight: '400' }, dayChipTextSelected: { color: palette.onAccent },
  block: { minHeight: 78, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  blockLast: { borderBottomWidth: 0 },
  time: { width: 90, color: green, fontSize: 9.9, lineHeight: 16.5, fontWeight: '400' },
  divider: { width: 3, minHeight: 45, borderRadius: 99, backgroundColor: palette.lightGreen },
  blockCopy: { flex: 1, gap: 4 },
  blockTitle: { color: ink, fontSize: 15.4, lineHeight: 20.9, fontWeight: '400' },
  details: { color: muted, fontSize: 12.1, lineHeight: 17.6 },
  blockNumber: { color: green, fontSize: 9.9, fontWeight: '400', letterSpacing: 1.1 },
  removeText: { color: palette.muted, fontSize: 11.5, fontWeight: '400' },
  blockSheetContent: { flexGrow: 1, paddingTop: 4, paddingHorizontal: LayoutSpacing.sheetInset, gap: 14, backgroundColor: paper },
  blockSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 2 },
  blockSheetHeadingCopy: { flex: 1, minWidth: 0, gap: 4 },
  blockSheetTitle: { color: ink, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  blockSheetDescription: { color: muted, fontSize: 13.2, lineHeight: 19.8 },
  blockSheetCancel: { minHeight: 44, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  blockSheetField: { gap: 7 },
  blockFieldLabel: { color: green, fontSize: 10, fontWeight: '400', letterSpacing: 0.8 },
  blockFieldHint: { color: muted, fontSize: 11.5, lineHeight: 16 },
  blockSheetSubmit: { minHeight: 52, marginTop: 2, paddingHorizontal: 16, borderRadius: 99, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockSheetSubmitText: { color: palette.onAccent, fontSize: 14.3, fontWeight: '400' },
  timeInput: { minHeight: 44, paddingHorizontal: 11, borderRadius: Radius.small, backgroundColor: palette.lightGreen, color: muted, fontSize: 13.2 },
  activityInput: { minHeight: 46, paddingHorizontal: 11, borderRadius: Radius.small, backgroundColor: palette.lightGreen, color: ink, fontSize: 16.5 },
  detailsInput: { minHeight: 76, paddingHorizontal: 11, paddingTop: 10, borderRadius: Radius.small, backgroundColor: palette.lightGreen, color: muted, fontSize: 13.2, lineHeight: 19.8 },
  measureRow: { flexDirection: 'row', gap: 8 }, metricInput: { flex: 1, minHeight: 44, paddingHorizontal: 11, borderRadius: Radius.small, backgroundColor: palette.lightGreen, color: ink, fontSize: 13.2 },
  editButton: { minHeight: 48, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBlockButton: { minHeight: 48, marginTop: 9, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButtonText: { color: green, fontSize: 13.2, fontWeight: '400' },
  cancelButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: muted, fontSize: 13.2 },
  action: { minHeight: 54, marginTop: 20, paddingHorizontal: 18, borderRadius: 999, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disabledAction: { opacity: 0.45 },
  actionAdded: { backgroundColor: palette.lightGreen },
  actionText: { color: palette.onAccent, fontSize: 14.3, fontWeight: '400' },
  actionTextAdded: { color: green },
}); };
