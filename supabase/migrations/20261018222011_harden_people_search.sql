-- Search parameters remain data; invoker permissions enforce directory/block RLS.
create or replace function public.buscar_usuarios_clt(p_busca text)
returns table(id uuid, slug text, nome text, avatar_url text, codigo_convite text)
language sql stable security invoker set search_path = ''
as $$
  select p.id,p.slug,p.nome,p.avatar_url,p.codigo_convite
  from public.perfis_publicos_clt p
  where (select auth.uid()) is not null and p.id <> (select auth.uid())
    and length(btrim(coalesce(p_busca,''))) between 2 and 80
    and (strpos(lower(coalesce(p.slug,'')),lower(btrim(p_busca))) > 0
      or strpos(lower(coalesce(p.nome,'')),lower(btrim(p_busca))) > 0
      or upper(coalesce(p.codigo_convite,'')) = upper(btrim(p_busca)))
  order by case when lower(p.slug)=lower(btrim(p_busca)) then 0
    when upper(coalesce(p.codigo_convite,''))=upper(btrim(p_busca)) then 1 else 2 end,
    lower(coalesce(p.nome,p.slug))
  limit 20;
$$;
revoke all on function public.buscar_usuarios_clt(text) from public,anon;
grant execute on function public.buscar_usuarios_clt(text) to authenticated,service_role;
