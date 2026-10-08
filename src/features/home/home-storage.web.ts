import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'daymark.home-session.v1';
const BACKUP_KEY = 'daymark.home-session.backup.v1';
const QUARANTINE_KEY = 'daymark.home-session.unreadable.v1';
const RECOVERY_PREFIX = 'daymark.recovery.v1.';
const META_KEYS = [SESSION_KEY, BACKUP_KEY, QUARANTINE_KEY] as const;

export const readSnapshot = (key: string) => AsyncStorage.getItem(key);
export const writeSnapshot = (key: string, raw: string) => AsyncStorage.setItem(key, raw);
export const getLegacySnapshots = (): Promise<[string | null, string | null]> => Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(BACKUP_KEY)]);
export const getLegacyQuarantine = () => AsyncStorage.getItem(QUARANTINE_KEY);
export const clearLegacySnapshots = () => AsyncStorage.multiRemove([...META_KEYS]);
export async function clearLocalStorage(options: { preserveRecovery?: boolean } = {}): Promise<void> {
  await clearLegacySnapshots();
  if (!options.preserveRecovery) {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(RECOVERY_PREFIX)));
  }
}

export type RecoverySnapshot = {
  id: string;
  kind: 'fresh-guest' | 'sync-conflict';
  createdAt: string;
  payload: unknown;
};

export async function saveRecoverySnapshot(kind: RecoverySnapshot['kind'], payload: unknown): Promise<string> {
  const createdAt = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const key = `${RECOVERY_PREFIX}${id}`;
  await AsyncStorage.setItem(key, JSON.stringify({ id, kind, createdAt, payload } satisfies RecoverySnapshot));
  return id;
}

export async function listRecoverySnapshots(): Promise<RecoverySnapshot[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(RECOVERY_PREFIX));
  const values = await AsyncStorage.multiGet(keys);
  return values.flatMap(([, value]) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as RecoverySnapshot;
      return parsed && typeof parsed.id === 'string' && typeof parsed.createdAt === 'string' && (parsed.kind === 'fresh-guest' || parsed.kind === 'sync-conflict')
        ? [parsed]
        : [];
    } catch { return []; }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function clearRecoverySnapshots(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(RECOVERY_PREFIX));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
export const writeLegacyQuarantine = (raw: string) => AsyncStorage.setItem(QUARANTINE_KEY, raw);
