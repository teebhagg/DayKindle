import { useTheme } from '@/hooks/use-theme';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeSessionProvider, useHomeSession } from '../features/home/home-session';
import { AccountProvider } from '../features/account/account-provider';
import { ToastProvider } from '../components/toast';
import { Feedback } from '../components/app-feedback';
import { VisualStyleContext } from '../features/home/visual-style-context';
import { useSplashStatusTransition } from '../features/home/splash-transition-context';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '../lib/posthog';
import { DailyPlanProvider } from '../features/home/daily-plan-provider';
import { scheduleSnoozedReminderNotification, syncLocalNotifications } from '../features/home/notification-service';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'DeliciousHandrawn-Regular': require('../../assets/fonts/DeliciousHandrawn-Regular.ttf'),
    Satoshi: require('../../assets/fonts/Satoshi-Variable.ttf'),
    SatoshiLight: require('../../assets/fonts/Satoshi-Light.ttf'),
    SatoshiBold: require('../../assets/fonts/Satoshi-Bold.ttf'),
  });
  const startupAssetsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DailyPlanProvider>
          <HomeSessionProvider startupAssetsReady={startupAssetsReady}>
            <StyledAppContent startupAssetsReady={startupAssetsReady} />
          </HomeSessionProvider>
        </DailyPlanProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function StyledAppContent({ startupAssetsReady }: { startupAssetsReady: boolean }) {
  const { visualStyle, storageStatus, retrySave } = useHomeSession();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const splashTransitionReady = useSplashStatusTransition();

  return (
    <VisualStyleContext.Provider value={visualStyle}>
      <ToastProvider theme="light" position="top">
        <AccountProvider>
          <StatusBar barStyle={splashTransitionReady ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ReminderNotificationActionHandler />
            {storageStatus === 'save-error' || storageStatus === 'recovery' ? <View style={{ paddingTop: insets.top, paddingHorizontal: 12, paddingBottom: 8 }}><Feedback severity={storageStatus === 'save-error' ? 'error' : 'warning'} message={storageStatus === 'save-error' ? 'Could not save your changes on this device. Keep the app open and try again.' : 'A backup was restored. Save it on this device to continue.'} action={{ label: 'Save again', onPress: retrySave }} /></View> : null}
            {startupAssetsReady && (posthog ? (
              <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: false }}>
                <PostHogScreenTracker />
                <Stack screenOptions={{ headerShown: false, animation: 'default', animationMatchesGesture: true, contentStyle: { backgroundColor: theme.background } }} />
              </PostHogProvider>
            ) : (
              <Stack screenOptions={{ headerShown: false, animation: 'default', animationMatchesGesture: true, contentStyle: { backgroundColor: theme.background } }} />
            ))}
          </View>
        </AccountProvider>
      </ToastProvider>
    </VisualStyleContext.Provider>
  );
}

function ReminderNotificationActionHandler() {
  const { reminders, setReminders, confirmLocalSave, retrySave, storageStatus } = useHomeSession();
  const response = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const notification = response.notification;
    const reminderId = notification.request.content.data?.daymarkReminderId;
    if (typeof reminderId !== 'string') return;
    const responseKey = notification.request.identifier + ':' + notification.date + ':' + response.actionIdentifier;
    if (handledResponse.current === responseKey) return;
    handledResponse.current = responseKey;

    void (async () => {
      try {
        if (response.actionIdentifier === 'snooze_10_minutes') {
          const result = await scheduleSnoozedReminderNotification(notification);
          if (result.ok) await Notifications.dismissNotificationAsync(notification.request.identifier);
        } else if (response.actionIdentifier === 'mark_done') {
          const isDaily = notification.request.content.data?.daymarkRepeat === 'daily';
          if (!isDaily) {
            const next = reminders.filter((reminder) => reminder.id !== reminderId);
            if (next.length !== reminders.length) {
              setReminders(next);
              if (storageStatus === 'save-error') retrySave();
              await confirmLocalSave();
              await syncLocalNotifications(next);
            }
          }
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        } else if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          const checkInPeriod = reminders.find((item) => item.id === reminderId)?.checkInPeriod;
          if (checkInPeriod) router.push({ pathname: '/(tabs)', params: { checkIn: checkInPeriod, at: String(Date.now()) } });
          else router.push('/profile');
        }
      } catch (error) {
        console.warn('Could not process a reminder notification action.', error);
      } finally {
        Notifications.clearLastNotificationResponse();
      }
    })();
  }, [confirmLocalSave, reminders, response, retrySave, setReminders, storageStatus]);

  return null;
}

function PostHogScreenTracker() {
  const pathname = usePathname();
  const segments = useSegments();
  const previousScreen = useRef<string | null>(null);

  useEffect(() => {
    // Route parameters can contain user data, so only report known static screens.
    const screen = pathname === '/' ? (segments[0] === '(tabs)' ? 'home' : 'welcome')
      : pathname === '/goals' ? 'goals'
      : pathname === '/progress' ? 'progress'
      : pathname === '/profile' ? 'profile'
      : pathname === '/history' ? 'history'
      : null;
    if (screen && screen !== previousScreen.current) {
      posthog?.screen(screen);
      previousScreen.current = screen;
    }
  }, [pathname, segments]);

  return null;
}
