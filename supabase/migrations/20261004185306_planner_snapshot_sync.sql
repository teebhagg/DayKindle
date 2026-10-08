create table if not exists public.planner_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_snapshots enable row level security;

revoke all on public.planner_snapshots from public, anon, authenticated;
grant select on public.planner_snapshots to authenticated;

create policy "Users read their planner snapshot"
  on public.planner_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their planner snapshot"
  on public.planner_snapshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their planner snapshot"
  on public.planner_snapshots
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their planner snapshot"
  on public.planner_snapshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.save_planner_snapshot(
  p_expected_revision bigint,
  p_snapshot jsonb
)
returns setof public.planner_snapshots
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Expected revision must be zero or greater.' using errcode = '22023';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Planner snapshot must be a JSON object.' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    return query
      insert into public.planner_snapshots (user_id, revision, snapshot, updated_at)
      values ((select auth.uid()), 1, p_snapshot, now())
      on conflict (user_id) do nothing
      returning *;
  else
    return query
      update public.planner_snapshots
      set revision = revision + 1,
          snapshot = p_snapshot,
          updated_at = now()
      where user_id = (select auth.uid())
        and revision = p_expected_revision
      returning *;
  end if;
end;
$$;

revoke insert, update, delete on public.planner_snapshots from public, anon, authenticated;
revoke all on function public.save_planner_snapshot(bigint, jsonb) from public, anon;
grant execute on function public.save_planner_snapshot(bigint, jsonb) to authenticated;
