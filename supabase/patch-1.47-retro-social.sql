-- BatCaverna CLT desktop 0.17.20 — RetroAchievements visível somente ao dono e amigos autorizados.
begin;

drop function if exists public.perfil_detalhes_autorizado(uuid);
create function public.perfil_detalhes_autorizado(p_perfil_id uuid)
returns table(
  fundo jsonb,
  listas jsonb,
  retroachievements_user text,
  retroachievements_ulid text
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if not clt_private.friends(auth.uid(),p_perfil_id) then
    raise exception 'Perfil privado ou acesso bloqueado.';
  end if;
  return query
    select p.fundo,p.listas,p.retroachievements_user,p.retroachievements_ulid
    from public.perfis p
    where p.id=p_perfil_id;
end
$$;

revoke execute on function public.perfil_detalhes_autorizado(uuid) from public,anon;
grant execute on function public.perfil_detalhes_autorizado(uuid) to authenticated;
notify pgrst,'reload schema';

commit;
