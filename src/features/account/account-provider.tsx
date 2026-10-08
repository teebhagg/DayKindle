import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import * as Network from 'expo-network';
import type { User } from '@supabase/supabase-js';
import { useHomeSession } from '../home/home-session';
import { createPlannerSnapshot } from '../home/planner-snapshot';
import { signInWithApple as appleSignIn, signInWithGoogle as googleSignIn } from './auth-service';
import { supabase, supabaseConfigured } from './supabase-client';
import { syncPlannerEntities, type SyncCollection } from './entity-sync-service';
import type { ConflictChoice, SyncOutcome } from './sync-service';
import { posthog } from '../../lib/posthog';
import { plannerSyncLogger } from '../../lib/posthog-logger';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';
type AccountContextValue = {
  user: User | null;
  initialUserId: string | null;
  configured: boolean;
  loading: boolean;
  signingIn: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signInWithApple: () => Promise<User | null>;
  updateUserName: (name: string) => Promise<void>;
  hasSavedCloudOnboarding: (userId: string) => Promise<boolean>;
  syncNow: (retryConflicts?: boolean) => Promise<SyncOutcome | null>;
  signOutToGuest: () => Promise<void>;
  deleteCloudAccount: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

function conflictChoice(): Promise<ConflictChoice> {
  return new Promise((resolve) => {
    Alert.alert(
      'Choose which planner copy to use',
      'Both your device and account have planner changes. A recoverable copy of each was saved on this device.',
      [
        { text: 'Keep this device', onPress: () => resolve('device') },
        { text: 'Use account copy', onPress: () => resolve('cloud') },
        { text: 'Decide later', style: 'cancel', onPress: () => resolve('later') },
      ],
      { cancelable: false },
    );
  });
}

function entityConflictChoice(collection: SyncCollection, entityId: string, local: unknown | null, cloud: unknown | null): Promise<ConflictChoice> {
  const value = (data: unknown | null) => data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const localValue = value(local);
  const cloudValue = value(cloud);
  const label = collection === 'settings' ? entityId : String(localValue.title ?? cloudValue.title ?? localValue.label ?? cloudValue.label ?? entityId);
  const kind = collection === 'plans' ? 'goal' : collection === 'entries' ? 'scheduled item' : collection === 'settings' ? 'setting' : 'planner item';
  return new Promise((resolve) => {
    Alert.alert(
      `${kind[0].toUpperCase()}${kind.slice(1)} changed on another device`,
      `Choose which version of “${label}” to keep. This item stays queued while unrelated planner items can sync separately.`,
      [
        { text: 'Keep device version', onPress: () => resolve('device') },
        { text: 'Use account version', onPress: () => resolve('cloud') },
        { text: 'Decide later', style: 'cancel', onPress: () => resolve('later') },
      ],
      { cancelable: false },
    );
  });
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const planner = useHomeSession();
  const [user, setUser] = useState<User | null>(null);
  const [initialUserId, setInitialUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [signingIn, setSigningIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) return;

    if (!user) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      return;
    }

    if (identifiedUserId.current === user.id) return;
    if (identifiedUserId.current) posthog.reset();

    posthog.identify(user.id);
    identifiedUserId.current = user.id;
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (active) {
        if (!error) {
          const initialUser = data.session?.user ?? null;
          setUser(initialUser);
          setInitialUserId(initialUser?.id ?? null);
        } else {
          setInitialUserId(null);
        }
        setLoading(false);
      }
    }).catch(() => { if (active) { setInitialUserId(null); setLoading(false); } });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') void client.auth.startAutoRefresh();
    return () => {
      active = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
      void client.auth.stopAutoRefresh();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Cloud sign-in is not configured on this build.');
    setSigningIn(true);
    setSyncError(null);
    try { return await googleSignIn(supabase); }
    finally { setSigningIn(false); }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!supabase) throw new Error('Cloud sign-in is not configured on this build.');
    setSigningIn(true);
    setSyncError(null);
    try { return await appleSignIn(supabase); }
    finally { setSigningIn(false); }
  }, []);

  const updateUserName = useCallback(async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Enter the name you want to use on your account.');
    if (!supabase) throw new Error('Cloud sign-in is not configured on this build.');
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: normalizedName } });
    if (error) throw error;
    if (data.user) setUser(data.user);
  }, []);

  const hasSavedCloudOnboarding = useCallback(async (userId: string) => {
    const client = supabase;
    if (!client) throw new Error('Cloud account services are not configured on this build.');

    const { data: onboardingEntity, error: entityError } = await client.from('planner_entities')
      .select('data,is_deleted')
      .eq('user_id', userId)
      .eq('collection', 'settings')
      .eq('entity_id', 'onboardingCompleted')
      .maybeSingle();
    if (entityError) throw entityError;
    if (onboardingEntity && !onboardingEntity.is_deleted && onboardingEntity.data === true) return true;

    const { data: onboardingProfile, error: profileError } = await client.from('planner_entities')
      .select('data,is_deleted')
      .eq('user_id', userId)
      .eq('collection', 'settings')
      .eq('entity_id', 'onboarding')
      .maybeSingle();
    if (profileError) throw profileError;
    if (onboardingProfile && !onboardingProfile.is_deleted && onboardingProfile.data && typeof onboardingProfile.data === 'object' && !Array.isArray(onboardingProfile.data)) return true;

    // Legacy snapshots are only written after local onboarding has completed.
    const { data: legacySnapshot, error: snapshotError } = await client.from('planner_snapshots')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (snapshotError) throw snapshotError;
    return Boolean(legacySnapshot);
  }, []);

  const syncNow = useCallback(async (retryConflicts = false) => {
    const targetUserId = user?.id;
    if (!supabase || !targetUserId || !planner.onboardingCompleted || !planner.onboarding?.syncConsent || planner.onboarding.syncConsentUserId !== targetUserId) return null;
    if (syncInFlight.current) return null;
    syncInFlight.current = true;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const network = await Network.getNetworkStateAsync();
      const networkAvailable = network.isConnected !== false && network.isInternetReachable !== false;
      const outcome = await syncPlannerEntities(
        supabase,
        targetUserId,
        createPlannerSnapshot(planner),
        conflictChoice,
        entityConflictChoice,
        planner.replacePlannerData,
        networkAvailable,
        retryConflicts,
      );
      setSyncStatus(outcome === 'conflict-pending' ? 'conflict' : outcome === 'offline' ? 'offline' : outcome === 'synced' ? 'synced' : 'idle');
      plannerSyncLogger.info('planner_sync_finished', {
        network_available: networkAvailable,
        outcome,
        retry_conflicts: retryConflicts,
      });
      return outcome;
    } catch (error) {
      plannerSyncLogger.error('planner_sync_failed', {
        retry_conflicts: retryConflicts,
      });
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Sync could not finish. Your local data is still available.');
      return null;
    } finally { syncInFlight.current = false; }
  }, [planner, user]);

  useEffect(() => {
    if (!user || !planner.onboardingCompleted || !planner.onboarding?.syncConsent || planner.onboarding.syncConsentUserId !== user.id || planner.storageStatus !== 'ready') return;
    const timer = setTimeout(() => { void syncNow(); }, 700);
    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void syncNow();
    });
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => { clearTimeout(timer); networkSubscription.remove(); appSubscription.remove(); };
  }, [planner, syncNow, user]);

  const deleteCloudAccount = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const { data: current, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!current.session) return;
    const { error } = await client.functions.invoke('delete-account', { body: {} });
    if (error) throw error;
    const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
    if (signOutError) {
      const { data, error: readError } = await client.auth.getSession();
      if (readError || data.session) throw signOutError;
    }
    setUser(null);
  }, []);

  const signOutToGuest = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const { data: current, error: readError } = await client.auth.getSession();
    if (readError) throw readError;
    if (!current.session) { setUser(null); return; }
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError || data.session) throw error;
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, initialUserId, configured: supabaseConfigured, loading, signingIn, syncStatus, syncError, signInWithGoogle, signInWithApple, updateUserName, hasSavedCloudOnboarding, syncNow, signOutToGuest, deleteCloudAccount }), [user, initialUserId, loading, signingIn, syncStatus, syncError, signInWithGoogle, signInWithApple, updateUserName, hasSavedCloudOnboarding, syncNow, signOutToGuest, deleteCloudAccount]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used inside AccountProvider');
  return value;
}
