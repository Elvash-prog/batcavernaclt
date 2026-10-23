begin;
set local lock_timeout='2s';

-- Validate every write path, including REST and both profile RPC overloads.
-- Existing rows are preserved; unrelated updates do not rewrite legacy fields.
create or replace function clt_private.validate_profile_input()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
declare item jsonb; field text; value text; fresh jsonb:=to_jsonb(new); previous jsonb;
begin
 if tg_op='UPDATE' then previous:=to_jsonb(old);end if;
 if tg_op='INSERT' or new.nome is distinct from old.nome then
  if char_length(btrim(coalesce(new.nome,''))) not between 1 and 40 then
   raise exception using errcode='23514',message='Informe um nome de até 40 caracteres.';
  end if;
 end if;
 if tg_op='INSERT' or new.bio is distinct from old.bio then
  if char_length(coalesce(new.bio,''))>280 then
   raise exception using errcode='23514',message='A bio pode ter até 280 caracteres.';
  end if;
 end if;
 foreach field in array array['avatar_url','banner_url'] loop
  if tg_op='INSERT' or fresh->field is distinct from previous->field then
   value:=fresh->>field;
   if value is not null and value<>'' and (char_length(value)>2048 or value !~ '^https://[^/@[:space:][:cntrl:]]+([/?#][^[:space:][:cntrl:]]*)?$') then
    raise exception using errcode='23514',message='Use uma imagem com endereço HTTPS válido.';
   end if;
  end if;
 end loop;
 if tg_op='INSERT' or new.steam_id is distinct from old.steam_id then
  if coalesce(new.steam_id,'')<>'' and new.steam_id !~ '^[0-9]{17}$' then
   raise exception using errcode='23514',message='Informe um Steam ID de 17 dígitos.';
  end if;
 end if;
 if tg_op='INSERT' or new.status_personalizado is distinct from old.status_personalizado then
  if new.status_personalizado is not null and new.status_personalizado not in ('online','jogando','ausente','dnd','invisivel') then
   raise exception using errcode='23514',message='Status inválido.';
  end if;
 end if;
 if tg_op='INSERT' or new.jogos_destaque is distinct from old.jogos_destaque then
  if new.jogos_destaque is not null then
   if jsonb_typeof(new.jogos_destaque)<>'array' then
    raise exception using errcode='23514',message='Destaques inválidos.';
   end if;
   if jsonb_array_length(new.jogos_destaque)>8 then
    raise exception using errcode='23514',message='Selecione até oito jogos.';
   end if;
   for item in select jsonb_array_elements(new.jogos_destaque) loop
    if jsonb_typeof(item)<>'string' or char_length(btrim(item#>>'{}')) not between 1 and 240 then
     raise exception using errcode='23514',message='Destaques inválidos.';
    end if;
   end loop;
  end if;
 end if;
 if tg_op='INSERT' or new.conquistas_destaque is distinct from old.conquistas_destaque then
  if new.conquistas_destaque is not null then
   if jsonb_typeof(new.conquistas_destaque)<>'array' then
    raise exception using errcode='23514',message='Destaques inválidos.';
   end if;
   if jsonb_array_length(new.conquistas_destaque)>4 then
    raise exception using errcode='23514',message='Selecione até quatro conquistas.';
   end if;
   for item in select jsonb_array_elements(new.conquistas_destaque) loop
    if jsonb_typeof(item)<>'number' or item::text !~ '^[0-9]{1,2}$' then
     raise exception using errcode='23514',message='Destaques inválidos.';
    end if;
    if item::integer not between 0 and 31 then
     raise exception using errcode='23514',message='Destaques inválidos.';
    end if;
   end loop;
  end if;
 end if;
 if tg_op='INSERT' or new.titulo_destaque_nivel is distinct from old.titulo_destaque_nivel then
  if new.titulo_destaque_nivel is not null and new.titulo_destaque_nivel not between 0 and 10000 then
   raise exception using errcode='23514',message='Título em destaque inválido.';
  end if;
 end if;
 return new;
end $$;
revoke all on function clt_private.validate_profile_input() from public,anon,authenticated;
drop trigger if exists clt_profile_input_guard on public.perfis;
create trigger clt_profile_input_guard before insert or update on public.perfis
for each row execute function clt_private.validate_profile_input();
commit;
