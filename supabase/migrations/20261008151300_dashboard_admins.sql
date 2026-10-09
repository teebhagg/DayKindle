-- Dashboard access is granted by membership in this table, never by client metadata.
create table if not exists public.dashboard_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.dashboard_admins enable row level security;

revoke all on table public.dashboard_admins from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.dashboard_admins to authenticated;

drop policy if exists "dashboard admins can read their own membership" on public.dashboard_admins;
create policy "dashboard admins can read their own membership"
  on public.dashboard_admins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Register the initial dashboard owner by email, so the migration does not depend on a generated UUID.
insert into public.dashboard_admins (user_id)
select id
from auth.users
where lower(email) = lower('mr.joshua.ansah@gmail.com')
on conflict (user_id) do nothing;
