-- Return aggregate cloud and account counts without exposing planner content.
-- Keep the SECURITY DEFINER function in the non-exposed sync schema and gate it
-- on the authenticated dashboard membership table.
create or replace function planner_sync_private.dashboard_database_metrics()
returns table (
  confirmed_users bigint,
  cloud_synced_users bigint,
  saved_snapshots bigint,
  active_planner_records bigint,
  last_cloud_update timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not exists (
      select 1
      from public.dashboard_admins
      where user_id = (select auth.uid())
    ) then
    raise exception 'Dashboard admin access required.' using errcode = '42501';
  end if;

  return query
  select
    (
      select count(*)::bigint
      from auth.users
      where deleted_at is null
        and email_confirmed_at is not null
    ),
    (
      select count(distinct synced.user_id)::bigint
      from (
        select user_id from public.planner_snapshots
        union
        select user_id from public.planner_entities where not is_deleted
      ) as synced
    ),
    (select count(*)::bigint from public.planner_snapshots),
    (
      select count(*)::bigint
      from public.planner_entities
      where not is_deleted
    ),
    (
      select max(sync_activity.updated_at)
      from (
        select updated_at from public.planner_snapshots
        union all
        select server_updated_at as updated_at from public.planner_entities
      ) as sync_activity
    );
end;
$$;

revoke all on function planner_sync_private.dashboard_database_metrics()
  from public, anon, authenticated;
grant usage on schema planner_sync_private to authenticated;
grant execute on function planner_sync_private.dashboard_database_metrics()
  to authenticated;

-- Expose only the aggregate report through the public API schema.
create or replace function public.dashboard_database_metrics()
returns table (
  confirmed_users bigint,
  cloud_synced_users bigint,
  saved_snapshots bigint,
  active_planner_records bigint,
  last_cloud_update timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from planner_sync_private.dashboard_database_metrics();
$$;

revoke all on function public.dashboard_database_metrics()
  from public, anon, authenticated;
grant execute on function public.dashboard_database_metrics()
  to authenticated;
