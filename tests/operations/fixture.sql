-- Isolated CI fixture, never run on production.
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema clt_private;
grant usage on schema auth,clt_private to authenticated,service_role;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key);
create table public.perfis(id uuid primary key references auth.users(id),slug text,nome text,avatar_url text,codigo_convite text,private_email text);
create table public.bloqueios_clt(bloqueador_id uuid,bloqueado_id uuid,primary key(bloqueador_id,bloqueado_id));
create function clt_private.community_visible(a uuid,b uuid) returns boolean language sql security definer set search_path='' as $$select a is not null and b is not null and(a=b or not exists(select 1 from public.bloqueios_clt where(bloqueador_id=a and bloqueado_id=b)or(bloqueador_id=b and bloqueado_id=a)))$$;
alter table public.perfis enable row level security;
grant select,update on public.perfis to authenticated;
create policy own_profile on public.perfis to authenticated using(id=auth.uid()) with check(id=auth.uid());
create view public.perfis_publicos_clt as select id,slug,nome,avatar_url,codigo_convite from public.perfis;
insert into auth.users values('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
insert into public.perfis values('11111111-1111-1111-1111-111111111111','fixture-one','Fixture One','','one','synthetic-one@example.invalid'),('22222222-2222-2222-2222-222222222222','fixture-two','Fixture Two','','two','synthetic-two@example.invalid');

create function public.fixture_trigger() returns trigger language plpgsql security definer as $$begin return new;end$$;
create trigger fixture_profile_updated before update on public.perfis for each row execute function public.fixture_trigger();
