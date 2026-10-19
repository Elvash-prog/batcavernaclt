alter table public.clt_retro_collection
  add column if not exists statuses jsonb not null default '{}'::jsonb;

alter table public.clt_retro_collection
  drop constraint if exists clt_retro_collection_statuses_check;

alter table public.clt_retro_collection
  add constraint clt_retro_collection_statuses_check
  check (jsonb_typeof(statuses) = 'object' and octet_length(statuses::text) <= 20000);

drop function if exists public.clt_retro_mutate(uuid,integer,integer,text);

create or replace function public.clt_retro_mutate(
  p_user uuid,
  p_add integer default null,
  p_remove integer default null,
  p_cover text default null,
  p_status_game integer default null,
  p_status text default null
) returns jsonb
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
declare
  r public.clt_retro_collection;
begin
  if p_user is null
     or (p_add is not null and p_remove is not null)
     or coalesce(p_add, 1) < 1
     or coalesce(p_remove, 1) < 1
     or coalesce(p_status_game, 1) < 1
     or ((p_status_game is null) <> (p_status is null))
     or (p_status is not null and p_status not in ('backlog','progress','finished','platinum','paused','abandoned'))
  then
    raise exception 'Invalid collection action';
  end if;

  insert into public.clt_retro_collection(user_id)
  values (p_user)
  on conflict (user_id) do nothing;

  select * into r
  from public.clt_retro_collection
  where user_id = p_user
  for update;

  if p_add is not null then
    r.hidden_game_ids := array_remove(r.hidden_game_ids, p_add);
    if not (p_add = any(coalesce(r.game_ids, '{}'))) then
      if cardinality(r.game_ids) >= 100 then raise exception 'Collection limit'; end if;
      r.game_ids := array_append(coalesce(r.game_ids, '{}'), p_add);
    end if;
  end if;

  if p_remove is not null then
    r.game_ids := array_remove(r.game_ids, p_remove);
    r.statuses := coalesce(r.statuses, '{}'::jsonb) - p_remove::text;
    if not (p_remove = any(r.hidden_game_ids)) then
      if cardinality(r.hidden_game_ids) >= 5000 then raise exception 'Hidden collection limit'; end if;
      r.hidden_game_ids := array_append(r.hidden_game_ids, p_remove);
    end if;
  end if;

  if p_status_game is not null then
    r.statuses := jsonb_set(coalesce(r.statuses, '{}'::jsonb), array[p_status_game::text], to_jsonb(p_status), true);
  end if;

  update public.clt_retro_collection
  set game_ids = r.game_ids,
      hidden_game_ids = r.hidden_game_ids,
      cover_url = coalesce(p_cover, r.cover_url),
      statuses = r.statuses
  where user_id = p_user;

  return jsonb_build_object(
    'game_ids', r.game_ids,
    'hidden_game_ids', r.hidden_game_ids,
    'cover_url', coalesce(p_cover, r.cover_url),
    'statuses', r.statuses
  );
end
$$;

revoke execute on function public.clt_retro_mutate(uuid,integer,integer,text,integer,text) from public, anon, authenticated;
grant execute on function public.clt_retro_mutate(uuid,integer,integer,text,integer,text) to service_role;
