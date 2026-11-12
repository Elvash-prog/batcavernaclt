-- Visibility metadata only. Existing grants, ownership policies and RLS stay in force.
alter table public.itens add column capa_adulta boolean not null default false;
comment on column public.itens.capa_adulta is 'Adult cover: conceal until per-image reveal. User/provider metadata, not age verification or pixel classification.';
do $migration$
declare fn text;
begin
 fn:=pg_get_functiondef('public.clt_game_feed(text,jsonb)'::regprocedure);
 if position($old$'capa',i.capa$old$ in fn)=0 then raise exception 'Unexpected game feed projection';end if;
 execute replace(fn,$old$'capa',i.capa$old$,$new$'capa',i.capa,'capa_adulta',i.capa_adulta$new$);
 fn:=pg_get_functiondef('public.clt_features(text,jsonb)'::regprocedure);
 if position($old$'capa',i.capa$old$ in fn)=0 or position($old$'capa',preview.titulo->>'capa'$old$ in fn)=0 or position($old$to_jsonb(i) order by i.created_at,i.item_id$old$ in fn)=0 then raise exception 'Unexpected lists projection';end if;
 fn:=replace(fn,$old$'capa',i.capa$old$,$new$'capa',i.capa,'capa_adulta',i.capa_adulta$new$);
 -- Existing list authorization remains before these bounded projections. Live marks beat old snapshots.
 fn:=replace(fn,$old$'capa',preview.titulo->>'capa'$old$,$new$'capa',preview.titulo->>'capa','capa_adulta',coalesce((select g.capa_adulta from public.itens g where g.id=case when preview.item_id ~ '^[0-9]{1,18}$' then preview.item_id::bigint end),(preview.titulo->>'capa_adulta')='true',false)$new$);
 fn:=replace(fn,$old$to_jsonb(i) order by i.created_at,i.item_id$old$,$new$to_jsonb(i) || jsonb_build_object('titulo',i.titulo || jsonb_build_object('capa_adulta',coalesce((select g.capa_adulta from public.itens g where g.id=case when i.item_id ~ '^[0-9]{1,18}$' then i.item_id::bigint end),(i.titulo->>'capa_adulta')='true',false))) order by i.created_at,i.item_id$new$);
 execute fn;
end $migration$;
notify pgrst, 'reload schema';
