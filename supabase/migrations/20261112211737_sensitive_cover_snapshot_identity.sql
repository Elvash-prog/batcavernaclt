-- A list snapshot can keep a previous cover. Never use another image's adult mark.
do $migration$
declare fn text;
begin
 fn:=pg_get_functiondef('public.clt_features(text,jsonb)'::regprocedure);
 if position($old$g.id=case when preview.item_id ~ '^[0-9]{1,18}$' then preview.item_id::bigint end$old$ in fn)=0 or position($old$g.id=case when i.item_id ~ '^[0-9]{1,18}$' then i.item_id::bigint end$old$ in fn)=0 then raise exception 'Unexpected sensitive cover projections';end if;
 fn:=replace(fn,$old$g.id=case when preview.item_id ~ '^[0-9]{1,18}$' then preview.item_id::bigint end$old$,$new$g.id=case when preview.item_id ~ '^[0-9]{1,18}$' then preview.item_id::bigint end and g.capa=(preview.titulo->>'capa')$new$);
 fn:=replace(fn,$old$g.id=case when i.item_id ~ '^[0-9]{1,18}$' then i.item_id::bigint end$old$,$new$g.id=case when i.item_id ~ '^[0-9]{1,18}$' then i.item_id::bigint end and g.capa=(i.titulo->>'capa')$new$);
 execute fn;
end $migration$;
