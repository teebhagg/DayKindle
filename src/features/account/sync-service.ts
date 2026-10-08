import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { PlannerSnapshot } from '../home/home-session';
import { saveRecoverySnapshot, readSnapshot, writeSnapshot } from '../home/home-storage';

export type SnapshotRow = { revision: number; snapshot: PlannerSnapshot; updated_at: string };
export type ConflictChoice = 'device' | 'cloud' | 'later';
export type SyncOutcome = 'synced' | 'unchanged' | 'offline' | 'conflict-pending';
type SyncBaseline = { revision: number; snapshot: PlannerSnapshot };

const baselineKey = (userId: string) => `daymark.sync.v1.${userId}`;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stableValue(child)]));
  }
  return value;
}

function sameSnapshot(left: PlannerSnapshot, right: PlannerSnapshot) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function hasPlannerData(snapshot: PlannerSnapshot) {
  return Boolean(
    snapshot.plans.length || snapshot.lifeAreas.some((area) => area.enabled) || snapshot.entries.length ||
    snapshot.taskDefinitions.length || snapshot.habitDefinitions.length || snapshot.goalProgressEvents.length ||
    snapshot.daySchedules.length || snapshot.reflections.length || snapshot.checkIns.length ||
    snapshot.commitments.length || snapshot.reminders.length,
  );
}

function isPlannerSnapshot(value: unknown): value is PlannerSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['plans', 'lifeAreas', 'entries', 'taskDefinitions', 'habitDefinitions', 'goalProgressEvents', 'daySchedules', 'reflections', 'checkIns', 'commitments', 'reminders'].every((key) => Array.isArray(candidate[key]))
    && (candidate.visualStyle === 'formal' || candidate.visualStyle === 'expressive')
    && typeof candidate.onboardingCompleted === 'boolean';
}

async function fetchRemote(client: SupabaseClient<Database>, userId: string): Promise<SnapshotRow | null> {
  const { data, error } = await client.from('planner_snapshots').select('revision,snapshot,updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!Number.isInteger(data.revision) || data.revision < 1 || !isPlannerSnapshot(data.snapshot)) {
    throw new Error('The cloud planner copy has an unsupported format. Local data was left unchanged.');
  }
  return data as SnapshotRow;
}

async function writeRemote(client: SupabaseClient<Database>, expectedRevision: number, snapshot: PlannerSnapshot): Promise<SnapshotRow | null> {
  const { data, error } = await client.rpc('save_planner_snapshot', {
    p_expected_revision: expectedRevision,
    p_snapshot: snapshot,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  if (!Number.isInteger(row.revision) || !isPlannerSnapshot(row.snapshot)) throw new Error('The server returned an unsupported planner copy.');
  return row as SnapshotRow;
}

async function getBaseline(userId: string): Promise<SyncBaseline | null> {
  const raw = await readSnapshot(baselineKey(userId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SyncBaseline;
    return Number.isInteger(value.revision) && value.revision >= 0 && isPlannerSnapshot(value.snapshot) ? value : null;
  } catch { return null; }
}

async function storeBaseline(userId: string, row: { revision: number; snapshot: PlannerSnapshot }) {
  await writeSnapshot(baselineKey(userId), JSON.stringify(row));
}

export async function syncPlannerSnapshot(
  client: SupabaseClient<Database>,
  userId: string,
  localSnapshot: PlannerSnapshot,
  chooseConflict: (local: PlannerSnapshot, remote: PlannerSnapshot) => Promise<ConflictChoice>,
  applyCloudSnapshot: (snapshot: PlannerSnapshot) => void,
): Promise<SyncOutcome> {
  const [baseline, remote] = await Promise.all([getBaseline(userId), fetchRemote(client, userId)]);
  const localHasData = hasPlannerData(localSnapshot);

  if (!remote) {
    if (baseline && baseline.revision > 0) {
      const choice = await resolveConflict(client, userId, localSnapshot, baseline, null, chooseConflict, applyCloudSnapshot);
      return choice;
    }
    if (!localHasData) {
      await storeBaseline(userId, { revision: 0, snapshot: localSnapshot });
      return 'unchanged';
    }
    const saved = await writeRemote(client, 0, localSnapshot);
    if (!saved) {
      const latest = await fetchRemote(client, userId);
      return latest ? resolveConflict(client, userId, localSnapshot, null, latest, chooseConflict, applyCloudSnapshot) : 'conflict-pending';
    }
    await storeBaseline(userId, saved);
    return 'synced';
  }

  if (!baseline) {
    if (!localHasData) {
      await storeBaseline(userId, remote);
      applyCloudSnapshot(remote.snapshot);
      return 'synced';
    }
    if (!hasPlannerData(remote.snapshot)) {
      const saved = await writeRemote(client, remote.revision, localSnapshot);
      if (!saved) {
        const latest = await fetchRemote(client, userId);
        return latest ? resolveConflict(client, userId, localSnapshot, null, latest, chooseConflict, applyCloudSnapshot) : 'conflict-pending';
      }
      await storeBaseline(userId, saved);
      return 'synced';
    }
    const result = await resolveConflict(client, userId, localSnapshot, null, remote, chooseConflict, applyCloudSnapshot);
    return result;
  }

  const localChanged = !sameSnapshot(localSnapshot, baseline.snapshot);
  const cloudChanged = remote.revision !== baseline.revision;
  if (!localChanged && !cloudChanged) return 'unchanged';
  if (!localChanged && cloudChanged) {
    await storeBaseline(userId, remote);
    applyCloudSnapshot(remote.snapshot);
    return 'synced';
  }
  if (localChanged && !cloudChanged) {
    const saved = await writeRemote(client, remote.revision, localSnapshot);
    if (!saved) {
      const latest = await fetchRemote(client, userId);
      return resolveConflict(client, userId, localSnapshot, baseline, latest, chooseConflict, applyCloudSnapshot);
    }
    await storeBaseline(userId, saved);
    return 'synced';
  }
  return resolveConflict(client, userId, localSnapshot, baseline, remote, chooseConflict, applyCloudSnapshot);
}

async function resolveConflict(
  client: SupabaseClient<Database>,
  userId: string,
  localSnapshot: PlannerSnapshot,
  baseline: SyncBaseline | null,
  remote: SnapshotRow | null,
  chooseConflict: (local: PlannerSnapshot, remote: PlannerSnapshot) => Promise<ConflictChoice>,
  applyCloudSnapshot: (snapshot: PlannerSnapshot) => void,
): Promise<SyncOutcome> {
  const cloudSnapshot = remote?.snapshot ?? baseline?.snapshot;
  if (!cloudSnapshot) return 'conflict-pending';
  await saveRecoverySnapshot('sync-conflict', {
    userId,
    localSnapshot,
    cloudSnapshot,
    remoteRevision: remote?.revision ?? 0,
    baselineRevision: baseline?.revision ?? 0,
  });
  const choice = await chooseConflict(localSnapshot, cloudSnapshot);
  if (choice === 'later') return 'conflict-pending';
  if (choice === 'cloud') {
    if (remote) await storeBaseline(userId, remote);
    else await storeBaseline(userId, { revision: 0, snapshot: cloudSnapshot });
    applyCloudSnapshot(cloudSnapshot);
    return 'synced';
  }
  const expectedRevision = remote?.revision ?? 0;
  const saved = await writeRemote(client, expectedRevision, localSnapshot);
  if (!saved) return 'conflict-pending';
  await storeBaseline(userId, saved);
  return 'synced';
}
