-- 071_scope_spot_scoring.sql — Sprint 42, WS-A (correctif post-import OSM).
--
-- Régression : le cron compute-spot-scores score TOUS les spots approuvés (1 appel
-- météo chacun, maxDuration=60). Depuis l'import OSM (158 → 1158 spots), il timeoute
-- → des curés restent sans score → markers gris sur la carte. On RESTREINT le scoring
-- aux spots qui en ont l'usage (curés + communautaires), en EXCLUANT les 942 imports
-- bruts (squelettiques, masqués par 072, et de toute façon hors périmètre tant qu'ils
-- ne sont pas curés au sprint 43).
--
-- ⚠️ CREATE OR REPLACE préserve les grants : EXECUTE reste réservé service_role
-- (verrou 025/047). NE PAS re-grant anon/authenticated.
--
-- ⚠️ Numérotation : prochain libre = 071 (070 = sprint 41).
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

-- 1) Scope : on REPREND le corps courant (043) et on AJOUTE le filtre source.
create or replace function public.get_spots_for_scoring()
returns table (id uuid, lng double precision, lat double precision)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    ST_X(s.geom::geometry) as lng,
    ST_Y(s.geom::geometry) as lat
  from public.spots s
  where s.visibility = 'public'
    and s.moderation_status = 'approved'
    and s.geom is not null
    -- Sprint 42 : seuls les curés + communautaires sont scorés (les imports bruts
    -- sont hors périmètre jusqu'au curage du sprint 43).
    and s.source in ('curated', 'community')
  order by s.id;
$$;

-- 2) Purge des scores d'imports (désormais hors périmètre) : cohérence + on évite
--    de garder 621 lignes mortes dans spot_scores.
delete from public.spot_scores
where spot_id in (select id from public.spots where source = 'imported');
