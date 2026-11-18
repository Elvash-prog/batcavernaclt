-- Performance: evaluate auth.uid()/auth.jwt()/auth.role() once per statement
-- instead of once per row in RLS policies (Supabase lint 0003 auth_rls_initplan).
-- The rewrite only wraps the call in a scalar subquery; policy semantics are unchanged.
do $$
declare
  p record;
  pattern constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
  replacement constant text := '(select auth.\1())';
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and coalesce(qual, '') || coalesce(with_check, '') ~ pattern
  loop
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      stmt := stmt || format(' using (%s)', regexp_replace(p.qual, pattern, replacement, 'g'));
    end if;
    if p.with_check is not null then
      stmt := stmt || format(' with check (%s)', regexp_replace(p.with_check, pattern, replacement, 'g'));
    end if;
    execute stmt;
  end loop;
end $$;

-- Performance: cover foreign keys used by joins, cascades and per-user lookups
-- (Supabase lint 0001 unindexed_foreign_keys).
create index if not exists amigos_amigo_id_idx on public.amigos (amigo_id);
create index if not exists convites_amizade_destinatario_id_idx on public.convites_amizade (destinatario_id);
create index if not exists notificacoes_actor_id_idx on public.notificacoes (actor_id);
create index if not exists clt_post_likes_user_id_idx on public.clt_post_likes (user_id);
create index if not exists clt_post_comments_user_id_idx on public.clt_post_comments (user_id);
create index if not exists clt_chat_groups_criado_por_idx on public.clt_chat_groups (criado_por);
create index if not exists clt_chat_group_messages_remetente_id_idx on public.clt_chat_group_messages (remetente_id);
create index if not exists clt_chat_group_invites_invited_by_idx on public.clt_chat_group_invites (invited_by);
create index if not exists clt_chat_group_invites_user_id_idx on public.clt_chat_group_invites (user_id);
create index if not exists clt_media_reviews_owner_id_idx on public.clt_media_reviews (owner_id);
create index if not exists clt_chat_reactions_user_id_idx on public.clt_chat_reactions (user_id);
create index if not exists clt_chat_group_reactions_user_id_idx on public.clt_chat_group_reactions (user_id);
create index if not exists clt_friend_recommendations_sender_id_idx on public.clt_friend_recommendations (sender_id);
create index if not exists clt_pc_play_clock_item_id_idx on public.clt_pc_play_clock (item_id);
create index if not exists clt_pc_play_sessions_item_id_idx on public.clt_pc_play_sessions (item_id);
