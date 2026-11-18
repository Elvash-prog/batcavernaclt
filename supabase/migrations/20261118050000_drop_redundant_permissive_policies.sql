-- Permissive policies are OR-ed, so a policy that is identical to, or implied by,
-- another permissive policy for the same table, command and role adds nothing.
-- The restrictive bc139_* policies, which actually limit access, are untouched.
-- Effective permissions are unchanged (Supabase lint 0006 multiple_permissive_policies).

-- Implied by "Chat: usuário envia como ele mesmo" (same sender check, without the friend check).
drop policy if exists "Chat: enviar para amigo" on public.clt_chat_messages;
-- Implied by "Chat: participantes podem ler" (same participant check, without the friend check).
drop policy if exists "Chat: participantes e amigos podem ler" on public.clt_chat_messages;
-- Identical to "Usuário pode apagar próprias notificações".
drop policy if exists "Usuário pode excluir próprias notificações" on public.notificacoes;
-- Implied by "perfis: leitura autenticada" (true).
drop policy if exists "Usuário pode ver próprio perfil" on public.perfis;
-- Identical to "Usuário pode atualizar próprio perfil".
drop policy if exists "Usuário pode atualizar própria foto" on public.perfis;
drop policy if exists "perfis: editar" on public.perfis;
