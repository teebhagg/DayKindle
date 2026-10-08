import { SquircleSurface } from '@/components/squircle-surface';
import { SquirclePressable } from '@/components/squircle-card';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { Feedback } from '@/components/app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, platformCardRadius, type AppTheme } from '@/constants/theme';
import { useId, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { BottomSheet, BottomSheetScrollView, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { AppIcon } from '../components/app-icon';
import { PageText } from '../features/home/page-text';
import { NON_TAB_HEADER_TITLE_SCALE, PAGE_HEADING_SCALE } from '../features/home/layout-metrics';
import { VisualStyleContext } from '../features/home/visual-style-context';
import { useHomeSession } from '../features/home/home-session';
import { type DaySchedule, type DayScheduleBlock } from '../features/home/day-schedules';
import { allGoalAndHabitTemplates, categoryIcons, scheduleTemplates, templateCategories, templateCatalogCounts, type ScheduleTemplate } from '../features/templates/catalog';
import { createOccurrenceId } from '../features/home/occurrences';
import NativeActionButton from '../components/native-action-button';
import { ProgressiveEdgeBlur } from '../components/progressive-edge-blur';
import { APP_STANDARD_HEADER_HEIGHT, scaleHeaderBlurIntensity, scaleHeaderGradientHeight } from '../components/header-gradient-metrics';
import { ProgressiveHorizontalScrollView } from '../components/progressive-horizontal-scroll-view';

const categories = ['All', ...templateCategories];





export default function TemplatesScreen() {
  const palette = useTheme();  const { ink, muted, green, paper } = palette; const styles = useThemedStyles(createStyles);
  const { visualStyle, daySchedules, setDaySchedules, confirmLocalSave, storageStatus, retrySave } = useHomeSession();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeKind, setActiveKind] = useState<'all' | 'goal' | 'habit'>('all');
  const [schedulePreview, setSchedulePreview] = useState<ScheduleTemplate | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<DaySchedule | null>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const categorySurfaceGradientId = `category-filter-${useId().replace(/:/g, '')}`;
  const headerHeight = insets.top + APP_STANDARD_HEADER_HEIGHT;
  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allGoalAndHabitTemplates.filter((item) => (activeCategory === 'All' || item.category === activeCategory)
      && (activeKind === 'all' || item.kind === activeKind)
      && (!normalized || [item.title, item.description, item.context, item.category, item.kind].join(' ').toLowerCase().includes(normalized)));
  }, [activeCategory, activeKind, query]);
  const editSchedule = (schedule: DaySchedule) => {
    Keyboard.dismiss();
    setSchedulePreview(null);
    router.push({ pathname: '/day-template-detail', params: { id: schedule.sourceTemplateId ?? schedule.id, ...(schedule.sourceTemplateId ? { routineId: schedule.id } : {}) } });
  };
  const updateScheduleBlock = (blockId: string, field: keyof DayScheduleBlock, value: string) => {
    setScheduleDraft((current) => current ? { ...current, blocks: current.blocks.map((block) => block.id === blockId ? { ...block, [field]: value } : block) } : current);
  };
  const addScheduleBlock = () => setScheduleDraft((current) => current ? {
    ...current,
    blocks: [...current.blocks, { id: `custom-${Date.now()}`, time: 'Add a time', title: 'New activity', details: 'Add a note or a small first step.' }],
  } : current);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const applySchedule = async () => {
    if (savingSchedule) return;
    if (!scheduleDraft) return;
    setDaySchedules((current) => [...current.filter((schedule) => schedule.id !== scheduleDraft.id), scheduleDraft]);
    setSavingSchedule(true);
    try { if (storageStatus === 'save-error') retrySave(); await confirmLocalSave(); }
    catch { setScheduleError('Could not save on this device. Your edits are still here. Try again.'); setSavingSchedule(false); return; }
    setSavingSchedule(false); setScheduleError('');
    setScheduleDraft(null);
    Keyboard.dismiss();
    router.back();
  };
  const applySchedulePreview = async () => {
    if (savingSchedule) return;
    if (!schedulePreview) return;
    const sourceTemplateId = schedulePreview.sourceTemplateId ?? schedulePreview.id;
    setDaySchedules((current) => current.some((schedule) => schedule.sourceTemplateId === sourceTemplateId || schedule.id === sourceTemplateId)
      ? current
      : [...current, {
        ...schedulePreview,
        id: createOccurrenceId('routine'),
        sourceTemplateId,
        daysOfWeek: schedulePreview.daysOfWeek ?? (schedulePreview.dayType === 'weekday' ? [1, 2, 3, 4, 5] : [0, 6]),
        blocks: schedulePreview.blocks.map((block) => ({ ...block })),
      }]);
    setSavingSchedule(true);
    try { if (storageStatus === 'save-error') retrySave(); await confirmLocalSave(); }
    catch { setScheduleError('Could not save this routine. Try again.'); setSavingSchedule(false); return; }
    setSavingSchedule(false); setScheduleError('');
    setSchedulePreview(null);
  };
  return (
    <VisualStyleContext.Provider value={visualStyle}>
      <KeyboardAvoidingView style={[styles.root, { minHeight: windowHeight }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
        <Animated.FlatList
          data={filteredTemplates}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { minHeight: Math.max(0, windowHeight - headerHeight), paddingTop: headerHeight + 174, paddingBottom: insets.bottom + 28 }]}
          ListHeaderComponent={<View>
            <View style={styles.scheduleTemplateHeading}><View style={{ flex: 1 }}><PageText style={styles.eyebrow}>DAILY ROUTINES</PageText><PageText display style={styles.heading}>Plan a daily routine.</PageText><PageText style={styles.intro}>Choose a starting plan, then edit it.</PageText></View><NativeActionButton label="See more" systemImage="arrow.right" appearance="plain" tintColor={green} labelColor={green} onPress={() => router.push('/full-day-templates')} style={styles.seeMoreButton} accessibilityLabel="See more full-day templates"><PageText style={styles.seeMoreText}>See more</PageText><AppIcon name="arrow" style={visualStyle} size={15} color={green} /></NativeActionButton></View>
            <ProgressiveHorizontalScrollView showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleTemplateList}>{scheduleTemplates.slice(0, 4).map((schedule) => {
              const appliedSchedule = daySchedules.find((item) => item.sourceTemplateId === schedule.id || item.id === schedule.id);
              const preview = appliedSchedule ? { ...schedule, ...appliedSchedule, audience: schedule.audience, description: schedule.description } : schedule;
              return <SquirclePressable key={schedule.id} onPress={() => setSchedulePreview({ ...preview, blocks: preview.blocks.map((block) => ({ ...block })) })} style={styles.scheduleTemplateCard} accessibilityRole="button" accessibilityLabel={`Preview ${preview.title}`}>
                <View style={styles.cardTop}><View style={styles.cardIcon}><AppIcon name={schedule.dayType === 'weekday' ? 'clock' : 'sun'} style={visualStyle} size={20} color={green} /></View><PageText style={styles.cardCategory}>{schedule.audience.toUpperCase()}</PageText></View>
                <PageText display style={styles.cardTitle}>{preview.title}</PageText>
                <PageText style={styles.cardDescription}>{schedule.description}</PageText>
                <View style={styles.horizontalCardAction}><PageText style={styles.gridCardActionText}>Preview routine</PageText><AppIcon name="arrow" style={visualStyle} size={15} color={green} /></View>
              </SquirclePressable>;
            })}</ProgressiveHorizontalScrollView>
            <PageText style={styles.eyebrow}>GOALS & HABITS</PageText>
            <PageText display style={styles.heading}>Start with a template.</PageText>
            <PageText style={styles.intro}>{templateCatalogCounts.goals} goals and {templateCatalogCounts.habits} habits across {templateCategories.length} areas. Edit each starting point before adding it.</PageText>
            <PageText style={styles.resultLabel}>{filteredTemplates.length} {activeKind === 'all' ? 'GOALS & HABITS' : `${activeKind.toUpperCase()} TEMPLATES`}</PageText>
          </View>}
          numColumns={2}
          columnWrapperStyle={styles.templateGridRow}
          renderItem={({ item }) => <Link href={{ pathname: '/template-detail', params: { id: item.id } }} asChild><SquirclePressable onPress={() => Keyboard.dismiss()} style={styles.templateCard} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
              <SquircleSurface style={styles.zoomCardContent}>
                <Link.AppleZoom><View collapsable={false} style={StyleSheet.flatten([styles.cardArt, item.category === 'Sleep & Recovery' && styles.cardArtRest, item.category === 'Productivity' && styles.cardArtFocus, item.category === 'Finance' && styles.cardArtMoney])}>
                  <AppIcon name={categoryIcons[item.category]} style={visualStyle} size={28} color={green} />
                  <PageText style={styles.cardCategory}>{item.category.toUpperCase()}</PageText>
                </View></Link.AppleZoom>
                <View style={styles.gridCardCopy}>
                  <PageText style={styles.resultLabel}>{item.kind.toUpperCase()}</PageText>
                  <PageText display style={styles.cardTitle}>{item.title}</PageText>
                  <PageText style={styles.gridCardDescription}>{item.description}</PageText>
                  <View style={styles.gridCardAction}><PageText style={styles.gridCardActionText}>View template</PageText><AppIcon name="arrow" style={visualStyle} size={15} color={green} /></View>
                </View>
              </SquircleSurface>
          </SquirclePressable></Link>}
          ListEmptyComponent={<SquircleSurface style={styles.emptyState}><AppIcon name="search" style={visualStyle} size={25} color={green} /><PageText display style={styles.emptyTitle}>No matches yet.</PageText><PageText style={styles.emptyCopy}>Try another word or category.</PageText></SquircleSurface>}
        />
        <ProgressiveEdgeBlur edge="top" surfaceColor={paper} intensity={scaleHeaderBlurIntensity(75)} style={{ height: scaleHeaderGradientHeight(headerHeight), zIndex: 9, opacity: 0.95 }} />
        <View pointerEvents="box-none" style={[styles.headerOverlay, { height: headerHeight }]}>
          <View style={[styles.topBar, { marginTop: insets.top }]}> 
            <NativeActionButton label="Back" systemImage="chevron.left" iconPlacement="leading" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
              <View style={styles.backIcon}><AppIcon name="arrow" style={visualStyle} size={18} color={ink} /></View><PageText style={styles.backLabel}>Back</PageText>
            </NativeActionButton>
            <View style={styles.topBarBalance} />
          </View>
          <View pointerEvents="none" style={[styles.templateHeaderCollapsed, { top: insets.top, height: APP_STANDARD_HEADER_HEIGHT }]}><PageText preserveDisplaySize style={styles.collapsedTitle}>Templates</PageText></View>
        </View>
        <View style={[styles.stickyFilters, { top: headerHeight }]}>
          <View style={styles.stickyFiltersInner}>
            <SquircleSurface radius={17} style={styles.searchField}>
              <AppIcon name="search" style={visualStyle} size={19} color={muted} />
              <TextInput borderless hideLabel value={query} onChangeText={setQuery} multiline={false} numberOfLines={1} placeholder="Search goals and habits" placeholderTextColor={palette.muted} selectionColor={green} style={styles.searchInput} returnKeyType="search" clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'} accessibilityLabel="Search templates" />
            </SquircleSurface>
            <View style={styles.categoryFilterSurface}>
              <Svg pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
                <Defs>
                  <LinearGradient id={categorySurfaceGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={paper} stopOpacity={0} />
                    <Stop offset="7%" stopColor={paper} stopOpacity={1} />
                    <Stop offset="93%" stopColor={paper} stopOpacity={1} />
                    <Stop offset="100%" stopColor={paper} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="100" fill={`url(#${categorySurfaceGradientId})`} />
              </Svg>
              <View style={styles.kindFilters}>
                {(['all', 'goal', 'habit'] as const).map((kind) => {
                  const selected = activeKind === kind;
                  const label = kind === 'all' ? 'All types' : `${kind[0].toUpperCase()}${kind.slice(1)}s`;
                  return <Pressable key={kind} onPress={() => setActiveKind(kind)} style={[styles.categoryPill, selected && styles.categoryPillSelected]} accessibilityRole="button" accessibilityState={{ selected }}><PageText style={[styles.categoryText, selected && styles.categoryTextSelected]}>{label}</PageText></Pressable>;
                })}
              </View>
              <ProgressiveHorizontalScrollView viewportStyle={styles.categoryScrollWrap} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} keyboardShouldPersistTaps="handled">
                {categories.map((category) => {
                  const selected = category === activeCategory;
                  return <Pressable key={category} onPress={() => setActiveCategory(category)} style={[styles.categoryPill, selected && styles.categoryPillSelected]} accessibilityRole="button" accessibilityState={{ selected }}><PageText style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category}</PageText></Pressable>;
                })}
              </ProgressiveHorizontalScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

        <BottomSheet index={schedulePreview ? 0 : -1} onClose={() => setSchedulePreview(null)} enablePanDownToClose snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: paper }}>
          <BottomSheetView style={{ flex: 1, backgroundColor: paper, overflow: 'hidden' }}>
            {schedulePreview && <BottomSheetScrollView style={styles.schedulePreviewScroll} contentContainerStyle={[styles.schedulePreviewContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.previewTop}>
                <View style={styles.cardIcon}><AppIcon name={schedulePreview.dayType === 'weekday' ? 'clock' : 'sun'} style={visualStyle} size={21} color={green} /></View>
                <View style={styles.schedulePreviewHeading}><PageText style={styles.cardCategory}>{schedulePreview.audience.toUpperCase()}</PageText><PageText style={styles.previewMeta}>{schedulePreview.blocks.length} flexible blocks</PageText></View>
                <NativeActionButton label="" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => setSchedulePreview(null)} style={styles.previewClose} accessibilityLabel="Close routine preview"><PageText style={styles.previewCloseText}>×</PageText></NativeActionButton>
              </View>
              <PageText display style={styles.schedulePreviewTitle}>{schedulePreview.title}</PageText>
              <PageText style={styles.schedulePreviewDescription}>{schedulePreview.description} Select the days that fit your schedule before saving.</PageText>
              <View style={styles.schedulePreviewBlocks}>{schedulePreview.blocks.map((block, index) => <View key={block.id} style={[styles.schedulePreviewBlock, index === schedulePreview.blocks.length - 1 && styles.schedulePreviewBlockLast]}>
                <PageText style={styles.schedulePreviewTime}>{block.time}</PageText><View style={styles.schedulePreviewDivider} /><View style={styles.schedulePreviewCopy}><PageText display style={styles.schedulePreviewBlockTitle}>{block.title}</PageText><PageText style={styles.schedulePreviewBlockDetails}>{block.details}</PageText></View>
              </View>)}</View>
              {scheduleError ? <Feedback severity="error" message={scheduleError} /> : null}<NativeActionButton label="Use this routine" systemImage="checkmark" onPress={() => void applySchedulePreview()} disabled={savingSchedule} style={styles.useButton}><PageText style={styles.useButtonText}>Use this routine</PageText><AppIcon name="check" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>
              <NativeActionButton label="Customize this routine" systemImage="arrow.right" appearance="plain" tintColor={green} labelColor={green} onPress={() => editSchedule(schedulePreview)} style={styles.customizeButton}><PageText style={styles.customizeButtonText}>Customize this routine</PageText><AppIcon name="arrow" style={visualStyle} size={16} color={green} /></NativeActionButton>
            </BottomSheetScrollView>}
          </BottomSheetView>
        </BottomSheet>

        <BottomSheet index={scheduleDraft ? 0 : -1} onClose={() => setScheduleDraft(null)} enablePanDownToClose snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: paper }}>
          <BottomSheetView style={{ flex: 1, backgroundColor: paper, overflow: 'hidden' }}>
            {scheduleDraft && <BottomSheetScrollView style={styles.scheduleEditScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scheduleEditSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
              <View style={styles.previewTop}><View style={styles.cardIcon}><AppIcon name="calendar" style={visualStyle} size={21} color={green} /></View><PageText style={styles.cardCategory}>{scheduleDraft.dayType === 'weekday' ? 'WEEKDAY ROUTINE' : 'WEEKEND ROUTINE'}</PageText><NativeActionButton label="" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => setScheduleDraft(null)} style={styles.previewClose} accessibilityLabel="Close routine editor"><PageText style={styles.previewCloseText}>×</PageText></NativeActionButton></View>
              <PageText display style={styles.schedulePreviewTitle}>Customize your {scheduleDraft.dayType} rhythm</PageText>
              <PageText style={styles.schedulePreviewDescription}>Adjust the routine name, times, activities, and notes.</PageText>
              <TextInput value={scheduleDraft.title} onChangeText={(title) => setScheduleDraft((current) => current ? { ...current, title } : current)} placeholder="Name this routine" placeholderTextColor={palette.muted} style={[styles.scheduleTitleInput, { fontFamily: visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel="Routine name" />
              <PageText style={styles.intro}>Edit the times, activities, and notes. Changes apply to this routine.</PageText>
              {scheduleDraft.blocks.map((block, index) => <View key={block.id} style={[styles.scheduleEditBlock, index === scheduleDraft.blocks.length - 1 && styles.scheduleEditBlockLast]}>
                <View style={styles.scheduleEditBlockHeading}><PageText style={styles.firstStepLabel}>BLOCK {index + 1}</PageText>{scheduleDraft.blocks.length > 1 && <NativeActionButton label="Remove" systemImage="trash" appearance="plain" tintColor={green} labelColor={green} onPress={() => setScheduleDraft((current) => current ? { ...current, blocks: current.blocks.filter((item) => item.id !== block.id) } : current)} style={styles.removeBlockButton} accessibilityLabel={`Remove ${block.title}`}><PageText style={styles.removeBlockText}>Remove</PageText></NativeActionButton>}</View>
                <TextInput value={block.time} onChangeText={(value) => updateScheduleBlock(block.id, 'time', value)} placeholder="Time range" placeholderTextColor={palette.muted} style={[styles.scheduleTimeInput, { fontFamily: visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel={`Time for ${block.title}`} />
                <TextInput value={block.title} onChangeText={(value) => updateScheduleBlock(block.id, 'title', value)} placeholder="Activity" placeholderTextColor={palette.muted} style={[styles.scheduleActivityInput, { fontFamily: visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel={`Activity ${index + 1}`} />
                <TextInput value={block.details} onChangeText={(value) => updateScheduleBlock(block.id, 'details', value)} placeholder="Add details or reminders" placeholderTextColor={palette.muted} multiline textAlignVertical="top" style={[styles.scheduleDetailsInput, { fontFamily: visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]} accessibilityLabel={`Notes for ${block.title}`} />
              </View>)}
              <NativeActionButton label="Add a time block" systemImage="plus" iconPlacement="leading" appearance="bordered" tintColor={green} labelColor={green} onPress={addScheduleBlock} style={styles.addBlockButton}><AppIcon name="add" style={visualStyle} size={17} color={green} /><PageText style={styles.addBlockText}>Add a time block</PageText></NativeActionButton>
              {scheduleError ? <Feedback severity="error" message={scheduleError} /> : null}
              <NativeActionButton label="Apply this routine" systemImage="checkmark" onPress={() => void applySchedule()} disabled={savingSchedule} style={styles.useButton}><PageText style={styles.useButtonText}>Apply this routine</PageText><AppIcon name="check" style={visualStyle} size={18} color={palette.onAccent} /></NativeActionButton>
            </BottomSheetScrollView>}
          </BottomSheetView>
        </BottomSheet>

    </VisualStyleContext.Provider>
  );
}
const createStyles = (palette: AppTheme) => {  const { ink, muted, green, paper } = palette; return StyleSheet.create({
  root: { flex: 1, backgroundColor: paper },
  headerOverlay: { position: 'absolute', zIndex: 10, top: 0, left: 0, right: 0, overflow: 'hidden' },
  stickyFilters: { position: 'absolute', zIndex: 9, left: 0, right: 0, paddingTop: 4, paddingBottom: 2 },
  stickyFiltersInner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: LayoutSpacing.screenInset },
  topBar: { height: APP_STANDARD_HEADER_HEIGHT, paddingHorizontal: LayoutSpacing.screenInset, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  templateHeaderCollapsed: { position: 'absolute', left: 108, right: 108, alignItems: 'center', justifyContent: 'center' },
  collapsedTitle: { color: ink, fontSize: 20.9 * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 27.5 * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '600' },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backIcon: { transform: [{ scaleX: -1 }] },
  backLabel: { color: ink, fontSize: 13.2, fontWeight: '600' },
  topBarBalance: { width: 78 },
  listContent: { paddingHorizontal: LayoutSpacing.screenInset, alignSelf: 'center', width: '100%', maxWidth: 560 },
  eyebrow: { color: green, fontFamily: 'Satoshi', fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginTop: 17 },
  heading: { color: ink, fontSize: 30.8 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 39.6 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '500', marginTop: 8 },
  intro: { color: muted, fontSize: 14.3, lineHeight: 22, fontWeight: '400', marginTop: 4, marginBottom: LayoutSpacing.group },
  searchField: { height: 48, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minHeight: 46, paddingVertical: 0, color: ink, fontSize: 16, lineHeight: 21, includeFontPadding: false },
  categoryFilterSurface: { position: 'relative', overflow: 'hidden', marginHorizontal: -22, paddingHorizontal: 22 },
  kindFilters: { flexDirection: 'row', gap: 8, paddingTop: 9, paddingBottom: 2 },
  categories: { gap: 8, paddingVertical: 10, paddingRight: 22 },
  categoryScrollWrap: { height: 60 },
  categoryPill: { minHeight: 40, paddingHorizontal: 15, borderRadius: 999, justifyContent: 'center', backgroundColor: palette.lightGreen },
  categoryPillSelected: { backgroundColor: palette.green },
  categoryText: { color: muted, fontSize: 12.1, fontWeight: '500' },
  categoryTextSelected: { color: palette.onAccent },
  resultLabel: { color: muted, fontFamily: 'Satoshi', fontSize: 9.9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  scheduleTemplateList: { gap: LayoutSpacing.control, paddingRight: LayoutSpacing.screenInset, marginBottom: LayoutSpacing.section },
  scheduleTemplateHeading: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  seeMoreButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 10 },
  seeMoreText: { color: green, fontSize: 12.1, fontWeight: '600' },
  scheduleTemplateCard: { width: 252, minHeight: 190, padding: 13, borderRadius: platformCardRadius(17.6), borderWidth: 1, borderColor: palette.line, backgroundColor: palette.lightGreen },
  horizontalCardAction: { minHeight: 34, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleEditSheet: { flexGrow: 1, paddingHorizontal: LayoutSpacing.sheetInset, paddingTop: 4, backgroundColor: paper },
  scheduleTitleInput: { minHeight: 50, paddingHorizontal: 15, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, color: ink, fontSize: 22 },
  scheduleEditBlock: { paddingTop: LayoutSpacing.control, paddingBottom: LayoutSpacing.group, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line, marginBottom: LayoutSpacing.control, gap: LayoutSpacing.control },
  scheduleEditBlockLast: { borderBottomWidth: 0 },
  scheduleEditBlockHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleTimeInput: { minHeight: 43, paddingHorizontal: 11, borderRadius: 12, backgroundColor: palette.lightGreen, color: muted, fontSize: 13.2 },
  scheduleActivityInput: { minHeight: 46, paddingHorizontal: 11, borderRadius: 12, backgroundColor: palette.lightGreen, color: ink, fontSize: 16.5 },
  scheduleDetailsInput: { minHeight: 86, paddingHorizontal: 11, paddingTop: 10, borderRadius: 12, backgroundColor: palette.lightGreen, color: muted, fontSize: 13.2, lineHeight: 20.9 },
  removeBlockButton: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  removeBlockText: { color: palette.muted, fontSize: 12.1 },
  addBlockButton: { minHeight: 48, marginBottom: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBlockText: { color: green, fontSize: 13.2, fontWeight: '600' },
  templateGridRow: { gap: LayoutSpacing.related, marginBottom: LayoutSpacing.related },
  templateCard: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: platformCardRadius(17.6), borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface },
  zoomCardContent: { flex: 1, overflow: 'hidden', borderRadius: platformCardRadius(17.6) },
  cardArt: { height: 116, padding: 13, alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: palette.lightGreen },
  cardArtRest: { backgroundColor: palette.lightGreen }, cardArtFocus: { backgroundColor: palette.lightGreen }, cardArtMoney: { backgroundColor: palette.lightGreen },
  gridCardCopy: { minHeight: 138, padding: 12, justifyContent: 'space-between' },
  gridCardDescription: { minHeight: 32, color: muted, fontSize: 11, lineHeight: 16.5, marginTop: 5 },
  gridCardAction: { minHeight: 32, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gridCardActionText: { color: green, fontSize: 11, fontWeight: '600' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  cardIcon: { width: 38, height: 38, borderRadius: 999, backgroundColor: palette.lightGreen, justifyContent: 'center', alignItems: 'center' },
  cardCategory: { color: green, fontFamily: 'Satoshi', fontSize: 9.9, fontWeight: '700', letterSpacing: 1.2 },
  cardTitle: { color: ink, fontSize: 17.6, lineHeight: 23.1, fontWeight: '500' },
  cardDescription: { color: muted, fontSize: 13.2, lineHeight: 19.8, marginTop: 4 },
  firstStep: { marginTop: 13, padding: 12, borderRadius: 18.7, backgroundColor: palette.lightGreen },
  firstStepLabel: { color: green, fontFamily: 'Satoshi', fontSize: 8.8, fontWeight: '700', letterSpacing: 1.1 },
  firstStepText: { color: ink, fontSize: 12.1, lineHeight: 18.7, fontWeight: '500', marginTop: 4 },
  useButton: { minHeight: 46, marginTop: 13, paddingHorizontal: 15, borderRadius: 999, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  useButtonAdded: { backgroundColor: palette.lightGreen },
  useButtonText: { color: palette.onAccent, fontFamily: 'Satoshi', fontSize: 13.2, fontWeight: '600' },
  useButtonTextAdded: { color: green },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  previewClose: { width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  previewCloseText: { color: muted, fontSize: 26.4, lineHeight: 30.8 },
  templatePreview: { paddingTop: LayoutSpacing.related, paddingHorizontal: LayoutSpacing.sheetInset, backgroundColor: paper },
  previewIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  previewCategory: { flex: 1, gap: 4 },
  previewEyebrow: { color: green, fontFamily: 'Satoshi', fontSize: 9.9, fontWeight: '700', letterSpacing: 1.2 },
  previewMeta: { color: muted, fontSize: 12.1, lineHeight: 16.5 },
  previewTitle: { color: ink, fontSize: 29.7, lineHeight: 36.3, fontWeight: '500', marginTop: 12 },
  previewDescription: { color: muted, fontSize: 15.4, lineHeight: 23.1, marginTop: 7 },
  previewStepCard: { marginTop: 20, padding: 16, borderRadius: platformCardRadius(17.6), backgroundColor: palette.lightGreen },
  previewStep: { color: ink, fontSize: 17.6, lineHeight: 25.3, fontWeight: '500', marginTop: 7 },
  schedulePreviewScroll: { flex: 1 },
  schedulePreviewContent: { paddingTop: LayoutSpacing.related, paddingHorizontal: LayoutSpacing.sheetInset },
  schedulePreviewHeading: { flex: 1, gap: 4 },
  schedulePreviewTitle: { color: ink, fontSize: 28.6, lineHeight: 35.2, fontWeight: '500', marginTop: 12 },
  schedulePreviewDescription: { color: muted, fontSize: 14.3, lineHeight: 22, marginTop: 6, marginBottom: 16 },
  schedulePreviewBlocks: { paddingHorizontal: 0 },
  schedulePreviewBlock: { minHeight: 76, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  schedulePreviewBlockLast: { borderBottomWidth: 0 },
  schedulePreviewDivider: { width: 3, minHeight: 42, borderRadius: 99, backgroundColor: palette.lightGreen },
  schedulePreviewCopy: { flex: 1, gap: 3 },
  schedulePreviewBlockTitle: { color: ink, fontSize: 15.4, lineHeight: 20.9, fontWeight: '500' },
  schedulePreviewBlockDetails: { color: muted, fontSize: 12.1, lineHeight: 17.6 },
  customizeButton: { minHeight: 48, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  customizeButtonText: { color: green, fontSize: 13.2, fontWeight: '600' },
  scheduleEditScroll: { flex: 1 },
  schedulePreviewTime: { width: 88, color: green, fontSize: 11, lineHeight: 17.6, fontWeight: '600' },
  previewNote: { color: muted, fontSize: 12.1, lineHeight: 18.7, marginTop: 15 },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 48 },
  emptyTitle: { color: ink, fontSize: 19.8, fontWeight: '500', marginTop: 8 },
  emptyCopy: { color: muted, fontSize: 13.2, fontWeight: '400' },
}); };
