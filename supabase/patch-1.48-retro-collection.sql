-- Meu Retrô: cover and manually tracked game IDs, accessed only by bright-api.
create table if not exists public.clt_retro_collection (
 user_id uuid primary key references auth.users(id) on delete cascade,
 cover_url text not null default '' check(length(cover_url)<=2000),
 game_ids integer[] not null default '{}' check(cardinality(game_ids)<=100)
);
alter table public.clt_retro_collection enable row level security;
revoke all on public.clt_retro_collection from anon, authenticated;
grant all on public.clt_retro_collection to service_role;
