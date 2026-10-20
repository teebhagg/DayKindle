import { SquircleSurface } from '@/components/squircle-surface';
import { SquircleCard, SquirclePressable, type SquirclePressableProps } from '@/components/squircle-card';
import { Feedback } from '@/components/app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { Redirect, router, useLocalSearchParams, usePathname } from 'expo-router';
import { posthog } from '../lib/posthog';
import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text as NativeText, View, useWindowDimensions, type LayoutChangeEvent, type PressableProps, type TextProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInLeft,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  Extrapolation,
  Easing,
  LinearTransition,
  interpolate,
  interpolateColor,
  useReducedMotion,
  useAnimatedScrollHandler,
  useAnimatedProps,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomInRotate,
  ZoomOutRotate,
} from 'react-native-reanimated';
import { AppIcon as SharedAppIcon, type AppIconName } from '../components/app-icon';
import { AppTextInput as TextInput } from '../components/app-text-input';
import { IntroSkiaBlob } from '../components/intro-skia-blob';
import NativeActionButton from '../components/native-action-button';
import { BlurView } from 'expo-backdrop';
import { ProgressiveEdgeBlur } from '../components/progressive-edge-blur';
import { APP_HEADER_FADE_CONTENT_HEIGHT, APP_NON_TAB_HEADER_HEIGHT } from '../components/header-gradient-metrics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayScheduleTemplates } from '../features/home/day-schedules';
import { seedHomeSession, useHomeSession, type AccountType, type OnboardingProfile, type VisualStyle } from '../features/home/home-session';
import AnimatedCheckbox from '../features/home/animated-checkbox';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';
import { useAccount } from '../features/account/account-provider';
import AppleAuthButton from '../features/account/apple-auth-button';
import { GoogleGlyph } from '../features/account/google-glyph';
import { authProviderLabelTypography } from '../features/account/auth-provider-typography';
import { WelcomeAuthScreen } from '../features/account/welcome-auth-screen';
import { toast } from '../components/toast';
import { useSplashTargetReporter } from '../features/home/splash-transition-context';
import { SyncConsentDialog } from '../features/account/sync-consent-dialog';

type Step = 0 | 1 | 2 | 3 | 4;
function Text({ style, display = false, ...props }: TextProps & { display?: boolean }) {
  const visualStyle = useContext(VisualStyleContext);
  const requestedStyle = StyleSheet.flatten(style);
  const hasHandwrittenFontScale = requestedStyle?.fontFamily === 'DeliciousHandrawn-Regular';
  const expressiveBaseScale = display || hasHandwrittenFontScale ? 1.7 : 1.2;
  const expressiveScale = visualStyle === 'expressive' ? (display ? expressiveBaseScale * 0.9 : expressiveBaseScale * EXPRESSIVE_FONT_SIZE_MULTIPLIER) : 1;
  const scaledTypography = expressiveScale === 1 ? undefined : {
    fontSize: (requestedStyle?.fontSize ?? 15.4) * expressiveScale,
    lineHeight: requestedStyle?.lineHeight == null ? undefined : requestedStyle.lineHeight * expressiveScale,
  };
  return <NativeText {...props} style={[style, scaledTypography, textStyleForVisualStyle(visualStyle)]} />;
}

function IntroFadeText({
  text,
  textStyle,
  lineStyle,
  stepKey,
  delay = 0,
  reduceMotion,
  display = false,
}: {
  text: string;
  textStyle: StyleProp<TextStyle>;
  lineStyle?: StyleProp<ViewStyle>;
  stepKey: number;
  delay?: number;
  reduceMotion: boolean | null;
  display?: boolean;
}) {
    const styles = useThemedStyles(createStyles);
  const words = text.trim().split(/\s+/);

  return (
    <View style={[styles.introFadeLine, lineStyle]} accessible accessibilityRole="text" accessibilityLabel={text}>
      {words.map((word, index) => (
        <IntroFadeWord
          key={`${stepKey}-${index}-${word}`}
          word={word}
          textStyle={textStyle}
          display={display}
          delay={delay + index * introFadeWordDelay}
          reduceMotion={Boolean(reduceMotion)}
        />
      ))}
    </View>
  );
}

function IntroFadeWord({
  word,
  textStyle,
  display = false,
  delay,
  reduceMotion,
}: {
  word: string;
  textStyle: StyleProp<TextStyle>;
  display?: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
    const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(
      reduceMotion ? 0 : delay,
      withTiming(1, {
        duration: reduceMotion ? 100 : introFadeDuration,
        easing: Easing.out(Easing.cubic),
      }),
    ));
    return () => cancelAnimation(progress);
  }, [delay, progress, reduceMotion]);
  const wordStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion ? [] : [
      { translateY: interpolate(progress.value, [0, 1], [6, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.985, 1], Extrapolation.CLAMP) },
    ],
  }));
  const blurProps = useAnimatedProps(() => ({
    intensity: reduceMotion
      ? 0
      : interpolate(progress.value, [0, 0.45, 1], [8, 3, 0], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.introFadeWord, wordStyle]}>
      <Text display={display} style={textStyle}>{word}{' '}</Text>
      <AnimatedBlurView
        tint="extraLight"
        style={StyleSheet.absoluteFill}
        animatedProps={blurProps}
      />
    </Animated.View>
  );
}

function IntroPaginationDot({
  index,
  selectedIndex,
  reduceMotion,
}: {
  index: number;
  selectedIndex: number;
  reduceMotion: boolean | null;
}) {
  const palette = useTheme();  const { green } = palette; const styles = useThemedStyles(createStyles);
  const animatedIndex = useDerivedValue(() => (
    reduceMotion
      ? selectedIndex
      : withSpring(selectedIndex, { damping: 18, stiffness: 190, mass: 0.7 })
  ));
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(animatedIndex.value - index), 1);
    return {
      width: interpolate(distance, [0, 1], [21, 6], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(distance, [0, 1], [green, palette.lightGreen]),
    };
  });
  return <Animated.View style={[styles.introPageDot, animatedStyle]} />;
}

const areas = [
  { id: 'health', label: 'Health', icon: 'health' },
  { id: 'fitness', label: 'Fitness', icon: 'fitness' },
  { id: 'sleep', label: 'Sleep & recovery', icon: 'sleep' },
  { id: 'career', label: 'Career', icon: 'work' },
  { id: 'finance', label: 'Finance', icon: 'money' },
  { id: 'learning', label: 'Learning', icon: 'goal' },
  { id: 'relationships', label: 'Relationships', icon: 'relationships' },
  { id: 'family', label: 'Family', icon: 'relationships' },
  { id: 'social', label: 'Social', icon: 'relationships' },
  { id: 'productivity', label: 'Productivity', icon: 'clock' },
  { id: 'personal_development', label: 'Personal growth', icon: 'sparkle' },
  { id: 'mental_wellbeing', label: 'Mental wellbeing', icon: 'mind' },
  { id: 'spirituality', label: 'Spirituality', icon: 'sparkle' },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'home' },
  { id: 'custom', label: 'Something else', icon: 'sparkle' },
] as const;

const starterPlans = [
  { id: 'gentle_movement', area: 'health', icon: 'health', title: 'Feel better in your body', detail: 'Build a small movement habit that fits your week.', firstStep: 'Choose one 15-minute activity to try this week.', plan: 'A flexible goal, a simple weekly rhythm, and a short progress check-in.' },
  { id: 'movement_rhythm', area: 'fitness', icon: 'fitness', title: 'Find a movement rhythm', detail: 'Make activity easier to repeat, one session at a time.', firstStep: 'Pick two days that usually work for movement.', plan: 'A weekly target, easy session ideas, and room to adjust.' },
  { id: 'sleep_routine', area: 'sleep', icon: 'sleep', title: 'Create a calmer evening', detail: 'Build a wind-down routine that supports better rest.', firstStep: 'Choose one thing to pause before bedtime.', plan: 'A bedtime routine, a small first step, and a weekly reflection.' },
  { id: 'career_step', area: 'career', icon: 'work', title: 'Make progress at work', detail: 'Turn one career priority into a steady next step.', firstStep: 'Name one skill or project you want to move forward.', plan: 'A clear outcome, small milestones, and focused work sessions.' },
  { id: 'money_checkin', area: 'finance', icon: 'money', title: 'Feel more in control of money', detail: 'Start with a simple, repeatable money check-in.', firstStep: 'Set aside 15 minutes to review one part of your finances.', plan: 'A personal goal, recurring check-in, and monthly review.' },
  { id: 'learning_blocks', area: 'learning', icon: 'goal', title: 'Keep learning consistently', detail: 'Make space for a skill or subject you care about.', firstStep: 'Choose a small learning block for this week.', plan: 'A learning goal, short sessions, and visible milestones.' },
  { id: 'relationship_time', area: 'relationships', icon: 'relationships', title: 'Show up for someone important', detail: 'Make meaningful connection easier to remember.', firstStep: 'Choose one person you want to check in with.', plan: 'A relationship intention, a gentle recurring action, and reflection.' },
  { id: 'family_connection', area: 'family', icon: 'relationships', title: 'Make more room for family', detail: 'Create a rhythm for the time and care you want to give.', firstStep: 'Pick one small way to connect this week.', plan: 'A flexible connection goal and actions that fit your schedule.' },
  { id: 'social_energy', area: 'social', icon: 'relationships', title: 'Build a social rhythm that feels good', detail: 'Create more space for the connections you value.', firstStep: 'Think of one low-pressure plan you would enjoy.', plan: 'A personal intention, small actions, and a monthly check-in.' },
  { id: 'daily_focus', area: 'productivity', icon: 'clock', title: 'Make space for focused work', detail: 'Protect time for the work that matters most.', firstStep: 'Choose one distraction-light block this week.', plan: 'A focus goal, planned sessions, and a simple review.' },
  { id: 'personal_growth', area: 'personal_development', icon: 'sparkle', title: 'Grow in a way that feels like yours', detail: 'Turn an intention into one practice you can repeat.', firstStep: 'Write down one quality you want to strengthen.', plan: 'A meaningful goal, small practices, and regular reflection.' },
  { id: 'mindful_pause', area: 'mental_wellbeing', icon: 'mind', title: 'Create more breathing room', detail: 'Try a small practice that helps you reset.', firstStep: 'Choose a five-minute pause for one day this week.', plan: 'A wellbeing intention, a manageable practice, and gentle check-ins.' },
  { id: 'spiritual_practice', area: 'spirituality', icon: 'sparkle', title: 'Make space for reflection', detail: 'Build a rhythm around the practice that grounds you.', firstStep: 'Choose a time for a short reflective moment.', plan: 'A personal intention, recurring practice, and weekly reflection.' },
  { id: 'life_rhythm', area: 'lifestyle', icon: 'home', title: 'Shape a day that feels more balanced', detail: 'Start with one routine that would make daily life easier.', firstStep: 'Choose one part of your day to simplify.', plan: 'A lifestyle goal, small routine changes, and a review point.' },
  { id: 'personal_goal', area: 'custom', icon: 'sparkle', title: 'Start with what matters to you', detail: 'Shape a goal around an area that is unique to your life.', firstStep: 'Write one sentence about what you want to change.', plan: 'A goal you define, flexible actions, and check-ins at your pace.' },
] as const;

const introSlides = [
  {
    eyebrow: 'GOALS, HABITS, AND TASKS',
    title: 'Choose what to work on.',
    body: 'Keep your goals, repeat habits, and one-time tasks in one place.',
    icon: 'goal',
    cardTitle: 'Start with a goal',
    cardBody: 'A goal is an outcome. Tasks and habits are steps toward it.',
  },
  {
    eyebrow: 'FROM INTENTION TO ACTION',
    title: 'Plan your next steps.',
    body: 'Choose a template or create a routine. Edit its actions and repeat days.',
    icon: 'calendar',
    cardTitle: 'Build a routine',
    cardBody: 'A routine groups actions into a daily plan.',
  },
  {
    eyebrow: 'DAILY NOTES',
    title: 'Add a note about your day.',
    body: 'Record how you felt and what helped. A check-in does not complete your tasks.',
    icon: 'clock',
    cardTitle: 'Check in when you need to',
    cardBody: 'Notes are optional. You can return to them later.',
  },
  {
    eyebrow: 'REVIEW YOUR ACTIVITY',
    title: 'See what you did.',
    body: 'Record completed actions in Today. Review your activity in Progress and History.',
    icon: 'check',
    cardTitle: 'Keep your plan flexible',
    cardBody: 'Missed a day? Adjust your next step and continue.',
  },
] as const;






const footerBackButtonWidth = 58;
const footerNavigationGap = 10;
const introFadeWordDelay = 10;
const introFadeDuration = 231;
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const DAYKINDLE_LOGO = require('../../assets/images/daykindle-logo.png');

export default function OnboardingScreen() {
  const palette = useTheme();  const { ink, green, paper } = palette; const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ mode?: string }>();
  const pathname = usePathname();
  const isLinkMode = params.mode === 'link';
  const isAuthMode = params.mode === 'auth' || params.mode === 'welcome' || pathname === '/auth';
  const planner = useHomeSession();
  const { onboardingCompleted, onboarding, setOnboarding, setOnboardingCompleted, startFreshGuestData } = planner;
  const account = useAccount();
  const accountUserId = account.user?.id;
  const accountUserProvider = account.user?.app_metadata.provider;
  const hasSavedCloudOnboarding = account.hasSavedCloudOnboarding;
  const { reportTarget: reportSplashTarget, reportNoTarget: reportNoSplashTarget } = useSplashTargetReporter();
  const sunLogoTargetRef = useRef<View>(null);
  const [step, setStep] = useState<Step>(isLinkMode || isAuthMode ? 1 : 0);
  const [introStep, setIntroStep] = useState(0);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [customAreaName, setCustomAreaName] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [visualStyle, setVisualStyle] = useState<VisualStyle | null>(null);
  const [routineTemplateId, setRoutineTemplateId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('guest');
  const [syncConsent, setSyncConsent] = useState(false);
  const [syncConsentAt, setSyncConsentAt] = useState<string | null>(null);
  const [syncConsentDialogVisible, setSyncConsentDialogVisible] = useState(false);
  const syncConsentResolver = useRef<((sync: boolean) => void) | null>(null);
  const [accountSkipBusy, setAccountSkipBusy] = useState(false);
  const [cloudCheckState, setCloudCheckState] = useState<{ userId: string; status: 'checking' | 'found' | 'not-found' | 'error' } | null>(null);
  const [cloudCheckAttempt, setCloudCheckAttempt] = useState(0);
  const plannerRef = useRef(planner);
  useEffect(() => { plannerRef.current = planner; }, [planner]);
    const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const contentScrollY = useSharedValue(0);
  const onContentScroll = useAnimatedScrollHandler({ onScroll: (event) => { contentScrollY.value = event.contentOffset.y; } });
  useEffect(() => { contentScrollY.value = 0; }, [contentScrollY, introStep, isLinkMode, step]);
  // Route params may change while this route remains mounted; preserve the intended auth-entry reset.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isLinkMode || isAuthMode) {
      setStep(1);
      setIntroStep(0);
    }
  }, [isAuthMode, isLinkMode]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const shouldCheckInitialCloudOnboarding = !isLinkMode && !isAuthMode && !onboardingCompleted && !account.loading && Boolean(accountUserId) && account.initialUserId === accountUserId;
  const initialCloudCheckStatus = cloudCheckState && cloudCheckState.userId === accountUserId ? cloudCheckState.status : 'checking';
  const shouldHoldForInitialCloudCheck = shouldCheckInitialCloudOnboarding && initialCloudCheckStatus !== 'not-found';
  useEffect(() => {
    if (!shouldCheckInitialCloudOnboarding || !accountUserId) return;
    const userId = accountUserId;
    let active = true;
    void hasSavedCloudOnboarding(userId).then(async (hasSavedOnboarding) => {
      if (!active) return;
      if (!hasSavedOnboarding) {
        setCloudCheckState({ userId, status: 'not-found' });
        return;
      }
      const currentPlanner = plannerRef.current;
      const existing = currentPlanner.onboarding;
      const keepConsent = Boolean(existing?.syncConsent && existing.syncConsentUserId === userId);
      const provider: AccountType = accountUserProvider === 'apple' ? 'apple' : 'google';
      const profile: OnboardingProfile = {
        ...(existing ?? {
          accountType: provider,
          syncConsent: false,
          syncConsentAt: null,
          syncConsentUserId: null,
          routineTemplateIds: [],
          appearance: currentPlanner.visualStyle,
          areas: [],
          customAreaName: '',
        }),
        accountType: provider,
        syncConsent: keepConsent,
        syncConsentAt: keepConsent ? existing?.syncConsentAt ?? null : null,
        syncConsentUserId: keepConsent ? userId : null,
      };
      setCloudCheckState({ userId, status: 'found' });
      currentPlanner.setOnboarding(profile);
      currentPlanner.setOnboardingCompleted(true);
      try {
        if (currentPlanner.storageStatus === 'save-error') currentPlanner.retrySave();
        await currentPlanner.confirmLocalSave();
      } catch {
        // The signed-in cloud record remains available for the next launch check.
      }
    }).catch(() => {
      if (active) {
        setCloudCheckState({ userId, status: 'error' });
        toast.error('Could not check your saved setup', { description: 'Retry before starting onboarding.' });
      }
    });
    return () => { active = false; };
  }, [hasSavedCloudOnboarding, accountUserId, accountUserProvider, cloudCheckAttempt, isAuthMode, isLinkMode, shouldCheckInitialCloudOnboarding]);
  const toggleArea = (id: string) => {
    setSelectedAreas((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const togglePlan = (id: string) => {
    setSelectedPlans((current) => current.includes(id)
      ? []
      : [id]);
  };
  const getOnboardingProfile = (): OnboardingProfile => ({
    accountType,
    syncConsent,
    syncConsentAt,
    syncConsentUserId: syncConsent ? account.user?.id ?? onboarding?.syncConsentUserId ?? null : null,
    routineTemplateIds: routineTemplateId ? [routineTemplateId] : [],
    appearance: visualStyle ?? 'formal',
    areas: areas.filter((area) => selectedAreas.includes(area.id)).map((area) => ({
      id: area.id,
      label: area.id === 'custom' && customAreaName.trim() ? customAreaName.trim() : area.label,
    })),
    customAreaName: customAreaName.trim(),
  });
  const continueAfterIntro = () => setStep(1);
  const resolveSyncConsent = (sync: boolean) => {
    const resolve = syncConsentResolver.current;
    syncConsentResolver.current = null;
    setSyncConsentDialogVisible(false);
    resolve?.(sync);
  };
  const requestSyncConsent = () => new Promise<boolean>((resolve) => {
    if (Platform.OS === 'android') {
      syncConsentResolver.current = resolve;
      setSyncConsentDialogVisible(true);
      return;
    }
    Alert.alert(
      'Sync your planner?',
      'Choose whether to sync your planner to this account or keep it on this device. You can change this in Profile.',
      [
        { text: 'Keep on this device', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sync my planner', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
  const handleProviderSignIn = async (provider: 'google' | 'apple') => {
    try {
      const user = provider === 'google' ? await account.signInWithGoogle() : await account.signInWithApple();
      if (!user) return;
      const hasSavedOnDevice = onboardingCompleted;
      const hasSavedInCloud = !isLinkMode && !hasSavedOnDevice && await account.hasSavedCloudOnboarding(user.id);
      const consent = await requestSyncConsent();
      const consentAt = consent ? new Date().toISOString() : null;
      setAccountType(provider);
      setSyncConsent(consent);
      setSyncConsentAt(consentAt);
      const savedOnboarding = onboarding ?? getOnboardingProfile();
      const updatedOnboarding: OnboardingProfile = { ...savedOnboarding, accountType: provider, syncConsent: consent, syncConsentAt: consentAt, syncConsentUserId: consent ? user.id : null };
      setOnboarding(updatedOnboarding);
      if (hasSavedInCloud) setOnboardingCompleted(true);
      await planner.confirmLocalSave();
      if (isLinkMode || hasSavedOnDevice || hasSavedInCloud) {
        router.replace('/(tabs)');
      } else {
        setStep(2);
      }
    } catch {
      toast.error('Sign-in could not finish', { description: 'Retry, or continue as a guest.' });
    }
  };
  const continueAsGuest = async () => {
    setAccountSkipBusy(true);
    try {
      await account.signOutToGuest();
      setAccountType('guest');
      setSyncConsent(false);
      setSyncConsentAt(null);
      setOnboarding((current) => current ? { ...current, accountType: 'guest', syncConsent: false, syncConsentAt: null, syncConsentUserId: null } : null);
      if (isLinkMode || onboardingCompleted) router.replace('/(tabs)');
      else setStep(2);
    } catch {
      toast.error('Could not switch to a guest workspace', {
        description: 'Try again in a moment.',
      });
    } finally {
      setAccountSkipBusy(false);
    }
  };
  const [finishingSetup, setFinishingSetup] = useState(false);
  const [setupError, setSetupError] = useState('');
  const next = async () => {
    if (finishingSetup) return;
    if (step === 0) {
      if (introStep === 0) setIntroStep(1);
      else if (introStep < introSlides.length) setIntroStep((current) => current + 1);
      else continueAfterIntro();
      return;
    }
    if (step === 4) {
      const selectedStarterPlans = starterPlans.filter((plan) => selectedPlans.includes(plan.id)).map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.detail,
        firstStep: plan.firstStep,
        lifeAreaId: plan.area,
      }));
      const selectedSchedules = dayScheduleTemplates.filter((schedule) => schedule.id === routineTemplateId);
      setFinishingSetup(true);
      seedHomeSession(visualStyle ?? 'formal', selectedStarterPlans, getOnboardingProfile(), selectedSchedules);
      try {
        if (planner.storageStatus === 'save-error') planner.retrySave();
        await planner.confirmLocalSave();
      } catch { setSetupError('Could not save your setup. Keep the app open and try again.'); setFinishingSetup(false); return; }
      posthog?.capture('onboarding_completed', { account_type: accountType, starter_plan_count: selectedStarterPlans.length, has_routine: selectedSchedules.length > 0 });
      setFinishingSetup(false);
      router.replace('/(tabs)');
      toast.success('Your planner is ready', { description: 'Saved on this device.' });
      return;
    }
    setStep((current) => Math.min(current + 1, 4) as Step);
  };
  const skipAccountSetup = async () => {
    if (isLinkMode) { router.replace('/(tabs)'); return; }
    setAccountSkipBusy(true);
    try {
      await account.signOutToGuest();
      if (onboardingCompleted) {
        setOnboarding((current) => current ? { ...current, accountType: 'guest', syncConsent: false, syncConsentAt: null, syncConsentUserId: null } : null);
        router.replace('/(tabs)');
      } else if (await startFreshGuestData()) router.replace('/(tabs)');
      else toast.error('Could not prepare a fresh guest workspace', { description: 'Try again or restore your saved data.' });
    } catch {
      toast.error('Could not switch to a fresh guest workspace', {
        description: 'Try again in a moment.',
      });
    } finally {
      setAccountSkipBusy(false);
    }
  };
  const back = () => {
    if (step === 0 && introStep > 0) {
      if (introStep === 1) return;
      setIntroStep((current) => current - 1);
      return;
    }
    setStep((current) => Math.max(current - 1, 0) as Step);
  };
  const goToStart = () => {
    if (isLinkMode) { router.back(); return; }
    setStep(0);
    setIntroStep(0);
  };
  const showingIntro = step === 0 && introStep > 0;
  const showingWelcome = step === 0 && introStep === 0;
  const canFlySplashLogo = showingWelcome && !shouldHoldForInitialCloudCheck && !onboardingCompleted && !isLinkMode && !isAuthMode;
  const showingAccountChoice = step === 1;
  const footerStep = showingIntro && introStep === introSlides.length ? 0 : step;
  useEffect(() => {
    if (!canFlySplashLogo) reportNoSplashTarget();
  }, [canFlySplashLogo, reportNoSplashTarget]);
  const measureSplashLogoTarget = useCallback(() => {
    if (!canFlySplashLogo) return;
    requestAnimationFrame(() => sunLogoTargetRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) reportSplashTarget({ x, y, width, height });
    }));
  }, [canFlySplashLogo, reportSplashTarget]);
  const introBlobMotion = useSharedValue(0);
  const introBlobFloatMotion = useSharedValue(0);
  const introBlobFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(introBlobFloatMotion.value, [0, 1], [0, -4], Extrapolation.CLAMP) }],
  }));
  useEffect(() => {
    cancelAnimation(introBlobMotion);
    cancelAnimation(introBlobFloatMotion);
    if (reduceMotion || !showingIntro) {
      introBlobMotion.set(0);
      introBlobFloatMotion.set(0);
      return;
    }

    introBlobMotion.set(withRepeat(
      withTiming(4, { duration: 7200, easing: Easing.linear }),
      -1,
      false,
    ));
    introBlobFloatMotion.set(withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    ));
    return () => {
      cancelAnimation(introBlobMotion);
      cancelAnimation(introBlobFloatMotion);
    };
  }, [introBlobMotion, introBlobFloatMotion, reduceMotion, showingIntro]);
  if (shouldHoldForInitialCloudCheck) {
    return <VisualStyleContext.Provider value={visualStyle ?? planner.visualStyle}>
      <View style={[styles.safeArea, { minHeight: windowHeight, justifyContent: 'center', paddingHorizontal: 28, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text display style={{ fontSize: 27.5, lineHeight: 35.2, fontWeight: '600', color: ink, textAlign: 'center' }}>{initialCloudCheckStatus === 'error' ? 'Could not check your saved setup.' : 'Checking your saved setup.'}</Text>
        <Text style={[styles.body, { maxWidth: 340, alignSelf: 'center', textAlign: 'center' }]}>{initialCloudCheckStatus === 'error' ? 'Your account is connected, but its saved planner could not be checked. Retry before starting onboarding.' : 'Looking for onboarding already saved to this account.'}</Text>
        {initialCloudCheckStatus === 'error' ? <SquirclePressable onPress={() => setCloudCheckAttempt((value) => value + 1)} style={[styles.primaryButton, { minHeight: 52, alignSelf: 'center', marginTop: 24 }]} accessibilityRole="button"><Text style={styles.primaryButtonText}>Try again</Text></SquirclePressable> : null}
      </View>
    </VisualStyleContext.Provider>;
  }
  if (onboardingCompleted && !isLinkMode && !isAuthMode) return <Redirect href="/(tabs)" />;

  return (
    <VisualStyleContext.Provider value={visualStyle ?? 'formal'}>
    <View style={[styles.safeArea, { minHeight: windowHeight }]} >
      <Animated.View
        key={`${step}-${introStep}`}
        entering={FadeIn.duration(reduceMotion ? 100 : showingIntro ? 198 : 180)}
      exiting={FadeOut.duration(showingIntro && !reduceMotion ? 239 : reduceMotion ? 60 : 100)}
        style={[styles.stepContent, { minHeight: windowHeight }]}
      >
      {step === 0 && introStep === 0 && (
        <View style={[styles.welcome, { paddingTop: insets.top + 56 }]}>
          <Animated.View entering={FadeIn.duration(reduceMotion ? 100 : 220).delay(40)} style={styles.sunMark}>
            <View ref={sunLogoTargetRef} collapsable={false} onLayout={measureSplashLogoTarget} style={styles.sunLogoTarget}>
              <SquircleSurface style={styles.sunLogoSquircle} radius={30}>
                <Image source={DAYKINDLE_LOGO} resizeMode="cover" style={styles.sunLogoImage} accessible={false} />
              </SquircleSurface>
            </View>
          </Animated.View>
          <Text style={styles.eyebrow}>A LITTLE MORE INTENTION, EVERY DAY</Text>
          <Text display style={styles.hero}>Make room for what matters.</Text>
          <Text style={styles.intro}>A calmer way to make plans, keep promises to yourself, and find your rhythm.</Text>
          <View style={styles.welcomeNote}>
            <AppIcon name="sparkle" size={18} color={palette.muted} />
            <Text style={styles.noteText}>Progress that meets you where you are.</Text>
          </View>
          <View style={[styles.bottomBlock, { paddingBottom: insets.bottom + 92 }]}>
            <Text style={styles.privacyNote}>Your life, at your pace. Always yours to shape.</Text>
          </View>
        </View>
      )}

      {showingIntro && (() => {
        const slide = introSlides[introStep - 1];
        return <View style={[styles.content, styles.introContent, { minHeight: windowHeight, paddingTop: insets.top + 100, paddingBottom: insets.bottom + 116 }]}>
          <Animated.View
            entering={reduceMotion
              ? FadeIn.duration(100)
              : ZoomInRotate.duration(306).rotate('-0.11').withInitialValues({ transform: [{ scale: 0.9 }, { rotate: '-0.11rad' }] })}
            exiting={reduceMotion
              ? FadeOut.duration(70)
              : ZoomOutRotate.duration(220).rotate('0.1').withTargetValues({ transform: [{ scale: 0.92 }, { rotate: '0.1rad' }] })}
            style={styles.introIllustration}
          >
            <Animated.View style={[styles.introOrbit, introBlobFloatStyle]}>
              <IntroSkiaBlob progress={introBlobMotion} outline />
            </Animated.View>
            <Animated.View style={[styles.introIcon, introBlobFloatStyle]}>
              <IntroSkiaBlob progress={introBlobMotion} />
              <AppIcon name={slide.icon} size={34} color={green} />
            </Animated.View>
            <View style={styles.introSparkle}><AppIcon name="sparkle" size={17} color={palette.muted} /></View>
          </Animated.View>
          <View style={styles.introCopy}>
            <IntroFadeText
              text={slide.eyebrow}
              textStyle={[styles.eyebrow, { marginBottom: 0 }]}
              lineStyle={styles.introEyebrowLine}
              stepKey={introStep}
              reduceMotion={reduceMotion}
            />
            <IntroFadeText
              text={slide.title}
              textStyle={styles.heading}
              stepKey={introStep}
              delay={35}
              reduceMotion={reduceMotion}
              display
            />
            <IntroFadeText
              text={slide.body}
              textStyle={[styles.body, { marginTop: 0, maxWidth: undefined }]}
              lineStyle={styles.introBodyLine}
              stepKey={introStep}
              delay={75}
              reduceMotion={reduceMotion}
            />
          </View>
          <Animated.View entering={reduceMotion ? FadeIn.duration(80) : FadeInUp.duration(363).delay(130)}>
            <SquircleCard style={styles.introCard}>
              <View style={styles.introCardIcon}><AppIcon name={slide.icon} size={19} color={green} /></View>
              <View style={styles.introCardCopy}>
                <IntroFadeText text={slide.cardTitle} textStyle={styles.introCardTitle} stepKey={introStep} delay={90} reduceMotion={reduceMotion} />
                <IntroFadeText text={slide.cardBody} textStyle={styles.introCardBody} stepKey={introStep} delay={115} reduceMotion={reduceMotion} />
              </View>
            </SquircleCard>
          </Animated.View>
        </View>;
      })()}

      {showingAccountChoice && !isLinkMode && <WelcomeAuthScreen
        accountConfigured={account.configured}
        busy={account.signingIn || accountSkipBusy}
        skipBusy={accountSkipBusy}
        onApple={() => void handleProviderSignIn('apple')}
        onGoogle={() => void handleProviderSignIn('google')}
        onGuest={() => void continueAsGuest()}
        onSkip={() => void skipAccountSetup()}
      />}

      {showingAccountChoice && isLinkMode && <Animated.ScrollView onScroll={onContentScroll} scrollEventThrottle={16} contentContainerStyle={[styles.content, styles.introContent, { minHeight: windowHeight, paddingTop: insets.top + 100, paddingBottom: insets.bottom + 116 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduceMotion ? FadeIn.duration(80) : FadeInUp.duration(400).delay(30)} style={styles.accountIllustration}><View style={styles.accountIllustrationRing} /><View style={styles.accountIllustrationIcon}><AppIcon name="cloud" size={32} color={green} /></View><View style={styles.localBadge}><AppIcon name="check" size={15} color={green} /></View></Animated.View>
        <Animated.View entering={reduceMotion ? FadeIn.duration(80) : FadeInUp.duration(360).delay(90)}><Text style={styles.eyebrow}>{isLinkMode ? 'CONNECT YOUR ACCOUNT' : 'YOUR PROGRESS, YOUR CHOICE'}</Text><Text display style={styles.heading}>{isLinkMode ? 'Sign in to sync.' : 'Choose how to begin.'}</Text><Text style={styles.body}>{isLinkMode ? 'Your current guest data stays on this device until you approve syncing.' : 'Sign in to sync across devices, or continue as a guest. You can start with a clean slate.'}</Text></Animated.View>
        <View style={styles.accountActions}>
          <SquirclePressable pill onPress={() => void handleProviderSignIn('google')} disabled={account.signingIn || accountSkipBusy || !account.configured} style={[styles.accountProviderButton, (account.signingIn || accountSkipBusy || !account.configured) && styles.accountProviderButtonDisabled]} accessibilityRole="button" accessibilityLabel="Continue with Google">
            <GoogleGlyph size={19} /><NativeText style={[styles.accountProviderText, authProviderLabelTypography(visualStyle ?? 'formal', 14.3)]}>{account.signingIn ? 'Connecting…' : 'Continue with Google'}</NativeText>
          </SquirclePressable>
          {Platform.OS === 'ios' && <AppleAuthButton onPress={() => void handleProviderSignIn('apple')} disabled={account.signingIn || accountSkipBusy || !account.configured} labelFontSize={14.3} />}
          {!isLinkMode && <SquirclePressable pill onPress={continueAsGuest} disabled={account.signingIn || accountSkipBusy} style={styles.accountProviderButton} accessibilityRole="button" accessibilityLabel="Continue as guest"><View style={styles.accountProviderMark}><AppIcon name="profile" size={19} color={green} /></View><Text style={styles.accountProviderText}>Guest</Text></SquirclePressable>}
          {!account.configured && <Text style={styles.localPrivacyNote}>Provider sign-in needs Supabase project settings and platform credentials. Guest mode is ready now.</Text>}
          <Pressable onPress={() => router.back()} style={styles.accountSkipAction} accessibilityRole="button"><Text style={styles.accountSkipText}>Not now</Text></Pressable>
        </View>
        <Text style={styles.localPrivacyNote}>Guest plans and check-ins stay on this device. Sync only starts after you choose it.</Text>
      </Animated.ScrollView>}

      {step === 2 && (
        <>
          <Animated.ScrollView onScroll={onContentScroll} scrollEventThrottle={16} contentContainerStyle={[styles.content, { minHeight: windowHeight, paddingTop: insets.top + 90, paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>START WITH WHAT MATTERS</Text>
            <Text display style={styles.heading}>What would you like to focus on?</Text>
            <Text style={styles.body}>Choose any life areas, then pick one matching starter goal if you want. You can change these any time.</Text>
            <View style={styles.areaGrid}>
              {areas.map((area) => {
                const selected = selectedAreas.includes(area.id);
                return (
                  <MotionPressable
                    key={area.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleArea(area.id)}
                    style={[styles.areaTile, selected && styles.areaTileSelected]}
                  >
                    <AppIcon name={area.icon} color={selected ? green : palette.muted} />
                    <Text style={[styles.areaLabel, selected && styles.areaLabelSelected]}>{area.label}</Text>
                    <View style={styles.areaCheck}><AnimatedCheckbox checked={selected} color={selected ? green : palette.muted} size={25} reduceMotion={reduceMotion} /></View>
                  </MotionPressable>
                );
              })}
            </View>
            {selectedAreas.includes('custom') && (
              <Animated.View entering={FadeIn.duration(reduceMotion ? 80 : 160)} exiting={FadeOut.duration(reduceMotion ? 60 : 120)}>
                <TextInput
                  value={customAreaName}
                  onChangeText={setCustomAreaName}
                  placeholder="Name your life area"
                  placeholderTextColor={palette.muted}
                  accessibilityLabel="Custom life area name"
                  style={[styles.customAreaInput, { fontFamily: visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi' }]}
                  maxLength={32}
                />
              </Animated.View>
            )}
            <Text style={styles.selectedHint}>{selectedAreas.length ? `${selectedAreas.length} area${selectedAreas.length === 1 ? '' : 's'} selected` : 'Pick one or more to get started'}</Text>
            <Text style={styles.sectionLabel}>ONE STARTER GOAL · OPTIONAL</Text>
            {starterPlans.filter((plan) => selectedAreas.includes(plan.area)).map((plan) => {
              const selected = selectedPlans.includes(plan.id);
              return <SquirclePressable exactSquircle key={plan.id} onPress={() => togglePlan(plan.id)} style={[styles.starterGoalChoice, selected && styles.starterGoalChoiceSelected]} accessibilityRole="radio" accessibilityState={{ selected }}>
                <View style={styles.starterGoalTop}><AppIcon name={plan.icon} size={19} color={green} /><Text style={styles.starterGoalTitle}>{plan.title}</Text><View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>{selected && <View style={styles.radioDot} />}</View></View>
                <Text style={styles.starterGoalDetail}>{plan.detail}</Text><Text style={styles.starterGoalFirstStep}>First step · {plan.firstStep}</Text>
              </SquirclePressable>;
            })}
            {!selectedAreas.length && <Text style={styles.selectedHint}>Choose an area above to see a matching goal. You can also skip both.</Text>}
          </Animated.ScrollView>
        </>
      )}

      {step === 3 && (
        <>
          <Animated.ScrollView onScroll={onContentScroll} scrollEventThrottle={16} contentContainerStyle={[styles.content, { minHeight: windowHeight, paddingTop: insets.top + 90, paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
            <Text display style={styles.heading}>Choose your{ '\n' }appearance style.</Text>
            <Text style={styles.body}>Choose a look for DayKindle, or keep the refined default. You can change this later in Appearance.</Text>
            <View style={styles.visualOptions}>
              <MotionPressable exactSquircle onPress={() => setVisualStyle('formal')} style={[styles.visualCard, visualStyle === 'formal' && styles.visualCardSelected]} accessibilityRole="radio" accessibilityState={{ selected: visualStyle === 'formal' }}>
                <SquircleCard exactSquircle style={styles.previewFormal}>
                  <Text style={styles.previewFormalHeading}>Your day, in focus.</Text>
                  <View style={styles.previewIconRow}>
                    <AppIcon name="health" style="formal" size={25} />
                    <AppIcon name="check" style="formal" size={25} />
                    <AppIcon name="goal" style="formal" size={25} />
                  </View>
                  <Text style={styles.previewFormalBody}>TODAY · 3 PRIORITIES</Text>
                </SquircleCard>
                <View style={styles.visualCardFooter}>
                  <View style={styles.visualTitleWrap}><Text style={styles.visualTitle}>Refined</Text><Text style={styles.visualSubtitle}>Clean & focused</Text></View>
                  <View style={styles.radioOuter}>{visualStyle === 'formal' && <Animated.View entering={FadeIn.duration(reduceMotion ? 70 : 130)} exiting={FadeOut.duration(reduceMotion ? 50 : 100)} style={styles.radioDot} />}</View>
                </View>
                <Text style={styles.fontPair}>Satoshi + Hugeicons</Text>
              </MotionPressable>
              <MotionPressable exactSquircle onPress={() => setVisualStyle('expressive')} style={[styles.visualCard, visualStyle === 'expressive' && styles.visualCardSelected]} accessibilityRole="radio" accessibilityState={{ selected: visualStyle === 'expressive' }}>
                <SquircleCard exactSquircle style={styles.previewExpressive}>
                  <Text display style={styles.previewExpressiveHeading}>Make today count.</Text>
                  <View style={styles.previewIconRow}>
                    <AppIcon name="health" style="expressive" size={29} />
                    <AppIcon name="check" style="expressive" size={29} />
                    <AppIcon name="goal" style="expressive" size={29} />
                  </View>
                  <Text style={styles.previewExpressiveBody}>Today · 3 little priorities</Text>
                </SquircleCard>
                <View style={styles.visualCardFooter}>
                  <View style={styles.visualTitleWrap}><Text style={styles.visualTitle}>Expressive</Text><Text style={styles.visualSubtitle}>Warm & handcrafted</Text></View>
                  <View style={styles.radioOuter}>{visualStyle === 'expressive' && <Animated.View entering={FadeIn.duration(reduceMotion ? 70 : 130)} exiting={FadeOut.duration(reduceMotion ? 50 : 100)} style={styles.radioDot} />}</View>
                </View>
                <Text style={styles.fontPair}>Delicious Handrawn + Doodles</Text>
              </MotionPressable>
            </View>
            <Text style={styles.selectedHint}>{visualStyle ? 'You can change this later in Appearance.' : 'Refined is selected by default.'}</Text>
          </Animated.ScrollView>
        </>
      )}

      {step === 4 && (
        <Animated.ScrollView onScroll={onContentScroll} scrollEventThrottle={16} contentContainerStyle={[styles.content, { minHeight: windowHeight, paddingTop: insets.top + 90, paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>OPTIONAL ROUTINE</Text>
          <Text display style={styles.heading}>Would a simple rhythm help?</Text>
          <Text style={styles.body}>Start with a flexible outline for weekdays or weekends. You can edit each block later in Templates.</Text>
          <SquirclePressable exactSquircle onPress={() => setRoutineTemplateId(null)} style={[styles.routineChoice, routineTemplateId === null && styles.routineChoiceSelected]} accessibilityRole="radio" accessibilityState={{ selected: routineTemplateId === null }}>
            <View style={styles.routineChoiceIcon}><AppIcon name="sparkle" size={19} color={green} /></View><View style={styles.routineChoiceCopy}><Text style={styles.routineChoiceTitle}>No routine for now</Text><Text style={styles.routineChoiceDetail}>You can add one whenever you are ready.</Text></View><View style={[styles.radioOuter, routineTemplateId === null && styles.radioOuterSelected]}>{routineTemplateId === null && <View style={styles.radioDot} />}</View>
          </SquirclePressable>
          {dayScheduleTemplates.map((schedule) => {
            const selected = routineTemplateId === schedule.id;
            return <SquirclePressable exactSquircle key={schedule.id} onPress={() => setRoutineTemplateId(schedule.id)} style={[styles.routineChoice, selected && styles.routineChoiceSelected]} accessibilityRole="radio" accessibilityState={{ selected }}>
              <View style={styles.routineChoiceIcon}><AppIcon name={schedule.dayType === 'weekday' ? 'clock' : 'sun'} size={19} color={green} /></View><View style={styles.routineChoiceCopy}><Text style={styles.routineChoiceTitle}>{schedule.title}</Text><Text style={styles.routineChoiceDetail}>{(schedule.dayType === 'weekday' ? 'Apply Monday to Friday' : 'Apply Saturday and Sunday') + ' · ' + schedule.blocks.length + ' flexible blocks'}</Text></View><View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>{selected && <View style={styles.radioDot} />}</View>
            </SquirclePressable>;
          })}
          {accountType !== 'guest' && <SquircleCard style={styles.syncConsentNote}><AppIcon name="cloud" size={17} color={green} /><Text style={styles.syncConsentCopy}>{syncConsent ? 'Sync is on. Your planner will be saved to your account.' : 'Sync is off. Your planner will stay on this device.'}</Text></SquircleCard>}
        </Animated.ScrollView>
      )}
      </Animated.View>
      {!showingIntro && !(showingAccountChoice && !isLinkMode) && <View style={styles.headerOverlay}>
        <View style={[styles.headerBlur, styles.solidHeader, { height: insets.top + APP_NON_TAB_HEADER_HEIGHT }]}>
          <View style={[styles.topBar, { height: insets.top + APP_NON_TAB_HEADER_HEIGHT, paddingTop: insets.top }]}>
            <View style={styles.headerSide}>
          {step > 0 || showingIntro ? (
                <Animated.View
                  entering={reduceMotion ? FadeIn.duration(80) : FadeInLeft.duration(180).easing(Easing.inOut(Easing.ease))}
                  exiting={reduceMotion ? FadeOut.duration(60) : FadeOutLeft.duration(140).easing(Easing.inOut(Easing.ease))}
                >
                  <NativeActionButton label="" appearance="plain" tintColor={ink} labelColor={ink} onPress={showingIntro ? back : goToStart} accessibilityLabel={showingIntro ? 'Go to previous introduction screen' : 'Return to welcome screen'} style={styles.backButton}>
                    <AppIcon name="back" size={20} color={ink} />
                  </NativeActionButton>
                </Animated.View>
              ) : <View style={styles.backPlaceholder} />}
            </View>
            <Text display style={styles.wordmark}>DAYKINDLE <Text display style={styles.wordmarkDot}>·</Text></Text>
            <Animated.View
              layout={reduceMotion ? LinearTransition.duration(80) : LinearTransition.duration(220).easing(Easing.inOut(Easing.ease))}
              style={[styles.headerSide, styles.headerSideRight]}
            >
              {step > 1 && step <= 4 ? <Animated.View entering={FadeIn.duration(reduceMotion ? 70 : 140)} exiting={FadeOut.duration(reduceMotion ? 50 : 100)}><Text style={styles.stepCount}>{step - 1} OF 3</Text></Animated.View> : null}
            </Animated.View>
          </View>
          {step > 1 && step <= 4 && (
            <Animated.View
              entering={FadeIn.duration(reduceMotion ? 70 : 150)}
              exiting={FadeOut.duration(reduceMotion ? 50 : 110)}
              style={styles.progressTrack}
            >
              <Animated.View layout={LinearTransition.duration(reduceMotion ? 100 : 220)} style={[styles.progressFill, { width: `${((step - 1) / 3) * 100}%` }]} />
            </Animated.View>
          )}
        </View>
      </View>}

      {showingIntro && <View style={[styles.introSkipOverlay, { top: insets.top + 10 }]}><SkipButton onPress={continueAfterIntro} /></View>}
      {!showingAccountChoice && (
        <StepFooter
          step={footerStep as Step}
          showBack={showingIntro ? introStep > 1 : step > 1}
          onBack={back}
          onNext={() => void next()}
          disabled={finishingSetup}
          reduceMotion={reduceMotion}
          bottomInset={insets.bottom}
          paginationIndex={showingIntro ? introStep - 1 : undefined}
        />
      )}
      {setupError ? <View style={{ padding: 16 }}><Feedback severity="error" message={setupError} action={{ label: 'Try again', onPress: () => void next(), disabled: finishingSetup }} /></View> : null}
      {(step > 0 || showingIntro || showingAccountChoice) && !(showingAccountChoice && !isLinkMode) && <ProgressiveEdgeBlur edge="top" surfaceColor={paper} scrollProgress={contentScrollY} revealDistance={insets.top + APP_HEADER_FADE_CONTENT_HEIGHT} style={{ height: insets.top + APP_HEADER_FADE_CONTENT_HEIGHT }} />}
      <SyncConsentDialog visible={syncConsentDialogVisible} onChoice={resolveSyncConsent} />
    </View>
    </VisualStyleContext.Provider>
  );
}

function AppChromeBackdrop({ children, edge, style }: { children: ReactNode; edge: 'top' | 'bottom'; style: StyleProp<ViewStyle> }) {
  const palette = useTheme();  const { paper } = palette; const styles = useThemedStyles(createStyles);
  if (Platform.OS === 'web') {
    return <View style={[style, styles.chromeFallback]}>{children}</View>;
  }

  return (
    <View style={[style, styles.chromeContainer]}>
      <ProgressiveEdgeBlur edge={edge} surfaceColor={paper} />
      <View style={styles.chromeContent}>{children}</View>
    </View>
  );
}

function StepFooter({ step, showBack, onBack, onNext, disabled, reduceMotion, bottomInset, paginationIndex }: { step: Step; showBack: boolean; onBack: () => void; onNext: () => void; disabled: boolean; reduceMotion: boolean | null; bottomInset: number; paginationIndex?: number }) {
    const styles = useThemedStyles(createStyles);
  const label = step === 0 ? 'Let’s begin' : step === 4 ? 'Start my day' : 'Continue';
  const backVisible = showBack;
  const rowWidth = useSharedValue(0);
  const widthProgress = useSharedValue(backVisible ? 1 : 0);
  const buttonMorphStyle = useAnimatedStyle(() => {
    const reservedWidth = footerBackButtonWidth + footerNavigationGap;
    return rowWidth.value > 0
      ? {
          width: rowWidth.value - reservedWidth * widthProgress.value,
          transform: [{ translateX: reservedWidth * widthProgress.value }],
        }
      : {};
  });
  const handleFooterLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    if (measuredWidth > 0 && Math.abs(measuredWidth - rowWidth.value) >= 0.5) {
      rowWidth.set(measuredWidth);
    }
  };
  useEffect(() => {
    if (reduceMotion) {
      widthProgress.set(backVisible ? 1 : 0);
      return;
    }
    widthProgress.set(backVisible
      ? withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
      : withDelay(85, withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) })));
  }, [backVisible, reduceMotion, widthProgress]);
  return (
    <Animated.View
      entering={FadeIn.duration(reduceMotion ? 60 : 110)}
      exiting={FadeOut.duration(reduceMotion ? 50 : 80)}
      style={styles.footerOverlay}
    >
      <AppChromeBackdrop edge="bottom" style={[styles.footer, { paddingBottom: bottomInset }]}>
        {paginationIndex !== undefined && <View pointerEvents="none" accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: introSlides.length, now: paginationIndex + 1, text: `Page ${paginationIndex + 1} of ${introSlides.length}` }} style={styles.introPaginationFooter}>
          {introSlides.map((_, index) => <IntroPaginationDot key={index} index={index} selectedIndex={paginationIndex} reduceMotion={reduceMotion} />)}
        </View>}
        <View onLayout={handleFooterLayout} style={styles.footerNavigation}>
          {backVisible && (
            <Animated.View
              entering={reduceMotion
                ? FadeIn.duration(60)
                : FadeInUp.duration(110).delay(180).withInitialValues({ opacity: 0, transform: [{ translateY: 5 }] })}
              exiting={reduceMotion ? FadeOut.duration(50) : FadeOutDown.duration(85)}
              style={styles.footerBackPosition}
            >
              <StepBackButton onPress={onBack} />
            </Animated.View>
          )}
          <Animated.View style={[styles.footerButtonMorph, buttonMorphStyle]}>
            <PrimaryButton
              label={label}
              onPress={onNext}
              disabled={disabled}
              reduceMotion={reduceMotion}
            />
          </Animated.View>
        </View>
      </AppChromeBackdrop>
    </Animated.View>
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
    const styles = useThemedStyles(createStyles);
  return (
    <NativeActionButton label="" onPress={onPress} appearance="plain" accessibilityLabel="Skip this step" style={styles.skipButton}>
      <Text style={styles.skipButtonText}>Skip</Text>
    </NativeActionButton>
  );
}

function PrimaryButton({ label, onPress, disabled = false, reduceMotion = false }: { label: string; onPress: () => void; disabled?: boolean; reduceMotion?: boolean | null }) {
  const palette = useTheme(); const styles = useThemedStyles(createStyles);
  return (
    <NativeActionButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      width="full"
      appearance="prominent"
      nativeHeight
      tintColor={disabled ? palette.lightGreen : palette.ink}
      accessibilityLabel={label}
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
    >
      <View pointerEvents="none" style={styles.primaryButtonContent}>
        <Animated.View
          key={label}
          entering={reduceMotion
            ? FadeIn.duration(70)
            : FadeInUp.duration(190).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}
          exiting={reduceMotion
            ? FadeOut.duration(50)
            : FadeOutDown.duration(115).withTargetValues({ opacity: 0, transform: [{ translateY: 4 }] })}
          pointerEvents="none"
          style={styles.primaryButtonInner}
        >
          <Text style={[styles.primaryButtonText, disabled && styles.primaryButtonTextDisabled]}>{label}</Text>
          <AppIcon name="arrow" size={18} color={disabled ? palette.muted : palette.lightGreen} />
        </Animated.View>
      </View>
    </NativeActionButton>
  );
}

function StepBackButton({ onPress }: { onPress: () => void }) {
  const palette = useTheme(); const styles = useThemedStyles(createStyles);
  return (
    <NativeActionButton label="" systemImage="chevron.left" onPress={onPress} appearance="bordered" tintColor={palette.green} accessibilityLabel="Go to previous step" style={styles.stepBackButton} />
  );
}

function MotionPressable({ onPress, onPressIn, onPressOut, children, style, ...props }: SquirclePressableProps) {
    const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const reduceMotion = useReducedMotion();
  const layout = typeof style === 'function' ? undefined : StyleSheet.flatten(style);
  const pressableStyle = typeof style === 'function' ? style : [style, styles.pressableFill];
  const wrapperStyle = {
    width: layout?.width,
    height: layout?.height,
    minWidth: layout?.minWidth,
    maxWidth: layout?.maxWidth,
    minHeight: layout?.minHeight,
    maxHeight: layout?.maxHeight,
    flex: layout?.flex,
    flexGrow: layout?.flexGrow,
    flexShrink: layout?.flexShrink,
    flexBasis: layout?.flexBasis,
    alignSelf: layout?.alignSelf ?? (layout?.width !== undefined ? 'flex-start' : 'stretch'),
  };
  const pressIn = (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    const pressedScale = reduceMotion ? 1 : 0.99;
    scale.set(withSpring(pressedScale, { damping: 28, stiffness: 360 }));
    onPressIn?.(event);
  };
  const pressOut = (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    scale.set(withSpring(1, { damping: 28, stiffness: 360 }));
    onPressOut?.(event);
  };
  return (
    <Animated.View style={[wrapperStyle, animatedStyle]}>
      <SquirclePressable {...props} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={pressableStyle}>
        {children}
      </SquirclePressable>
    </Animated.View>
  );
}

function AppIcon({ name, color, size = 22, style }: { name: AppIconName; color?: string; size?: number; style?: VisualStyle }) {
  const selectedStyle = useContext(VisualStyleContext);
  const palette = useTheme();
  color ??= palette.green;
  return <SharedAppIcon name={name} style={style ?? selectedStyle} color={color} size={size} />;
}

const createStyles = (palette: AppTheme) => {  const { ink, muted, green, paper, line } = palette; return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: paper, overflow: 'hidden' },
  stepContent: { flex: 1, overflow: 'hidden' },
  pressableFill: { width: '100%' },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, elevation: 20 },
  headerBlur: { height: APP_NON_TAB_HEADER_HEIGHT },
  solidHeader: { backgroundColor: 'transparent' },
  topBar: { height: APP_NON_TAB_HEADER_HEIGHT, paddingHorizontal: LayoutSpacing.screenInset, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { width: 112, flexDirection: 'row', alignItems: 'center' },
  headerSideRight: { justifyContent: 'flex-end', gap: 6 },
  chromeFallback: { backgroundColor: palette.paper },
  chromeContainer: { backgroundColor: 'transparent' },
  chromeContent: { position: 'relative', zIndex: 1 },
  backButton: { width: 52, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  back: { color: ink, fontSize: 37.4, lineHeight: 41.8, fontWeight: '300', width: 30, textAlign: 'center' },
  backPlaceholder: { width: 52 },
  wordmark: { fontFamily: 'DeliciousHandrawn-Regular', fontSize: 11, letterSpacing: 1.5, color: ink },
  wordmarkDot: { fontFamily: 'DeliciousHandrawn-Regular', color: palette.muted, fontSize: 11 },
  stepCount: { fontFamily: 'DeliciousHandrawn-Regular', width: 44, textAlign: 'right', color: muted, fontSize: 9.9, letterSpacing: 0.8, fontWeight: '500' },
  stepCountPlaceholder: { width: 112 },
  progressTrack: { height: 2, backgroundColor: palette.lightGreen, marginHorizontal: 24 },
  progressFill: { height: 2, backgroundColor: green },
  welcome: { flex: 1, paddingHorizontal: 30, alignItems: 'center' },
  sunMark: { width: 90, height: 90, alignSelf: 'center', marginTop: 44, marginBottom: 48, alignItems: 'center', justifyContent: 'center' },
  sunLogoTarget: { width: 72, height: 72 }, sunLogoSquircle: { flex: 1 }, sunLogoImage: { width: '100%', height: '100%' },
  eyebrow: { fontFamily: 'DeliciousHandrawn-Regular', color: green, fontSize: 8.8, letterSpacing: 1.1, marginBottom: 17, fontWeight: '400', textAlign: 'center' },
  hero: { fontFamily: 'DeliciousHandrawn-Regular', fontSize: 35.2, lineHeight: 38.5, letterSpacing: 0, color: ink, textAlign: 'center' },
  intro: { marginTop: 18, fontSize: 17.6, lineHeight: 27.5, color: muted, maxWidth: 320, fontWeight: '400', textAlign: 'center' },
  welcomeNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30, width: '100%' },
  noteText: { fontFamily: 'DeliciousHandrawn-Regular', color: palette.muted, fontSize: 11, letterSpacing: 0.15, fontWeight: '400', textAlign: 'center', flexShrink: 1 },
  bottomBlock: { width: '100%', marginTop: 'auto', paddingBottom: 20 },
  doneBottomBlock: { marginTop: 32 },
  primaryButton: { backgroundColor: palette.green, borderRadius: 999, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primaryButtonDisabled: { backgroundColor: palette.lightGreen },
  primaryButtonText: { fontFamily: 'Satoshi', color: palette.onAccent, fontSize: 15.4, letterSpacing: 0, fontWeight: '600' },
  primaryButtonTextDisabled: { color: palette.muted },
  buttonArrow: { position: 'absolute', right: 20 },
  privacyNote: { textAlign: 'center', marginTop: 13, fontSize: 11, color: palette.muted, letterSpacing: 0.2, fontWeight: '400' },
  content: { paddingHorizontal: LayoutSpacing.screenInset, paddingTop: 90, paddingBottom: 110 },
  introContent: { justifyContent: 'center' },
  introIllustration: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 29 },
  introCopy: { width: '100%' },
  introFadeLine: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  introFadeWord: { position: 'relative', overflow: 'hidden', borderRadius: 3 },
  introEyebrowLine: { justifyContent: 'center', marginBottom: 17 },
  introBodyLine: { maxWidth: 330, marginTop: 12 },
  introOrbit: { position: 'absolute', width: 108, height: 108 },
  introIcon: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  introSparkle: { position: 'absolute', right: 0, top: 1, width: 32, height: 32, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  introCard: { minHeight: 90, marginTop: LayoutSpacing.section, padding: LayoutSpacing.cardInset, borderRadius: Radius.card, backgroundColor: palette.warmSurface, flexDirection: 'row', alignItems: 'center', gap: LayoutSpacing.related },
  introCardIcon: { width: 40, height: 40, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  introCardCopy: { flex: 1, gap: 4 },
  introCardTitle: { color: ink, fontSize: 14.3, fontWeight: '600' },
  introCardBody: { color: muted, fontSize: 12.1, lineHeight: 17.6 },
  introPaginationFooter: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 13 },
  introPageDot: { height: 6, borderRadius: 999 },
  introSkipOverlay: { position: 'absolute', right: 20, zIndex: 30 },
  accountIllustration: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 29 },
  accountIllustrationRing: { position: 'absolute', width: 108, height: 108, borderRadius: 999, borderWidth: 1, borderColor: palette.line },
  accountIllustrationIcon: { width: 78, height: 78, borderRadius: Radius.hero, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  localBadge: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  accountActions: { gap: 11, marginTop: 23 },
  accountProviderButton: { minHeight: 56, paddingHorizontal: 15, borderRadius: Radius.pill, borderCurve: 'circular', borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  accountProviderButtonDisabled: { opacity: 0.6 },
  accountProviderMark: { width: 30, height: 30, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  accountProviderText: { color: ink, fontSize: 14.3, fontWeight: '600' },
  accountSkipAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 18, borderRadius: Radius.pill, borderCurve: 'circular', backgroundColor: palette.lightGreen },
  accountSkipText: { color: muted, fontSize: 13.2, fontWeight: '500' },
  accountOption: { minHeight: 88, padding: 14, marginTop: 23, borderRadius: Radius.cardLarge, borderWidth: 1, borderColor: line, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 11, opacity: 0.82 },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: palette.lightGreen },
  comingSoonText: { color: muted, fontSize: 8.8, fontWeight: '700', letterSpacing: 0.8 },
  localContinueButton: { minHeight: 56, paddingHorizontal: 19, marginTop: 13, borderRadius: 999, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  localContinueText: { color: palette.onAccent, fontSize: 14.3, fontWeight: '600' },
  localPrivacyNote: { color: palette.muted, fontSize: 11, lineHeight: 16.5, textAlign: 'center', marginTop: 11 },
  customAreaInput: { height: 52, marginTop: 15, borderRadius: Radius.control, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, paddingHorizontal: 14, color: ink, fontFamily: 'Satoshi', fontSize: 15.4 },
  selectionCount: { marginTop: 20, color: green, fontSize: 13.2, fontWeight: '500' },
  planList: { gap: 11, marginTop: 12 },
  planCard: { borderWidth: 1, borderColor: line, borderRadius: Radius.card, backgroundColor: palette.surface, padding: 13 },
  planCardSelected: { borderColor: palette.controlBorder, backgroundColor: palette.lightGreen },
  planSelectRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11 },
  planAtLimit: { opacity: 0.55 },
  planIcon: { width: 38, height: 38, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  planCopy: { flex: 1, gap: 4 },
  planTitle: { color: ink, fontSize: 14.3, fontWeight: '600' },
  planDetail: { color: muted, fontSize: 12.1, lineHeight: 17.6, fontWeight: '400' },
  planPreviewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginTop: 5, paddingHorizontal: 5 },
  planPreviewLabel: { color: green, fontSize: 12.1, fontWeight: '500' },
  planPreview: { borderTopWidth: 1, borderTopColor: line, paddingTop: 11, gap: 7 },
  planEditor: { gap: 7 },
  planPreviewHeading: { color: ink, fontSize: 12.1, fontWeight: '600' },
  planPreviewBody: { color: muted, fontSize: 12.1, lineHeight: 17.6, fontWeight: '400' },
  planPreviewFootnote: { color: palette.muted, fontSize: 11, lineHeight: 15.4, fontWeight: '400' },
  planEditLabel: { color: palette.muted, fontSize: 11, fontWeight: '500', marginTop: 5 },
  planEditInput: { minHeight: 42, borderRadius: Radius.small, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, paddingHorizontal: 11, paddingVertical: 8, color: ink, fontFamily: 'Satoshi', fontSize: 13.2 },
  planActionInput: { minHeight: 58, textAlignVertical: 'top' },
  emptyPlans: { alignItems: 'center', gap: 12, padding: 24, borderRadius: Radius.cardLarge, backgroundColor: palette.surface },
  timeRow: { flexDirection: 'row', gap: 10, marginTop: 23 },
  timeCard: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: line, borderRadius: Radius.card, backgroundColor: palette.surface, padding: 13 },
  timeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  timeLabel: { color: muted, fontSize: 11, fontWeight: '500' },
  timeInput: { marginTop: 10, minHeight: 38, color: ink, fontFamily: 'Satoshi', fontSize: 19.8, fontWeight: '600', padding: 0 },
  rhythmSectionTitle: { color: ink, fontSize: 13.2, fontWeight: '600', marginTop: 23, marginBottom: 10 },
  focusWindowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  focusWindow: { width: '48%', minHeight: 44, borderWidth: 1, borderColor: line, borderRadius: 999, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  focusWindowSelected: { borderColor: green, backgroundColor: palette.lightGreen },
  focusWindowText: { color: muted, fontSize: 12.1, fontWeight: '500' },
  focusWindowTextSelected: { color: ink },
  heading: { fontFamily: 'DeliciousHandrawn-Regular', fontSize: 25.3, lineHeight: 28.6, letterSpacing: 0, color: ink },
  body: { fontSize: 15.4, lineHeight: 23.1, color: muted, marginTop: 12, maxWidth: 330, fontWeight: '400' },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: LayoutSpacing.related, marginTop: LayoutSpacing.sectionLarge },
  areaTile: { width: '48%', minHeight: 86, borderWidth: 1, borderColor: line, borderRadius: Radius.cardLarge, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: palette.surface, justifyContent: 'space-between' },
  areaTileSelected: { backgroundColor: palette.lightGreen, borderColor: palette.controlBorder },
  areaCheck: { position: 'absolute', top: 9, right: 9 },
  areaLabel: { fontFamily: 'Satoshi', color: palette.ink, fontSize: 11, fontWeight: '400' }, areaLabelSelected: { color: ink },
  selectedHint: { marginTop: 17, color: palette.muted, fontSize: 12.1, textAlign: 'center', fontWeight: '400' },
  sectionLabel: { marginTop: 25, marginBottom: 8, color: muted, fontSize: 10.5, letterSpacing: 0.8, fontWeight: '700' },
  starterGoalChoice: { padding: 14, marginTop: 9, borderWidth: 1, borderColor: line, borderRadius: Radius.cardLarge, backgroundColor: palette.surface, gap: 6 },
  starterGoalChoiceSelected: { borderColor: palette.controlBorder, backgroundColor: palette.lightGreen },
  starterGoalTop: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 9 },
  starterGoalTitle: { flex: 1, fontFamily: 'Satoshi', color: ink, fontSize: 13.2, fontWeight: '600' },
  starterGoalDetail: { fontFamily: 'Satoshi', color: muted, fontSize: 11.5, lineHeight: 16 },
  starterGoalFirstStep: { fontFamily: 'Satoshi', color: green, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  radioOuterSelected: { borderColor: green },
  routineChoice: { minHeight: 74, padding: 13, marginTop: 10, borderWidth: 1, borderColor: line, borderRadius: Radius.cardLarge, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  routineChoiceSelected: { borderColor: palette.controlBorder, backgroundColor: palette.lightGreen },
  routineChoiceIcon: { width: 37, height: 37, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  routineChoiceCopy: { flex: 1, gap: 4 },
  routineChoiceTitle: { fontFamily: 'Satoshi', color: ink, fontSize: 13.2, fontWeight: '600' },
  routineChoiceDetail: { fontFamily: 'Satoshi', color: muted, fontSize: 11, lineHeight: 16 },
  syncConsentNote: { padding: 13, marginTop: 18, borderRadius: Radius.card, backgroundColor: palette.lightGreen, flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncConsentCopy: { flex: 1, color: muted, fontSize: 11, lineHeight: 16 },
  footerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, elevation: 20 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  footerNavigation: { width: '100%', minHeight: footerBackButtonWidth, position: 'relative', flexDirection: 'row', alignItems: 'flex-end' },
  footerBackPosition: { position: 'absolute', left: 0, bottom: 0, zIndex: 1 },
  footerButtonMorph: { flexDirection: 'row', alignItems: 'flex-end' },
  stepBackButton: { width: footerBackButtonWidth, height: 58, flexShrink: 0, borderRadius: 999, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  skipButton: { minWidth: 58, height: 44, flexShrink: 0, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.lightGreen },
  skipButtonText: { fontFamily: 'Satoshi', fontSize: 15.4, fontWeight: '500', color: green },
  primaryButtonContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  optionList: { gap: LayoutSpacing.control, marginTop: LayoutSpacing.sectionLarge },
  styleOption: { minHeight: 75, borderWidth: 1, borderColor: line, borderRadius: Radius.cardLarge, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, gap: 13 },
  styleOptionSelected: { borderColor: palette.controlBorder, backgroundColor: palette.lightGreen },
  visualOptions: { gap: LayoutSpacing.related, marginTop: LayoutSpacing.section },
  visualCard: { minHeight: 216, borderWidth: 1, borderColor: line, borderRadius: Radius.card, padding: 12, backgroundColor: palette.surface },
  visualCardSelected: { borderColor: palette.controlBorder, backgroundColor: palette.lightGreen },
  previewFormal: { minHeight: 126, backgroundColor: palette.lightGreen, borderRadius: Radius.card, padding: 14, justifyContent: 'space-between' },
  previewExpressive: { minHeight: 126, backgroundColor: palette.lightGreen, borderRadius: Radius.cardLarge, padding: 14, justifyContent: 'space-between' },
  previewFormalHeading: { fontFamily: 'Satoshi', color: ink, fontWeight: '700', fontSize: 19.8 },
  previewFormalBody: { fontFamily: 'Satoshi', color: muted, fontSize: 11, letterSpacing: 1, fontWeight: '500' },
  previewExpressiveHeading: { fontFamily: 'DeliciousHandrawn-Regular', color: ink, fontSize: 27.5 },
  previewExpressiveBody: { fontFamily: 'DeliciousHandrawn-Regular', color: muted, fontSize: 18.7 },
  previewIconRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  visualCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  visualTitleWrap: { gap: 3 }, visualTitle: { fontFamily: 'Satoshi', fontWeight: '700', color: ink, fontSize: 16.5 },
  visualSubtitle: { fontFamily: 'Satoshi', color: muted, fontSize: 13.2, fontWeight: '400' },
  fontPair: { fontFamily: 'Satoshi', color: palette.muted, fontSize: 11, marginTop: 9 },
  radioOuter: { width: 20, height: 20, borderRadius: Radius.pill, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  styleIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  styleCopy: { flex: 1 }, styleTitle: { fontFamily: 'DeliciousHandrawn-Regular', color: ink, fontSize: 12.1, fontWeight: '400' }, styleDetail: { color: muted, fontSize: 12.1, marginTop: 4, fontWeight: '400' },
  radio: { width: 19, height: 19, borderRadius: Radius.pill, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: green }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: green },
  reminderCard: { flexDirection: 'row', alignItems: 'center', marginTop: 21, paddingVertical: 15, paddingHorizontal: 14, backgroundColor: palette.lightGreen, borderRadius: Radius.card, gap: 12 },
  reminderIconWrap: { width: 42, height: 42, borderRadius: 999, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  reminderCopy: { flex: 1 }, reminderTitle: { fontFamily: 'DeliciousHandrawn-Regular', fontSize: 12.1, color: ink, fontWeight: '400' }, reminderDetail: { fontSize: 11, color: muted, marginTop: 4, fontWeight: '400' },
  optional: { color: palette.muted, fontSize: 11, textAlign: 'center', marginTop: 12, fontWeight: '400' },
  doneScreen: { flexGrow: 1, paddingHorizontal: 27, alignItems: 'center' },
  doneIllustration: { height: 185, width: 220, marginTop: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  orbitOne: { position: 'absolute', width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: palette.line },
  orbitTwo: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderColor: palette.line },
  doneCenter: { width: 76, height: 76, borderRadius: 38, backgroundColor: palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  orbitDot: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: palette.muted, top: 25, right: 55 },
  orbitDotTwo: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.muted, bottom: 32, left: 49 },
  doneTitle: { fontFamily: 'DeliciousHandrawn-Regular', fontSize: 27.5, lineHeight: 30.8, letterSpacing: 0, color: ink, textAlign: 'center' },
  doneBody: { marginTop: 12, color: muted, fontSize: 14.3, lineHeight: 22, textAlign: 'center', maxWidth: 310, fontWeight: '400' },
  summaryCard: { width: '100%', padding: 16, borderRadius: Radius.card, backgroundColor: palette.lightGreen, marginTop: 22 },
  summaryLabel: { color: palette.muted, fontSize: 9.9, letterSpacing: 1.5, fontWeight: '500', marginBottom: 12 },
  summaryAreas: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.surface, borderRadius: Radius.small, paddingHorizontal: 9, paddingVertical: 7 },
  summaryChipText: { fontSize: 11, color: palette.ink }, moreAreas: { alignSelf: 'center', fontSize: 11, color: muted },
  summaryPlanList: { gap: 5, marginTop: 14 },
  summaryPlanLabel: { color: palette.muted, fontSize: 9.9, letterSpacing: 1.2, fontWeight: '500', marginBottom: 3 },
  summaryPlan: { color: ink, fontSize: 12.1, fontWeight: '500' },
  summaryRule: { height: 1, backgroundColor: palette.lightGreen, marginVertical: 13 },
  summaryStyle: { fontSize: 12.1, color: muted, marginTop: 5 }, summaryValue: { color: ink },
}); };
