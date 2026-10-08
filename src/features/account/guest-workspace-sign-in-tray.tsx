import { Feedback } from '@/components/app-feedback';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, type AppTheme } from '@/constants/theme';
import { forwardRef, useCallback, useContext, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { User } from '@supabase/supabase-js';
import { Tray, useTray } from '../../shared/components/organisms/tray';
import { AppTextInput } from '../../components/app-text-input';
import AppleAuthButton from './apple-auth-button';
import { GoogleGlyph } from './google-glyph';
import { toast } from '../../components/toast';
import { textStyleForVisualStyle, EXPRESSIVE_FONT_SIZE_MULTIPLIER, VisualStyleContext } from '../home/visual-style-context';
import { useHomeSession, type OnboardingProfile } from '../home/home-session';
import { useAccount } from './account-provider';



type AuthProvider = 'google' | 'apple';
type PendingAccount = { user: User; provider: AuthProvider };
export type GuestWorkspaceSignInTrayHandle = { open: () => void };

function nameFromUser(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const candidate = [metadata?.full_name, metadata?.name, metadata?.display_name, metadata?.preferred_username]
    .find((value): value is string => typeof value === 'string' && Boolean(value.trim()));
  if (candidate) return candidate.trim();
  return user.email?.split('@')[0].replace(/[._-]+/g, ' ') ?? '';
}

function TrayCopy({ children, style, display = false, accessibilityRole }: { children: ReactNode; style?: StyleProp<TextStyle>; display?: boolean; accessibilityRole?: 'alert' | 'text' }) {
  const palette = useTheme();
  const colors = palette;
  const visualStyle = useContext(VisualStyleContext);
  const flatStyle = StyleSheet.flatten(style);
  const typeScale = visualStyle === 'expressive' ? display ? 1.53 : 1.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 1;
  return <Text accessibilityRole={accessibilityRole} style={[{ color: colors.ink }, style, typeScale !== 1 ? { fontSize: (flatStyle?.fontSize ?? 14) * typeScale, lineHeight: flatStyle?.lineHeight == null ? undefined : flatStyle.lineHeight * typeScale } : null, textStyleForVisualStyle(visualStyle)]}>{children}</Text>;
}

function GuestWorkspaceSignInFlow() {
  const palette = useTheme();
  const colors = palette;
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { setView, close } = useTray();
  const account = useAccount();
  const { setOnboarding, visualStyle, confirmLocalSave, storageStatus, retrySave } = useHomeSession();
  const [pendingAccount, setPendingAccount] = useState<PendingAccount | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [busyProvider, setBusyProvider] = useState<AuthProvider | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [authError, setAuthError] = useState('');
  const nameInput = useRef<import('react-native').TextInput>(null);
  const beginSignIn = async (provider: AuthProvider) => {
    if (account.signingIn || busyProvider || !account.configured) return;
    setAuthError('');
    setBusyProvider(provider);
    try {
      const user = provider === 'google' ? await account.signInWithGoogle() : await account.signInWithApple();
      if (!user) return;
      setPendingAccount({ user, provider });
      setNameDraft(nameFromUser(user));
      setView('confirm-name');
    } catch {
      setAuthError('Sign-in could not finish. Choose an account to try again.');
    } finally {
      setBusyProvider(null);
    }
  };
  const confirmName = async (enableSync: boolean) => {
    const name = nameDraft.trim();
    if (!pendingAccount) {
      toast.warning('Restart sign-in', { description: 'Go back and choose an account provider.' });
      return;
    }
    if (!name) {
      setAuthError('Enter the name you want to use on your account.');
      nameInput.current?.focus();
      return;
    }
    if (savingName) return;
    setAuthError('');
    setSavingName(true);
    try {
      await account.updateUserName(name);
      const consentAt = enableSync ? new Date().toISOString() : null;
      setOnboarding((current) => {
        const base: OnboardingProfile = current ?? {
          accountType: pendingAccount.provider,
          syncConsent: false,
          syncConsentAt: null,
          syncConsentUserId: null,
          routineTemplateIds: [],
          appearance: visualStyle,
          areas: [],
          customAreaName: '',
        };
        return {
          ...base,
          accountType: pendingAccount.provider,
          syncConsent: enableSync,
          syncConsentAt: consentAt,
          syncConsentUserId: enableSync ? pendingAccount.user.id : null,
        };
      });
      if (storageStatus === 'save-error') retrySave();
      await confirmLocalSave();
      toast.success(enableSync ? 'Sync preference saved' : 'Account connected', {
        description: enableSync ? 'Check Profile for sync status.' : 'Your planner remains on this device until you turn on sync.',
      });
      close();
    } catch {
      setAuthError('Could not save your account details. Your name is still here. Try again.');
    } finally {
      setSavingName(false);
    }
  };
  const scrollMaxHeight = Math.max(320, windowHeight - insets.top - Math.max(insets.bottom, 16) - 32);

  return (
    <Tray.Content>
      <Tray.View id="providers">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Tray.ScrollView maxHeight={scrollMaxHeight} contentContainerStyle={[styles.sheetContent, { paddingBottom: LayoutSpacing.group }]}>
            <Tray.Header style={styles.trayHeader}>
              <View style={styles.headerControl} />
              <View style={styles.headerCopy}>
                <Text style={[styles.trayTitle, textStyleForVisualStyle(visualStyle)]}>Sign in to sync</Text>
                <Text style={[styles.traySubtitle, textStyleForVisualStyle(visualStyle)]}>Choose an account. Your planner stays here until you choose to sync.</Text>
              </View>
              <Tray.Close style={styles.headerControl}>
                {({ color }) => <Text style={[styles.closeGlyph, { color }, textStyleForVisualStyle(visualStyle)]}>×</Text>}
              </Tray.Close>
            </Tray.Header>
            <View style={styles.providersBody}>
              {authError ? <Feedback severity="error" message={authError} /> : null}
              <Pressable
                onPress={() => void beginSignIn('google')}
                disabled={account.signingIn || busyProvider !== null || !account.configured}
                style={({ pressed }) => [styles.providerButton, styles.googleButton, pressed && styles.buttonPressed, (account.signingIn || busyProvider !== null) && styles.buttonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                accessibilityState={{ disabled: account.signingIn || busyProvider !== null || !account.configured, busy: busyProvider === 'google' }}
              >
                <View style={styles.providerButtonContent} pointerEvents="none">
                  <GoogleGlyph size={19} />
                  <TrayCopy style={styles.providerLabel}>Continue with Google</TrayCopy>
                </View>
                {busyProvider === 'google' ? <ActivityIndicator size="small" color={colors.green} style={styles.providerSpinner} /> : null}
              </Pressable>
              {Platform.OS === 'ios' ? <View style={[styles.appleButtonWrap, (account.signingIn || busyProvider !== null) && styles.buttonDisabled]}>
                <AppleAuthButton onPress={() => void beginSignIn('apple')} disabled={account.signingIn || busyProvider !== null || !account.configured} labelFontSize={14} />
                {busyProvider === 'apple' ? <ActivityIndicator size="small" color={palette.onInk} style={styles.appleSpinner} pointerEvents="none" /> : null}
              </View> : null}
              {!account.configured ? <TrayCopy style={styles.supportingText}>Sign-in is unavailable in this build. Your guest planner remains saved on this device.</TrayCopy> : null}
            </View>
          </Tray.ScrollView>
        </KeyboardAvoidingView>
      </Tray.View>

      <Tray.View id="confirm-name">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Tray.ScrollView maxHeight={scrollMaxHeight} contentContainerStyle={[styles.sheetContent, { paddingBottom: LayoutSpacing.group }]}>
            <Tray.Header style={styles.trayHeader}>
              <Tray.Back style={styles.headerControl}>
                {({ color }) => <Text style={[styles.backGlyph, { color }, textStyleForVisualStyle(visualStyle)]}>‹</Text>}
              </Tray.Back>
              <View style={styles.headerCopy}>
                <Text style={[styles.trayTitle, textStyleForVisualStyle(visualStyle)]}>Confirm your name</Text>
                <Text style={[styles.traySubtitle, textStyleForVisualStyle(visualStyle)]}>This name will appear on your account.</Text>
              </View>
              <Tray.Close style={styles.headerControl}>
                {({ color }) => <Text style={[styles.closeGlyph, { color }, textStyleForVisualStyle(visualStyle)]}>×</Text>}
              </Tray.Close>
            </Tray.Header>
            {authError ? <View style={styles.feedbackWrap}><Feedback severity="error" message={authError} /></View> : null}
            <View style={styles.confirmBody}>
              <TrayCopy style={styles.nameLabel}>YOUR NAME</TrayCopy>
              <AppTextInput
                ref={nameInput}
                error={!nameDraft.trim() ? authError : undefined}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Your name"
                placeholderTextColor={palette.muted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={80}
                editable={!savingName}
                accessibilityLabel="Name for your account"
                style={styles.nameInput}
              />
              <TrayCopy style={styles.syncConsentCopy}>Choose whether to sync your planner to this account or keep it on this device. You can change this in Profile.</TrayCopy>
            </View>
            <View style={styles.confirmFooter}>
              <Pressable
                onPress={() => void confirmName(true)}
                disabled={savingName || !pendingAccount}
                style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed, (savingName || !pendingAccount) && styles.buttonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Confirm name and sync planner"
                accessibilityState={{ disabled: savingName || !pendingAccount, busy: savingName }}
              >
                {savingName ? <ActivityIndicator color={palette.onInk} size="small" /> : null}
                <TrayCopy style={styles.primaryActionLabel}>Confirm name &amp; sync</TrayCopy>
              </Pressable>
              <Pressable
                onPress={() => void confirmName(false)}
                disabled={savingName || !pendingAccount}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.buttonPressed, (savingName || !pendingAccount) && styles.buttonDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Confirm name and keep planner on this device"
                accessibilityState={{ disabled: savingName || !pendingAccount, busy: savingName }}
              >
                <TrayCopy style={styles.secondaryActionLabel}>Confirm name, keep data here</TrayCopy>
              </Pressable>
            </View>
          </Tray.ScrollView>
        </KeyboardAvoidingView>
      </Tray.View>
    </Tray.Content>
  );
}

const GuestWorkspaceSignInTray = forwardRef<GuestWorkspaceSignInTrayHandle>(function GuestWorkspaceSignInTray(_props, ref) {
  const palette = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = useCallback(() => {
    setSession((current) => current + 1);
    setIsOpen(true);
  }, []);
  useImperativeHandle(ref, () => ({ open }), [open]);

  return (
    <Tray
      key={session}
      defaultOpen={isOpen}
      defaultView="providers"
      onOpenChange={setIsOpen}
      palette={{
        surface: palette.paper,
        border: palette.line,
        handle: palette.controlBorder,
        text: palette.ink,
        mutedText: palette.muted,
        backdrop: palette.scrim,
      }}
    >
      <GuestWorkspaceSignInFlow />
    </Tray>
  );
});

const createStyles = (palette: AppTheme) => { const colors = palette; return StyleSheet.create({
  sheetContent: { flexGrow: 1, paddingBottom: 12 },
  trayHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: LayoutSpacing.screenInset, paddingTop: 10, paddingBottom: LayoutSpacing.control, gap: LayoutSpacing.control },
  headerControl: { width: 44, height: 44, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { color: colors.muted, fontSize: 22, lineHeight: 28 },
  backGlyph: { color: colors.muted, fontSize: 31, lineHeight: 36 },
  headerCopy: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3 },
  trayTitle: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 },
  traySubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  providersBody: { width: '100%', alignItems: 'stretch', paddingHorizontal: LayoutSpacing.screenInset, paddingBottom: LayoutSpacing.section, gap: LayoutSpacing.related },
  feedbackWrap: { paddingHorizontal: LayoutSpacing.screenInset, paddingBottom: LayoutSpacing.related },
  providerButton: { width: '100%', alignSelf: 'stretch', minHeight: 56, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  providerButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleButton: { borderColor: colors.line, backgroundColor: palette.surface },
  providerLabel: { fontSize: 14, fontWeight: '600' },
  providerSpinner: { position: 'absolute', right: 16 },
  appleButtonWrap: { position: 'relative', width: '100%' },
  appleSpinner: { position: 'absolute', right: 16, top: 0, bottom: 0 },
  supportingText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  confirmBody: { paddingHorizontal: LayoutSpacing.screenInset, paddingBottom: LayoutSpacing.related },
  nameLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 8 },
  nameInput: { height: 52, paddingHorizontal: 15, borderRadius: 16, borderWidth: 1, backgroundColor: palette.surface, color: colors.ink, fontSize: 15, marginBottom: 13 },
  syncConsentCopy: { color: colors.muted, fontSize: 11.5, lineHeight: 17 },
  confirmFooter: { paddingHorizontal: LayoutSpacing.screenInset, paddingTop: LayoutSpacing.related, paddingBottom: LayoutSpacing.group },
  primaryAction: { minHeight: 52, borderRadius: 99, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 15 },
  primaryActionLabel: { color: palette.onAccent, fontSize: 13, fontWeight: '600' },
  secondaryAction: { minHeight: 48, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  secondaryActionLabel: { color: colors.green, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  buttonPressed: { opacity: 0.76 },
  buttonDisabled: { opacity: 0.55 },
}); };

export default GuestWorkspaceSignInTray;
