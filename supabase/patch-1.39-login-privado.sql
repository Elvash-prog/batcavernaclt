-- Execute SOMENTE depois de cadastrar SUPABASE_SERVICE_ROLE_KEY no Cloudflare
-- e confirmar que o login pelo site funciona. O e-mail deixa de ser consultável pelo navegador.
begin;
revoke execute on function public.email_login_por_usuario(text) from public,anon,authenticated;
grant execute on function public.email_login_por_usuario(text) to service_role;
notify pgrst,'reload schema';
commit;
