-- Complemento da auditoria: identidade administrativa fixa e privacidade de grupos.
-- UUID obtido do resultado fornecido pelo administrador no SQL Editor.
begin;
do $$begin
 if not exists(select 1 from public.perfis where id='2d3268d1-4993-46d6-abba-340a2ffdd0fa'::uuid) then
  raise exception 'Conta administrativa não encontrada. Confirme o projeto Supabase.';
 end if;
end $$;
-- Alterar o nome/slug nunca concede poder administrativo.
drop policy if exists "Somente Elvash pode alterar configuração pública" on public.configuracoes_site;
create policy "Somente Elvash pode alterar configuração pública"
on public.configuracoes_site for update to authenticated
using(auth.uid()='2d3268d1-4993-46d6-abba-340a2ffdd0fa'::uuid)
with check(auth.uid()='2d3268d1-4993-46d6-abba-340a2ffdd0fa'::uuid);
drop policy if exists bc139_config_admin on public.configuracoes_site;
create policy bc139_config_admin on public.configuracoes_site as restrictive
for update to authenticated
using(auth.uid()='2d3268d1-4993-46d6-abba-340a2ffdd0fa'::uuid)
with check(auth.uid()='2d3268d1-4993-46d6-abba-340a2ffdd0fa'::uuid);
revoke insert,delete,truncate,references,trigger on public.configuracoes_site from public,anon,authenticated;
revoke update on public.configuracoes_site from public,anon;
-- Mantém a consulta da própria participação e a consulta de membros por membros.
-- Pessoas externas não podem usar as funções para descobrir participação de terceiros.
create or replace function public.usuario_admin_grupo_clt(p_group_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null
 and (p_user_id=auth.uid() or clt_private.group_member(p_group_id,auth.uid()))
 and exists(select 1 from public.clt_chat_group_members where group_id=p_group_id and user_id=p_user_id and admin=true);
$$;
create or replace function public.usuario_membro_grupo_clt(p_group_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null
 and (p_user_id=auth.uid() or clt_private.group_member(p_group_id,auth.uid()))
 and exists(select 1 from public.clt_chat_group_members where group_id=p_group_id and user_id=p_user_id);
$$;
revoke execute on function public.usuario_admin_grupo_clt(uuid,uuid),public.usuario_membro_grupo_clt(uuid,uuid) from public,anon;
grant execute on function public.usuario_admin_grupo_clt(uuid,uuid),public.usuario_membro_grupo_clt(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
-- Resultado de verificação do conjunto 1.39.1 + 1.39.2.
select
 not has_function_privilege('authenticated','public.adicionar_membro_grupo_clt(uuid,uuid)','EXECUTE') as inclusao_antiga_bloqueada,
 not has_function_privilege('authenticated','public.criar_grupo_clt(text,uuid[])','EXECUTE') as criacao_antiga_bloqueada,
 not has_function_privilege('authenticated','public.email_login_por_usuario(text)','EXECUTE') as email_privado,
 position('clt_private.friends' in pg_get_functiondef('public.perfil_detalhes_autorizado(uuid)'::regprocedure))>0 as perfil_respeita_bloqueios,
 exists(select 1 from pg_policies where schemaname='public' and tablename='configuracoes_site'
 and policyname='bc139_config_admin' and permissive='RESTRICTIVE'
 and qual like '%2d3268d1-4993-46d6-abba-340a2ffdd0fa%') as administrador_por_uuid,
 not exists(select 1 from storage.buckets where id in ('avatars','group-avatars','feed-media','chat-media','group-chat-media','clt-quarantine') and public) as buckets_privados;
