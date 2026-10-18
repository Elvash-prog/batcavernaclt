-- One active desktop session per owned non-Steam game; cumulative ticks are idempotent.
create table if not exists public.clt_pc_play_clock (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id bigint not null references public.itens(id) on delete cascade,
 session_id uuid not null,
 elapsed_seconds bigint not null check (elapsed_seconds between 0 and 604800),
 last_ping timestamptz not null default now(),
 primary key (user_id,item_id)
);
alter table public.clt_pc_play_clock enable row level security;
revoke all on public.clt_pc_play_clock from public,anon;
grant select,insert,update on public.clt_pc_play_clock to authenticated;
create policy own_play_clock on public.clt_pc_play_clock for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.clt_record_pc_play(p_item bigint,p_session uuid,p_seconds bigint)
returns numeric language plpgsql security invoker set search_path='' as $$
declare me uuid:=auth.uid(); game public.itens%rowtype; clock public.clt_pc_play_clock%rowtype; delta bigint:=0;
begin
 if me is null or p_session is null or p_seconds is null or p_seconds<0 or p_seconds>604800 then raise exception 'Sessão de jogo inválida'; end if;
 select * into game from public.itens where id=p_item and user_id=me and categoria='jogos' for update;
 if not found then raise exception 'Jogo não disponível na sua biblioteca'; end if;
 if coalesce(game.steam_appid,0)>0 and lower(coalesce(game.loja,'')) like '%steam%' then return coalesce(game.horas,0); end if;
 select * into clock from public.clt_pc_play_clock where user_id=me and item_id=p_item;
 if found then
  if clock.session_id<>p_session and clock.last_ping>now()-interval '120 seconds' then return coalesce(game.horas,0); end if;
  if clock.session_id=p_session then
   if p_seconds<=clock.elapsed_seconds then return coalesce(game.horas,0); end if;
   delta:=least(p_seconds-clock.elapsed_seconds,90,greatest(0,floor(extract(epoch from now()-clock.last_ping))::bigint+5));
  end if;
 end if;
 insert into public.clt_pc_play_clock(user_id,item_id,session_id,elapsed_seconds,last_ping) values(me,p_item,p_session,p_seconds,now())
 on conflict(user_id,item_id) do update set session_id=excluded.session_id,elapsed_seconds=excluded.elapsed_seconds,last_ping=excluded.last_ping;
 if delta>0 then update public.itens set horas=coalesce(horas,0)+delta::numeric/3600 where id=p_item and user_id=me returning * into game; end if;
 return coalesce(game.horas,0);
end $$;
revoke all on function public.clt_record_pc_play(bigint,uuid,bigint) from public,anon;
grant execute on function public.clt_record_pc_play(bigint,uuid,bigint) to authenticated;
