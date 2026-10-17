-- Keep the minimal friend directory available only after authentication.
REVOKE ALL PRIVILEGES ON public.perfis_publicos_clt FROM PUBLIC, anon;
GRANT SELECT ON public.perfis_publicos_clt TO authenticated;
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog;
