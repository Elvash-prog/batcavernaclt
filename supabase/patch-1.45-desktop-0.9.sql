-- BatCaverna CLT 0.9: fundo de login global, edição exclusiva da conta Elvash.
begin;
create table if not exists public.clt_launcher_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.clt_launcher_admins enable row level security;
revoke all on public.clt_launcher_admins from anon, authenticated;
-- A identidade é vinculada uma única vez ao UUID existente, não ao nome enviado pelo cliente.
do $$ declare owner_id uuid; matches integer; begin
 if not exists(select 1 from public.clt_launcher_admins) then
  select count(*), min(id::text)::uuid into matches,owner_id from public.perfis where lower(slug)='elvash';
  if matches<>1 then raise exception 'É necessário existir exatamente um perfil com o usuário Elvash antes de aplicar este patch.'; end if;
  insert into public.clt_launcher_admins(user_id) values(owner_id);
 end if;
end $$;
create table if not exists public.clt_launcher_settings(id boolean primary key default true check(id),wallpaper_url text,updated_by uuid references auth.users(id),updated_at timestamptz not null default now());
alter table public.clt_launcher_settings enable row level security;
revoke all on public.clt_launcher_settings from anon, authenticated;
insert into public.clt_launcher_settings(id) values(true) on conflict do nothing;
create or replace function public.clt_launcher_can_edit() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.clt_launcher_admins where user_id=auth.uid()) $$;
revoke all on function public.clt_launcher_can_edit() from public,anon;
grant execute on function public.clt_launcher_can_edit() to authenticated;
create or replace function public.clt_launcher_public() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$ select jsonb_build_object('wallpaper',wallpaper_url,'updated_at',updated_at) from public.clt_launcher_settings where id=true $$;
revoke all on function public.clt_launcher_public() from public;
grant execute on function public.clt_launcher_public() to anon,authenticated;
create or replace function public.clt_launcher_set_wallpaper(p_url text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if not public.clt_launcher_can_edit() then raise exception 'Apenas a conta autorizada pode alterar o fundo de login.' using errcode='42501'; end if;
 if p_url is not null and (length(p_url)>1200 or p_url not like 'https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/public/login-backgrounds/'||auth.uid()::text||'/%' or p_url ~ '[?#]') then raise exception 'Imagem inválida.'; end if;
 update public.clt_launcher_settings set wallpaper_url=p_url,updated_by=auth.uid(),updated_at=now() where id=true;
 return public.clt_launcher_public();
end $$;
revoke all on function public.clt_launcher_set_wallpaper(text) from public,anon;
grant execute on function public.clt_launcher_set_wallpaper(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('login-backgrounds','login-backgrounds',true,8388608,array['image/png','image/jpeg','image/webp']) on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
drop policy if exists "launcher_admin_insert" on storage.objects;
create policy "launcher_admin_insert" on storage.objects for insert to authenticated with check(bucket_id='login-backgrounds' and (storage.foldername(name))[1]=auth.uid()::text and public.clt_launcher_can_edit());
commit;
