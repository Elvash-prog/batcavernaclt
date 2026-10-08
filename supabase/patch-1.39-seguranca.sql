-- Patch 1.39. Execute no Supabase SQL Editor como administrador.
-- Não apaga contas/conversas. Mantém políticas existentes e acrescenta limites RESTRICTIVE.
-- Arquivos existentes ficam privados e são analisados automaticamente antes de serem servidos.
begin;
create schema if not exists clt_private;
revoke all on schema clt_private from public,anon;
grant usage on schema clt_private to authenticated,service_role;
create or replace function clt_private.friends(a uuid,b uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select a is not null and b is not null and (a=b or (
 exists(select 1 from public.amigos where (user_id=a and amigo_id=b) or (user_id=b and amigo_id=a))
 and not exists(select 1 from public.bloqueios_clt where (bloqueador_id=a and bloqueado_id=b) or (bloqueador_id=b and bloqueado_id=a))))
$$;
create or replace function clt_private.group_member(g uuid,u uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select u is not null and exists(select 1 from public.clt_chat_group_members where group_id=g and user_id=u)
$$;
revoke all on function clt_private.friends(uuid,uuid),clt_private.group_member(uuid,uuid) from public,anon;
grant execute on function clt_private.friends(uuid,uuid),clt_private.group_member(uuid,uuid) to authenticated,service_role;
-- Exponha apenas nomes e identificadores no diretório. Bio, Steam e biblioteca continuam no perfil privado.
create or replace view public.perfis_publicos_clt with(security_barrier=true) as
 select id,slug,nome,avatar_url,codigo_convite from public.perfis;
revoke all on public.perfis_publicos_clt from public,anon,authenticated;
grant select on public.perfis_publicos_clt to anon,authenticated;
-- RLS e remoção de privilégios administrativos das contas do navegador.
do $$declare t text;begin
 foreach t in array array['perfis','itens','amigos','bloqueios_clt','convites_amizade','notificacoes','clt_posts','clt_post_likes','clt_post_comments','clt_activity_events','clt_chat_messages','clt_chat_groups','clt_chat_group_members','clt_chat_group_messages','clt_chat_group_reads','clt_missoes'] loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon',t);
   execute format('revoke truncate,references,trigger on public.%I from authenticated',t);
  end if;
 end loop;
end $$;
-- As permissões existentes continuam necessárias; estes limites não concedem acesso adicional.
drop policy if exists bc139_profile_read on public.perfis;
create policy bc139_profile_read on public.perfis as restrictive for select to authenticated using(clt_private.friends(auth.uid(),id));
drop policy if exists bc139_profile_update on public.perfis;
create policy bc139_profile_update on public.perfis as restrictive for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists bc139_items_read on public.itens;
create policy bc139_items_read on public.itens as restrictive for select to authenticated using(clt_private.friends(auth.uid(),user_id));
-- Generic user-owned mutations, with separate read scope for social objects.
do $$declare t text;expr text;begin
 foreach t in array array['itens','clt_posts','clt_post_comments','clt_post_likes'] loop
  execute format('drop policy if exists bc139_insert on public.%I',t);
  execute format('create policy bc139_insert on public.%I as restrictive for insert to authenticated with check(user_id=auth.uid())',t);
  execute format('drop policy if exists bc139_update on public.%I',t);
  execute format('create policy bc139_update on public.%I as restrictive for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
  execute format('drop policy if exists bc139_delete on public.%I',t);
  execute format('create policy bc139_delete on public.%I as restrictive for delete to authenticated using(user_id=auth.uid())',t);
 end loop;
end $$;
drop policy if exists bc139_post_read on public.clt_posts;
create policy bc139_post_read on public.clt_posts as restrictive for select to authenticated using(clt_private.friends(auth.uid(),user_id));
do $$declare t text;begin
 foreach t in array array['clt_post_comments','clt_post_likes'] loop
  execute format('drop policy if exists bc139_read on public.%I',t);
  execute format('create policy bc139_read on public.%I as restrictive for select to authenticated using(exists(select 1 from public.clt_posts p where p.id=post_id and clt_private.friends(auth.uid(),p.user_id)))',t);
  execute format('drop policy if exists bc139_post_scope on public.%I',t);
  execute format('create policy bc139_post_scope on public.%I as restrictive for insert to authenticated with check(exists(select 1 from public.clt_posts p where p.id=post_id and clt_private.friends(auth.uid(),p.user_id)))',t);
 end loop;
end $$;
drop policy if exists bc139_activity_read on public.clt_activity_events;
create policy bc139_activity_read on public.clt_activity_events as restrictive for select to authenticated using(clt_private.friends(auth.uid(),user_id));
-- Conversas privadas: somente participantes e amizades não bloqueadas.
drop policy if exists bc139_chat_read on public.clt_chat_messages;
create policy bc139_chat_read on public.clt_chat_messages as restrictive for select to authenticated using((auth.uid()=remetente_id or auth.uid()=destinatario_id) and clt_private.friends(remetente_id,destinatario_id));
drop policy if exists bc139_chat_insert on public.clt_chat_messages;
create policy bc139_chat_insert on public.clt_chat_messages as restrictive for insert to authenticated with check(remetente_id=auth.uid() and remetente_id<>destinatario_id and clt_private.friends(remetente_id,destinatario_id));
drop policy if exists bc139_chat_update on public.clt_chat_messages;
create policy bc139_chat_update on public.clt_chat_messages as restrictive for update to authenticated using(auth.uid()=remetente_id or auth.uid()=destinatario_id) with check(auth.uid()=remetente_id or auth.uid()=destinatario_id);
drop policy if exists bc139_chat_delete on public.clt_chat_messages;
create policy bc139_chat_delete on public.clt_chat_messages as restrictive for delete to authenticated using(remetente_id=auth.uid());
create or replace function clt_private.chat_immutable()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null then
  if new.remetente_id<>old.remetente_id or new.destinatario_id<>old.destinatario_id or new.id<>old.id or new.created_at<>old.created_at then raise exception 'Identidade da conversa não pode mudar.'; end if;
  if auth.uid()<>old.remetente_id and (new.texto is distinct from old.texto or new.midia_url is distinct from old.midia_url) then raise exception 'Você não pode editar a mensagem de outra pessoa.'; end if;
 end if;
 return new;
end $$;
drop trigger if exists bc139_chat_immutable on public.clt_chat_messages;
create trigger bc139_chat_immutable before update on public.clt_chat_messages for each row execute function clt_private.chat_immutable();
drop policy if exists bc139_group_messages_read on public.clt_chat_group_messages;
create policy bc139_group_messages_read on public.clt_chat_group_messages as restrictive for select to authenticated using(clt_private.group_member(group_id,auth.uid()));
drop policy if exists bc139_group_messages_insert on public.clt_chat_group_messages;
create policy bc139_group_messages_insert on public.clt_chat_group_messages as restrictive for insert to authenticated with check(remetente_id=auth.uid() and clt_private.group_member(group_id,auth.uid()));
drop policy if exists bc139_group_messages_update on public.clt_chat_group_messages;
create policy bc139_group_messages_update on public.clt_chat_group_messages as restrictive for update to authenticated using(remetente_id=auth.uid() and clt_private.group_member(group_id,auth.uid())) with check(remetente_id=auth.uid() and clt_private.group_member(group_id,auth.uid()));
drop policy if exists bc139_group_messages_delete on public.clt_chat_group_messages;
create policy bc139_group_messages_delete on public.clt_chat_group_messages as restrictive for delete to authenticated using(remetente_id=auth.uid() and clt_private.group_member(group_id,auth.uid()));
-- Only the server can attest that an immutable upload passed visual moderation.
create table if not exists public.clt_media_reviews(
 bucket text not null,path text not null,owner_id uuid not null references auth.users(id),
 status text not null check(status in ('processing','approved','rejected')),checked_at timestamptz not null default now(),
 primary key(bucket,path)
);
alter table public.clt_media_reviews enable row level security;
revoke all on public.clt_media_reviews from public,anon,authenticated;
grant all on public.clt_media_reviews to service_role;
create or replace function public.clt_lock_quarantine(p_path text,p_owner uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.clt_media_reviews(bucket,path,owner_id,status) values('clt-quarantine',p_path,p_owner,'processing') on conflict do nothing;
 return found;
end $$;
revoke all on function public.clt_lock_quarantine(text,uuid) from public,anon,authenticated;
grant execute on function public.clt_lock_quarantine(text,uuid) to service_role;
create or replace function clt_private.can_view_media(u uuid,b text,p text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare first uuid;
begin
 if u is null then return false; end if;
 begin first:=split_part(p,'/',1)::uuid;exception when others then return false;end;
 if b='avatars' then return clt_private.friends(u,first); end if;
 if b='group-avatars' then return clt_private.group_member(first,u); end if;
 if b='feed-media' then
  return u=first or exists(select 1 from public.clt_posts post where clt_private.friends(u,post.user_id) and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(post.midias),'[]'::jsonb)) x where right(x,length('/feed-media/'||p))='/feed-media/'||p));
 end if;
 if b='chat-media' then
  return u=first or exists(select 1 from public.clt_chat_messages m where m.midia_url=p and (m.remetente_id=u or m.destinatario_id=u) and clt_private.friends(m.remetente_id,m.destinatario_id));
 end if;
 if b='group-chat-media' then
  return u=first or exists(select 1 from public.clt_chat_group_messages m where m.midia_path=p and clt_private.group_member(m.group_id,u));
 end if;
 return false;
end $$;
revoke all on function clt_private.can_view_media(uuid,text,text) from public,anon;
grant execute on function clt_private.can_view_media(uuid,text,text) to authenticated,service_role;
create or replace function public.clt_can_view_media(p_user uuid,p_bucket text,p_path text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$select clt_private.can_view_media(p_user,p_bucket,p_path)$$;
revoke all on function public.clt_can_view_media(uuid,text,text) from public,anon,authenticated;
grant execute on function public.clt_can_view_media(uuid,text,text) to service_role;
create or replace function clt_private.media_approved(b text,p text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.clt_media_reviews where bucket=b and path=p and status='approved')$$;
revoke all on function clt_private.media_approved(text,text) from public,anon;
grant execute on function clt_private.media_approved(text,text) to authenticated,service_role;
create or replace function clt_private.quarantine_unlocked(p text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$select not exists(select 1 from public.clt_media_reviews where bucket='clt-quarantine' and path=p)$$;
revoke all on function clt_private.quarantine_unlocked(text) from public,anon;
grant execute on function clt_private.quarantine_unlocked(text) to authenticated,service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('clt-quarantine','clt-quarantine',false,209715200,array['video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=209715200,allowed_mime_types=excluded.allowed_mime_types;
update storage.buckets set public=false,allowed_mime_types=array['image/jpeg','image/png','image/webp'],file_size_limit=10485760 where id in ('avatars','group-avatars');
update storage.buckets set public=false,allowed_mime_types=array['image/jpeg','image/png','image/webp'],file_size_limit=5242880 where id in ('chat-media','group-chat-media');
update storage.buckets set public=false,allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm'],file_size_limit=209715200 where id='feed-media';
-- Existing policies cannot bypass these restrictive rules.
drop policy if exists bc139_storage_read on storage.objects;
create policy bc139_storage_read on storage.objects as restrictive for select to anon,authenticated using(
 bucket_id not in ('avatars','group-avatars','feed-media','chat-media','group-chat-media','clt-quarantine') or
 (bucket_id<>'clt-quarantine' and clt_private.media_approved(bucket_id,name) and clt_private.can_view_media(auth.uid(),bucket_id,name))
);
drop policy if exists bc139_storage_insert on storage.objects;
create policy bc139_storage_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id not in ('avatars','group-avatars','feed-media','chat-media','group-chat-media','clt-quarantine') or (bucket_id='clt-quarantine' and (storage.foldername(name))[1]=auth.uid()::text and clt_private.quarantine_unlocked(name)));
-- Permissive policy only for uploading into private quarantine. No public read or mutation.
drop policy if exists bc139_quarantine_insert on storage.objects;
create policy bc139_quarantine_insert on storage.objects for insert to authenticated with check(bucket_id='clt-quarantine' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists bc139_storage_update on storage.objects;
create policy bc139_storage_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id not in ('avatars','group-avatars','feed-media','chat-media','group-chat-media','clt-quarantine')) with check(bucket_id not in ('avatars','group-avatars','feed-media','chat-media','group-chat-media','clt-quarantine'));
drop policy if exists bc139_storage_delete on storage.objects;
create policy bc139_storage_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id not in ('avatars','group-avatars','feed-media','chat-media','group-chat-media','clt-quarantine') or (bucket_id<>'clt-quarantine' and (storage.foldername(name))[1]=auth.uid()::text));
-- Approved files get a positive read grant; restrictive policies still enforce scope.
drop policy if exists bc139_media_read_grant on storage.objects;
create policy bc139_media_read_grant on storage.objects for select to authenticated using(bucket_id in ('avatars','group-avatars','feed-media','chat-media','group-chat-media') and clt_private.media_approved(bucket_id,name) and clt_private.can_view_media(auth.uid(),bucket_id,name));
-- Impede mover registros entre contas, conversas e publicações por UPDATE.
create or replace function clt_private.immutable_identity()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare k text;oldj jsonb:=to_jsonb(old);newj jsonb:=to_jsonb(new);
begin
 if auth.uid() is not null then
  foreach k in array array['id','user_id','remetente_id','group_id','criado_por','post_id','created_at'] loop
   if oldj ? k and newj->k is distinct from oldj->k then raise exception 'Identidade do registro não pode ser alterada.'; end if;
  end loop;
 end if;
 return new;
end $$;
do $$declare t text;begin
 foreach t in array array['perfis','itens','clt_posts','clt_post_comments','clt_post_likes','clt_chat_groups','clt_chat_group_messages'] loop
  execute format('drop trigger if exists bc139_identity on public.%I',t);
  execute format('create trigger bc139_identity before update on public.%I for each row execute function clt_private.immutable_identity()',t);
 end loop;
end $$;
-- Conteúdo compartilhado só pode apontar para arquivos moderados deste projeto.
create or replace function clt_private.approved_url(b text,u text,owner text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare prefix text:='https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/public/'||b||'/';p text;
begin
 if coalesce(u,'')='' then return true; end if;
 if left(u,length(prefix))<>prefix then return false; end if;
 p:=split_part(substring(u from length(prefix)+1),'#',1);
 return split_part(p,'/',1)=owner and clt_private.media_approved(b,p);
end $$;
revoke all on function clt_private.approved_url(text,text,text) from public,anon;
grant execute on function clt_private.approved_url(text,text,text) to authenticated,service_role;
create or replace function clt_private.check_shared_media()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v text;first_insert boolean:=tg_op='INSERT';
begin
 if auth.uid() is null then return new; end if;
 if tg_table_name='perfis' then
  if (first_insert or new.avatar_url is distinct from old.avatar_url) and not clt_private.approved_url('avatars',new.avatar_url,new.id::text) then raise exception 'Envie a foto pelo fluxo de moderação do site.'; end if;
  if (first_insert or new.banner_url is distinct from old.banner_url) and not clt_private.approved_url('avatars',new.banner_url,new.id::text) then raise exception 'Envie o banner pelo fluxo de moderação do site.'; end if;
 elsif tg_table_name='clt_posts' then
  if first_insert or new.midias is distinct from old.midias then
   if jsonb_array_length(coalesce(to_jsonb(new.midias),'[]'::jsonb))>4 then raise exception 'Máximo de quatro arquivos.'; end if;
   for v in select jsonb_array_elements_text(coalesce(to_jsonb(new.midias),'[]'::jsonb)) loop
    if not clt_private.approved_url('feed-media',v,new.user_id::text) then raise exception 'Arquivo não aprovado para publicação.'; end if;
   end loop;
  end if;
 elsif tg_table_name='clt_chat_messages' then
  if (first_insert or new.midia_url is distinct from old.midia_url) and coalesce(new.midia_url,'')<>'' and not clt_private.media_approved('chat-media',new.midia_url) then raise exception 'Arquivo não aprovado para o chat.'; end if;
  if coalesce(new.midia_url,'')<>'' and split_part(new.midia_url,'/',1)<>new.remetente_id::text then raise exception 'Arquivo de outra conta.'; end if;
 elsif tg_table_name='clt_chat_group_messages' then
  if (first_insert or new.midia_path is distinct from old.midia_path) and coalesce(new.midia_path,'')<>'' and not clt_private.media_approved('group-chat-media',new.midia_path) then raise exception 'Arquivo não aprovado para o grupo.'; end if;
  if coalesce(new.midia_path,'')<>'' and split_part(new.midia_path,'/',1)<>new.remetente_id::text then raise exception 'Arquivo de outra conta.'; end if;
 elsif tg_table_name='clt_chat_groups' then
  if (first_insert or new.foto_path is distinct from old.foto_path) and coalesce(new.foto_path,'')<>'' and (split_part(new.foto_path,'/',1)<>new.id::text or not clt_private.media_approved('group-avatars',new.foto_path)) then raise exception 'Foto de grupo não aprovada.'; end if;
 end if;
 return new;
end $$;
do $$declare t text;begin
 foreach t in array array['perfis','clt_posts','clt_chat_messages','clt_chat_group_messages','clt_chat_groups'] loop
  execute format('drop trigger if exists bc139_shared_media on public.%I',t);
  execute format('create trigger bc139_shared_media before insert or update on public.%I for each row execute function clt_private.check_shared_media()',t);
 end loop;
end $$;
-- Mensagens de sistema não podem ser falsificadas para outra conta por chamadas diretas.
drop policy if exists bc139_notifications on public.notificacoes;
create policy bc139_notifications on public.notificacoes as restrictive for all to authenticated using(destinatario_id=auth.uid()) with check(destinatario_id=auth.uid());
-- A tabela de membros é administrada pelas funções com aceite, não por INSERT/UPDATE livres.
drop policy if exists bc139_members_read on public.clt_chat_group_members;
create policy bc139_members_read on public.clt_chat_group_members as restrictive for select to authenticated using(clt_private.group_member(group_id,auth.uid()));
drop policy if exists bc139_members_insert on public.clt_chat_group_members;
create policy bc139_members_insert on public.clt_chat_group_members as restrictive for insert to authenticated with check(false);
drop policy if exists bc139_members_update on public.clt_chat_group_members;
create policy bc139_members_update on public.clt_chat_group_members as restrictive for update to authenticated using(false) with check(false);
drop policy if exists bc139_members_delete on public.clt_chat_group_members;
create policy bc139_members_delete on public.clt_chat_group_members as restrictive for delete to authenticated using(false);
-- Evita novos objetos public com acesso automático ao navegador.
alter default privileges for role postgres in schema public revoke all on tables from anon,authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public,anon,authenticated;

-- Limites de tamanho e frequência no banco: não dependem do JavaScript do navegador.
create or replace function clt_private.limit_social_write()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare j jsonb:=to_jsonb(new);n bigint;actor uuid:=auth.uid();max_count int;
begin
 if actor is null then return new; end if;
 if length(coalesce(j->>'texto',''))>case when tg_table_name='clt_posts' then 2000 when tg_table_name='clt_post_comments' then 240 else 4000 end then raise exception 'Texto ultrapassa o limite permitido.'; end if;
 if tg_op='INSERT' then
  perform pg_advisory_xact_lock(hashtextextended('bc139:'||tg_table_name||':'||actor::text,0));
  if tg_table_name in ('clt_posts','clt_post_comments') then
   execute format('select count(*) from public.%I where user_id=$1 and created_at>now()-interval ''1 minute''',tg_table_name) into n using actor;
   max_count:=case when tg_table_name='clt_posts' then 5 else 30 end;
  else
   execute format('select count(*) from public.%I where remetente_id=$1 and created_at>now()-interval ''1 minute''',tg_table_name) into n using actor;
   max_count:=120;
  end if;
  if n>=max_count then raise exception 'Muitas publicações ou mensagens. Aguarde um minuto.'; end if;
 end if;
 return new;
end $$;
do $$declare t text;begin
 foreach t in array array['clt_posts','clt_post_comments','clt_chat_messages','clt_chat_group_messages'] loop
  execute format('drop trigger if exists bc139_write_limits on public.%I',t);
  execute format('create trigger bc139_write_limits before insert or update on public.%I for each row execute function clt_private.limit_social_write()',t);
 end loop;
end $$;

-- Relações e grupos também ficam limitados à conta / participação.
drop policy if exists bc139_friend_read on public.amigos;
create policy bc139_friend_read on public.amigos as restrictive for select to authenticated using(clt_private.friends(auth.uid(),user_id));
do $$declare t text;begin
 foreach t in array array['amigos','convites_amizade'] loop
  execute format('drop policy if exists bc139_relationship_insert on public.%I',t);
  execute format('create policy bc139_relationship_insert on public.%I as restrictive for insert to authenticated with check(false)',t);
  execute format('drop policy if exists bc139_relationship_update on public.%I',t);
  execute format('create policy bc139_relationship_update on public.%I as restrictive for update to authenticated using(false) with check(false)',t);
  execute format('drop policy if exists bc139_relationship_delete on public.%I',t);
  execute format('create policy bc139_relationship_delete on public.%I as restrictive for delete to authenticated using(false)',t);
 end loop;
end $$;
drop policy if exists bc139_invite_read on public.convites_amizade;
create policy bc139_invite_read on public.convites_amizade as restrictive for select to authenticated using(remetente_id=auth.uid() or destinatario_id=auth.uid());
drop policy if exists bc139_blocks on public.bloqueios_clt;
create policy bc139_blocks on public.bloqueios_clt as restrictive for all to authenticated using(bloqueador_id=auth.uid()) with check(bloqueador_id=auth.uid());
create or replace function clt_private.group_admin(g uuid,u uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.clt_chat_group_members where group_id=g and user_id=u and admin)$$;
revoke all on function clt_private.group_admin(uuid,uuid) from public,anon;
grant execute on function clt_private.group_admin(uuid,uuid) to authenticated,service_role;
drop policy if exists bc139_groups_read on public.clt_chat_groups;
create policy bc139_groups_read on public.clt_chat_groups as restrictive for select to authenticated using(clt_private.group_member(id,auth.uid()));
drop policy if exists bc139_groups_update on public.clt_chat_groups;
create policy bc139_groups_update on public.clt_chat_groups as restrictive for update to authenticated using(clt_private.group_admin(id,auth.uid())) with check(clt_private.group_admin(id,auth.uid()));
drop policy if exists bc139_groups_insert on public.clt_chat_groups;
create policy bc139_groups_insert on public.clt_chat_groups as restrictive for insert to authenticated with check(false);
drop policy if exists bc139_group_reads on public.clt_chat_group_reads;
create policy bc139_group_reads on public.clt_chat_group_reads as restrictive for all to authenticated using(user_id=auth.uid() and clt_private.group_member(group_id,auth.uid())) with check(user_id=auth.uid() and clt_private.group_member(group_id,auth.uid()));
-- Funções do aplicativo não ficam executáveis por visitantes. A consulta de e-mail
-- é fechada separadamente, após ativar o novo login no Worker.
do $$declare f record;had_access boolean;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('aceitar_convite_amizade','enviar_convite_amizade','recusar_convite_amizade','criar_grupo_clt','adicionar_membro_grupo_clt','definir_admin_grupo_clt','remover_membro_grupo_clt','sair_grupo_clt','bloquear_usuario_clt','desbloquear_usuario_clt','missoes_clt','resgatar_missao_clt','salvar_personalizacao_perfil_clt') loop
  had_access:=has_function_privilege('authenticated',f.oid,'EXECUTE');
  execute format('revoke execute on function %s from public,anon',f.oid::regprocedure);
  if had_access then execute format('grant execute on function %s to authenticated',f.oid::regprocedure);end if;
 end loop;
end $$;

notify pgrst,'reload schema';
commit;
