-- Global upstream attempt budgets, shared cooldown and public metadata cache only.
create table if not exists public.clt_provider_limits (
 provider text primary key check(provider in ('steam','retro','steam_store','offers')),
 day_start timestamptz not null default date_trunc('day',now()),day_calls integer not null default 0,
 minute_start timestamptz not null default date_trunc('minute',now()),minute_calls integer not null default 0,
 blocked_until timestamptz not null default '-infinity'
);
create table if not exists public.clt_provider_public_cache (
 cache_key text primary key check(cache_key ~ '^[a-f0-9]{64}$'),
 payload jsonb,expires_at timestamptz not null default '-infinity',
 lease_id uuid,lease_until timestamptz not null default '-infinity'
);
create index if not exists clt_provider_cache_expiry on public.clt_provider_public_cache(expires_at);
alter table public.clt_provider_limits enable row level security;
alter table public.clt_provider_public_cache enable row level security;
revoke all on public.clt_provider_limits,public.clt_provider_public_cache from public,anon,authenticated;
grant all on public.clt_provider_limits,public.clt_provider_public_cache to service_role;
create or replace function public.clt_provider_reserve(p_provider text) returns jsonb language plpgsql security definer set search_path=public,pg_temp set timezone='UTC' as $$
declare r public.clt_provider_limits; t timestamptz:=clock_timestamp(); daily integer; per_minute integer; wait integer;
begin
 if p_provider not in ('steam','retro','steam_store','offers') then raise exception 'Invalid provider';end if;
 daily:=case p_provider when 'steam' then 90000 when 'retro' then 30000 else 10000 end;
 per_minute:=case p_provider when 'steam' then 1000 when 'retro' then 120 when 'steam_store' then 60 else 30 end;
 insert into public.clt_provider_limits(provider) values(p_provider) on conflict do nothing;
 select * into r from public.clt_provider_limits where provider=p_provider for update;
 t:=clock_timestamp();
 if r.day_start<>date_trunc('day',t) then r.day_start:=date_trunc('day',t);r.day_calls:=0;end if;
 if r.minute_start<>date_trunc('minute',t) then r.minute_start:=date_trunc('minute',t);r.minute_calls:=0;end if;
 wait:=case when r.blocked_until>t then ceil(extract(epoch from r.blocked_until-t))::integer else 0 end;
 if r.day_calls>=daily then wait:=greatest(wait,ceil(extract(epoch from r.day_start+interval '1 day'-t))::integer);end if;
 if r.minute_calls>=per_minute then wait:=greatest(wait,ceil(extract(epoch from r.minute_start+interval '1 minute'-t))::integer);end if;
 if wait>0 then return jsonb_build_object('allowed',false,'retry_after',wait);end if;
 update public.clt_provider_limits set day_start=r.day_start,day_calls=r.day_calls+1,minute_start=r.minute_start,minute_calls=r.minute_calls+1 where provider=p_provider;
 return jsonb_build_object('allowed',true);
end $$;
create or replace function public.clt_provider_pause(p_provider text,p_seconds integer) returns void language plpgsql security definer set search_path=public,pg_temp set timezone='UTC' as $$
begin
 if p_provider not in ('steam','retro','steam_store','offers') or p_seconds<1 or p_seconds>2147483640 then raise exception 'Invalid cooldown';end if;
 insert into public.clt_provider_limits(provider,blocked_until) values(p_provider,clock_timestamp()+make_interval(secs=>p_seconds))
 on conflict(provider) do update set blocked_until=greatest(clt_provider_limits.blocked_until,excluded.blocked_until);
end $$;
create or replace function public.clt_provider_cache_claim(p_key text,p_lease uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp set timezone='UTC' as $$
declare r public.clt_provider_public_cache;t timestamptz:=clock_timestamp();
begin
 delete from public.clt_provider_public_cache where expires_at<t-interval '1 day' and lease_until<t;
 insert into public.clt_provider_public_cache(cache_key) values(p_key) on conflict do nothing;
 select * into r from public.clt_provider_public_cache where cache_key=p_key for update;
 t:=clock_timestamp();
 if r.expires_at>t and r.payload is not null then return jsonb_build_object('state','hit','payload',r.payload);end if;
 if r.lease_until>t and r.lease_id is distinct from p_lease then return jsonb_build_object('state','wait');end if;
 update public.clt_provider_public_cache set lease_id=p_lease,lease_until=t+interval '25 seconds' where cache_key=p_key;
 return jsonb_build_object('state','fetch');
end $$;
create or replace function public.clt_provider_cache_store(p_key text,p_lease uuid,p_payload jsonb,p_ttl integer) returns boolean language plpgsql security definer set search_path=public,pg_temp set timezone='UTC' as $$
begin
 if p_ttl<1 or p_ttl>86400 or p_payload is null or octet_length(p_payload::text)>4194304 then raise exception 'Invalid public payload';end if;
 update public.clt_provider_public_cache set payload=p_payload,expires_at=clock_timestamp()+make_interval(secs=>p_ttl),lease_until='-infinity',lease_id=null where cache_key=p_key and lease_id=p_lease;
 return found;
end $$;
create or replace function public.clt_provider_cache_release(p_key text,p_lease uuid) returns void language sql security definer set search_path=public,pg_temp set timezone='UTC' as $$
 update public.clt_provider_public_cache set lease_until='-infinity',lease_id=null where cache_key=p_key and lease_id=p_lease;
$$;
revoke all on function public.clt_provider_reserve(text),public.clt_provider_pause(text,integer),public.clt_provider_cache_claim(text,uuid),public.clt_provider_cache_store(text,uuid,jsonb,integer),public.clt_provider_cache_release(text,uuid) from public,anon,authenticated;
grant execute on function public.clt_provider_reserve(text),public.clt_provider_pause(text,integer),public.clt_provider_cache_claim(text,uuid),public.clt_provider_cache_store(text,uuid,jsonb,integer),public.clt_provider_cache_release(text,uuid) to service_role;
