-- Read-only public profile projection: searches still work without exposing private profile columns.
create table public.clt_profile_directory as select id,slug,nome,avatar_url,codigo_convite from public.perfis with no data;
alter table public.clt_profile_directory add primary key(id);
alter table public.clt_profile_directory add foreign key(id) references public.perfis(id) on delete cascade;
alter table public.clt_profile_directory enable row level security;
revoke all on public.clt_profile_directory from public,anon,authenticated;
grant select on public.clt_profile_directory to authenticated;
grant all on public.clt_profile_directory to service_role;
create policy directory_visible on public.clt_profile_directory for select to authenticated using((select auth.uid()) is not null and clt_private.community_visible((select auth.uid()),id));
insert into public.clt_profile_directory select id,slug,nome,avatar_url,codigo_convite from public.perfis;
create function clt_private.sync_profile_directory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.clt_profile_directory(id,slug,nome,avatar_url,codigo_convite) values(new.id,new.slug,new.nome,new.avatar_url,new.codigo_convite)
 on conflict(id) do update set slug=excluded.slug,nome=excluded.nome,avatar_url=excluded.avatar_url,codigo_convite=excluded.codigo_convite;
 return new;
end $$;
revoke all on function clt_private.sync_profile_directory() from public,anon,authenticated;
create trigger sync_profile_directory after insert or update of slug,nome,avatar_url,codigo_convite on public.perfis for each row execute function clt_private.sync_profile_directory();
create or replace view public.perfis_publicos_clt with(security_invoker=true,security_barrier=true) as select id,slug,nome,avatar_url,codigo_convite from public.clt_profile_directory;
revoke all on public.perfis_publicos_clt from public,anon,authenticated;
grant select on public.perfis_publicos_clt to authenticated;
-- A trigger is invoked by its table, never through an application RPC.
do $$ declare fn record;begin
 for fn in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prorettype='pg_catalog.trigger'::regtype loop
 execute format('revoke all on function %s from public,anon,authenticated',fn.signature);
 execute format('alter function %s set search_path=pg_catalog,public,pg_temp',fn.signature);
 end loop;
end $$;

-- Aggregate service metrics only: no user, IP, query, path parameters, payload or token.
create table public.clt_operational_metrics (
 hour timestamptz not null, service text not null check(service in ('native-api','bright-api')),
 route text not null check(route in ('igdb','tmdb','media','steam_cover','steam_free','other','games','catalog_cache_hit','catalog_cache_miss')),
 status_group smallint not null check(status_group between 1 and 5),requests bigint not null default 0,total_ms bigint not null default 0,max_ms integer not null default 0,slow_requests bigint not null default 0,
 primary key(hour,service,route,status_group)
);
alter table public.clt_operational_metrics enable row level security;
revoke all on public.clt_operational_metrics from public,anon,authenticated;
grant all on public.clt_operational_metrics to service_role;
create function public.clt_record_operational_metric(p_service text,p_route text,p_status integer,p_elapsed integer) returns void language plpgsql security invoker set search_path='' as $$
declare elapsed integer:=greatest(0,least(120000,p_elapsed));
begin
 if p_status not between 100 and 599 or p_status is null or p_elapsed is null then raise exception 'Invalid metric';end if;
 insert into public.clt_operational_metrics(hour,service,route,status_group,requests,total_ms,max_ms,slow_requests)
 values(date_trunc('hour',now()),p_service,p_route,(p_status/100)::smallint,1,elapsed,elapsed,case when elapsed>=1000 then 1 else 0 end)
 on conflict(hour,service,route,status_group) do update set requests=public.clt_operational_metrics.requests+1,total_ms=public.clt_operational_metrics.total_ms+elapsed,max_ms=greatest(public.clt_operational_metrics.max_ms,elapsed),slow_requests=public.clt_operational_metrics.slow_requests+excluded.slow_requests;
 delete from public.clt_operational_metrics where hour<now()-interval '30 days';
end $$;
revoke all on function public.clt_record_operational_metric(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.clt_record_operational_metric(text,text,integer,integer) to service_role;

create or replace function public.clt_catalog_cache_claim(p_key text,p_lease uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare row public.clt_catalog_cache%rowtype;
begin
 if p_key !~ '^[a-f0-9]{64}$' or p_lease is null then raise exception 'Invalid cache key';end if;
 insert into public.clt_catalog_cache(cache_key,lease_id,lease_until) values(p_key,p_lease,now()+interval '45 seconds') on conflict do nothing;
 select * into row from public.clt_catalog_cache where cache_key=p_key for update;
 if row.payload is not null and row.expires_at>now() then perform public.clt_record_operational_metric('native-api','catalog_cache_hit',200,0);return jsonb_build_object('state','hit','payload',row.payload);end if;
 if row.lease_id is distinct from p_lease and row.lease_until>now() then return jsonb_build_object('state','wait');end if;
 update public.clt_catalog_cache set lease_id=p_lease,lease_until=now()+interval '45 seconds' where cache_key=p_key;
 perform public.clt_record_operational_metric('native-api','catalog_cache_miss',200,0);
 return jsonb_build_object('state','fetch');
end $$;
