-- =====================================================================
-- Carnet de Pêche — 025 verrou get_spots_for_scoring (sprint 11.5 Bloc A)
-- =====================================================================
-- NON APPLIQUÉE — à relire par John puis jouer via le dashboard
-- (Supabase Studio → SQL Editor) ou `supabase db push`.
--
-- 🔴 CORRECTIF CRITIQUE (audit 2026-06-21 §3.1).
-- public.get_spots_for_scoring() est SECURITY DEFINER et renvoie les
-- coordonnées GPS *précises* (ST_X/ST_Y(geom)) de TOUS les spots publics,
-- sans filtre de visiteur. EXECUTE est accordé à anon + authenticated →
-- n'importe qui, avec la clé publishable présente dans le bundle navigateur,
-- peut récupérer les coords exactes via :
--     POST /rest/v1/rpc/get_spots_for_scoring
-- ce qui contourne intégralement le floutage 1 km (geom_public /
-- spots_for_viewer — la promesse anti spot-burning) ET le gating payant
-- (coords précises = réservées Local/Itinérant).
--
-- Le cron `compute-spot-scores` appelle cette fonction via le client
-- SERVICE-ROLE (lib/supabase/admin.ts) → il conserve l'accès, rien ne casse.
--
-- Vérif post-application :
--   select has_function_privilege('anon','public.get_spots_for_scoring()','EXECUTE');        -- false
--   select has_function_privilege('service_role','public.get_spots_for_scoring()','EXECUTE'); -- true
--   -- puis : le cron quotidien produit toujours spot_scores (38 lignes).
-- =====================================================================

revoke execute on function public.get_spots_for_scoring() from anon, authenticated, public;
grant  execute on function public.get_spots_for_scoring() to service_role;
