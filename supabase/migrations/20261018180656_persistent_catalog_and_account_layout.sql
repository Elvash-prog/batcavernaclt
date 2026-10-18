-- Only public IGDB responses enter this service-only cache. No account tokens or personal data.
create table public.clt_catalog_cache (
 cache_key text primary key check(cache_key ~ '^[a-f0-9]{64}$'),
 payload jsonb,
 expires_at timestamptz not null default now(),
 lease_id uuid,
 lease_until timestamptz,
 updated_at timestamptz not null default now(),
 check(payload is null or (jsonb_typeof(payload)='array' and octet_length(payload::text)<=262144))
);
create index clt_catalog_cache_expiry on public.clt_catalog_cache(expires_at);
alter table public.clt_catalog_cache enable row level security;
revoke all on public.clt_catalog_cache from public,anon,authenticated;
grant select,insert,update,delete on public.clt_catalog_cache to service_role;
create function public.clt_catalog_cache_claim(p_key text,p_lease uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare row public.clt_catalog_cache%rowtype;
begin
 if p_key !~ '^[a-f0-9]{64}$' or p_lease is null then raise exception 'Invalid cache key';end if;
 insert into public.clt_catalog_cache(cache_key,lease_id,lease_until) values(p_key,p_lease,now()+interval '45 seconds') on conflict do nothing;
 select * into row from public.clt_catalog_cache where cache_key=p_key for update;
 if row.payload is not null and row.expires_at>now() then return jsonb_build_object('state','hit','payload',row.payload);end if;
 if row.lease_id is distinct from p_lease and row.lease_until>now() then return jsonb_build_object('state','wait');end if;
 update public.clt_catalog_cache set lease_id=p_lease,lease_until=now()+interval '45 seconds' where cache_key=p_key;
 return jsonb_build_object('state','fetch');
end $$;
create function public.clt_catalog_cache_store(p_key text,p_lease uuid,p_payload jsonb,p_ttl integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare changed integer; total_bytes bigint; total_rows bigint; oldest text;
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'array' or octet_length(p_payload::text)>262144 then return false;end if;
 if p_ttl not between 60 and 604800 then raise exception 'Invalid cache duration';end if;
 perform pg_advisory_xact_lock(617219042);
 update public.clt_catalog_cache set payload=p_payload,expires_at=now()+make_interval(secs=>p_ttl),updated_at=now(),lease_id=null,lease_until=null where cache_key=p_key and lease_id=p_lease;
 get diagnostics changed=row_count;
 delete from public.clt_catalog_cache where cache_key in(select cache_key from public.clt_catalog_cache where expires_at<now()-interval '1 day' and (lease_until is null or lease_until<now()) order by expires_at limit 64);
 loop
  select count(*),coalesce(sum(octet_length(payload::text)),0) into total_rows,total_bytes from public.clt_catalog_cache;
  exit when total_rows<=512 and total_bytes<=16777216;
  select cache_key into oldest from public.clt_catalog_cache where lease_until is null or lease_until<now() order by updated_at limit 1;
  exit when oldest is null;
  delete from public.clt_catalog_cache where cache_key=oldest;
 end loop;
 return changed=1;
end $$;
revoke all on function public.clt_catalog_cache_claim(text,uuid),public.clt_catalog_cache_store(text,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.clt_catalog_cache_claim(text,uuid),public.clt_catalog_cache_store(text,uuid,jsonb,integer) to service_role;

-- Desktop appearance is private to its owner and merges only changed keys.
create table public.clt_desktop_layout (
 user_id uuid primary key references auth.users(id) on delete cascade,
 layout jsonb not null default '{}'::jsonb check(jsonb_typeof(layout)='object' and octet_length(layout::text)<=2097152),
 updated_at timestamptz not null default now()
);
alter table public.clt_desktop_layout enable row level security;
revoke all on public.clt_desktop_layout from public,anon,authenticated;
grant select,insert,update on public.clt_desktop_layout to authenticated;
grant all on public.clt_desktop_layout to service_role;
create policy own_desktop_layout on public.clt_desktop_layout for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create function public.clt_save_desktop_layout(p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare me uuid:=auth.uid(); key text; value jsonb; removed text[]:='{}'; cleaned jsonb:='{}'; result jsonb;
begin
 if me is null or p_patch is null or jsonb_typeof(p_patch)<>'object' or octet_length(p_patch::text)>2097152 then raise exception 'Aparência inválida';end if;
 for key,value in select * from jsonb_each(p_patch) loop
  if key not in ('preset','bg','panel','accent','text','width','cardWidth','scale','cardFormat','background','compact','noAnimations') then raise exception 'Configuração de aparência desconhecida';end if;
  if value='null'::jsonb then removed:=array_append(removed,key);continue;end if;
  if key in ('bg','panel','accent','text') and (jsonb_typeof(value)<>'string' or value#>>'{}' !~ '^#[a-fA-F0-9]{6}$') then raise exception 'Cor inválida';end if;
  if key='preset' and (jsonb_typeof(value)<>'string' or length(value#>>'{}')>40) then raise exception 'Tema inválido';end if;
  if key='cardFormat' and value#>>'{}' not in ('poster','landscape') then raise exception 'Formato inválido';end if;
  if key='background' and (jsonb_typeof(value)<>'string' or value#>>'{}' !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'Imagem de fundo inválida';end if;
  if key in ('compact','noAnimations') and jsonb_typeof(value)<>'boolean' then raise exception 'Preferência inválida';end if;
  if key in ('width','cardWidth','scale') then
   if jsonb_typeof(value)<>'number' then raise exception 'Dimensão inválida';end if;
   if (key='width' and (value#>>'{}')::numeric not between 1050 and 2600) or (key='cardWidth' and (value#>>'{}')::numeric not between 180 and 500) or (key='scale' and (value#>>'{}')::numeric not between 80 and 140) then raise exception 'Dimensão fora do limite';end if;
  end if;
  cleaned:=cleaned||jsonb_build_object(key,value);
 end loop;
 insert into public.clt_desktop_layout(user_id,layout) values(me,cleaned)
 on conflict(user_id) do update set layout=(public.clt_desktop_layout.layout-removed)||cleaned,updated_at=now()
 returning jsonb_build_object('layout',layout,'updated_at',updated_at) into result;
 return result;
end $$;
revoke all on function public.clt_save_desktop_layout(jsonb) from public,anon;
grant execute on function public.clt_save_desktop_layout(jsonb) to authenticated;
