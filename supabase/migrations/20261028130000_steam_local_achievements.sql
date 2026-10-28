-- Permanent, user-owned snapshots of achievements visible only in the local Steam client.
create table if not exists public.steam_local_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  steam_appid bigint not null check (steam_appid between 1 and 4294967295),
  unlocked integer not null default 0 check (unlocked between 0 and 10000),
  total integer not null default 0 check (total between 0 and 10000 and unlocked <= total),
  achievements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(achievements) = 'array' and jsonb_array_length(achievements) <= 1000),
  observed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, steam_appid)
);

comment on table public.steam_local_progress is
  'Cumulative read-only snapshots imported from the signed-in user local Steam client cache.';
comment on column public.steam_local_progress.achievements is
  'Unlocked achievement metadata only; this data is self-reported and is not an official Steam account record.';

alter table public.steam_local_progress enable row level security;

drop policy if exists steam_local_progress_select_own on public.steam_local_progress;
create policy steam_local_progress_select_own on public.steam_local_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists steam_local_progress_insert_own on public.steam_local_progress;
create policy steam_local_progress_insert_own on public.steam_local_progress
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists steam_local_progress_update_own on public.steam_local_progress;
create policy steam_local_progress_update_own on public.steam_local_progress
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists steam_local_progress_delete_own on public.steam_local_progress;
create policy steam_local_progress_delete_own on public.steam_local_progress
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.steam_local_progress from anon;
grant select, insert, update, delete on public.steam_local_progress to authenticated;
