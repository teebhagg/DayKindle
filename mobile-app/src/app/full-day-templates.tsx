import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, type AppTheme } from '@/constants/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { AppIcon } from '../components/app-icon';
import { PageText } from '../features/home/page-text';
import { NON_TAB_HEADER_TITLE_SCALE, PAGE_HEADING_SCALE } from '../features/home/layout-metrics';
import { VisualStyleContext } from '../features/home/visual-style-context';
import { useHomeSession } from '../features/home/home-session';
import { scheduleTemplates, templateAudiences, type ScheduleAudience } from '../features/templates/catalog';
import NativeActionButton from '../components/native-action-button';
import { ProgressiveEdgeBlur } from '../components/progressive-edge-blur';
import { ProgressiveHorizontalScrollView } from '../components/progressive-horizontal-scroll-view';
import { SquirclePressable } from '../components/squircle-card';
import { APP_HEADER_FADE_CONTENT_HEIGHT, APP_NON_TAB_HEADER_HEIGHT, topHeaderBlurHeight } from '../components/header-gradient-metrics';






export default function FullDayTemplatesScreen() {
  const palette = useTheme();  const { ink, green, paper } = palette; const styles = useThemedStyles(createStyles);
  const { visualStyle, daySchedules } = useHomeSession();
  const [activeAudience, setActiveAudience] = useState<ScheduleAudience | 'All'>('All');
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const headerHeight = insets.top + APP_NON_TAB_HEADER_HEIGHT;
  const headerFadeHeight = insets.top + APP_HEADER_FADE_CONTENT_HEIGHT;
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  return (
    <VisualStyleContext.Provider value={visualStyle}>
      <View style={styles.root}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: headerHeight, paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
          <PageText style={styles.eyebrow}>FULL-DAY RHYTHMS</PageText>
          <PageText display style={styles.heading}>Find a flow for the day.</PageText>
          <PageText style={styles.intro}>Explore flexible outlines for weekdays and weekends. Pick one, then adjust the blocks to suit your commitments and energy.</PageText>
          <NativeActionButton label="Create your own routine" systemImage="plus" iconPlacement="leading" appearance="bordered" tintColor={green} labelColor={green} onPress={() => router.push({ pathname: '/day-template-detail', params: { id: 'new' } })} style={styles.createButton}><AppIcon name="add" style={visualStyle} size={18} color={green} /><PageText style={styles.createButtonText}>Create your own routine</PageText></NativeActionButton>
          <PageText style={styles.sectionLabel}>AUDIENCE</PageText>
          <ProgressiveHorizontalScrollView showsHorizontalScrollIndicator={false} contentContainerStyle={styles.audienceFilters}>
            {(['All', ...templateAudiences] as const).map((audience) => {
              const selected = activeAudience === audience;
              return <SquirclePressable pill key={audience} onPress={() => setActiveAudience(audience)} style={[styles.audienceChip, selected && styles.audienceChipSelected]} accessibilityRole="button" accessibilityState={{ selected }}><PageText style={[styles.audienceText, selected && styles.audienceTextSelected]}>{audience}</PageText></SquirclePressable>;
            })}
          </ProgressiveHorizontalScrollView>
          <PageText style={styles.sectionLabel}>{activeAudience === 'All' ? `${scheduleTemplates.length} BUILT-IN RHYTHMS` : `${activeAudience.toUpperCase()} RHYTHMS`}</PageText>
          {activeAudience === 'All' && daySchedules.filter((schedule) => !schedule.sourceTemplateId && !scheduleTemplates.some((template) => template.id === schedule.id)).map((schedule) => <Link key={schedule.id} href={{ pathname: '/day-template-detail', params: { id: schedule.id, routineId: schedule.id } }} asChild><Pressable style={styles.routineItem} accessibilityRole="button" accessibilityLabel={`Edit ${schedule.title}`}><View style={styles.routineContent}><View style={styles.cardTop}><View style={styles.icon}><AppIcon name="clock" style={visualStyle} size={21} color={green} /></View><PageText style={styles.label}>YOUR ROUTINE</PageText></View><PageText display style={styles.cardTitle}>{schedule.title}</PageText><PageText style={styles.cardDescription}>{schedule.blocks.length} steps · choose your repeat days.</PageText><View style={styles.cardAction}><PageText style={styles.cardActionText}>Edit routine</PageText><AppIcon name="arrow" style={visualStyle} size={16} color={green} /></View></View></Pressable></Link>)}
          {scheduleTemplates.filter((schedule) => activeAudience === 'All' || schedule.audience === activeAudience).map((schedule) => {
            const saved = daySchedules.find((item) => item.sourceTemplateId === schedule.id || item.id === schedule.id);
            const item = saved ? { ...schedule, ...saved } : schedule;
            return <Link key={schedule.id} href={{ pathname: '/day-template-detail', params: { id: schedule.id, ...(saved ? { routineId: saved.id } : {}) } }} asChild><Pressable style={styles.routineItem} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}><Link.AppleZoom><View collapsable={false} style={styles.routineContent}>
              <View style={styles.cardTop}><View style={styles.icon}><AppIcon name={schedule.dayType === 'weekday' ? 'clock' : 'sun'} style={visualStyle} size={21} color={green} /></View><PageText style={styles.label}>{schedule.audience.toUpperCase()}</PageText></View>
              <PageText display style={styles.cardTitle}>{item.title}</PageText>
              <PageText style={styles.cardDescription}>{schedule.description}</PageText>
              <View style={styles.cardAction}><PageText style={styles.cardActionText}>{saved ? 'Edit your version' : 'Preview and customize'}</PageText><AppIcon name="arrow" style={visualStyle} size={16} color={green} /></View>
            </View></Link.AppleZoom></Pressable></Link>;
          })}
        </Animated.ScrollView>
        <ProgressiveEdgeBlur edge="bottom" surfaceColor={paper} style={{ zIndex: 8 }} />
        <ProgressiveEdgeBlur edge="top" surfaceColor={paper} startOffset={0.8} scrollProgress={scrollY} revealDistance={headerFadeHeight} style={{ height: topHeaderBlurHeight(headerFadeHeight), zIndex: 9, opacity: 0.95 }} />
        <View pointerEvents="box-none" collapsable={false} renderToHardwareTextureAndroid style={[styles.headerOverlay, { height: headerHeight }]}>
          <View style={[styles.topBar, { marginTop: insets.top }]}>
            <NativeActionButton label="Back" systemImage="chevron.left" iconPlacement="leading" appearance="plain" tintColor={ink} labelColor={ink} onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back"><AppIcon name="back" style={visualStyle} size={19} color={ink} /><PageText style={styles.backText}>Back</PageText></NativeActionButton>
            <View style={styles.topBarBalance} />
          </View>
          <View pointerEvents="none" style={[styles.collapsedPageTitle, { top: insets.top, height: APP_NON_TAB_HEADER_HEIGHT }]}><PageText style={styles.collapsedTitle} numberOfLines={1}>Full-day rhythms</PageText></View>
        </View>
      </View>
    </VisualStyleContext.Provider>
  );
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
  eyebrow: { color: green, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginTop: 20 },
  heading: { color: ink, fontSize: 31.9 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, lineHeight: 39.6 * PAGE_HEADING_SCALE * NON_TAB_HEADER_TITLE_SCALE, fontWeight: '500', marginTop: 8 },
  intro: { color: muted, fontSize: 14.3, lineHeight: 22, marginTop: 7, marginBottom: LayoutSpacing.group },
  createButton: { minHeight: 50, marginBottom: 16, paddingHorizontal: 15, borderRadius: 99, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.lightGreen, flexDirection: 'row', alignItems: 'center', gap: 9 },
  createButtonText: { color: green, fontSize: 14.3, fontWeight: '600' },
  sectionLabel: { color: green, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.15, marginTop: LayoutSpacing.group, marginBottom: LayoutSpacing.control },
  audienceFilters: { gap: 8, paddingVertical: 2 },
  audienceChip: { minHeight: 38, paddingHorizontal: 13, borderRadius: 999, justifyContent: 'center', backgroundColor: palette.lightGreen },
  audienceChipSelected: { backgroundColor: palette.green },
  audienceText: { color: muted, fontSize: 11.5, fontWeight: '500' },
  audienceTextSelected: { color: palette.onAccent },
  routineItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  routineContent: { paddingVertical: 19 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  label: { color: green, fontSize: 9.9, fontWeight: '700', letterSpacing: 1.2 },
  cardTitle: { color: ink, fontSize: 22, lineHeight: 29.7, fontWeight: '500', marginTop: 15 },
  cardDescription: { color: muted, fontSize: 13.2, lineHeight: 19.8, marginTop: 5 },
  cardAction: { minHeight: 40, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActionText: { color: green, fontSize: 12.1, fontWeight: '600' },
}); };
