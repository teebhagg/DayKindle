create table if not exists public.planner_entities (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null check (collection in (
    'plans', 'lifeAreas', 'entries', 'taskDefinitions', 'habitDefinitions', 'goalProgressEvents',
    'daySchedules', 'reflections', 'checkIns', 'commitments', 'reminders', 'settings'
  )),
  entity_id text not null check (char_length(entity_id) between 1 and 300),
  version bigint not null check (version > 0),
  data jsonb,
  is_deleted boolean not null default false,
  change_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  local_updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  sync_status text not null default 'synced' check (sync_status = 'synced'),
  primary key (user_id, collection, entity_id),
  check (is_deleted or data is not null)
);

alter table public.planner_entities enable row level security;

revoke all on public.planner_entities from public, anon, authenticated;
grant select on public.planner_entities to authenticated;

create policy "Users read their planner entities"
  on public.planner_entities
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create schema if not exists planner_sync_private;
revoke all on schema planner_sync_private from public, anon, authenticated;

create table if not exists planner_sync_private.planner_entity_changes (
  change_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null,
  entity_id text not null,
  version bigint not null,
  data jsonb,
  is_deleted boolean not null,
  mutation_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  local_updated_at timestamptz not null,
  server_updated_at timestamptz not null,
  sync_status text not null check (sync_status = 'synced'),
  recorded_at timestamptz not null default now()
);

create index if not exists planner_entity_changes_user_cursor_idx
  on planner_sync_private.planner_entity_changes (user_id, change_id);

create table if not exists planner_sync_private.planner_mutation_receipts (
  user_id uuid not null references auth.users (id) on delete cascade,
  mutation_id text not null,
  collection text not null,
  entity_id text not null,
  version bigint not null,
  data jsonb,
  is_deleted boolean not null,
  change_id bigint not null,
  created_at timestamptz not null,
  local_updated_at timestamptz not null,
  server_updated_at timestamptz not null,
  deleted_at timestamptz,
  sync_status text not null check (sync_status = 'synced'),
  primary key (user_id, mutation_id)
);

alter table planner_sync_private.planner_entity_changes enable row level security;
alter table planner_sync_private.planner_mutation_receipts enable row level security;
revoke all on all tables in schema planner_sync_private from public, anon, authenticated;

create or replace function public.sync_planner_mutations(
  p_cursor bigint,
  p_limit integer,
  p_mutations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_mutation jsonb;
  v_mutation_id text;
  v_collection text;
  v_entity_id text;
  v_base_version bigint;
  v_requested_created_at timestamptz;
  v_local_updated_at timestamptz;
  v_requested_deleted_at timestamptz;
  v_data jsonb;
  v_is_deleted boolean;
  v_current_version bigint;
  v_current_data jsonb;
  v_current_deleted boolean;
  v_current_change_id bigint;
  v_current_created_at timestamptz;
  v_current_updated_at timestamptz;
  v_current_deleted_at timestamptz;
  v_current_local_updated_at timestamptz;
  v_current_server_updated_at timestamptz;
  v_current_sync_status text;
  v_next_version bigint;
  v_change_id bigint;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_deleted_at timestamptz;
  v_server_updated_at timestamptz;
  v_receipt record;
  v_results jsonb := '[]'::jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_next_cursor bigint := p_cursor;
  v_has_more boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_cursor is null or p_cursor < 0 then
    raise exception 'Sync cursor must be zero or greater.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Sync page size must be between 1 and 500.' using errcode = '22023';
  end if;
  if p_mutations is null or jsonb_typeof(p_mutations) <> 'array' or jsonb_array_length(p_mutations) > 100 then
    raise exception 'A sync batch must be an array with at most 100 mutations.' using errcode = '22023';
  end if;

  -- Keep one user's batch atomic with respect to other devices syncing that account.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':planner-sync', 0));

  for v_mutation in select value from jsonb_array_elements(p_mutations)
  loop
    if jsonb_typeof(v_mutation) <> 'object' then
      raise exception 'Each planner mutation must be an object.' using errcode = '22023';
    end if;

    v_mutation_id := v_mutation ->> 'mutation_id';
    v_collection := v_mutation ->> 'collection';
    v_entity_id := v_mutation ->> 'entity_id';
    v_base_version := (v_mutation ->> 'base_version')::bigint;
    v_requested_created_at := nullif(v_mutation ->> 'created_at', '')::timestamptz;
    v_local_updated_at := nullif(v_mutation ->> 'local_updated_at', '')::timestamptz;
    v_requested_deleted_at := nullif(v_mutation ->> 'deleted_at', '')::timestamptz;
    v_is_deleted := (v_mutation ->> 'is_deleted')::boolean;
    v_data := v_mutation -> 'data';

    if v_mutation_id is null or char_length(v_mutation_id) not between 1 and 160 then
      raise exception 'Mutation id is required and must be at most 160 characters.' using errcode = '22023';
    end if;
    if v_collection is null or v_collection not in (
      'plans', 'lifeAreas', 'entries', 'taskDefinitions', 'habitDefinitions', 'goalProgressEvents',
      'daySchedules', 'reflections', 'checkIns', 'commitments', 'reminders', 'settings'
    ) then
      raise exception 'Unsupported planner collection.' using errcode = '22023';
    end if;
    if v_entity_id is null or char_length(v_entity_id) not between 1 and 300 then
      raise exception 'Planner entity id is required and must be at most 300 characters.' using errcode = '22023';
    end if;
    if v_base_version is null or v_base_version < 0 then
      raise exception 'Entity base version must be zero or greater.' using errcode = '22023';
    end if;
    if v_is_deleted is null or not (v_mutation ? 'data') then
      raise exception 'Mutation data and deletion state are required.' using errcode = '22023';
    end if;
    if v_local_updated_at is null then
      raise exception 'Local updated timestamp is required.' using errcode = '22023';
    end if;
    if not v_is_deleted and v_data is null then
      raise exception 'An upsert mutation must include data.' using errcode = '22023';
    end if;
    if v_is_deleted then
      v_data := null;
    end if;

    select * into v_receipt
    from planner_sync_private.planner_mutation_receipts
    where user_id = v_user_id and mutation_id = v_mutation_id;

    if found then
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'mutation_id', v_mutation_id,
        'status', 'applied',
        'entity', jsonb_build_object(
          'collection', v_receipt.collection,
          'entity_id', v_receipt.entity_id,
          'version', v_receipt.version,
          'data', v_receipt.data,
          'is_deleted', v_receipt.is_deleted,
          'change_id', v_receipt.change_id,
          'created_at', v_receipt.created_at,
          'updated_at', v_receipt.server_updated_at,
          'deleted_at', v_receipt.deleted_at,
          'local_updated_at', v_receipt.local_updated_at,
          'server_updated_at', v_receipt.server_updated_at,
          'sync_status', v_receipt.sync_status
        )
      ));
      continue;
    end if;

    select version, data, is_deleted, change_id, created_at, updated_at, deleted_at, local_updated_at, server_updated_at, sync_status
      into v_current_version, v_current_data, v_current_deleted, v_current_change_id, v_current_created_at, v_current_updated_at, v_current_deleted_at, v_current_local_updated_at, v_current_server_updated_at, v_current_sync_status
    from public.planner_entities
    where user_id = v_user_id and collection = v_collection and entity_id = v_entity_id
    for update;

    v_current_version := coalesce(v_current_version, 0);
    if v_current_version <> v_base_version then
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'mutation_id', v_mutation_id,
        'status', 'conflict',
        'entity', case when v_current_version = 0 then null else jsonb_build_object(
          'collection', v_collection,
          'entity_id', v_entity_id,
          'version', v_current_version,
          'data', v_current_data,
          'is_deleted', v_current_deleted,
          'change_id', v_current_change_id,
          'created_at', v_current_created_at,
          'updated_at', v_current_updated_at,
          'deleted_at', v_current_deleted_at,
          'local_updated_at', v_current_local_updated_at,
          'server_updated_at', v_current_server_updated_at,
          'sync_status', v_current_sync_status
        ) end
      ));
      continue;
    end if;

    v_next_version := v_current_version + 1;
    v_server_updated_at := now();
    v_updated_at := v_server_updated_at;
    v_created_at := coalesce(v_current_created_at, v_requested_created_at, v_server_updated_at);
    v_deleted_at := case when v_is_deleted then coalesce(v_requested_deleted_at, v_server_updated_at) else null end;

    insert into planner_sync_private.planner_entity_changes (
      user_id, collection, entity_id, version, data, is_deleted, mutation_id,
      created_at, updated_at, deleted_at, local_updated_at, server_updated_at, sync_status
    )
    values (
      v_user_id, v_collection, v_entity_id, v_next_version, v_data, v_is_deleted, v_mutation_id,
      v_created_at, v_updated_at, v_deleted_at, v_local_updated_at, v_server_updated_at, 'synced'
    )
    returning change_id into v_change_id;

    insert into public.planner_entities (
      user_id, collection, entity_id, version, data, is_deleted, change_id,
      created_at, updated_at, deleted_at, local_updated_at, server_updated_at, sync_status
    )
    values (
      v_user_id, v_collection, v_entity_id, v_next_version, v_data, v_is_deleted, v_change_id,
      v_created_at, v_updated_at, v_deleted_at, v_local_updated_at, v_server_updated_at, 'synced'
    )
    on conflict (user_id, collection, entity_id) do update
      set version = excluded.version,
          data = excluded.data,
          is_deleted = excluded.is_deleted,
          change_id = excluded.change_id,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          local_updated_at = excluded.local_updated_at,
          server_updated_at = excluded.server_updated_at,
          sync_status = excluded.sync_status;

    insert into planner_sync_private.planner_mutation_receipts (
      user_id, mutation_id, collection, entity_id, version, data, is_deleted, change_id,
      created_at, local_updated_at, server_updated_at, deleted_at, sync_status
    )
    values (
      v_user_id, v_mutation_id, v_collection, v_entity_id, v_next_version, v_data, v_is_deleted, v_change_id,
      v_created_at, v_local_updated_at, v_server_updated_at, v_deleted_at, 'synced'
    );

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'mutation_id', v_mutation_id,
      'status', 'applied',
      'entity', jsonb_build_object(
        'collection', v_collection,
        'entity_id', v_entity_id,
        'version', v_next_version,
        'data', v_data,
        'is_deleted', v_is_deleted,
        'change_id', v_change_id,
        'created_at', v_created_at,
        'updated_at', v_updated_at,
        'deleted_at', v_deleted_at,
        'local_updated_at', v_local_updated_at,
        'server_updated_at', v_server_updated_at,
        'sync_status', 'synced'
      )
    ));
  end loop;

  select coalesce(jsonb_agg(page.entity order by page.change_id), '[]'::jsonb),
         coalesce(max(page.change_id), p_cursor)
    into v_changes, v_next_cursor
  from (
    select change_id,
           jsonb_build_object(
             'collection', collection,
             'entity_id', entity_id,
             'version', version,
             'data', data,
             'is_deleted', is_deleted,
             'change_id', change_id,
             'created_at', created_at,
             'updated_at', updated_at,
             'deleted_at', deleted_at,
             'local_updated_at', local_updated_at,
             'server_updated_at', server_updated_at,
             'sync_status', sync_status
           ) as entity
    from planner_sync_private.planner_entity_changes
    where user_id = v_user_id and change_id > p_cursor
    order by change_id
    limit p_limit
  ) as page;

  select exists (
    select 1 from planner_sync_private.planner_entity_changes
    where user_id = v_user_id and change_id > v_next_cursor
  ) into v_has_more;

  return jsonb_build_object(
    'mutations', v_results,
    'changes', v_changes,
    'next_cursor', v_next_cursor,
    'has_more', v_has_more
  );
end;
$$;

revoke all on function public.sync_planner_mutations(bigint, integer, jsonb) from public, anon;
grant execute on function public.sync_planner_mutations(bigint, integer, jsonb) to authenticated;
