-- Patch 1.42: figurinhas da conta e reações compartilhadas. Execute inteiro no SQL Editor.
-- Idempotente. Não altera mensagens, políticas anteriores ou privacidade dos buckets.
begin;
create table if not exists public.clt_account_stickers (
 id text primary key check(length(id) between 1 and 180),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80),
 filename text not null check(length(filename) between 1 and 160),
 path text not null unique check(length(path)<=300),
 created_at timestamptz not null default now()
);
alter table public.clt_account_stickers enable row level security;
revoke all on public.clt_account_stickers from public,anon,authenticated;
grant select,insert,delete on public.clt_account_stickers to authenticated;
grant all on public.clt_account_stickers to service_role;
drop policy if exists bc142_stickers on public.clt_account_stickers;
create policy bc142_stickers on public.clt_account_stickers to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create or replace function clt_private.sticker_check()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.user_id is distinct from auth.uid() then raise exception 'Sessão inválida.'; end if;
 -- Trava por conta: duas importações simultâneas não ultrapassam o limite.
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,142));
 if (select count(*) from public.clt_account_stickers where user_id=new.user_id)>=60 then
  raise exception 'Você pode salvar até 60 figurinhas na conta.';
 end if;
 if split_part(new.path,'/',1)<>new.user_id::text or not clt_private.media_approved('chat-media',new.path) then
  raise exception 'A figurinha precisa passar pela moderação.';
 end if;
 return new;
end $$;
revoke all on function clt_private.sticker_check() from public,anon,authenticated;
drop trigger if exists bc142_sticker_check on public.clt_account_stickers;
create trigger bc142_sticker_check before insert on public.clt_account_stickers for each row execute function clt_private.sticker_check();
-- Usa exatamente o tipo de ID das tabelas existentes, seja UUID ou inteiro.
do $$
declare src text; dst text; typ text;
begin
 foreach src in array array['clt_chat_messages','clt_chat_group_messages'] loop
  dst=case when src='clt_chat_messages' then 'clt_chat_reactions' else 'clt_chat_group_reactions' end;
  select format_type(a.atttypid,a.atttypmod) into typ from pg_attribute a
   where a.attrelid=('public.'||src)::regclass and a.attname='id' and not a.attisdropped;
  if typ is null then raise exception 'ID de mensagem ausente: %',src; end if;
  execute format('create table if not exists public.%I(message_id %s not null references public.%I(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,emoji text not null check(emoji in (''❤️'',''😂'',''🔥'',''👍'')),created_at timestamptz not null default now(),primary key(message_id,user_id,emoji))',dst,typ,src);
  execute format('alter table public.%I enable row level security',dst);
  execute format('revoke all on public.%I from public,anon,authenticated',dst);
  execute format('grant select,insert,delete on public.%I to authenticated',dst);
  execute format('grant all on public.%I to service_role',dst);
  execute format('drop policy if exists bc142_read on public.%I',dst);
  execute format('drop policy if exists bc142_insert on public.%I',dst);
  execute format('drop policy if exists bc142_delete on public.%I',dst);
  -- A subconsulta passa pelo RLS das mensagens: somente participantes autorizados.
  execute format('create policy bc142_read on public.%I for select to authenticated using(exists(select 1 from public.%I m where m.id=message_id))',dst,src);
  execute format('create policy bc142_insert on public.%I for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.%I m where m.id=message_id))',dst,src);
  execute format('create policy bc142_delete on public.%I for delete to authenticated using(user_id=auth.uid() and exists(select 1 from public.%I m where m.id=message_id))',dst,src);
 end loop;
end $$;
create index if not exists bc142_stickers_user on public.clt_account_stickers(user_id,created_at desc);
notify pgrst,'reload schema';
commit;
-- Deve retornar true nas três colunas.
select to_regclass('public.clt_account_stickers') is not null as figurinhas,
 to_regclass('public.clt_chat_reactions') is not null as reacoes_privadas,
 to_regclass('public.clt_chat_group_reactions') is not null as reacoes_grupos;
