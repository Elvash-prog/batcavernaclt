-- Add bounded artwork previews to the already authorized lists response.
-- Preserve all existing authorization checks, mutations, function attributes and grants.
do $migration$
declare
 fn text := pg_get_functiondef('public.clt_features(text,jsonb)'::regprocedure);
 old text := $old$'count',(select count(*) from public.clt_custom_list_items i where i.list_id=c.id)) x$old$;
 replacement text := $new$'count',(select count(*) from public.clt_custom_list_items i where i.list_id=c.id),
    'preview',coalesce((select jsonb_agg(jsonb_build_object('nome',preview.titulo->>'nome','capa',preview.titulo->>'capa') order by preview.created_at,preview.item_id)
      from (select i.titulo,i.created_at,i.item_id from public.clt_custom_list_items i where i.list_id=c.id order by i.created_at,i.item_id limit 4) preview),'[]'::jsonb)) x$new$;
begin
 if position(replacement in fn)>0 then return; end if;
 if position(old in fn)=0 then raise exception 'Unexpected clt_features lists definition; review before applying.'; end if;
 execute replace(fn,old,replacement);
end $migration$;
notify pgrst, 'reload schema';
