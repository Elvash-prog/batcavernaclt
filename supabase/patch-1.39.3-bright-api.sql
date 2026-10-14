-- Patch 1.39.3: shared limits for the bright-api Edge Function.
-- Execute this first, then replace the deployed bright-api/index.ts.
begin;
create schema if not exists clt_private;
-- Preserve schema access required by existing RLS helper functions.
revoke all on schema clt_private from public, anon;
grant usage on schema clt_private to authenticated, service_role;

create table if not exists clt_private.bright_api_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('minute','day')),
  window_start timestamptz not null,
  requests integer not null default 0,
  credits integer not null default 0,
  primary key (user_id, period)
);
alter table clt_private.bright_api_limits enable row level security;
revoke all on clt_private.bright_api_limits from public, anon, authenticated;

create or replace function public.clt_bright_api_limit(p_user_id uuid, p_cost integer)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_period text;
  v_start timestamptz;
  v_requests integer;
  v_credits integer;
  v_allowed boolean := true;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if p_user_id is null or p_cost is null or p_cost < 1 or p_cost > 160 then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  -- Serialize calls per account, including calls from different Edge instances.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1393));
  foreach v_period in array array['minute','day'] loop
    v_start := date_trunc(v_period, statement_timestamp(), 'UTC');
    insert into clt_private.bright_api_limits as limits
      (user_id, period, window_start, requests, credits)
    values (p_user_id, v_period, v_start, 1, p_cost)
    on conflict (user_id, period) do update set
      window_start = excluded.window_start,
      requests = case when limits.window_start = excluded.window_start
        then least(limits.requests + 1, 1000000) else 1 end,
      credits = case when limits.window_start = excluded.window_start
        then least(limits.credits + p_cost, 1000000) else p_cost end
    returning requests, credits into v_requests, v_credits;
    if (v_period = 'minute' and (v_requests > 120 or v_credits > 600))
       or (v_period = 'day' and (v_requests > 6000 or v_credits > 12000)) then
      v_allowed := false;
    end if;
  end loop;
  return v_allowed;
end;
$$;
revoke all on function public.clt_bright_api_limit(uuid,integer) from public, anon, authenticated;
grant execute on function public.clt_bright_api_limit(uuid,integer) to service_role;
notify pgrst, 'reload schema';
commit;

select
  not has_function_privilege('anon','public.clt_bright_api_limit(uuid,integer)','EXECUTE') as anon_bloqueado,
  not has_function_privilege('authenticated','public.clt_bright_api_limit(uuid,integer)','EXECUTE') as chamada_direta_bloqueada,
  has_function_privilege('service_role','public.clt_bright_api_limit(uuid,integer)','EXECUTE') as servidor_autorizado;
