-- Cumulative, account-owned desktop sessions. Replaying an offline batch adds only
-- the unacknowledged seconds. Legacy heartbeat RPC remains available to old apps.
create table if not exists public.clt_pc_play_sessions (
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 item_id bigint not null references public.itens(id) on delete cascade,
 elapsed_seconds bigint not null check(elapsed_seconds between 0 and 604800),
 updated_at timestamptz not null default now(),
 primary key(user_id,session_id)
);
alter table public.clt_pc_play_sessions enable row level security;
revoke all on public.clt_pc_play_sessions from public,anon,authenticated;
grant select on public.clt_pc_play_sessions to authenticated;
drop policy if exists own_sessions on public.clt_pc_play_sessions;
create policy own_sessions on public.clt_pc_play_sessions for select to authenticated using(user_id=auth.uid());
create or replace function public.clt_record_offline_play(p_item bigint,p_session uuid,p_seconds bigint)
returns numeric language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); game public.itens%rowtype; clock public.clt_pc_play_sessions%rowtype; delta bigint;
begin
 if me is null or p_session is null or p_seconds is null or p_seconds not between 0 and 604800 then raise exception 'Sessão inválida';end if;
 -- Serialize both duplicate retries and attempts to reuse a UUID with another game.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text||p_session::text,0));
 select * into game from public.itens where id=p_item and user_id=me and categoria='jogos' for update;
 if not found then raise exception 'Jogo não disponível na sua biblioteca';end if;
 select * into clock from public.clt_pc_play_sessions where user_id=me and session_id=p_session;
 if found and clock.item_id<>p_item then raise exception 'Sessão pertence a outro jogo';end if;
 delta:=greatest(0,p_seconds-coalesce(clock.elapsed_seconds,0));
 insert into public.clt_pc_play_sessions(user_id,session_id,item_id,elapsed_seconds) values(me,p_session,p_item,p_seconds)
 on conflict(user_id,session_id) do update set elapsed_seconds=greatest(clt_pc_play_sessions.elapsed_seconds,excluded.elapsed_seconds),updated_at=now();
 if delta>0 then update public.itens set horas=coalesce(horas,0)+delta::numeric/3600 where id=p_item and user_id=me returning * into game;end if;
 return coalesce(game.horas,0);
end $$;
revoke all on function public.clt_record_offline_play(bigint,uuid,bigint) from public,anon;
grant execute on function public.clt_record_offline_play(bigint,uuid,bigint) to authenticated;

-- Atomically union local unlocks so offline desktops cannot overwrite one another.
create or replace function public.clt_merge_local_achievements(p_appid bigint,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); old public.steam_local_progress%rowtype; merged jsonb; n integer; t integer; result jsonb;
begin
 if me is null or p_appid is null or p_appid not between 1 and 4294967295 or jsonb_typeof(p_snapshot->'lista') is distinct from 'array' or jsonb_array_length(p_snapshot->'lista')>1000 then raise exception 'Conquistas inválidas';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text||':achievements:'||p_appid::text,0));
 select * into old from public.steam_local_progress where user_id=me and steam_appid=p_appid;
 select coalesce(jsonb_agg(entry order by key),'[]'::jsonb) into merged from (
  select distinct on(key) key,entry from (
   select coalesce(nullif(entry->>'id',''),nullif(entry->>'nome','')) key,entry,ordinality seq
   from jsonb_array_elements(coalesce(old.achievements,'[]'::jsonb)||(p_snapshot->'lista')) with ordinality as x(entry,ordinality)
   where coalesce((entry->>'got')::boolean,true)
  ) entries where key is not null order by key,seq desc
 ) dedup;
 if jsonb_array_length(merged)>1000 then raise exception 'Muitas conquistas';end if;
 t:=greatest(coalesce(old.total,0),coalesce((p_snapshot->>'total')::integer,0),jsonb_array_length(merged));
 n:=greatest(coalesce(old.unlocked,0),coalesce((p_snapshot->>'unlocked')::integer,0),jsonb_array_length(merged));
 insert into public.steam_local_progress(user_id,steam_appid,unlocked,total,achievements) values(me,p_appid,n,greatest(t,n),merged)
 on conflict(user_id,steam_appid) do update set unlocked=excluded.unlocked,total=excluded.total,achievements=excluded.achievements,observed_at=now(),updated_at=now()
 returning to_jsonb(steam_local_progress.*)-'user_id' into result;
 if greatest(t,n)>0 then update public.itens set conquistas=round(n::numeric/greatest(t,n)*100,2) where user_id=me and categoria='jogos' and steam_appid=p_appid;end if;
 return result;
end $$;
revoke all on function public.clt_merge_local_achievements(bigint,jsonb) from public,anon;
grant execute on function public.clt_merge_local_achievements(bigint,jsonb) to authenticated;
