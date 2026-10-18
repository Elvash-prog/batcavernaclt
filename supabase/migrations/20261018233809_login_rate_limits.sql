-- Service-only fixed windows. Never store raw account names, passwords or IPs.
create table if not exists clt_private.login_rate_windows (
 window_start timestamptz not null,
 key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),
 requests integer not null check(requests between 1 and 301),
 primary key(window_start,key_hash)
);
alter table clt_private.login_rate_windows enable row level security;
revoke all on clt_private.login_rate_windows from public,anon,authenticated;
grant usage on schema clt_private to service_role;
grant select,insert,update,delete on clt_private.login_rate_windows to service_role;
create or replace function public.clt_login_rate_limit(p_keys text[])
returns boolean language plpgsql security invoker set search_path='' as $$
declare bucket timestamptz:=date_trunc('minute',now()); n integer; i integer; allowed boolean:=true;
 limits integer[]:=array[30,60,10];
begin
 if array_ndims(p_keys) is distinct from 1 or cardinality(p_keys)<>4 or exists(select 1 from unnest(p_keys) k where k is null or k!~'^[a-f0-9]{64}$') then raise exception 'Invalid rate keys';end if;
 delete from clt_private.login_rate_windows where window_start<bucket-interval '10 minutes';
 -- Global row first: serializes updates and bounds new key creation under abuse.
 insert into clt_private.login_rate_windows values(bucket,p_keys[4],1)
 on conflict(window_start,key_hash)do update set requests=least(clt_private.login_rate_windows.requests+1,301)
 returning requests into n;
 if n>300 then return false;end if;
 for i in 1..3 loop
  insert into clt_private.login_rate_windows values(bucket,p_keys[i],1)
  on conflict(window_start,key_hash)do update set requests=least(clt_private.login_rate_windows.requests+1,301)
  returning requests into n;
  if n>limits[i] then allowed:=false;end if;
 end loop;
 return allowed;
end$$;
revoke all on function public.clt_login_rate_limit(text[]) from public,anon,authenticated;
grant execute on function public.clt_login_rate_limit(text[]) to service_role;
