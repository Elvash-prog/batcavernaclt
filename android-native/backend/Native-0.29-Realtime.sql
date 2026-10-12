-- Execute no SQL Editor do projeto Supabase atual.
-- Idempotente: habilita eventos nas tabelas existentes; não altera RLS, grants ou dados.
begin;
do $block$
declare
  table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Publicação supabase_realtime ausente. Ative Realtime no projeto antes de executar.';
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and puballtables) then
    return;
  end if;
  foreach table_name in array array[
    'clt_chat_messages','clt_chat_reactions','clt_chat_group_messages',
    'clt_chat_group_reactions','clt_chat_group_members','clt_chat_group_reads',
    'clt_chat_group_invites','notificacoes'
  ] loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise notice 'Tabela % não existe; não criada nem alterada.', table_name;
    elsif not exists (
      select 1 from pg_publication_tables p
      where p.pubname = 'supabase_realtime' and p.schemaname = 'public' and p.tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$block$;
commit;
select tablename as tabela_ativa from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
  and tablename in ('clt_chat_messages','clt_chat_reactions','clt_chat_group_messages',
      'clt_chat_group_reactions','clt_chat_group_members','clt_chat_group_reads',
      'clt_chat_group_invites','notificacoes')
order by tablename;
