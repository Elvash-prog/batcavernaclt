-- Explicit executable associations may track Steam games as well.
create or replace function public.clt_record_pc_play(p_item bigint,p_session uuid,p_seconds bigint)
returns numeric language plpgsql security invoker set search_path='' as $$
declare me uuid:=auth.uid(); game public.itens%rowtype; clock public.clt_pc_play_clock%rowtype; delta bigint:=0;
begin
 if me is null or p_session is null or p_seconds is null or p_seconds<0 or p_seconds>604800 then raise exception 'Sessão de jogo inválida'; end if;
 select * into game from public.itens where id=p_item and user_id=me and categoria='jogos' for update;
 if not found then raise exception 'Jogo não disponível na sua biblioteca'; end if;
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
