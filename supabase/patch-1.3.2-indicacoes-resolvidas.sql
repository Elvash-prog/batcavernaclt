-- BatCaverna CLT 1.3.2/1.3.3
-- Remove indicações resolvidas da caixa de entrada e impede respostas repetidas.
-- Idempotente: pode ser executado novamente com segurança.

do $$
declare
  fn text;
begin
  if to_regprocedure('public.clt_features(text,jsonb)') is null then
    raise exception 'A função public.clt_features(text,jsonb) ainda não existe. Execute primeiro supabase/ativar-desktop-0.12.1.sql.';
  end if;

  select pg_get_functiondef('public.clt_features(text,jsonb)'::regprocedure) into fn;

  fn := replace(
    fn,
    'where id=(p_data->>''recommendation_id'')::uuid and recipient_id=u;',
    'where id=(p_data->>''recommendation_id'')::uuid and recipient_id=u and estado=''pendente'';'
  );
  fn := replace(
    fn,
    'and (c.recipient_id=u or c.sender_id=u) and public.clt_feature_friend(c.sender_id,c.recipient_id)',
    'and (c.sender_id=u or (c.recipient_id=u and c.estado=''pendente'')) and public.clt_feature_friend(c.sender_id,c.recipient_id)'
  );
  fn := replace(
    fn,
    'and recipient_id=u and public.clt_feature_friend(u,sender_id);',
    'and recipient_id=u and estado=''pendente'' and public.clt_feature_friend(u,sender_id);'
  );

  execute fn;
end $$;

notify pgrst, 'reload schema';
