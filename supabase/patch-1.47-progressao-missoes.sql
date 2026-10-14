-- BatCaverna 1.47 — XP permanente e missões variadas.
-- Execute uma vez no SQL Editor do Supabase. O patch é idempotente.
begin;
create schema if not exists clt_private;
create extension if not exists pgcrypto;

create table if not exists public.clt_xp_events(
 id bigserial primary key,user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null,event_type text not null,xp integer not null check(xp between 0 and 10000),
 created_at timestamptz not null default now(),unique(user_id,event_key)
);
alter table public.clt_xp_events enable row level security;
drop policy if exists clt_xp_own_read on public.clt_xp_events;
create policy clt_xp_own_read on public.clt_xp_events for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.clt_xp_events from public,anon,authenticated;
grant select on public.clt_xp_events to authenticated;

create or replace function clt_private.award_xp(u uuid,k text,t text,points integer,at_time timestamptz default now())
returns void language sql security definer set search_path=public,pg_temp as $$
 insert into public.clt_xp_events(user_id,event_key,event_type,xp,created_at)
 values(u,left(k,240),left(t,60),greatest(0,least(points,10000)),at_time) on conflict(user_id,event_key) do nothing
$$;
revoke all on function clt_private.award_xp(uuid,text,text,integer,timestamptz) from public,anon,authenticated;

create or replace function clt_private.track_item_xp() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare game boolean:=new.categoria='jogos';old_status text:='';new_status text:=lower(coalesce(new.status,''));marker text:=new.id::text;
begin
 if tg_op='INSERT' then
  perform clt_private.award_xp(new.user_id,'item:'||marker||':added',case when game then 'add_game' else 'add_media' end,case when game then 20 else 10 end,coalesce(new.created_at,now()));
 else
  old_status:=lower(coalesce(old.status,''));
  if coalesce(new.nota,0)>0 and coalesce(old.nota,0)<=0 then perform clt_private.award_xp(new.user_id,'item:'||marker||':rated','rate_content',10); end if;
  if game and coalesce(new.horas,0)>=coalesce(old.horas,0)+1 then perform clt_private.award_xp(new.user_id,'item:'||marker||':hours:'||floor(new.horas)::text,'play_hours',greatest(1,least(20,floor(new.horas-old.horas)::integer*3))); end if;
 end if;
 if game and new_status~'(zerad|finaliz|conclu)' and old_status!~'(zerad|finaliz|conclu)' then perform clt_private.award_xp(new.user_id,'item:'||marker||':finished','finish_game',60); end if;
 if game and new_status~'(platina|100%)' and old_status!~'(platina|100%)' then perform clt_private.award_xp(new.user_id,'item:'||marker||':platinum','platinum_game',100); end if;
 if not game and new_status~'(assistido|conclu|favorit)' and old_status!~'(assistido|conclu|favorit)' then perform clt_private.award_xp(new.user_id,'item:'||marker||':finished','finish_media',35); end if;
 return new;
end $$;
revoke all on function clt_private.track_item_xp() from public,anon,authenticated;
drop trigger if exists clt_track_item_xp on public.itens;
create trigger clt_track_item_xp after insert or update of status,nota,horas on public.itens for each row execute function clt_private.track_item_xp();

insert into public.clt_xp_events(user_id,event_key,event_type,xp,created_at)
select user_id,'item:'||id::text||':added',case when categoria='jogos' then 'add_game' else 'add_media' end,case when categoria='jogos' then 20 else 10 end,coalesce(created_at,now()) from public.itens on conflict do nothing;
insert into public.clt_xp_events(user_id,event_key,event_type,xp,created_at)
select user_id,'item:'||id::text||':finished',case when categoria='jogos' then 'finish_game' else 'finish_media' end,case when categoria='jogos' then 60 else 35 end,coalesce(updated_at,created_at,now()) from public.itens where (categoria='jogos' and lower(coalesce(status,''))~'(zerad|finaliz|conclu|platina|100%)') or (categoria<>'jogos' and lower(coalesce(status,''))~'(assistido|conclu|favorit)') on conflict do nothing;
insert into public.clt_xp_events(user_id,event_key,event_type,xp,created_at)
select user_id,'item:'||id::text||':platinum','platinum_game',100,coalesce(updated_at,created_at,now()) from public.itens where categoria='jogos' and lower(coalesce(status,''))~'(platina|100%)' on conflict do nothing;

create or replace function clt_private.track_episode_xp() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.episodio>0 and (tg_op='INSERT' or new.temporada>old.temporada or new.episodio>old.episodio) then
  perform clt_private.award_xp(new.user_id,'episode:'||new.item_id||':'||new.temporada||':'||new.episodio,'watch_episode',5);
 end if;return new;
end $$;
revoke all on function clt_private.track_episode_xp() from public,anon,authenticated;
drop trigger if exists clt_track_episode_xp on public.clt_episode_progress;
create trigger clt_track_episode_xp after insert or update of temporada,episodio on public.clt_episode_progress for each row execute function clt_private.track_episode_xp();

create or replace function public.clt_progression_v2()
returns table(id uuid,nome text,avatar_url text,xp bigint,nivel integer)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.id,p.nome,p.avatar_url,coalesce(sum(e.xp),0)::bigint,(floor(sqrt(coalesce(sum(e.xp),0)::numeric/100))+1)::integer
 from public.perfis p left join public.clt_xp_events e on e.user_id=p.id group by p.id,p.nome,p.avatar_url order by coalesce(sum(e.xp),0) desc,p.nome
$$;
revoke all on function public.clt_progression_v2() from public,anon;
grant execute on function public.clt_progression_v2() to authenticated,service_role;

create table if not exists public.clt_missions_v2(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 periodo text not null,missao_id text not null,nome text not null,objetivo text not null,event_type text not null,
 meta integer not null check(meta between 1 and 100),xp integer not null check(xp between 1 and 1000),
 inicio timestamptz not null,fim timestamptz not null,reivindicada boolean not null default false,created_at timestamptz not null default now(),
 unique(user_id,periodo,missao_id)
);
alter table public.clt_missions_v2 enable row level security;
drop policy if exists clt_missions_v2_own on public.clt_missions_v2;
create policy clt_missions_v2_own on public.clt_missions_v2 for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.clt_missions_v2 from public,anon,authenticated;
grant select on public.clt_missions_v2 to authenticated;

create or replace function clt_private.ensure_missions(u uuid,p_period text,p_start timestamptz,p_end timestamptz,weekly boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare pool text[]:=array['add_game','finish_game','watch_episode','add_media','finish_media','rate_content','play_hours'];offset_i integer:=(abs(hashtext(u::text||p_period)::bigint)%7)::integer;i integer;key text;goal integer;reward integer;title text;objective text;event_name text;
begin
 for i in 0..2 loop
  key:=pool[1+((offset_i+i*2)%7)];
  goal:=case key when 'watch_episode' then case when weekly then 7 else 2 end when 'play_hours' then case when weekly then 8 else 2 end else case when weekly then 3 else 1 end end;
  reward:=case key when 'finish_game' then case when weekly then 120 else 55 end when 'finish_media' then case when weekly then 90 else 40 end when 'watch_episode' then case when weekly then 90 else 30 end when 'play_hours' then case when weekly then 85 else 30 end else case when weekly then 75 else 25 end end;
  title:=case key when 'add_game' then 'Nova jornada' when 'finish_game' then 'Missão cumprida' when 'watch_episode' then 'Maratona de episódios' when 'add_media' then 'Nova história' when 'finish_media' then 'Créditos finais' when 'rate_content' then 'Crítico da caverna' else 'Tempo de jogo' end;
  objective:=case key when 'add_game' then 'Adicione '||goal||' jogo(s) à biblioteca.' when 'finish_game' then 'Finalize '||goal||' jogo(s).' when 'watch_episode' then 'Assista e registre '||goal||' episódio(s).' when 'add_media' then 'Adicione '||goal||' filme(s), série(s) ou anime(s).' when 'finish_media' then 'Conclua '||goal||' filme(s), série(s) ou anime(s).' when 'rate_content' then 'Avalie '||goal||' título(s).' else 'Registre pelo menos '||goal||' nova(s) hora(s) jogada(s).' end;
  event_name:=key;
  insert into public.clt_missions_v2(user_id,periodo,missao_id,nome,objetivo,event_type,meta,xp,inicio,fim) values(u,p_period,key,title,objective,event_name,goal,reward,p_start,p_end) on conflict(user_id,periodo,missao_id) do nothing;
 end loop;
end $$;
revoke all on function clt_private.ensure_missions(uuid,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;

create or replace function public.clt_missions_v2()
returns table(id uuid,periodo text,missao_id text,nome text,objetivo text,meta integer,progresso integer,xp integer,reivindicada boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();day_start timestamptz:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';week_start timestamptz:=date_trunc('week',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
 if u is null then raise exception 'Entre na conta.';end if;
 perform clt_private.ensure_missions(u,to_char(day_start at time zone 'America/Sao_Paulo','YYYY-MM-DD'),day_start,day_start+interval '1 day',false);
 perform clt_private.ensure_missions(u,'semana:'||to_char(week_start at time zone 'America/Sao_Paulo','YYYY-MM-DD'),week_start,week_start+interval '7 day',true);
 return query select m.id,m.periodo,m.missao_id,m.nome,m.objetivo,m.meta,least(m.meta,count(e.id)::integer),m.xp,m.reivindicada from public.clt_missions_v2 m left join public.clt_xp_events e on e.user_id=m.user_id and e.event_type=m.event_type and e.created_at>=m.inicio and e.created_at<m.fim where m.user_id=u and m.fim>now() group by m.id order by m.inicio desc,m.created_at,m.missao_id;
end $$;
revoke all on function public.clt_missions_v2() from public,anon;
grant execute on function public.clt_missions_v2() to authenticated,service_role;

create or replace function public.clt_claim_mission_v2(p_id uuid)
returns table(sucesso boolean,mensagem text,xp integer) language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.clt_missions_v2%rowtype;progress integer;
begin
 select * into m from public.clt_missions_v2 where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Missão indisponível.';end if;
 select least(m.meta,count(*)::integer) into progress from public.clt_xp_events where user_id=m.user_id and event_type=m.event_type and created_at>=m.inicio and created_at<m.fim;
 if m.reivindicada then return query select true,'Recompensa já recebida.',m.xp;return;end if;
 if progress<m.meta then raise exception 'A missão ainda não foi concluída.';end if;
 update public.clt_missions_v2 set reivindicada=true where id=m.id;
 perform clt_private.award_xp(m.user_id,'mission:'||m.id::text,'mission_reward',m.xp);
 return query select true,'Recompensa recebida: +'||m.xp||' XP.',m.xp;
end $$;
revoke all on function public.clt_claim_mission_v2(uuid) from public,anon;
grant execute on function public.clt_claim_mission_v2(uuid) to authenticated,service_role;

create or replace function public.missoes_clt_versao() returns integer language sql stable security invoker set search_path=public as $$select 3$$;
revoke all on function public.missoes_clt_versao() from public,anon;
grant execute on function public.missoes_clt_versao() to authenticated,service_role;
notify pgrst,'reload schema';
commit;
