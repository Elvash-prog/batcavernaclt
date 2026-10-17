-- Community is visible to signed-in accounts, respecting bilateral blocks.
create or replace function clt_private.community_visible(a uuid,b uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select a is not null and b is not null and (a=b or not exists(select 1 from public.bloqueios_clt where (bloqueador_id=a and bloqueado_id=b) or (bloqueador_id=b and bloqueado_id=a)))
$$;
revoke all on function clt_private.community_visible(uuid,uuid) from public,anon;
grant execute on function clt_private.community_visible(uuid,uuid) to authenticated,service_role;
alter policy bc139_post_read on public.clt_posts to authenticated using(clt_private.community_visible(auth.uid(),user_id));
alter policy "CLT pode ver posts próprios e de amigos" on public.clt_posts to authenticated using(auth.uid() is not null);
alter policy bc139_read on public.clt_post_likes to authenticated using(exists(select 1 from public.clt_posts p where p.id=clt_post_likes.post_id));
alter policy bc139_post_scope on public.clt_post_likes to authenticated with check(exists(select 1 from public.clt_posts p where p.id=clt_post_likes.post_id));
alter policy bc139_read on public.clt_post_comments to authenticated using(exists(select 1 from public.clt_posts p where p.id=clt_post_comments.post_id));
alter policy bc139_post_scope on public.clt_post_comments to authenticated with check(exists(select 1 from public.clt_posts p where p.id=clt_post_comments.post_id));
create or replace function clt_private.can_view_media(u uuid,b text,p text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare first uuid;
begin
 if u is null then return false;end if;
 begin first:=split_part(p,'/',1)::uuid;exception when others then return false;end;
 if b='avatars' then return clt_private.friends(u,first);end if;
 if b='group-avatars' then return clt_private.group_member(first,u);end if;
 if b='feed-media' then return u=first or exists(select 1 from public.clt_posts post where clt_private.community_visible(u,post.user_id) and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(post.midias),'[]'::jsonb)) x where right(x,length('/feed-media/'||p))='/feed-media/'||p));end if;
 if b='chat-media' then return u=first or exists(select 1 from public.clt_chat_messages m where m.midia_url=p and (m.remetente_id=u or m.destinatario_id=u) and clt_private.friends(m.remetente_id,m.destinatario_id));end if;
 if b='group-chat-media' then return u=first or exists(select 1 from public.clt_chat_group_messages m where m.midia_path=p and clt_private.group_member(m.group_id,u));end if;
 return false;
end $$;
alter table public.clt_retro_collection add column if not exists hidden_game_ids integer[] not null default '{}';
-- Only the authenticated Edge Function's service role can call this atomic mutator.
create or replace function public.clt_retro_mutate(p_user uuid,p_add integer default null,p_remove integer default null,p_cover text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.clt_retro_collection;
begin
 if p_user is null or (p_add is not null and p_remove is not null) or coalesce(p_add,1)<1 or coalesce(p_remove,1)<1 then raise exception 'Invalid collection action';end if;
 insert into public.clt_retro_collection(user_id) values(p_user) on conflict(user_id) do nothing;
 select * into r from public.clt_retro_collection where user_id=p_user for update;
 if p_add is not null then
  r.hidden_game_ids:=array_remove(r.hidden_game_ids,p_add);
  if not(p_add=any(coalesce(r.game_ids,'{}'))) then
   if cardinality(r.game_ids)>=100 then raise exception 'Collection limit';end if;
   r.game_ids:=array_append(coalesce(r.game_ids,'{}'),p_add);
  end if;
 end if;
 if p_remove is not null then
  r.game_ids:=array_remove(r.game_ids,p_remove);
  if not(p_remove=any(r.hidden_game_ids)) then
   if cardinality(r.hidden_game_ids)>=5000 then raise exception 'Hidden collection limit';end if;
   r.hidden_game_ids:=array_append(r.hidden_game_ids,p_remove);
  end if;
 end if;
 update public.clt_retro_collection set game_ids=r.game_ids,hidden_game_ids=r.hidden_game_ids,cover_url=coalesce(p_cover,r.cover_url) where user_id=p_user;
 return jsonb_build_object('game_ids',r.game_ids,'hidden_game_ids',r.hidden_game_ids,'cover_url',coalesce(p_cover,r.cover_url));
end $$;
revoke all on function public.clt_retro_mutate(uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.clt_retro_mutate(uuid,integer,integer,text) to service_role;
