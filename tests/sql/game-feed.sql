-- Run inside a transaction and roll it back. Uses one existing game and friendship;
-- never creates accounts, sends recommendations/messages or commits fixture activity.
do $$
declare owner_id uuid; friend_id uuid; game_id bigint; fixture text; retry_id text; result jsonb; created timestamptz;
begin
 select i.user_id,i.id,a.amigo_id into owner_id,game_id,friend_id from public.itens i join public.amigos a on a.user_id=i.user_id where i.categoria='jogos' and clt_private.friends(i.user_id,a.amigo_id) limit 1;
 if game_id is null then raise exception 'Fixture requires one game and friendship';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 execute 'set local role authenticated';
 result:=public.clt_game_feed('share',jsonb_build_object('item_id',game_id::text,'action','recommend'));
 fixture:=result->0->>'id';
 result:=public.clt_game_feed('share',jsonb_build_object('item_id',game_id::text,'action','recommend'));
 if result->0->>'id'<>fixture then raise exception 'Retry created duplicate publication';end if;
 select created_at into created from public.clt_activity_events where id=fixture::bigint;
 result:=public.clt_game_feed('list','{}');
 if not exists(select 1 from jsonb_array_elements(result) x where x->>'id'=fixture) then raise exception 'Own share missing';end if;
 if exists(select 1 from jsonb_array_elements(result) x where (x->'title') ?| array['id','user_id','horas','nota','preco','review','status','updated_at']) then raise exception 'Private library fields leaked';end if;
 result:=public.clt_game_feed('list',jsonb_build_object('before_id',fixture,'before_time',created));
 if exists(select 1 from jsonb_array_elements(result) x where x->>'id'=fixture) then raise exception 'Cursor repeated anchor';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',friend_id::text,true);
 execute 'set local role authenticated';
 result:=public.clt_game_feed('list','{}');
 if not exists(select 1 from jsonb_array_elements(result) x where x->>'id'=fixture) then raise exception 'Friend share missing';end if;
 perform public.clt_game_feed('like',jsonb_build_object('id',fixture,'liked',true));
 result:=public.clt_game_feed('like',jsonb_build_object('id',fixture,'liked',true));
 if result->0->>'like_count'<>'1' then raise exception 'Duplicate like counted';end if;
 begin
  insert into public.clt_game_activity_likes(event_id,user_id) values(fixture::bigint,owner_id);
  raise exception 'Forged like accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.clt_game_feed('share',jsonb_build_object('item_id',game_id::text,'action','recommend'));
  raise exception 'Foreign game accepted for publishing';
 exception when insufficient_privilege then null;end;
 begin
  perform public.clt_game_feed('delete',jsonb_build_object('id',fixture));
  raise exception 'Friend could delete publication';
 exception when insufficient_privilege then null;end;
 result:=public.clt_game_feed('like',jsonb_build_object('id',fixture,'liked',false));
 if result->0->>'like_count'<>'0' then raise exception 'Unlike failed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 execute 'set local role authenticated';
 result:=public.clt_game_feed('list','{}');
 if exists(select 1 from jsonb_array_elements(result) x where x->>'id'=fixture) then raise exception 'Stranger can read share';end if;
 begin
  perform public.clt_game_feed('like',jsonb_build_object('id',fixture,'liked',true));
  raise exception 'Stranger could like share';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 insert into public.bloqueios_clt(bloqueador_id,bloqueado_id) values(owner_id,friend_id);
 perform set_config('request.jwt.claim.sub',friend_id::text,true);
 execute 'set local role authenticated';
 result:=public.clt_game_feed('list','{}');
 if exists(select 1 from jsonb_array_elements(result) x where x->>'id'=fixture) then raise exception 'Blocked friend can read share';end if;
 begin
  perform public.clt_game_feed('like',jsonb_build_object('id',fixture,'liked',true));
  raise exception 'Blocked friend could like share';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 execute 'set local role authenticated';
 perform public.clt_game_feed('delete',jsonb_build_object('id',fixture));
 if exists(select 1 from public.clt_activity_events where id=fixture::bigint) then raise exception 'Own delete failed';end if;
 execute 'reset role';
 execute 'set local role anon';
 begin
  perform public.clt_game_feed('list','{}');
  raise exception 'Anonymous feed access allowed';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end;$$;
