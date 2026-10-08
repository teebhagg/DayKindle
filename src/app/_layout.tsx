import { useTheme } from '@/hooks/use-theme';
import { Stack, usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar, View } from 'react-native';
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

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'DeliciousHandrawn-Regular': require('../../assets/fonts/DeliciousHandrawn-Regular.ttf'),
    Satoshi: require('../../assets/fonts/Satoshi-Variable.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HomeSessionProvider>
          <StyledAppContent />
        </HomeSessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function StyledAppContent() {
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
            {storageStatus === 'save-error' || storageStatus === 'recovery' ? <View style={{ paddingTop: insets.top, paddingHorizontal: 12, paddingBottom: 8 }}><Feedback severity={storageStatus === 'save-error' ? 'error' : 'warning'} message={storageStatus === 'save-error' ? 'Could not save your changes on this device. Keep the app open and try again.' : 'A backup was restored. Save it on this device to continue.'} action={{ label: 'Save again', onPress: retrySave }} /></View> : null}
            {posthog ? (
              <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: false }}>
                <PostHogScreenTracker />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
              </PostHogProvider>
            ) : (
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
            )}
          </View>
        </AccountProvider>
      </ToastProvider>
    </VisualStyleContext.Provider>
  );
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
