-- BatCaverna 1.2.0: execute este arquivo inteiro no SQL Editor.
-- Compatível com IDs de títulos numéricos ou UUID; não modifica bibliotecas.
begin;
create table if not exists public.clt_episode_progress (
 user_id uuid not null references auth.users(id) on delete cascade, item_id text not null,
 temporada integer not null default 1 check(temporada between 1 and 10000),
 episodio integer not null default 0 check(episodio between 0 and 100000),
 total integer check(total between 1 and 100000), revision bigint not null default 0,
 updated_at timestamptz not null default now(),primary key(user_id,item_id),check(total is null or episodio<=total));
alter table public.clt_episode_progress enable row level security;
revoke all on public.clt_episode_progress from public,anon,authenticated;
create or replace function public.clt_journey(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); ident text:=p_data->>'item_id'; item jsonb; p public.clt_episode_progress;
 s integer; e integer; n integer; expected bigint; result jsonb;
begin
 if u is null then raise exception 'Entre na sua conta.'; end if;
 if p_action='stats' then
  with source as (
   select *,case when categoria='jogos' then 'jogos' when lower(coalesce(tipo,'')) like '%anime%' or tipo like '%🍥%' then 'animes'
    when lower(coalesce(tipo,'')) similar to '%(serie|série)%' or tipo like '%📺%' then 'series' else 'filmes' end grupo,
    translate(lower(coalesce(status,'')),'áàâãéêíóôõúç','aaaaeeiooouc') st,
    case when coalesce(data::text,'') ~ '^\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])' then left(data::text,7) else null end mes
   from public.itens where user_id=u
  ), marked as (
   select *,case when grupo='jogos' then st similar to '%(zerado|finalizado|platina|100\%)%' else st similar to '%(assistido|concluid|favorit)%' end finished from source
  ), months as (
   select to_char(date_trunc('month',now() at time zone 'America/Sao_Paulo')-i*interval '1 month','YYYY-MM') mes
   from generate_series(11,0,-1) i
  )
  select jsonb_build_array(jsonb_build_object('total',count(*),'concluidos',count(*) filter(where finished),
   'jogos',count(*) filter(where grupo='jogos'),'filmes',count(*) filter(where grupo='filmes'),
   'series',count(*) filter(where grupo='series'),'animes',count(*) filter(where grupo='animes'),
   'horas',coalesce(sum(greatest(0,coalesce(horas,0))) filter(where grupo='jogos'),0),
   'sem_data',count(*) filter(where finished and mes is null),
   'months',(select jsonb_agg(jsonb_build_object('mes',m.mes,'jogos',(select count(*) from marked x where x.finished and x.grupo='jogos' and x.mes=m.mes),'midias',(select count(*) from marked x where x.finished and x.grupo<>'jogos' and x.mes=m.mes)) order by m.mes) from months m)
  )) into result from marked;
  return result;
 end if;
 if p_action not in ('progress','save_progress','next_episode','next_season') then raise exception 'Ação inválida.'; end if;
 -- Lock item before progress to serialize edits/deletions and first-row initialization.
 select jsonb_build_object('nome',nome,'tipo',tipo,'categoria',categoria) into item from public.itens where user_id=u and id::text=ident for update;
 if item is null then raise exception 'Título indisponível na sua biblioteca.'; end if;
 if item->>'categoria'<>'filmes' or not(lower(coalesce(item->>'tipo','')) similar to '%(anime|serie|série)%' or item->>'tipo' like '%🍥%' or item->>'tipo' like '%📺%') then raise exception 'Progresso disponível apenas para séries e animes.'; end if;
 insert into public.clt_episode_progress(user_id,item_id) values(u,ident) on conflict do nothing;
 select * into p from public.clt_episode_progress where user_id=u and item_id=ident for update;
 if p_action<>'progress' then
  expected:=(p_data->>'revision')::bigint;
  if expected is null or expected<>p.revision then raise exception 'O progresso mudou em outra tela. Atualize antes de avançar.'; end if;
  s:=p.temporada;e:=p.episodio;n:=p.total;
  if p_action='save_progress' then
   s:=(p_data->>'temporada')::integer;e:=(p_data->>'episodio')::integer;n:=nullif(p_data->>'total','')::integer;
  elsif p_action='next_episode' then e:=e+1;
  elsif p_action='next_season' then s:=s+1;e:=0;n:=null;
  end if;
  if s is null or e is null or s not between 1 and 10000 or e not between 0 and 100000 or (n is not null and (n not between 1 and 100000 or e>n)) then raise exception 'Confira temporada, episódio e total de episódios.'; end if;
  update public.clt_episode_progress set temporada=s,episodio=e,total=n,revision=revision+1,updated_at=now() where user_id=u and item_id=ident returning * into p;
 end if;
 return jsonb_build_array(to_jsonb(p)||item);
end; $$;
revoke all on function public.clt_journey(text,jsonb) from public,anon;
grant execute on function public.clt_journey(text,jsonb) to authenticated;
create or replace function public.clt_cleanup_episode_progress() returns trigger
language plpgsql security definer set search_path=public as $$
begin delete from public.clt_episode_progress where user_id=old.user_id and item_id=old.id::text;return old;end; $$;
revoke all on function public.clt_cleanup_episode_progress() from public,anon,authenticated;
drop trigger if exists clt_episode_progress_cleanup on public.itens;
create trigger clt_episode_progress_cleanup after delete on public.itens for each row execute function public.clt_cleanup_episode_progress();
notify pgrst,'reload schema';
commit;
