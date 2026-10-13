-- Corrige instalações existentes em que notificacoes.referencia_id é uuid.
-- Execute o arquivo inteiro no SQL Editor do Supabase. Não altera dados existentes.
begin;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.clt_features(text,jsonb)'::regprocedure) into definition;
  if position('r.id::text,false' in definition) > 0 then
    definition := replace(definition, 'r.id::text,false', 'r.id,false');
    execute definition;
  end if;
end $$;

notify pgrst,'reload schema';
commit;
