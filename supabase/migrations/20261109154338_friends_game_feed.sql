-- Games shared with existing friends. All reads/writes use the caller's RLS.
create table public.clt_game_activity_likes (
 event_id bigint not null references public.clt_activity_events(id) on delete cascade,
 user_id uuid not null references public.perfis(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(event_id,user_id)
);
alter table public.clt_game_activity_likes enable row level security;
revoke all on public.clt_game_activity_likes from public,anon,authenticated;
grant select,insert,delete on public.clt_game_activity_likes to authenticated;
create policy game_likes_read on public.clt_game_activity_likes for select to authenticated
 using(exists(select 1 from public.clt_activity_events e where e.id=clt_game_activity_likes.event_id and e.categoria='jogos'));
create policy game_likes_insert on public.clt_game_activity_likes for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.clt_activity_events e where e.id=clt_game_activity_likes.event_id and e.categoria='jogos'));
create policy game_likes_delete on public.clt_game_activity_likes for delete to authenticated
 using(user_id=(select auth.uid()));
create index clt_game_activity_likes_user_idx on public.clt_game_activity_likes(user_id);
create index clt_game_activity_feed_idx on public.clt_activity_events(created_at desc,id desc) where categoria='jogos';
create policy game_share_delete on public.clt_activity_events for delete to authenticated
 using(user_id=(select auth.uid()) and tipo='game_share');

create function public.clt_game_feed(p_action text default 'list',p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 uid uuid:=auth.uid(); result jsonb; game public.itens%rowtype; v_event bigint; action text; cursor_time timestamptz; cursor_id bigint;
begin
 if uid is null then raise exception 'Não autenticado' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>2048 then raise exception 'Dados inválidos'; end if;
 if p_action='list' then
  cursor_time:=(p_data->>'before_time')::timestamptz;
  cursor_id:=(p_data->>'before_id')::bigint;
  if (cursor_time is null)<>(cursor_id is null) then raise exception 'Página inválida';end if;
  with page as materialized (
   select e.*,jsonb_build_object('nome',i.nome,'categoria','jogos','capa',i.capa,'ano',i.ano,'generos',i.generos,'plataforma',i.plataforma,'steam_appid',i.steam_appid) as title,
    jsonb_build_object('id',p.id,'nome',p.nome,'avatar_url',p.avatar_url) as author
   from public.clt_activity_events e
   join public.itens i on i.id=e.item_id and i.user_id=e.user_id and i.categoria='jogos'
   join public.perfis_publicos_clt p on p.id=e.user_id
   where e.categoria='jogos' and e.tipo in ('item','game_share')
    and (cursor_time is null or (e.created_at,e.id)<(cursor_time,cursor_id))
    and (e.meta->>'acao' is distinct from 'atualizou' or e.status is distinct from e.meta->>'status_anterior')
   order by e.created_at desc,e.id desc limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id::text,'user_id',e.user_id,'created_at',e.created_at,'status',e.status,'meta',e.meta,'title',e.title,'author',e.author,
   'liked',exists(select 1 from public.clt_game_activity_likes l where l.event_id=e.id and l.user_id=uid),
   'like_count',(select count(*) from public.clt_game_activity_likes l where l.event_id=e.id)) order by e.created_at desc,e.id desc),'[]'::jsonb)
  into result from page e;
  return result;
 elsif p_action='share' then
  action:=p_data->>'action';
  if action is null or action not in ('started','recommend','finished') then raise exception 'Escolha uma atividade';end if;
  select * into game from public.itens where id=(p_data->>'item_id')::bigint and user_id=uid and categoria='jogos';
  if not found then raise exception 'Escolha um jogo da sua biblioteca' using errcode='42501';end if;
  -- Serialize retries for this account without locking other people's publications.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,37));
  select id into v_event from public.clt_activity_events where user_id=uid and tipo='game_share' and item_id=game.id and meta->>'acao'=action and created_at>now()-interval '30 seconds' order by id desc limit 1;
  if v_event is null then
   if (select count(*) from public.clt_activity_events where user_id=uid and tipo='game_share' and created_at>now()-interval '1 hour')>=30 then raise exception 'Aguarde antes de compartilhar mais jogos';end if;
   insert into public.clt_activity_events(user_id,tipo,item_id,categoria,nome,status,meta)
   values(uid,'game_share',game.id,'jogos',game.nome,game.status,jsonb_build_object('acao',action)) returning id into v_event;
  end if;
  return jsonb_build_array(jsonb_build_object('id',v_event::text));
 elsif p_action='like' then
  v_event:=(p_data->>'id')::bigint;
  if jsonb_typeof(p_data->'liked') is distinct from 'boolean' then raise exception 'Curtida inválida';end if;
  if not exists(select 1 from public.clt_activity_events e join public.itens i on i.id=e.item_id and i.user_id=e.user_id where e.id=v_event and e.categoria='jogos' and i.categoria='jogos') then raise exception 'Atividade indisponível' using errcode='42501';end if;
  if (p_data->>'liked')::boolean then
   insert into public.clt_game_activity_likes(event_id,user_id) values(v_event,uid) on conflict do nothing;
  else delete from public.clt_game_activity_likes l where l.event_id=v_event and l.user_id=uid;end if;
  return jsonb_build_array(jsonb_build_object('liked',(p_data->>'liked')::boolean,'like_count',(select count(*) from public.clt_game_activity_likes l where l.event_id=v_event)));
 elsif p_action='delete' then
  delete from public.clt_activity_events where id=(p_data->>'id')::bigint and user_id=uid and tipo='game_share';
  if not found then raise exception 'Publicação indisponível' using errcode='42501';end if;
  return '[]'::jsonb;
 end if;
 raise exception 'Ação inválida';
end;$$;
revoke all on function public.clt_game_feed(text,jsonb) from public,anon;
grant execute on function public.clt_game_feed(text,jsonb) to authenticated;
notify pgrst,'reload schema';
