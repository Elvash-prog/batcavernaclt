-- Somente leitura. Use para conferir o estado real depois de executar os patches.
select c.relname as tabela,c.relrowsecurity as rls_ativo from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select p.proname as funcao,pg_get_function_identity_arguments(p.oid) as argumentos,p.prosecdef as security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as usuario_executa,
 p.proconfig as configuracao,
 position('auth.uid' in pg_get_functiondef(p.oid))>0 as menciona_usuario_autenticado
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by p.proname;
select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id;
select grantee,table_name,privilege_type from information_schema.table_privileges where table_schema='public' and grantee in ('anon','authenticated') order by table_name,grantee,privilege_type;
-- O resultado acima não substitui inspeção das funções: citar auth.uid não garante validação correta.
