import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabaseAsync } from 'expo-sqlite';

const DATABASE_NAME = 'daymark-local.db';
const SESSION_KEY = 'daymark.home-session.v1';
const BACKUP_KEY = 'daymark.home-session.backup.v1';
const QUARANTINE_KEY = 'daymark.home-session.unreadable.v1';
const RECOVERY_PREFIX = 'daymark.recovery.v1.';
const META_KEYS = [SESSION_KEY, BACKUP_KEY, QUARANTINE_KEY] as const;
const COLLECTIONS = [
  'plans', 'lifeAreas', 'entries', 'taskDefinitions', 'habitDefinitions', 'goalProgressEvents',
  'daySchedules', 'reflections', 'checkIns', 'commitments',
] as const;
const TABLES: Record<(typeof COLLECTIONS)[number], string> = {
  plans: 'goals', lifeAreas: 'life_areas', entries: 'occurrences', taskDefinitions: 'task_definitions',
  habitDefinitions: 'habit_definitions', goalProgressEvents: 'goal_progress_events',
  daySchedules: 'day_schedules', reflections: 'weekly_reflections',
  checkIns: 'daily_check_ins', commitments: 'commitments',
};

let databasePromise: ReturnType<typeof openDatabaseAsync> | undefined;
async function database() {
  databasePromise ??= openDatabaseAsync(DATABASE_NAME);
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS session_settings (id INTEGER PRIMARY KEY CHECK (id = 1), data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS life_areas (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS occurrences (id TEXT PRIMARY KEY, source_type TEXT, source_id TEXT, occurrence_key TEXT, scheduled_date TEXT, status TEXT, data_json TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS occurrences_source_date_unique ON occurrences(source_type, source_id, occurrence_key, scheduled_date) WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND occurrence_key IS NOT NULL AND scheduled_date IS NOT NULL;
    CREATE TABLE IF NOT EXISTS task_definitions (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS habit_definitions (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goal_progress_events (id TEXT PRIMARY KEY, source_id TEXT, occurrence_key TEXT, scheduled_date TEXT, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS day_schedules (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS weekly_reflections (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS daily_check_ins (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS commitments (id TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS storage_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}

function rowId(item: Record<string, unknown>, collection: (typeof COLLECTIONS)[number], index: number) {
  if (typeof item.id === 'string') return item.id;
  if (collection === 'reflections' && typeof item.weekStart === 'string') return item.weekStart;
  if (collection === 'checkIns' && typeof item.date === 'string') return item.date;
  return `${collection}-${index}`;
}

export async function readSnapshot(key: string): Promise<string | null> {
  const db = await database();
  if (key === SESSION_KEY) {
    const settings = await db.getFirstAsync<{ data_json: string }>('SELECT data_json FROM session_settings WHERE id = 1');
    if (!settings) return null;
    const data = JSON.parse(settings.data_json) as Record<string, unknown>;
    for (const collection of COLLECTIONS) {
      const table = TABLES[collection];
      const rows = await db.getAllAsync<{ data_json: string }>(`SELECT data_json FROM ${table} ORDER BY rowid`);
      data[collection] = rows.map((row) => JSON.parse(row.data_json));
    }
    return JSON.stringify({ schemaVersion: data.schemaVersion, data });
  }
  const meta = await db.getFirstAsync<{ value: string }>('SELECT value FROM storage_metadata WHERE key = ?', key);
  return meta?.value ?? null;
}

export async function writeSnapshot(key: string, raw: string): Promise<void> {
  const db = await database();
  if (key !== SESSION_KEY) {
    await db.runAsync('INSERT INTO storage_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, raw);
    return;
  }
  const decoded = JSON.parse(raw) as { schemaVersion?: number; data?: Record<string, unknown> };
  if (!decoded.data) throw new Error('Cannot save an invalid local session snapshot.');
  const settings: Record<string, unknown> = { ...decoded.data, schemaVersion: decoded.schemaVersion };
  for (const collection of COLLECTIONS) delete settings[collection];
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('INSERT INTO session_settings (id, data_json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json', JSON.stringify(settings));
    for (const collection of COLLECTIONS) {
      const table = TABLES[collection];
      await transaction.runAsync(`DELETE FROM ${table}`);
      const items = decoded.data?.[collection];
      if (!Array.isArray(items)) continue;
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index] as Record<string, unknown>;
        const id = rowId(item, collection, index);
        const json = JSON.stringify(item);
        const nullableText = (value: unknown) => typeof value === 'string' ? value : null;
        if (collection === 'entries') {
          await transaction.runAsync('INSERT INTO occurrences (id, source_type, source_id, occurrence_key, scheduled_date, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)', id, nullableText(item.sourceType), nullableText(item.sourceId), nullableText(item.occurrenceKey), nullableText(item.date), nullableText(item.status), json);
        } else if (collection === 'goalProgressEvents') {
          await transaction.runAsync('INSERT INTO goal_progress_events (id, source_id, occurrence_key, scheduled_date, data_json) VALUES (?, ?, ?, ?, ?)', id, nullableText(item.sourceId), nullableText(item.occurrenceKey), nullableText(item.date), json);
        } else {
          await transaction.runAsync(`INSERT INTO ${table} (id, data_json) VALUES (?, ?)`, id, json);
        }
      }
    }
  });
}

export async function getLegacySnapshots(): Promise<[string | null, string | null]> {
  return Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(BACKUP_KEY)]);
}

export const getLegacyQuarantine = () => AsyncStorage.getItem(QUARANTINE_KEY);

export async function clearLegacySnapshots(): Promise<void> {
  await AsyncStorage.multiRemove([...META_KEYS]);
}

export async function clearLocalStorage(options: { preserveRecovery?: boolean } = {}): Promise<void> {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('DELETE FROM session_settings');
    for (const table of Object.values(TABLES)) await transaction.runAsync(`DELETE FROM ${table}`);
    if (options.preserveRecovery === false) await transaction.runAsync('DELETE FROM storage_metadata');
    else await transaction.runAsync('DELETE FROM storage_metadata WHERE key NOT LIKE ?', `${RECOVERY_PREFIX}%`);
  });
  await clearLegacySnapshots();
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
  await writeSnapshot(key, JSON.stringify({ id, kind, createdAt, payload } satisfies RecoverySnapshot));
  return id;
}

export async function listRecoverySnapshots(): Promise<RecoverySnapshot[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM storage_metadata WHERE key LIKE ? ORDER BY key DESC',
    `${RECOVERY_PREFIX}%`,
  );
  return rows.flatMap(({ value }) => {
    try {
      const parsed = JSON.parse(value) as RecoverySnapshot;
      return parsed && typeof parsed.id === 'string' && typeof parsed.createdAt === 'string' && (parsed.kind === 'fresh-guest' || parsed.kind === 'sync-conflict')
        ? [parsed]
        : [];
    } catch { return []; }
  });
}

export async function clearRecoverySnapshots(): Promise<void> {
  const db = await database();
  const keys = await db.getAllAsync<{ key: string }>(
    'SELECT key FROM storage_metadata WHERE key LIKE ?',
    `${RECOVERY_PREFIX}%`,
  );
  for (const { key } of keys) await db.runAsync('DELETE FROM storage_metadata WHERE key = ?', key);
}

export async function writeLegacyQuarantine(raw: string): Promise<void> {
  await AsyncStorage.setItem(QUARANTINE_KEY, raw);
  const db = await database();
  await db.runAsync('INSERT INTO storage_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', QUARANTINE_KEY, raw);
}
