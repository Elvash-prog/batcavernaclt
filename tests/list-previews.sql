-- Transactional integration test: synthetic lists are rolled back, existing data is unchanged.
begin;
do $test$
declare
 users uuid[]; owner_id uuid; other_id uuid; list_id uuid:=gen_random_uuid();
 result jsonb; row jsonb; denied boolean:=false;
begin
 select array_agg(id) into users from (select id from auth.users order by id limit 2) accounts;
 if coalesce(array_length(users,1),0)<2 then raise exception 'Two testable accounts required'; end if;
 owner_id:=users[1];other_id:=users[2];
 insert into public.clt_custom_lists(id,user_id,nome) values(list_id,owner_id,'Teste transacional de capas');
 insert into public.clt_custom_list_items(list_id,item_id,titulo,created_at)
 select list_id,n::text,jsonb_build_object('nome','Título de teste '||n,'capa','https://example.com/'||n||'.jpg'),'2026-01-01'::timestamptz+n*interval '1 second' from generate_series(1,6) n;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 result:=public.clt_features('lists');
 select value into row from jsonb_array_elements(result) where value->>'id'=list_id::text;
 if row is null or row->>'count'<>'6' or jsonb_array_length(row->'preview')<>4 then raise exception 'Preview count differs from total'; end if;
 if row->'preview'->0->>'nome'<>'Título de teste 1' or row->'preview'->3->>'nome'<>'Título de teste 4' then raise exception 'Unstable preview ordering'; end if;
 if exists(select 1 from jsonb_array_elements(row->'preview') p where (select count(*) from jsonb_object_keys(p))<>2) then raise exception 'Preview exposes extra fields'; end if;
 perform set_config('request.jwt.claim.sub',other_id::text,true);
 result:=public.clt_features('lists');
 if exists(select 1 from jsonb_array_elements(result) p where p->>'id'=list_id::text) then raise exception 'Private list leaked'; end if;
 begin perform public.clt_features('list_items',jsonb_build_object('list_id',list_id));
 exception when others then if sqlerrm='Lista privada.' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Private list items leaked'; end if;
 if has_function_privilege('anon','public.clt_features(text,jsonb)','EXECUTE') or not has_function_privilege('authenticated','public.clt_features(text,jsonb)','EXECUTE') then raise exception 'Function grants changed'; end if;
end $test$;
rollback;
