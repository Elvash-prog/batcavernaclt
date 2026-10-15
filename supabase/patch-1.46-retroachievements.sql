-- BatCaverna CLT desktop 0.17.16 — vínculo seguro com RetroAchievements.
alter table public.perfis add column if not exists retroachievements_user text;
alter table public.perfis add column if not exists retroachievements_ulid text;

alter table public.perfis drop constraint if exists perfis_retroachievements_user_check;
alter table public.perfis add constraint perfis_retroachievements_user_check
  check (retroachievements_user is null or retroachievements_user ~ '^[A-Za-z0-9_-]{1,64}$');

alter table public.perfis drop constraint if exists perfis_retroachievements_ulid_check;
alter table public.perfis add constraint perfis_retroachievements_ulid_check
  check (retroachievements_ulid is null or retroachievements_ulid ~ '^[0-9A-HJKMNP-TV-Z]{26}$');

comment on column public.perfis.retroachievements_user is 'Nome público validado da conta RetroAchievements.';
comment on column public.perfis.retroachievements_ulid is 'Identificador estável retornado pela API RetroAchievements.';
