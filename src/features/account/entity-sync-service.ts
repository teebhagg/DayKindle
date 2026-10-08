import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import type { PlannerSnapshot } from '../home/home-session';
import { readSnapshot, saveRecoverySnapshot, writeSnapshot } from '../home/home-storage';
import { syncPlannerSnapshot, type ConflictChoice, type SyncOutcome } from './sync-service';

export const SYNC_COLLECTIONS = [
  'plans', 'lifeAreas', 'entries', 'taskDefinitions', 'habitDefinitions', 'goalProgressEvents',
  'daySchedules', 'reflections', 'checkIns', 'commitments', 'reminders', 'settings',
] as const;

export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];
export type EntitySyncStatus = 'local' | 'pending' | 'synced' | 'conflict' | 'failed';
export type EntityConflictChoice = (collection: SyncCollection, entityId: string, local: unknown | null, cloud: unknown | null) => Promise<ConflictChoice>;
export type EntitySyncOutcome = SyncOutcome;

type LocalEntity = { collection: SyncCollection; entityId: string; data: unknown; deleted: boolean };
type EntitySyncMetadata = { syncStatus: EntitySyncStatus; createdAt: string; localUpdatedAt: string; serverUpdatedAt: string | null; deletedAt: string | null };
type StoredEntity = LocalEntity & EntitySyncMetadata & { version: number; changeId: number };
type PendingMutation = LocalEntity & EntitySyncMetadata & { mutationId: string; baseVersion: number; queuedAt: string; attempted: boolean };
type SyncStore = { format: 2; cursor: number; entities: Record<string, StoredEntity>; metadata: Record<string, EntitySyncMetadata>; pending: PendingMutation[]; bootstrapPending?: boolean };
type ServerEntity = {
  collection: SyncCollection; entity_id: string; version: number; data: unknown; is_deleted: boolean; change_id: number;
  created_at: string; updated_at: string; deleted_at: string | null; local_updated_at: string; server_updated_at: string; sync_status: 'synced';
};
type MutationResult = { mutation_id: string; status: 'applied' | 'conflict'; entity: ServerEntity | null };
type SyncResponse = { mutations: MutationResult[]; changes: ServerEntity[]; next_cursor: number; has_more: boolean };

const COLLECTION_FIELDS: Partial<Record<SyncCollection, keyof PlannerSnapshot>> = {
  plans: 'plans', lifeAreas: 'lifeAreas', entries: 'entries', taskDefinitions: 'taskDefinitions',
  habitDefinitions: 'habitDefinitions', goalProgressEvents: 'goalProgressEvents', daySchedules: 'daySchedules',
  reflections: 'reflections', checkIns: 'checkIns', commitments: 'commitments', reminders: 'reminders',
};
const SETTINGS_FIELDS = ['visualStyle', 'selectedDate', 'onboarding', 'onboardingCompleted'] as const;
const BOOTSTRAP_MARKER_ID = 'syncSchemaVersion';
const SYNC_SCHEMA_VERSION = 2;
const STORE_KEY = (userId: string) => `daymark.sync.entities.v2.${userId}`;
const BOOTSTRAP_CONFLICT_KEY = (userId: string) => `daymark.sync.entities.bootstrap-conflict.v2.${userId}`;

function entityKey(collection: SyncCollection, entityId: string) {
  return `${collection}:${encodeURIComponent(entityId)}`;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stableValue(child)]));
  }
  return value;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function getEntityId(collection: SyncCollection, item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  if (collection === 'reflections') return typeof record.weekStart === 'string' ? record.weekStart : null;
  if (collection === 'checkIns') return typeof record.date === 'string' ? record.date : null;
  return typeof record.id === 'string' ? record.id : null;
}

function snapshotEntities(snapshot: PlannerSnapshot): Map<string, LocalEntity> {
  const entities = new Map<string, LocalEntity>();
  for (const collection of SYNC_COLLECTIONS) {
    if (collection === 'settings') {
      for (const field of SETTINGS_FIELDS) {
        const value = snapshot[field];
        entities.set(entityKey('settings', field), { collection: 'settings', entityId: field, data: value, deleted: false });
      }
      entities.set(entityKey('settings', BOOTSTRAP_MARKER_ID), { collection: 'settings', entityId: BOOTSTRAP_MARKER_ID, data: SYNC_SCHEMA_VERSION, deleted: false });
      continue;
    }
    const field = COLLECTION_FIELDS[collection];
    if (!field) continue;
    const values = snapshot[field] as unknown;
    if (!Array.isArray(values)) continue;
    for (const item of values) {
      const id = getEntityId(collection, item);
      if (id) entities.set(entityKey(collection, id), { collection, entityId: id, data: item, deleted: false });
    }
  }
  return entities;
}

function entityStateEquals(left: LocalEntity | undefined, right: LocalEntity | undefined) {
  const leftDeleted = left?.deleted ?? true;
  const rightDeleted = right?.deleted ?? true;
  return leftDeleted === rightDeleted && (leftDeleted || sameValue(left?.data, right?.data));
}

function snapshotFromEntities(entities: Record<string, LocalEntity & { changeId?: number }>, fallback: PlannerSnapshot): PlannerSnapshot {
  const result = { ...fallback };
  for (const collection of SYNC_COLLECTIONS) {
    if (collection === 'settings') {
      for (const field of SETTINGS_FIELDS) {
        const saved = entities[entityKey('settings', field)];
        if (saved && !saved.deleted) Object.assign(result, { [field]: saved.data });
      }
      continue;
    }
    const field = COLLECTION_FIELDS[collection];
    if (!field) continue;
    const rows = Object.values(entities)
      .filter((entity) => entity.collection === collection && !entity.deleted)
      .sort((left, right) => (left.changeId ?? 0) - (right.changeId ?? 0) || left.entityId.localeCompare(right.entityId))
      .map((entity) => entity.data);
    Object.assign(result, { [field]: rows });
  }
  return result;
}

function isCollection(value: unknown): value is SyncCollection {
  return typeof value === 'string' && (SYNC_COLLECTIONS as readonly string[]).includes(value);
}

function parseServerEntity(value: unknown): ServerEntity | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!isCollection(row.collection) || typeof row.entity_id !== 'string' || !Number.isInteger(row.version) || !Number.isInteger(row.change_id) || typeof row.is_deleted !== 'boolean') return null;
  if (typeof row.created_at !== 'string' || typeof row.updated_at !== 'string' || (row.deleted_at !== null && typeof row.deleted_at !== 'string') || typeof row.local_updated_at !== 'string' || typeof row.server_updated_at !== 'string' || row.sync_status !== 'synced') return null;
  if (!row.is_deleted && !Object.prototype.hasOwnProperty.call(row, 'data')) return null;
  return row as ServerEntity;
}

function asStoredEntity(entity: ServerEntity): StoredEntity {
  return {
    collection: entity.collection, entityId: entity.entity_id, data: entity.data, deleted: entity.is_deleted,
    version: entity.version, changeId: entity.change_id, createdAt: entity.created_at,
    syncStatus: entity.sync_status, localUpdatedAt: entity.local_updated_at,
    serverUpdatedAt: entity.server_updated_at, deletedAt: entity.deleted_at,
  };
}

function parseStore(raw: string | null): SyncStore | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SyncStore>;
    if (value.format !== 2 || !Number.isInteger(value.cursor) || !value.entities || typeof value.entities !== 'object' || !value.metadata || typeof value.metadata !== 'object' || !Array.isArray(value.pending)) return null;
    const entities = Object.values(value.entities).every((entity) => entity && isCollection(entity.collection) && typeof entity.entityId === 'string' && typeof entity.deleted === 'boolean' && Number.isInteger(entity.version) && Number.isInteger(entity.changeId) && typeof entity.createdAt === 'string' && ['local', 'pending', 'synced', 'conflict', 'failed'].includes(entity.syncStatus));
    const metadata = Object.values(value.metadata).every((item) => item && ['local', 'pending', 'synced', 'conflict', 'failed'].includes(item.syncStatus) && typeof item.createdAt === 'string' && typeof item.localUpdatedAt === 'string');
    const pending = value.pending.every((item) => item && isCollection(item.collection) && typeof item.entityId === 'string' && typeof item.deleted === 'boolean' && typeof item.mutationId === 'string' && Number.isInteger(item.baseVersion) && item.baseVersion >= 0 && typeof item.attempted === 'boolean' && typeof item.localUpdatedAt === 'string' && ['pending', 'conflict', 'failed'].includes(item.syncStatus));
    return entities && metadata && pending && (value.bootstrapPending === undefined || typeof value.bootstrapPending === 'boolean') ? value as SyncStore : null;
  } catch { return null; }
}

async function readStore(userId: string) {
  return parseStore(await readSnapshot(STORE_KEY(userId)));
}

async function saveStore(userId: string, store: SyncStore) {
  await writeSnapshot(STORE_KEY(userId), JSON.stringify(store));
}

function markConflictPending(store: SyncStore, key: string) {
  const pending = pendingForKey(store, key);
  for (const mutation of pending) mutation.syncStatus = 'conflict';
  const last = pending[pending.length - 1];
  if (!last) return;
  const previous = store.metadata[key];
  store.metadata[key] = {
    syncStatus: 'conflict',
    createdAt: last.createdAt,
    localUpdatedAt: last.localUpdatedAt,
    serverUpdatedAt: store.entities[key]?.serverUpdatedAt ?? previous?.serverUpdatedAt ?? null,
    deletedAt: last.deletedAt,
  };
}

function createMutation(entity: LocalEntity, baseVersion: number, previous?: EntitySyncMetadata): PendingMutation {
  const now = new Date().toISOString();
  const dataCreatedAt = entity.data && typeof entity.data === 'object' && typeof (entity.data as Record<string, unknown>).createdAt === 'string'
    ? (entity.data as Record<string, string>).createdAt
    : previous?.createdAt ?? now;
  return {
    ...entity,
    createdAt: dataCreatedAt,
    mutationId: `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
    baseVersion,
    queuedAt: now,
    attempted: false,
    syncStatus: 'pending',
    localUpdatedAt: now,
    serverUpdatedAt: previous?.serverUpdatedAt ?? null,
    deletedAt: entity.deleted ? now : null,
  };
}

function enqueueLocalDiff(store: SyncStore, snapshot: PlannerSnapshot) {
  const current = snapshotEntities(snapshot);
  const keys = new Set([...Object.keys(store.entities), ...current.keys(), ...store.pending.map((item) => entityKey(item.collection, item.entityId))]);
  const nextPending = [...store.pending];
  const pendingIndexesByKey = new Map<string, number[]>();
  const firstIndexByMutationId = new Map<string, number>();
  nextPending.forEach((item, index) => {
    const key = entityKey(item.collection, item.entityId);
    const indexes = pendingIndexesByKey.get(key);
    if (indexes) indexes.push(index);
    else pendingIndexesByKey.set(key, [index]);
    if (!firstIndexByMutationId.has(item.mutationId)) firstIndexByMutationId.set(item.mutationId, index);
  });
  const addPendingIndex = (key: string, index: number) => {
    const indexes = pendingIndexesByKey.get(key) ?? [];
    const insertAt = indexes.findIndex((candidate) => candidate > index);
    if (insertAt === -1) indexes.push(index);
    else indexes.splice(insertAt, 0, index);
    pendingIndexesByKey.set(key, indexes);
  };
  const removePendingIndex = (key: string, index: number) => {
    const indexes = pendingIndexesByKey.get(key);
    if (!indexes) return;
    const removeAt = indexes.indexOf(index);
    if (removeAt !== -1) indexes.splice(removeAt, 1);
    if (indexes.length === 0) pendingIndexesByKey.delete(key);
  };

  for (const key of keys) {
    const baseline = store.entities[key];
    const desired = current.get(key);
    const initialPendingIndexes = pendingIndexesByKey.get(key) ?? [];
    const firstPendingIndex = initialPendingIndexes[0];
    const firstPending = firstPendingIndex === undefined ? undefined : nextPending[firstPendingIndex];
    const lastPendingIndex = initialPendingIndexes[initialPendingIndexes.length - 1];
    const lastPending = lastPendingIndex === undefined ? undefined : nextPending[lastPendingIndex];
    const desiredEntity: LocalEntity = desired ?? {
      collection: baseline?.collection ?? firstPending?.collection ?? 'settings',
      entityId: baseline?.entityId ?? firstPending?.entityId ?? 'onboardingCompleted',
      data: null,
      deleted: true,
    };
    const previous: LocalEntity | undefined = lastPending ?? (baseline ? { collection: baseline.collection, entityId: baseline.entityId, data: baseline.data, deleted: baseline.deleted } : undefined);
    if (!entityStateEquals(previous, desiredEntity)) {
      const baseVersion = lastPending ? lastPending.baseVersion + 1 : baseline?.version ?? 0;
      if (lastPending && !lastPending.attempted) {
        const index = firstIndexByMutationId.get(lastPending.mutationId);
        if (index !== undefined) {
          const previousMutation = nextPending[index];
          const now = new Date().toISOString();
          const updatedMutation: PendingMutation = { ...lastPending, data: desiredEntity.data, deleted: desiredEntity.deleted, syncStatus: lastPending.syncStatus === 'conflict' ? 'conflict' : 'pending', localUpdatedAt: now, deletedAt: desiredEntity.deleted ? now : null };
          nextPending[index] = updatedMutation;
          const previousKey = entityKey(previousMutation.collection, previousMutation.entityId);
          const updatedKey = entityKey(updatedMutation.collection, updatedMutation.entityId);
          if (previousKey !== updatedKey) {
            removePendingIndex(previousKey, index);
            addPendingIndex(updatedKey, index);
          }
        }
      } else {
        const mutation = createMutation(desiredEntity, baseVersion, store.metadata[key]);
        const index = nextPending.length;
        nextPending.push(mutation);
        addPendingIndex(key, index);
        if (!firstIndexByMutationId.has(mutation.mutationId)) firstIndexByMutationId.set(mutation.mutationId, index);
      }
    }

    const updatedPendingIndexes = pendingIndexesByKey.get(key) ?? [];
    const updatedLastPendingIndex = updatedPendingIndexes[updatedPendingIndexes.length - 1];
    const last = updatedLastPendingIndex === undefined ? undefined : nextPending[updatedLastPendingIndex];
    const oldMetadata = store.metadata[key];
    if (last) {
      store.metadata[key] = {
        syncStatus: last.syncStatus,
        createdAt: last.createdAt,
        localUpdatedAt: last.localUpdatedAt,
        serverUpdatedAt: baseline?.serverUpdatedAt ?? oldMetadata?.serverUpdatedAt ?? null,
        deletedAt: last.deletedAt,
      };
    } else if (baseline) {
      store.metadata[key] = {
        syncStatus: 'synced',
        createdAt: baseline.createdAt,
        localUpdatedAt: oldMetadata?.localUpdatedAt ?? baseline.localUpdatedAt,
        serverUpdatedAt: baseline.serverUpdatedAt,
        deletedAt: baseline.deletedAt,
      };
    } else if (desired) {
      store.metadata[key] = {
        syncStatus: 'local',
        createdAt: desired.data && typeof desired.data === 'object' && typeof (desired.data as Record<string, unknown>).createdAt === 'string'
          ? (desired.data as Record<string, string>).createdAt
          : oldMetadata?.createdAt ?? new Date().toISOString(),
        localUpdatedAt: oldMetadata?.localUpdatedAt ?? new Date().toISOString(),
        serverUpdatedAt: null,
        deletedAt: null,
      };
    } else {
      delete store.metadata[key];
    }
  }
  store.pending = nextPending;
}

function snapshotHasData(snapshot: PlannerSnapshot) {
  return Boolean(
    snapshot.plans.length || snapshot.lifeAreas.some((area) => area.enabled) || snapshot.entries.length ||
    snapshot.taskDefinitions.length || snapshot.habitDefinitions.length || snapshot.goalProgressEvents.length ||
    snapshot.daySchedules.length || snapshot.reflections.length || snapshot.checkIns.length ||
    snapshot.commitments.length || snapshot.reminders.length,
  );
}

async function fetchRemoteEntities(client: SupabaseClient<Database>): Promise<ServerEntity[]> {
  const rows: ServerEntity[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from('planner_entities')
      .select('collection,entity_id,version,data,is_deleted,change_id,created_at,updated_at,deleted_at,local_updated_at,server_updated_at,sync_status')
      .order('change_id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const parsed = parseServerEntity(row);
      if (!parsed) throw new Error('The cloud planner contains an unsupported entity. Local data was left unchanged.');
      rows.push(parsed);
    }
    if ((data?.length ?? 0) < pageSize) return rows;
  }
}

function makeStoreFromRemote(rows: ServerEntity[]): SyncStore {
  const entities: Record<string, StoredEntity> = {};
  const metadata: Record<string, EntitySyncMetadata> = {};
  let cursor = 0;
  for (const row of rows) {
    const entity = asStoredEntity(row);
    const key = entityKey(entity.collection, entity.entityId);
    entities[key] = entity;
    metadata[key] = { syncStatus: 'synced', createdAt: entity.createdAt, localUpdatedAt: entity.localUpdatedAt, serverUpdatedAt: entity.serverUpdatedAt, deletedAt: entity.deletedAt };
    cursor = Math.max(cursor, entity.changeId);
  }
  return { format: 2, cursor, entities, metadata, pending: [] };
}

function mapWithRemote(store: SyncStore, key: string, remote: StoredEntity | null) {
  if (remote) {
    store.entities[key] = remote;
    store.metadata[key] = { syncStatus: 'synced', createdAt: remote.createdAt, localUpdatedAt: remote.localUpdatedAt, serverUpdatedAt: remote.serverUpdatedAt, deletedAt: remote.deletedAt };
  } else {
    delete store.entities[key];
    delete store.metadata[key];
  }
}

function parseResponse(value: unknown): SyncResponse {
  if (!value || typeof value !== 'object') throw new Error('The sync service returned an unsupported response.');
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.mutations) || !Array.isArray(response.changes) || !Number.isInteger(response.next_cursor) || typeof response.has_more !== 'boolean') throw new Error('The sync service returned an unsupported response.');
  const mutations = response.mutations.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('The sync service returned an unsupported mutation result.');
    const result = item as Record<string, unknown>;
    if (typeof result.mutation_id !== 'string' || (result.status !== 'applied' && result.status !== 'conflict')) throw new Error('The sync service returned an unsupported mutation result.');
    if (result.entity !== null && !parseServerEntity(result.entity)) throw new Error('The sync service returned an unsupported planner entity.');
    return { mutation_id: result.mutation_id, status: result.status, entity: result.entity === null ? null : parseServerEntity(result.entity) } as MutationResult;
  });
  const changes = response.changes.map((item) => {
    const entity = parseServerEntity(item);
    if (!entity) throw new Error('The sync service returned an unsupported planner change.');
    return entity;
  });
  return { mutations, changes, next_cursor: response.next_cursor as number, has_more: response.has_more };
}

async function callSyncRpc(client: SupabaseClient<Database>, cursor: number, pending: PendingMutation[]) {
  const { data, error } = await client.rpc('sync_planner_mutations', {
    p_cursor: cursor,
    p_limit: 500,
    p_mutations: pending.map((mutation) => ({
      mutation_id: mutation.mutationId,
      collection: mutation.collection,
      entity_id: mutation.entityId,
      base_version: mutation.baseVersion,
      created_at: mutation.createdAt,
      local_updated_at: mutation.localUpdatedAt,
      deleted_at: mutation.deletedAt,
      data: mutation.deleted ? null : mutation.data,
      is_deleted: mutation.deleted,
    })) as Json,
  });
  if (error) throw error;
  return parseResponse(data);
}

function applyServerEntityToStore(store: SyncStore, entity: ServerEntity) {
  const stored = asStoredEntity(entity);
  const key = entityKey(stored.collection, stored.entityId);
  const existing = store.entities[key];
  if (!existing || stored.changeId >= existing.changeId) store.entities[key] = stored;
}

function pendingForKey(store: SyncStore, key: string) {
  return store.pending.filter((mutation) => entityKey(mutation.collection, mutation.entityId) === key);
}

async function saveConflictCopies(userId: string, local: PlannerSnapshot, cloud: PlannerSnapshot, details: unknown) {
  await saveRecoverySnapshot('sync-conflict', { userId, localSnapshot: local, cloudSnapshot: cloud, mode: 'entity-sync', details });
}

async function initializeFromExistingEntities(
  userId: string, localSnapshot: PlannerSnapshot, rows: ServerEntity[],
  chooseEntityConflict: EntityConflictChoice, applyCloudSnapshot: (snapshot: PlannerSnapshot) => void,
) {
  const store = makeStoreFromRemote(rows);
  const local = snapshotEntities(localSnapshot);
  const cloudSnapshot = snapshotFromEntities(store.entities, localSnapshot);
  if (!snapshotHasData(localSnapshot)) {
    applyCloudSnapshot(cloudSnapshot);
    await saveStore(userId, store);
    return { outcome: 'synced' as const, store };
  }
  if (!snapshotHasData(cloudSnapshot)) {
    const mergedState: Record<string, LocalEntity & { changeId?: number }> = { ...store.entities };
    for (const [key, entity] of local) {
      mergedState[key] = { ...entity, changeId: store.entities[key]?.changeId ?? 0 };
    }
    const mergedSnapshot = snapshotFromEntities(mergedState, localSnapshot);
    applyCloudSnapshot(mergedSnapshot);
    enqueueLocalDiff(store, mergedSnapshot);
    await saveStore(userId, store);
    return { outcome: 'synced' as const, store };
  }

  const conflicts: { key: string; local: LocalEntity; remote: StoredEntity }[] = [];
  const merged = new Map<string, LocalEntity>();
  for (const [key, entity] of Object.entries(store.entities)) {
    if (!entity.deleted) merged.set(key, entity);
  }
  for (const [key, localEntity] of local) {
    const remoteEntity = store.entities[key];
    if (!remoteEntity || remoteEntity.deleted) {
      merged.set(key, localEntity);
    } else if (sameValue(localEntity.data, remoteEntity.data)) {
      merged.set(key, { collection: localEntity.collection, entityId: localEntity.entityId, data: remoteEntity.data, deleted: false });
    } else {
      conflicts.push({ key, local: localEntity, remote: remoteEntity });
    }
  }

  if (conflicts.length) await saveConflictCopies(userId, localSnapshot, cloudSnapshot, conflicts.map(({ local: entity }) => ({ collection: entity.collection, entityId: entity.entityId })));
  const deferredConflictKeys = new Set<string>();
  for (const conflict of conflicts) {
    const choice = await chooseEntityConflict(conflict.local.collection, conflict.local.entityId, conflict.local.data, conflict.remote.deleted ? null : conflict.remote.data);
    if (choice === 'later') deferredConflictKeys.add(conflict.key);
    merged.set(conflict.key, choice === 'device' || choice === 'later'
      ? conflict.local
      : { collection: conflict.remote.collection, entityId: conflict.remote.entityId, data: conflict.remote.data, deleted: conflict.remote.deleted });
  }

  const mergedState: Record<string, LocalEntity & { changeId?: number }> = { ...store.entities };
  for (const [key, entity] of merged) {
    const baseline = store.entities[key];
    mergedState[key] = { ...entity, changeId: baseline?.changeId ?? 0 };
  }
  const mergedSnapshot = snapshotFromEntities(mergedState, localSnapshot);
  applyCloudSnapshot(mergedSnapshot);
  enqueueLocalDiff(store, mergedSnapshot);
  for (const key of deferredConflictKeys) markConflictPending(store, key);
  await saveStore(userId, store);
  return { outcome: deferredConflictKeys.size ? 'conflict-pending' as const : 'synced' as const, store };
}

async function initializeFromLegacySnapshot(
  client: SupabaseClient<Database>, userId: string, localSnapshot: PlannerSnapshot, remoteRows: ServerEntity[],
  chooseSnapshotConflict: (local: PlannerSnapshot, cloud: PlannerSnapshot) => Promise<ConflictChoice>,
  chooseEntityConflict: EntityConflictChoice,
  applyCloudSnapshot: (snapshot: PlannerSnapshot) => void,
) {
  let effectiveSnapshot = localSnapshot;
  const outcome = await syncPlannerSnapshot(client, userId, localSnapshot, chooseSnapshotConflict, (cloudSnapshot) => {
    effectiveSnapshot = cloudSnapshot;
    applyCloudSnapshot(cloudSnapshot);
  });
  if (outcome === 'offline' || outcome === 'conflict-pending') return outcome;
  const store = makeStoreFromRemote(remoteRows);

  const localEntities = snapshotEntities(effectiveSnapshot);
  const cloudSnapshot = snapshotFromEntities(store.entities, effectiveSnapshot);
  const conflicts: { key: string; local: LocalEntity; remote: StoredEntity }[] = [];
  const merged = new Map(localEntities);
  for (const [key, remote] of Object.entries(store.entities)) {
    const local = localEntities.get(key);
    if (!local) {
      if (!remote.deleted) merged.set(key, { collection: remote.collection, entityId: remote.entityId, data: remote.data, deleted: false });
    } else if (!entityStateEquals(local, { collection: remote.collection, entityId: remote.entityId, data: remote.data, deleted: remote.deleted })) {
      conflicts.push({ key, local, remote });
    }
  }

  if (conflicts.length) await saveConflictCopies(userId, effectiveSnapshot, cloudSnapshot, conflicts.map(({ local }) => ({ collection: local.collection, entityId: local.entityId })));
  const deferredConflictKeys = new Set<string>();
  for (const conflict of conflicts) {
    const choice = await chooseEntityConflict(conflict.local.collection, conflict.local.entityId, conflict.local.deleted ? null : conflict.local.data, conflict.remote.deleted ? null : conflict.remote.data);
    if (choice === 'later') deferredConflictKeys.add(conflict.key);
    merged.set(conflict.key, choice === 'device' || choice === 'later'
      ? conflict.local
      : { collection: conflict.remote.collection, entityId: conflict.remote.entityId, data: conflict.remote.data, deleted: conflict.remote.deleted });
  }

  const mergedState: Record<string, LocalEntity & { changeId?: number }> = { ...store.entities };
  for (const [key, entity] of merged) {
    const baseline = store.entities[key];
    mergedState[key] = { ...entity, changeId: baseline?.changeId ?? 0 };
  }
  effectiveSnapshot = snapshotFromEntities(mergedState, effectiveSnapshot);
  applyCloudSnapshot(effectiveSnapshot);
  enqueueLocalDiff(store, effectiveSnapshot);
  for (const key of deferredConflictKeys) markConflictPending(store, key);
  await saveStore(userId, store);
  return { outcome: deferredConflictKeys.size ? 'conflict-pending' as const : outcome, store } as const;
}

export async function syncPlannerEntities(
  client: SupabaseClient<Database>,
  userId: string,
  localSnapshot: PlannerSnapshot,
  chooseSnapshotConflict: (local: PlannerSnapshot, cloud: PlannerSnapshot) => Promise<ConflictChoice>,
  chooseEntityConflict: EntityConflictChoice,
  applyCloudSnapshot: (snapshot: PlannerSnapshot) => void,
  networkAvailable: boolean,
  retryConflicts = false,
): Promise<EntitySyncOutcome> {
  let effectiveSnapshot = localSnapshot;
  const applySnapshot = (snapshot: PlannerSnapshot) => {
    effectiveSnapshot = snapshot;
    applyCloudSnapshot(snapshot);
  };
  let store = await readStore(userId);
  const bootstrapConflictDeferred = await readSnapshot(BOOTSTRAP_CONFLICT_KEY(userId)) === 'deferred';
  if (store) {
    enqueueLocalDiff(store, localSnapshot);
    await saveStore(userId, store);
  }
  if (bootstrapConflictDeferred && !retryConflicts) {
    if (!store) {
      store = makeStoreFromRemote([]);
      store.bootstrapPending = true;
      enqueueLocalDiff(store, localSnapshot);
      await saveStore(userId, store);
    }
    return 'conflict-pending';
  }
  if (!networkAvailable) {
    if (!store) {
      store = makeStoreFromRemote([]);
      store.bootstrapPending = true;
    }
    if (store.bootstrapPending) {
      enqueueLocalDiff(store, localSnapshot);
      await saveStore(userId, store);
    }
    return 'offline';
  }
  if (!store || store.bootstrapPending) {
    const remoteRows = await fetchRemoteEntities(client);
    const marker = remoteRows.find((row) => row.collection === 'settings' && row.entity_id === BOOTSTRAP_MARKER_ID && !row.is_deleted);
    if (marker && marker.data !== SYNC_SCHEMA_VERSION) throw new Error('The cloud planner uses a newer sync format. Local data was left unchanged.');
    if (marker) {
      const initialized = await initializeFromExistingEntities(userId, localSnapshot, remoteRows, chooseEntityConflict, applySnapshot);
      store = initialized.store;
    } else {
      const initialized = await initializeFromLegacySnapshot(client, userId, localSnapshot, remoteRows, chooseSnapshotConflict, chooseEntityConflict, applySnapshot);
      if (initialized === 'offline') return initialized;
      if (initialized === 'conflict-pending') {
        if (!store) store = makeStoreFromRemote([]);
        store.bootstrapPending = true;
        enqueueLocalDiff(store, localSnapshot);
        await saveStore(userId, store);
        await writeSnapshot(BOOTSTRAP_CONFLICT_KEY(userId), 'deferred');
        return initialized;
      }
      store = initialized.store;
      if (bootstrapConflictDeferred) await writeSnapshot(BOOTSTRAP_CONFLICT_KEY(userId), 'resolved');
    }
    delete store.bootstrapPending;
    await saveStore(userId, store);
  }

  const localEntities = snapshotEntities(effectiveSnapshot);
  const deferredConflictKeys = new Set<string>();
  for (const mutation of store.pending) {
    if (mutation.syncStatus !== 'conflict') continue;
    const key = entityKey(mutation.collection, mutation.entityId);
    deferredConflictKeys.add(key);
    if (retryConflicts) {
      const metadata = store.metadata[key];
      const related = pendingForKey(store, key);
      for (const item of related) item.syncStatus = 'pending';
      const last = related[related.length - 1] ?? mutation;
      store.metadata[key] = { ...metadata, syncStatus: 'pending', createdAt: last.createdAt, localUpdatedAt: last.localUpdatedAt, serverUpdatedAt: store.entities[key]?.serverUpdatedAt ?? metadata?.serverUpdatedAt ?? null, deletedAt: last.deletedAt };
    }
  }
  if (retryConflicts) deferredConflictKeys.clear();
  let needsApply = false;
  let loops = 0;
  while (loops < 1000) {
    loops += 1;
    const batch = store.pending.filter((mutation) => !deferredConflictKeys.has(entityKey(mutation.collection, mutation.entityId))).slice(0, 100);
    for (const mutation of batch) {
      mutation.attempted = true;
      mutation.syncStatus = 'pending';
      const key = entityKey(mutation.collection, mutation.entityId);
      const metadata = store.metadata[key];
      store.metadata[key] = {
        syncStatus: 'pending',
        createdAt: mutation.createdAt,
        localUpdatedAt: mutation.localUpdatedAt,
        serverUpdatedAt: store.entities[key]?.serverUpdatedAt ?? metadata?.serverUpdatedAt ?? null,
        deletedAt: mutation.deletedAt,
      };
    }
    await saveStore(userId, store);

    let response: SyncResponse;
    try {
      response = await callSyncRpc(client, store.cursor, batch);
    } catch (error) {
      for (const mutation of batch) {
        mutation.syncStatus = 'failed';
        const key = entityKey(mutation.collection, mutation.entityId);
        const metadata = store.metadata[key];
        store.metadata[key] = { ...metadata, syncStatus: 'failed', createdAt: mutation.createdAt, localUpdatedAt: mutation.localUpdatedAt, serverUpdatedAt: store.entities[key]?.serverUpdatedAt ?? metadata?.serverUpdatedAt ?? null, deletedAt: mutation.deletedAt };
      }
      await saveStore(userId, store);
      throw error;
    }
    const appliedIds = new Set<string>();
    const touchedKeys = new Set<string>();
    const conflicts = new Map<string, { remote: StoredEntity | null; mutationIds: Set<string> }>();
    for (const result of response.mutations) {
      const keyMutation = batch.find((item) => item.mutationId === result.mutation_id);
      if (!keyMutation) throw new Error('The sync service returned a result for an unknown mutation.');
      const key = entityKey(keyMutation.collection, keyMutation.entityId);
      touchedKeys.add(key);
      if (result.status === 'applied') {
        appliedIds.add(result.mutation_id);
        if (result.entity) applyServerEntityToStore(store, result.entity);
      } else {
        const existing = conflicts.get(key) ?? { remote: null, mutationIds: new Set<string>() };
        existing.mutationIds.add(result.mutation_id);
        if (result.entity) existing.remote = asStoredEntity(result.entity);
        conflicts.set(key, existing);
      }
    }
    store.pending = store.pending.filter((mutation) => !appliedIds.has(mutation.mutationId));

    if (conflicts.size) {
      const cloudEntities = { ...store.entities };
      for (const entity of response.changes) {
        const key = entityKey(entity.collection, entity.entity_id);
        const current = cloudEntities[key];
        if (!current || entity.change_id >= current.changeId) cloudEntities[key] = asStoredEntity(entity);
      }
      for (const [key, conflict] of conflicts) {
        if (conflict.remote) cloudEntities[key] = conflict.remote;
        else delete cloudEntities[key];
      }
      const cloudSnapshot = snapshotFromEntities(cloudEntities, localSnapshot);
      await saveConflictCopies(userId, localSnapshot, cloudSnapshot, [...conflicts.keys()]);
      for (const [key, conflict] of conflicts) {
        const existingPending = pendingForKey(store, key);
        const first = existingPending[0];
        if (!first) continue;
        const desired = localEntities.get(key) ?? { collection: first.collection, entityId: first.entityId, data: null, deleted: true };
        const remote = conflict.remote;
        store.metadata[key] = {
          syncStatus: 'conflict',
          createdAt: remote?.createdAt ?? first.createdAt,
          localUpdatedAt: existingPending[existingPending.length - 1]?.localUpdatedAt ?? first.localUpdatedAt,
          serverUpdatedAt: remote?.serverUpdatedAt ?? null,
          deletedAt: remote?.deletedAt ?? null,
        };
        const remoteState: LocalEntity | undefined = remote ? { collection: remote.collection, entityId: remote.entityId, data: remote.data, deleted: remote.deleted } : undefined;
        if (entityStateEquals(desired, remoteState)) {
          store.pending = store.pending.filter((item) => entityKey(item.collection, item.entityId) !== key);
          mapWithRemote(store, key, remote);
          touchedKeys.add(key);
          continue;
        }
        const choice = await chooseEntityConflict(first.collection, first.entityId, desired.deleted ? null : desired.data, remote?.deleted ? null : remote?.data ?? null);
        if (choice === 'later') {
          deferredConflictKeys.add(key);
          markConflictPending(store, key);
          continue;
        }
        store.pending = store.pending.filter((item) => entityKey(item.collection, item.entityId) !== key);
        mapWithRemote(store, key, remote);
        if (choice === 'device') {
          const mutation = createMutation(desired, remote?.version ?? 0, store.metadata[key]);
          store.pending.push(mutation);
          store.metadata[key] = { syncStatus: 'pending', createdAt: mutation.createdAt, localUpdatedAt: mutation.localUpdatedAt, serverUpdatedAt: remote?.serverUpdatedAt ?? null, deletedAt: mutation.deletedAt };
        }
        touchedKeys.add(key);
      }
    }

    for (const entity of response.changes) {
      const key = entityKey(entity.collection, entity.entity_id);
      applyServerEntityToStore(store, entity);
      touchedKeys.add(key);
    }
    store.cursor = Math.max(store.cursor, response.next_cursor);
    for (const key of touchedKeys) {
      const pending = pendingForKey(store, key);
      if (pending.length) {
        const last = pending[pending.length - 1];
        const baseline = store.entities[key];
        store.metadata[key] = {
          syncStatus: last.syncStatus,
          createdAt: last.createdAt,
          localUpdatedAt: last.localUpdatedAt,
          serverUpdatedAt: baseline?.serverUpdatedAt ?? null,
          deletedAt: last.deletedAt,
        };
        continue;
      }
      const remote = store.entities[key];
      if (!remote || remote.deleted) localEntities.delete(key);
      else localEntities.set(key, { collection: remote.collection, entityId: remote.entityId, data: remote.data, deleted: false });
      if (remote) store.metadata[key] = { syncStatus: 'synced', createdAt: remote.createdAt, localUpdatedAt: remote.localUpdatedAt, serverUpdatedAt: remote.serverUpdatedAt, deletedAt: remote.deletedAt };
      else delete store.metadata[key];
      needsApply = true;
    }
    await saveStore(userId, store);

    if (response.has_more) continue;
    if (store.pending.some((mutation) => !deferredConflictKeys.has(entityKey(mutation.collection, mutation.entityId)))) continue;
    break;
  }

  if (loops >= 1000 && store.pending.length) {
    await saveStore(userId, store);
    return 'conflict-pending';
  }

  if (needsApply) {
    const nextSnapshot = snapshotFromEntities(
      Object.fromEntries([...localEntities].map(([key, entity]) => {
        const baseline = store!.entities[key];
        return [key, { ...entity, version: baseline?.version ?? 0, changeId: baseline?.changeId ?? 0 }];
      })),
      effectiveSnapshot,
    );
    if (!sameValue(nextSnapshot, effectiveSnapshot)) applySnapshot(nextSnapshot);
  }
  await saveStore(userId, store);
  if (deferredConflictKeys.size) return 'conflict-pending';
  return store.pending.length ? 'synced' : needsApply ? 'synced' : 'unchanged';
}
