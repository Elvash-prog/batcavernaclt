-- Integração opcional. Não foi aplicada ao banco nesta atualização.
begin;
create table if not exists public.clt_android_push_tokens (
 user_id uuid not null references auth.users(id) on delete cascade,
 token text not null check (length(token) between 32 and 4096),
 updated_at timestamptz not null default now(),
 primary key(user_id,token)
);
alter table public.clt_android_push_tokens enable row level security;
alter table public.clt_android_push_tokens force row level security;
revoke all on public.clt_android_push_tokens from anon,authenticated;
grant select,delete on public.clt_android_push_tokens to service_role;
grant select,insert,update,delete on public.clt_android_push_tokens to authenticated;
drop policy if exists own_android_tokens on public.clt_android_push_tokens;
create policy own_android_tokens on public.clt_android_push_tokens for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
