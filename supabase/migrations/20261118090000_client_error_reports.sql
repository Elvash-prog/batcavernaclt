-- Error reports sent by the Windows and Android apps of signed-in accounts.
-- Accounts can only insert their own reports through the RPC below; nobody but the
-- service role can read them. Reports are kept for 30 days.
create table if not exists public.clt_client_errors (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('windows', 'android')),
  app_version text not null check (char_length(app_version) between 1 and 32),
  stage text not null check (char_length(stage) between 1 and 80),
  message text not null check (char_length(message) between 1 and 900),
  created_at timestamptz not null default now()
);
create index if not exists clt_client_errors_user_created_idx on public.clt_client_errors (user_id, created_at desc);
create index if not exists clt_client_errors_created_idx on public.clt_client_errors (created_at);
alter table public.clt_client_errors enable row level security;
revoke all on public.clt_client_errors from anon, authenticated;

create or replace function public.clt_report_client_error(p_platform text, p_version text, p_stage text, p_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  v_stage text := left(btrim(coalesce(p_stage, '')), 80);
  v_message text := left(btrim(coalesce(p_message, '')), 900);
  v_version text := left(btrim(coalesce(p_version, '')), 32);
begin
  if me is null then raise exception 'Entre novamente para continuar.'; end if;
  if p_platform not in ('windows', 'android') or v_version !~ '^[0-9]+(\.[0-9]+){1,3}$'
     or v_stage = '' or v_message = '' then
    return false;
  end if;
  -- At most 20 reports per account per hour; extra reports are dropped silently.
  if (select count(*) from public.clt_client_errors
      where user_id = me and created_at > now() - interval '1 hour') >= 20 then
    return false;
  end if;
  insert into public.clt_client_errors (user_id, platform, app_version, stage, message)
  values (me, p_platform, v_version, v_stage, v_message);
  delete from public.clt_client_errors where created_at < now() - interval '30 days';
  return true;
end $$;

revoke all on function public.clt_report_client_error(text, text, text, text) from public, anon;
grant execute on function public.clt_report_client_error(text, text, text, text) to authenticated;
notify pgrst, 'reload schema';
