-- =====================================================================
-- Carnet de Pêche — 031 security_invoker sur les vues + verrou profile_stats
-- Sprint 11.6, Workstream J (durcissement advisor security_definer_view).
-- ⚠️ APPLIQUÉ EN PROD le 2026-06-21 (version 20260621113723).
-- =====================================================================
-- 3 vues passent en SECURITY INVOKER (PostgreSQL >= 15 ; prod = 17.x) : leur WHERE
-- est le miroir exact des policies SELECT des tables sous-jacentes, et le floutage
-- ne dépend pas de la RLS (porté par catch_visible_geom / le CASE). Lecture identique.
-- profile_stats perd en plus le SELECT anon (vue non utilisée par l'app).
--
-- ⚠️ spots_for_viewer reste VOLONTAIREMENT en SECURITY DEFINER : son CASE geom_precise
-- lit public.spots.geom DIRECTEMENT, or cette colonne est révoquée à anon/authenticated
-- (028, anti spot-burning) → la passer en invoker casserait sa lecture pour ces rôles.
-- Elle masque déjà le précis (geom_precise = NULL pour les non-abonnés) : definer est
-- ici le comportement voulu, pas une faille. L'app ne la lit jamais en direct (RPC only).
-- → L'advisor security_definer_view continue de la signaler : c'est ASSUMÉ et documenté.
-- Pour la passer un jour en invoker, router geom via une fonction SECURITY DEFINER
-- (ex. spot_visible_geom) au lieu du CASE direct.
--
-- RLS : aucune table touchée, aucune policy modifiée. Append-only.
-- ROLLBACK : alter view ... set (security_invoker = false) ; grant select on profile_stats to anon ;
-- =====================================================================

alter view public.catches_for_viewer   set (security_invoker = true);
alter view public.feed_posts_for_viewer set (security_invoker = true);
alter view public.profile_stats         set (security_invoker = true);
revoke select on public.profile_stats from anon;

comment on view public.spots_for_viewer is
  'SECURITY DEFINER VOLONTAIRE (sprint 11.6 / WS J) : lit spots.geom pour le gating geom_precise alors que la colonne est revoquee a anon/authenticated. Masque deja le precis aux non-abonnes. Ne PAS passer en security_invoker sans router geom via une fonction definer.';
