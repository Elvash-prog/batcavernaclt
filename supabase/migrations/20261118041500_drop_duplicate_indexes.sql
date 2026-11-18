-- Duplicate indexes (Supabase lint 0009): identical to amigos_pkey and to
-- notificacoes_destinatario_created_idx; neither backs a constraint.
drop index if exists public.amigos_par_unica;
drop index if exists public.idx_notificacoes_destinatario_created_at;
