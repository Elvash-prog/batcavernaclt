-- Complemento da auditoria 1.39. Execute no SQL Editor como administrador.
-- Mantém os grupos existentes e as funções novas de convites.
begin;
do $$begin
 if to_regprocedure('public.criar_grupo_convites_clt(text,uuid[])') is null
 or to_regprocedure('public.convidar_grupo_clt(uuid,uuid)') is null
 or to_regprocedure('public.responder_convite_grupo_clt(uuid,boolean)') is null then
  raise exception 'Execute primeiro o Patch 1.37 de convites.';
 end if;
end $$;
-- As funções antigas não validam aceite no corpo. Impede chamadas diretas
-- mesmo que o trigger de consentimento seja removido ou esteja ausente.
revoke execute on function public.adicionar_membro_grupo_clt(uuid,uuid),public.criar_grupo_clt(text,uuid[])
from public,anon,authenticated;
-- Não depender apenas de uma amizade antiga: respeitar também bloqueios.
create or replace function public.perfil_detalhes_autorizado(p_perfil_id uuid)
returns table(fundo jsonb,listas jsonb)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Não autenticado'; end if;
 if not clt_private.friends(auth.uid(),p_perfil_id) then
  raise exception 'Perfil privado ou acesso bloqueado.';
 end if;
 return query select p.fundo,p.listas from public.perfis p where p.id=p_perfil_id;
end $$;
revoke execute on function public.perfil_detalhes_autorizado(uuid) from public,anon;
grant execute on function public.perfil_detalhes_autorizado(uuid) to authenticated;
-- Torna explícito que objetos temporários não antecedem objetos confiáveis.
alter function public.meus_privados() set search_path=public,pg_temp;
alter function public.buscar_usuarios_clt(text) set search_path=public,pg_temp;
alter function public.definir_admin_grupo_clt(uuid,uuid,boolean) set search_path=public,pg_temp;
alter function public.ranking_clt() set search_path=public,pg_temp;
alter function public.email_login_por_usuario(text) set search_path=public,auth,pg_temp;
alter function public.salvar_personalizacao_perfil_clt(text,text,text,text,jsonb,jsonb) set search_path=public,pg_temp;
alter function public.salvar_personalizacao_perfil_clt(text,text,text,text,integer,jsonb,jsonb) set search_path=public,pg_temp;
-- Complemento já executado anteriormente; repetir é seguro.
revoke truncate,references,trigger on public.configuracoes_site,public.push_subscriptions from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
