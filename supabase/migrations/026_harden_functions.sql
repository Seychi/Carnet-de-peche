-- =====================================================================
-- Carnet de Pêche — 026 durcissement search_path (sprint 11.5 Bloc A)
-- =====================================================================
-- NON APPLIQUÉE — à relire par John puis jouer via le dashboard.
--
-- Advisor Supabase `function_search_path_mutable` sur 6 fonctions : leur
-- search_path n'est pas figé → une fonction (surtout SECURITY DEFINER ou
-- appelée en trigger) peut être détournée via un objet placé dans un schéma
-- temporaire prioritaire. Correctif : figer search_path = public.
-- Les corps référencent uniquement des objets du schéma public (tables
-- `catches` / `feed_posts`, fonctions PostGIS ST_*, random...) → `public`
-- (avec pg_catalog implicite) suffit ; on ne met PAS '' qui casserait les
-- références non qualifiées.
--
-- Choix d'implémentation : ALTER FUNCTION ... SET search_path plutôt que de
-- recréer chaque corps (le brief disait « recréer à l'identique + SET »).
-- ALTER produit exactement le même proconfig (search_path=public), sans
-- aucun risque de transcription du corps — important pour la volumineuse
-- get_my_catches_breakdown. Sémantique strictement inchangée.
--
-- Vérif post-application :
--   select proname, proconfig from pg_proc
--   where proname in ('blur_spot_geom','blur_catch_geom','bump_likes_count',
--     'bump_comments_count','touch_updated_at','get_my_catches_breakdown');
--   -- chaque ligne doit contenir {search_path=public}
--   -- get_advisors(security) ne doit plus lister ces 6 function_search_path_mutable
-- =====================================================================

alter function public.blur_spot_geom()                  set search_path = public;
alter function public.blur_catch_geom()                 set search_path = public;
alter function public.bump_likes_count()                set search_path = public;
alter function public.bump_comments_count()             set search_path = public;
alter function public.touch_updated_at()                set search_path = public;
alter function public.get_my_catches_breakdown(uuid)    set search_path = public;
