-- BatCaverna — Patch 1.31
-- Execute no SQL Editor do Supabase. Amplia os objetivos disponíveis,
-- preservando a validação, as permissões e os resgates existentes.
BEGIN;
DO $patch$
DECLARE
  signature text;
  original text;
  revised text;
  insertion text;
BEGIN
  FOREACH signature IN ARRAY ARRAY['public.missoes_clt()', 'public.resgatar_missao_clt(bigint)'] LOOP
    IF to_regprocedure(signature) IS NULL THEN
      RAISE EXCEPTION 'Função necessária não encontrada: %', signature;
    END IF;
    original := pg_get_functiondef(to_regprocedure(signature));
    IF position('add_game_2' in original) > 0 AND position('media_1' in original) > 0 AND position('media_2' in original) > 0 THEN
      CONTINUE;
    END IF;
    IF signature = 'public.missoes_clt()' THEN
      insertion := $body$elsif r.missao_id='add_game_2' then v_meta:=2; prog:=greatest(0,j-r.base_jogos);
   elsif r.missao_id='media_1' then v_meta:=1; prog:=greatest(0,e-r.base_extras);
   elsif r.missao_id='media_2' then v_meta:=2; prog:=greatest(0,e-r.base_extras);
   elsif r.missao_id='add_game_3' then$body$;
    ELSE
      insertion := $body$elsif r.missao_id='add_game_2' then meta:=2;reward:=50;prog:=j-r.base_jogos;
   elsif r.missao_id='media_1' then meta:=1;reward:=25;prog:=e-r.base_extras;
   elsif r.missao_id='media_2' then meta:=2;reward:=50;prog:=e-r.base_extras;
   elsif r.missao_id='add_game_3' then$body$;
    END IF;
    revised := regexp_replace(original, $regex$elsif\s+r\.missao_id\s*=\s*'add_game_3'\s+then$regex$, insertion, 'i');
    IF revised = original THEN
      RAISE EXCEPTION 'A estrutura de % difere da esperada. Nenhuma alteração foi aplicada; envie a definição atual para adaptar o patch.', signature;
    END IF;
    EXECUTE revised;
  END LOOP;
END;
$patch$;
CREATE OR REPLACE FUNCTION public.missoes_clt_versao()
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $version$ SELECT 2; $version$;
REVOKE ALL ON FUNCTION public.missoes_clt_versao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.missoes_clt_versao() TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
