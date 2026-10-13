-- BatCaverna 1.1.0: execute o arquivo inteiro no SQL Editor do Supabase.
-- Transação idempotente. Não altera bibliotecas, amizades ou notificações antigas.
begin;
create table if not exists public.clt_custom_lists (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 nome text not null check(length(nome) between 1 and 60), compartilhada boolean not null default false,
 created_at timestamptz not null default now());
create table if not exists public.clt_custom_list_items (
 list_id uuid not null references public.clt_custom_lists(id) on delete cascade,
 item_id text not null, titulo jsonb not null, created_at timestamptz not null default now(), primary key(list_id,item_id));
create table if not exists public.clt_friend_recommendations (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade, item_id text not null, titulo jsonb not null,
 mensagem text not null default '' check(length(mensagem)<=240), estado text not null default 'pendente' check(estado in ('pendente','interesse','dispensada')),
 created_at timestamptz not null default now(), check(sender_id<>recipient_id));
create index if not exists clt_recommendations_recipient on public.clt_friend_recommendations(recipient_id,created_at desc);
create index if not exists clt_lists_owner on public.clt_custom_lists(user_id);
create table if not exists public.clt_notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mensagens boolean not null default true, social boolean not null default true,
 amizades boolean not null default true, indicacoes boolean not null default true,
 progresso boolean not null default true, updated_at timestamptz not null default now());
alter table public.clt_custom_lists enable row level security;
alter table public.clt_custom_list_items enable row level security;
alter table public.clt_friend_recommendations enable row level security;
alter table public.clt_notification_preferences enable row level security;
revoke all on public.clt_custom_lists,public.clt_custom_list_items,public.clt_friend_recommendations,public.clt_notification_preferences from anon,authenticated;

-- Toda leitura/escrita passa pelo RPC, que verifica proprietário, amizade e bloqueio.
create or replace function public.clt_feature_friend(a uuid,b uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select a<>b and exists(select 1 from public.amigos where user_id=a and amigo_id=b)
 and not exists(select 1 from public.bloqueios_clt where (bloqueador_id=a and bloqueado_id=b) or (bloqueador_id=b and bloqueado_id=a));
$$;
revoke all on function public.clt_feature_friend(uuid,uuid) from public,anon,authenticated;

create or replace function public.clt_features(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); l public.clt_custom_lists; r public.clt_friend_recommendations;
 v jsonb; result jsonb; target uuid; ident text; nm text;
begin
 if u is null then raise exception 'Entre na sua conta.'; end if;
 -- Serialize bounded mutations by owner to keep quota checks consistent.
 perform pg_advisory_xact_lock(hashtextextended(u::text,110));
 if p_action='lists' then
  select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]') into result from (
   select to_jsonb(c)||jsonb_build_object('owner_name',coalesce(p.nome,'Amigo'),'mine',c.user_id=u,'count',(select count(*) from public.clt_custom_list_items i where i.list_id=c.id)) x
   from public.clt_custom_lists c left join public.perfis p on p.id=c.user_id
   where c.user_id=u or (c.compartilhada and public.clt_feature_friend(u,c.user_id))) q;
  return result;
 elsif p_action='create_list' then
  nm:=trim(p_data->>'nome'); if nm is null or length(nm) not between 1 and 60 then raise exception 'Nome: 1 a 60 caracteres.'; end if;
  if (select count(*) from public.clt_custom_lists where user_id=u)>=100 then raise exception 'Limite de 100 listas.'; end if;
  insert into public.clt_custom_lists(user_id,nome) values(u,nm) returning * into l;
  return jsonb_build_array(to_jsonb(l));
 elsif p_action in ('list_items','rename_list','share_list','delete_list','add_item','remove_item','save_recommendation') then
  select * into l from public.clt_custom_lists where id=(p_data->>'list_id')::uuid for update;
  if l.id is null then raise exception 'Lista indisponível.'; end if;
  if p_action='list_items' then
   if l.user_id<>u and not(l.compartilhada and public.clt_feature_friend(u,l.user_id)) then raise exception 'Lista privada.'; end if;
   return coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at,i.item_id) from public.clt_custom_list_items i where i.list_id=l.id),'[]');
  end if;
  if l.user_id<>u then raise exception 'Esta lista não é sua.'; end if;
  if p_action='rename_list' then
   nm:=trim(p_data->>'nome'); if nm is null or length(nm) not between 1 and 60 then raise exception 'Nome: 1 a 60 caracteres.'; end if;
   update public.clt_custom_lists set nome=nm where id=l.id;
  elsif p_action='share_list' then update public.clt_custom_lists set compartilhada=(p_data->>'compartilhada')::boolean where id=l.id;
  elsif p_action='delete_list' then delete from public.clt_custom_lists where id=l.id;
  elsif p_action='remove_item' then delete from public.clt_custom_list_items where list_id=l.id and item_id=p_data->>'item_id';
  else
   if (select count(*) from public.clt_custom_list_items where list_id=l.id)>=500 then raise exception 'Limite de 500 títulos por lista.'; end if;
   if p_action='save_recommendation' then
    select * into r from public.clt_friend_recommendations where id=(p_data->>'recommendation_id')::uuid and recipient_id=u and estado='pendente';
    if r.id is null or not public.clt_feature_friend(u,r.sender_id) then raise exception 'Indicação indisponível.'; end if;
    v:=r.titulo; ident:='rec:'||r.id;
    update public.clt_friend_recommendations set estado='interesse' where id=r.id;
   else
    ident:=p_data->>'item_id';
    select jsonb_build_object('nome',i.nome,'categoria',i.categoria,'tipo',i.tipo,'capa',i.capa) into v from public.itens i where i.id::text=ident and i.user_id=u;
    if v is null then raise exception 'Título indisponível na sua biblioteca.'; end if;
   end if;
   insert into public.clt_custom_list_items(list_id,item_id,titulo) values(l.id,ident,v) on conflict do nothing;
  end if;
  return '[{"ok":true}]';
 elsif p_action='recommend' then
  target:=(p_data->>'friend_id')::uuid;
  if not public.clt_feature_friend(u,target) then raise exception 'Selecione um amigo atual, sem bloqueio.'; end if;
  ident:=p_data->>'item_id';
  select jsonb_build_object('nome',i.nome,'categoria',i.categoria,'tipo',i.tipo,'capa',i.capa) into v from public.itens i where i.id::text=ident and i.user_id=u;
  if v is null then raise exception 'Título indisponível na sua biblioteca.'; end if;
  if length(coalesce(p_data->>'mensagem',''))>240 then raise exception 'Mensagem: até 240 caracteres.'; end if;
  if exists(select 1 from public.clt_friend_recommendations where sender_id=u and recipient_id=target and item_id=ident and created_at>now()-interval '1 day') then raise exception 'Você já indicou este título a este amigo hoje.'; end if;
  if (select count(*) from public.clt_friend_recommendations where sender_id=u and created_at>now()-interval '1 day')>=50 then raise exception 'Limite diário de 50 indicações.'; end if;
  insert into public.clt_friend_recommendations(sender_id,recipient_id,item_id,titulo,mensagem) values(u,target,ident,v,trim(coalesce(p_data->>'mensagem',''))) returning * into r;
  insert into public.notificacoes(destinatario_id,tipo,mensagem,actor_id,referencia_id,read) values(target,'friend_recommendation','Indicou: '||(v->>'nome'),u,r.id,false);
  return jsonb_build_array(to_jsonb(r));
 elsif p_action='recommendations' then
  return coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
   select to_jsonb(c)||jsonb_build_object('sender_name',coalesce(p.nome,'Amigo'),'recipient_name',coalesce(q.nome,'Amigo'),'received',c.recipient_id=u) x
   from public.clt_friend_recommendations c left join public.perfis p on p.id=c.sender_id left join public.perfis q on q.id=c.recipient_id
   where (p_data->>'id' is null or c.id::text=p_data->>'id') and (c.sender_id=u or (c.recipient_id=u and c.estado='pendente')) and public.clt_feature_friend(c.sender_id,c.recipient_id)
   order by c.created_at desc,c.id desc limit 200) z),'[]');
 elsif p_action='recommendation_state' then
  if coalesce(p_data->>'estado','') not in ('interesse','dispensada') then raise exception 'Estado inválido.'; end if;
  update public.clt_friend_recommendations set estado=p_data->>'estado' where id=(p_data->>'id')::uuid and recipient_id=u and estado='pendente' and public.clt_feature_friend(u,sender_id);
  if not found then raise exception 'Indicação indisponível.'; end if;
  return '[{"ok":true}]';
 elsif p_action in ('preferences','save_preferences') then
  insert into public.clt_notification_preferences(user_id) values(u) on conflict do nothing;
  if p_action='save_preferences' then
   update public.clt_notification_preferences set mensagens=(p_data->>'mensagens')::boolean,social=(p_data->>'social')::boolean,amizades=(p_data->>'amizades')::boolean,indicacoes=(p_data->>'indicacoes')::boolean,progresso=(p_data->>'progresso')::boolean,updated_at=now() where user_id=u;
  end if;
  return (select jsonb_build_array(to_jsonb(p)) from public.clt_notification_preferences p where user_id=u);
 else raise exception 'Ação inválida.';
 end if;
end; $$;
revoke all on function public.clt_features(text,jsonb) from public,anon;
grant execute on function public.clt_features(text,jsonb) to authenticated;

-- Aplica as preferências a novas notificações, antes de disparar o push existente.
create or replace function public.clt_filter_notification_preferences() returns trigger
language plpgsql security definer set search_path=public as $$
declare p public.clt_notification_preferences;
begin
 select * into p from public.clt_notification_preferences where user_id=new.destinatario_id;
 if not found then return new; end if;
 if (new.tipo in ('chat_message','chat_group_message') and not p.mensagens)
 or (new.tipo like 'social_%' and not p.social)
 or (new.tipo in ('convite','amizade_aceita','group_invite','chat_group_invite','convite_grupo') and not p.amizades)
 or (new.tipo='friend_recommendation' and not p.indicacoes)
 or (new.tipo in ('conquista','nivel','level','missao','missao_concluida') and not p.progresso) then return null; end if;
 return new;
end; $$;
revoke all on function public.clt_filter_notification_preferences() from public,anon,authenticated;
drop trigger if exists clt_notification_preferences_filter on public.notificacoes;
create trigger clt_notification_preferences_filter before insert on public.notificacoes for each row execute function public.clt_filter_notification_preferences();
notify pgrst,'reload schema';
commit;
