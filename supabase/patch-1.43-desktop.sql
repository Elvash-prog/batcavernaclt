-- BatCaverna 1.43: permissões mínimas para os clientes nativos.
-- Execute inteiro no SQL Editor. As políticas RLS continuam limitando cada conta.
begin;

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.itens to authenticated;
grant select,update on public.perfis to authenticated;
grant select on public.perfis_publicos_clt to authenticated;
grant select on public.amigos to authenticated;
grant select,insert,update,delete on public.clt_posts,public.clt_post_likes,public.clt_post_comments to authenticated;
grant select,insert,update on public.clt_chat_messages to authenticated;
grant select,update on public.notificacoes to authenticated;

do $$ declare seq regclass; begin
  seq:=pg_get_serial_sequence('public.itens','id')::regclass;
  if seq is not null then execute format('grant usage,select on sequence %s to authenticated',seq); end if;
exception when others then null; end $$;

do $$ declare f regprocedure; begin
  foreach f in array array[
    to_regprocedure('public.buscar_usuarios_clt(text)'),
    to_regprocedure('public.perfil_detalhes_autorizado(uuid)'),
    to_regprocedure('public.enviar_convite_amizade(uuid)'),
    to_regprocedure('public.aceitar_convite_amizade(uuid)'),
    to_regprocedure('public.recusar_convite_amizade(uuid)'),
    to_regprocedure('public.clt_journey(text,jsonb)')
  ] loop
    if f is not null then execute format('grant execute on function %s to authenticated',f); end if;
  end loop;
end $$;

notify pgrst,'reload schema';
commit;

