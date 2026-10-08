-- Apenas leitura. Retorna todas as seções em um único resultado, sem dados de chats ou chaves.
select 'buckets'::text as secao,id::text as objeto,
 jsonb_build_object('publico',public,'limite',file_size_limit,'formatos',allowed_mime_types) as detalhes
from storage.buckets
union all
select 'administrador',id::text,jsonb_build_object('slug',slug,'nome',nome)
from public.perfis where lower(slug)='elvash'
union all
select 'triggers_perfis_grupos',t.tgname,
 jsonb_build_object('tabela',c.relname,'ativo',t.tgenabled,'trigger',pg_get_triggerdef(t.oid),'funcao',pg_get_functiondef(p.oid))
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and c.relname in ('perfis','clt_chat_group_members') and not t.tgisinternal
union all
select 'colunas_itens',column_name,jsonb_build_object('papel',grantee,'permissao',privilege_type)
from information_schema.column_privileges
where table_schema='public' and table_name='itens' and grantee in ('anon','authenticated')
union all
select 'funcoes_convites',p.proname,
 jsonb_build_object('argumentos',pg_get_function_identity_arguments(p.oid),
 'anon_executa',has_function_privilege('anon',p.oid,'EXECUTE'),
 'usuario_executa',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'definicao',pg_get_functiondef(p.oid))
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and p.proname in (
 'criar_grupo_convites_clt','convidar_grupo_clt','responder_convite_grupo_clt',
 'usuario_admin_grupo_clt','usuario_membro_grupo_clt')
order by secao,objeto;
