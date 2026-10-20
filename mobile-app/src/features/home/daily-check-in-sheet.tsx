import { Feedback } from '@/components/app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CommunityBottomSheet, { BottomSheetScrollView, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { AppTextInput } from '../../components/app-text-input';
import { AppIcon } from '../../components/app-icon';
import { SquircleCard, SquirclePressable } from '../../components/squircle-card';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle } from './visual-style-context';
import { useHomeSession, type DailyCheckIn, type HomeEntry } from './home-session';
import { toast } from '../../components/toast';
import { posthog } from '../../lib/posthog';



type CheckInPeriod = 'morning' | 'evening';
type DailyCheckInSheetProps = { date: string; onClose: () => void };

function SheetText({
  children,
  style,
  visualStyle,
  display = false,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  visualStyle: ReturnType<typeof useHomeSession>['visualStyle'];
  display?: boolean;
}) {
  const palette = useTheme();
  const colors = palette;
  const flatStyle = StyleSheet.flatten(style);
  const scale = visualStyle === 'expressive' ? (display ? 1.7 * 0.9 : 1.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER) : 1;
  const scaledType = scale === 1
    ? undefined
    : {
        fontSize: (flatStyle?.fontSize ?? 15.4) * scale,
        lineHeight: flatStyle?.lineHeight == null ? undefined : flatStyle.lineHeight * scale,
      };
  return (
    <Text
      style={[
        { color: colors.ink },
        style,
        scaledType,
        textStyleForVisualStyle(visualStyle),
      ]}
    >
      {children}
    </Text>
  );
}

function formatDateHeading(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function isEntryComplete(entry: HomeEntry, date: string) {
  return entry.status
    ? entry.status === 'completed'
    : entry.completedDates?.includes(date) ?? entry.completed;
}

export default function DailyCheckInSheet({ date, onClose }: DailyCheckInSheetProps) {
  const palette = useTheme();
  const colors = palette;  const styles = useThemedStyles(createStyles);
  const { visualStyle, checkIns, setCheckIns, confirmLocalSave, storageStatus, retrySave, entries, plans } = useHomeSession();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const savedCheckIn = checkIns.find((item) => item.date === date);
  const plannedEntries = entries.filter((entry) => entry.date === date && entry.type !== 'goal');
  const [period, setPeriod] = useState<CheckInPeriod>(savedCheckIn?.morning ? 'morning' : savedCheckIn?.evening ? 'evening' : 'morning');
  const [morningMood, setMorningMood] = useState(savedCheckIn?.morning?.mood ?? 3);
  const [morningEnergy, setMorningEnergy] = useState(savedCheckIn?.morning?.energy ?? 3);
  const [morningSleep, setMorningSleep] = useState(savedCheckIn?.morning?.sleepQuality ?? 3);
  const [morningIntention, setMorningIntention] = useState(savedCheckIn?.morning?.intention ?? '');
  const [eveningMood, setEveningMood] = useState(savedCheckIn?.evening?.mood ?? 3);
  const [eveningEnergy, setEveningEnergy] = useState(savedCheckIn?.evening?.energy ?? 3);
  const [eveningProductivity, setEveningProductivity] = useState(savedCheckIn?.evening?.productivity ?? 3);
  const [eveningSatisfaction, setEveningSatisfaction] = useState(savedCheckIn?.evening?.satisfaction ?? 3);
  const [eveningReflection, setEveningReflection] = useState(savedCheckIn?.evening?.reflection ?? '');
  const saveCheckIn = async () => {
    if (saving) return;
    setSaving(true);
    const updatedAt = new Date().toISOString();
    setCheckIns((currentItems) => {
      const current = currentItems.find((item) => item.date === date) ?? { date };
      const updated: DailyCheckIn = period === 'morning'
        ? {
            ...current,
            morning: {
              mood: morningMood,
              energy: morningEnergy,
              sleepQuality: morningSleep,
              intention: morningIntention.trim(),
              updatedAt,
            },
          }
        : {
            ...current,
            evening: {
              mood: eveningMood,
              energy: eveningEnergy,
              productivity: eveningProductivity,
              satisfaction: eveningSatisfaction,
              reflection: eveningReflection.trim(),
              updatedAt,
            },
          };
      const existingIndex = currentItems.findIndex((item) => item.date === date);
      return existingIndex < 0
        ? [...currentItems, updated]
        : currentItems.map((item, index) => index === existingIndex ? updated : item);
    });
    try { if (storageStatus === 'save-error') retrySave(); await confirmLocalSave(); } catch { setSaving(false); return; }
    setSaving(false);
    posthog?.capture('daily_check_in_saved', { period });
    toast.success(`${period === 'morning' ? 'Morning' : 'Evening'} check-in saved`, { description: 'Saved on this device.' });
  };
  const periodSaved = Boolean(savedCheckIn?.[period]);
  const saveLabel = `${periodSaved ? 'Update' : 'Save'} ${period} check-in`;
  return (
    <CommunityBottomSheet
      index={0}
      onClose={onClose}
      enablePanDownToClose
      snapPoints={['60%', '90%']}
      backgroundStyle={{ backgroundColor: colors.paper }}
    >
      <BottomSheetView style={styles.sheetRoot}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {storageStatus === 'save-error' ? <Feedback severity="error" message="Could not save this check-in. Your edits are still here." action={{ label: 'Save again', onPress: retrySave }} /> : null}
        <View style={styles.headerWrap}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <SheetText visualStyle={visualStyle} style={styles.eyebrow}>DAILY CHECK-IN</SheetText>
              <SheetText visualStyle={visualStyle} style={styles.title}>{formatDateHeading(date)}</SheetText>
              <SheetText visualStyle={visualStyle} style={styles.subtitle}>Add a note about your day.</SheetText>
            </View>
            <SquirclePressable
              pill
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close daily check-in"
              accessibilityHint="Closes the sheet. Use Save to keep any unsaved changes."
            >
              <AppIcon name="close" style={visualStyle} size={20} color={colors.ink} />
            </SquirclePressable>
          </View>
        </View>
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.planSection}>
            <View style={styles.sectionHeading}>
              <View style={styles.planIcon}><AppIcon name="calendar" style={visualStyle} size={18} color={colors.green} /></View>
              <View style={styles.sectionHeadingCopy}>
                <SheetText visualStyle={visualStyle} style={styles.sectionTitle}>Your plan</SheetText>
                <SheetText visualStyle={visualStyle} style={styles.sectionHint}>{plannedEntries.length ? `${plannedEntries.length} planned ${plannedEntries.length === 1 ? 'item' : 'items'}` : 'A quiet day is okay too'}</SheetText>
              </View>
            </View>
            {plannedEntries.length ? (
              <View style={styles.planList}>
                {plannedEntries.map((entry) => {
                  const complete = isEntryComplete(entry, date);
                  const status = entry.status && entry.status !== 'planned'
                    ? entry.status[0].toUpperCase() + entry.status.slice(1)
                    : complete ? 'Completed' : 'Planned';
                  const kind = entry.sourceType === 'routine_step'
                    ? 'Routine step'
                    : entry.type === 'habit' ? 'Habit' : 'Task';
                  const linkedGoal = entry.goalId ? plans.find((plan) => plan.id === entry.goalId)?.title : undefined;
                  return (
                    <View
                      key={entry.id}
                      style={styles.planRow}
                      accessible
                      accessibilityLabel={`${kind}: ${entry.title}, ${status}${linkedGoal ? `, linked to ${linkedGoal}` : ''}`}
                    >
                      <View style={[styles.planState, complete && styles.planStateComplete]}>
                        {complete ? <AppIcon name="check" style={visualStyle} size={13} color={palette.onInk} /> : null}
                      </View>
                      <View style={styles.planRowCopy}>
                        <SheetText visualStyle={visualStyle} style={styles.planTitle}>{entry.title}</SheetText>
                        <SheetText visualStyle={visualStyle} style={styles.planMeta}>{[kind, status, entry.time].filter(Boolean).join(' · ')}</SheetText>
                        {linkedGoal ? <SheetText visualStyle={visualStyle} style={styles.planGoal}>Goal: {linkedGoal}</SheetText> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <SheetText visualStyle={visualStyle} style={styles.emptyPlan}>Nothing planned for this date. You can still leave a reflection.</SheetText>
            )}
          </View>

          <View style={styles.checkInSection}>
            <SheetText visualStyle={visualStyle} style={styles.eyebrow}>REFLECT</SheetText>
            <SquircleCard style={styles.periodRow} accessibilityRole="radiogroup" accessibilityLabel="Choose morning or evening check-in">
              {(['morning', 'evening'] as const).map((item) => (
                <SquirclePressable
                  pill
                  key={item}
                  onPress={() => setPeriod(item)}
                  style={[styles.periodButton, period === item && styles.periodButtonSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: period === item }}
                >
                  <SheetText visualStyle={visualStyle} style={[styles.periodText, period === item && styles.periodTextSelected]}>
                    {item === 'morning' ? 'Morning' : 'Evening'}
                  </SheetText>
                </SquirclePressable>
              ))}
            </SquircleCard>

            {period === 'morning' ? (
              <>
                <RatingPicker label="Mood" value={morningMood} onChange={setMorningMood} visualStyle={visualStyle} />
                <RatingPicker label="Energy" value={morningEnergy} onChange={setMorningEnergy} visualStyle={visualStyle} />
                <RatingPicker label="Sleep quality" value={morningSleep} onChange={setMorningSleep} visualStyle={visualStyle} />
                <AppTextInput
                  value={morningIntention}
                  onChangeText={setMorningIntention}
                  placeholder="One thing I want to focus on..."
                  placeholderTextColor={palette.muted}
                  multiline
                  style={styles.reflectionInput}
                  accessibilityLabel="Morning intention"
                  maxLength={500}
                />
              </>
            ) : (
              <>
                <RatingPicker label="Mood" value={eveningMood} onChange={setEveningMood} visualStyle={visualStyle} />
                <RatingPicker label="Energy" value={eveningEnergy} onChange={setEveningEnergy} visualStyle={visualStyle} />
                <RatingPicker label="Productivity" value={eveningProductivity} onChange={setEveningProductivity} visualStyle={visualStyle} />
                <RatingPicker label="Satisfaction" value={eveningSatisfaction} onChange={setEveningSatisfaction} visualStyle={visualStyle} />
                <AppTextInput
                  value={eveningReflection}
                  onChangeText={setEveningReflection}
                  placeholder="What stood out about today?"
                  placeholderTextColor={palette.muted}
                  multiline
                  style={styles.reflectionInput}
                  accessibilityLabel="Evening reflection"
                  maxLength={1000}
                />
              </>
            )}

            <SquirclePressable
            pill
              onPress={() => void saveCheckIn()} disabled={saving}
              style={styles.saveButton}
              accessibilityRole="button"
              accessibilityLabel={saveLabel}
            >
              <SheetText visualStyle={visualStyle} style={styles.saveButtonText}>{saveLabel}</SheetText>
              <AppIcon name="check" style={visualStyle} size={18} color={palette.paper} />
            </SquirclePressable>
          </View>
        </BottomSheetScrollView>
      </KeyboardAvoidingView></BottomSheetView>
    </CommunityBottomSheet>
  );
}

function RatingPicker({
  label,
  value,
  onChange,
  visualStyle,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  visualStyle: ReturnType<typeof useHomeSession>['visualStyle'];
}) {
    const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.ratingGroup}>
      <SheetText visualStyle={visualStyle} style={styles.fieldLabel}>{label}</SheetText>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((score) => (
          <SquirclePressable
            pill
            key={score}
            onPress={() => onChange(score)}
            style={[styles.ratingChoice, value === score && styles.ratingChoiceSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: value === score }}
            accessibilityLabel={`${label} ${score} of 5`}
          >
            <SheetText visualStyle={visualStyle} style={[styles.ratingText, value === score && styles.ratingTextSelected]}>{score}</SheetText>
          </SquirclePressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (palette: AppTheme) => { const colors = palette;  return StyleSheet.create({
  sheetRoot: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  headerWrap: { paddingHorizontal: LayoutSpacing.sheetInset, paddingTop: 14, paddingBottom: LayoutSpacing.related },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: LayoutSpacing.related },
  headerCopy: { flex: 1, minWidth: 0, gap: LayoutSpacing.control },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  closeButton: { minWidth: 48, minHeight: 48, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: LayoutSpacing.sheetInset, paddingTop: LayoutSpacing.control, gap: LayoutSpacing.section },
  planSection: { gap: LayoutSpacing.related },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: LayoutSpacing.control },
  planIcon: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightGreen },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionHint: { color: colors.muted, fontSize: 11.5, lineHeight: 16 },
  planList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  planRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: LayoutSpacing.control, paddingVertical: LayoutSpacing.control, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  planState: { width: 20, height: 20, borderRadius: 999, borderWidth: 1.5, borderColor: palette.controlBorder, alignItems: 'center', justifyContent: 'center' },
  planStateComplete: { backgroundColor: colors.green, borderColor: colors.green },
  planRowCopy: { flex: 1, gap: 2 },
  planTitle: { fontSize: 13.5, lineHeight: 18, fontWeight: '500' },
  planMeta: { color: colors.muted, fontSize: 10.5, lineHeight: 15 },
  planGoal: { color: colors.green, fontSize: 10.5, lineHeight: 15 },
  emptyPlan: { color: colors.muted, fontSize: 12.5, lineHeight: 18, paddingTop: 2 },
  checkInSection: { gap: 10 },
  periodRow: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: Radius.control, backgroundColor: palette.lightGreen },
  periodButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  periodButtonSelected: { backgroundColor: palette.green },
  periodText: { fontFamily: 'Satoshi', color: colors.muted, fontSize: 13, fontWeight: '600' },
  periodTextSelected: { color: palette.onAccent },
  ratingGroup: { gap: 6 },
  fieldLabel: { color: colors.green, fontSize: 12, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 5 },
  ratingChoice: { flex: 1, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, borderCurve: 'circular', backgroundColor: palette.lightGreen },
  ratingChoiceSelected: { backgroundColor: colors.green },
  ratingText: { fontFamily: 'Satoshi', fontSize: 13, fontWeight: '600' },
  ratingTextSelected: { color: palette.onAccent },
  reflectionInput: { minHeight: 92, paddingHorizontal: 13, paddingVertical: 12, borderRadius: Radius.control, borderWidth: 1, borderColor: palette.line, backgroundColor: colors.surface, color: colors.ink, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  saveButton: { minHeight: 54, paddingHorizontal: 18, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.ink },
  saveButtonText: { fontFamily: 'Satoshi', color: palette.paper, fontSize: 14, fontWeight: '600' },
}); };
