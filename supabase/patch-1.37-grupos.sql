-- BatCaverna — Patch 1.37: convites com aceite obrigatório.
-- Executar uma vez no SQL Editor do projeto Supabase. Transação atômica e reexecutável.
begin;
create table if not exists public.clt_chat_group_invites (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.clt_chat_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 invited_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(), responded_at timestamptz,
 unique(group_id,user_id)
);
alter table public.clt_chat_group_invites enable row level security;
drop policy if exists group_invite_read on public.clt_chat_group_invites;
create policy group_invite_read on public.clt_chat_group_invites for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.clt_chat_group_members m where m.group_id=clt_chat_group_invites.group_id and m.user_id=auth.uid() and m.admin)
);
revoke all on public.clt_chat_group_invites from anon,authenticated;
grant select on public.clt_chat_group_invites to authenticated;
create or replace function public.convidar_grupo_clt(p_group_id uuid,p_user_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.clt_chat_group_members where group_id=p_group_id and user_id=auth.uid() and admin) then raise exception 'Somente administradores podem convidar.'; end if;
 if p_user_id=auth.uid() or exists(select 1 from public.clt_chat_group_members where group_id=p_group_id and user_id=p_user_id) then raise exception 'Esta pessoa já participa do grupo.'; end if;
 insert into public.clt_chat_group_invites(group_id,user_id,invited_by) values(p_group_id,p_user_id,auth.uid())
 on conflict(group_id,user_id) do update set status='pending',invited_by=auth.uid(),created_at=now(),responded_at=null
 returning id into v_id;
 return v_id;
end $$;
create or replace function public.listar_convites_grupo_clt()
returns table(id uuid,group_id uuid,nome text,invited_by uuid,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select i.id,i.group_id,g.nome::text,i.invited_by,i.created_at from public.clt_chat_group_invites i join public.clt_chat_groups g on g.id=i.group_id
 where i.user_id=auth.uid() and i.status='pending'
 and exists(select 1 from public.clt_chat_group_members m where m.group_id=i.group_id and m.user_id=i.invited_by and m.admin)
 order by i.created_at desc;
$$;
create or replace function public.responder_convite_grupo_clt(p_invite_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.clt_chat_group_invites%rowtype;
begin
 select * into v from public.clt_chat_group_invites where id=p_invite_id and user_id=auth.uid() and status='pending' for update;
 if not found then raise exception 'Convite indisponível.'; end if;
 if p_accept and not exists(select 1 from public.clt_chat_group_members where group_id=v.group_id and user_id=v.invited_by and admin) then raise exception 'O convite não é mais válido.'; end if;
 update public.clt_chat_group_invites set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=v.id;
 if p_accept then insert into public.clt_chat_group_members(group_id,user_id,admin) values(v.group_id,auth.uid(),false) on conflict do nothing; end if;
end $$;
-- Criação atômica: só o criador entra; os demais recebem convites.
create or replace function public.criar_grupo_convites_clt(p_nome text,p_membros uuid[] default '{}')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_group uuid;v_user uuid;
begin
 if auth.uid() is null then raise exception 'Entre na conta para criar um grupo.'; end if;
 if char_length(trim(p_nome)) not between 1 and 60 then raise exception 'O nome deve ter de 1 a 60 caracteres.'; end if;
 if coalesce(cardinality(p_membros),0)>100 then raise exception 'Selecione no máximo 100 convites.'; end if;
 insert into public.clt_chat_groups(nome,criado_por) values(trim(p_nome),auth.uid()) returning id into v_group;
 insert into public.clt_chat_group_members(group_id,user_id,admin) values(v_group,auth.uid(),true);
 for v_user in select distinct unnest(p_membros) loop
  if v_user is not null and v_user<>auth.uid() then perform public.convidar_grupo_clt(v_group,v_user); end if;
 end loop;
 return v_group;
end $$;
revoke all on function public.criar_grupo_convites_clt(text,uuid[]) from public,anon;
grant execute on function public.criar_grupo_convites_clt(text,uuid[]) to authenticated;
-- O trigger também bloqueia a inclusão direta pelas funções antigas e por clientes antigos.
create or replace function public.exigir_aceite_grupo_clt()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.clt_chat_groups where id=new.group_id and criado_por=new.user_id and criado_por=auth.uid()) then return new; end if;
 if new.user_id=auth.uid() and exists(select 1 from public.clt_chat_group_invites where group_id=new.group_id and user_id=new.user_id and status='accepted' and responded_at=now()) then
  new.admin=false;return new;
 end if;
 raise exception 'A entrada no grupo exige um convite aceito pela própria pessoa.';
end $$;
drop trigger if exists clt_group_consent on public.clt_chat_group_members;
create trigger clt_group_consent before insert or update of user_id,group_id on public.clt_chat_group_members for each row execute function public.exigir_aceite_grupo_clt();
revoke all on function public.convidar_grupo_clt(uuid,uuid),public.listar_convites_grupo_clt(),public.responder_convite_grupo_clt(uuid,boolean),public.exigir_aceite_grupo_clt() from public,anon;
grant execute on function public.convidar_grupo_clt(uuid,uuid),public.listar_convites_grupo_clt(),public.responder_convite_grupo_clt(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
