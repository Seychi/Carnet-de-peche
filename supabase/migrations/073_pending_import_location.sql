-- 073_pending_import_location.sql — Sprint 43, WS-A bis (coord du curage).
--
-- Le curage = ENRICHIR + VÉRIFIER. Vérifier la coordonnée suppose de la VOIR sur le
-- satellite. Or la coordonnée précise d'un import `pending` n'est lisible par aucune
-- voie (verrou colonne geom 028 : anon/authenticated sans SELECT ; geom_public floutée
-- ~500-900 m ; imports created_by NULL → spots_for_viewer.geom_precise NULL ; toutes
-- les RPC carte filtrent 'approved'). Cette RPC modérateur-only rend la coord OSM
-- exacte d'un import pending pour l'afficher dans le form de curage.
--
-- Décision John (sprint 43) : OUI. Risque faible et assumé :
--   * gate is_moderator() DANS le WHERE → un non-modérateur obtient 0 ligne ;
--   * source='imported' AND pending UNIQUEMENT (jamais un spot user/communautaire) ;
--   * ce sont des coordonnées OSM PUBLIQUES (déjà sur openstreetmap.org) → l'invariant
--     anti spot-burning (coords de PRISES/spots privés d'utilisateurs) n'est pas concerné.
--
-- ⚠️ Prochain libre = 073. Migration APPLIQUÉE en prod. Régénérer lib/types.ts ensuite.

create or replace function public.get_pending_import_location(p_spot_id uuid)
returns table (lng double precision, lat double precision)
language sql
stable
security definer
set search_path = public
as $$
  select
    ST_X(s.geom::geometry) as lng,
    ST_Y(s.geom::geometry) as lat
  from public.spots s
  where s.id = p_spot_id
    and s.source = 'imported'
    and s.moderation_status = 'pending'
    -- Gate : seul un modérateur obtient la coordonnée (sinon 0 ligne).
    and public.is_moderator();
$$;

comment on function public.get_pending_import_location(uuid) is
  'Coordonnée précise (lng/lat) d''un import OSM pending, pour le form de curage (sprint 43). Modérateur-only (gate is_moderator() dans le WHERE). Limité aux imports pending. Coords OSM publiques.';

-- anon exclu ; authenticated peut EXECUTE mais le gate is_moderator() filtre.
revoke all on function public.get_pending_import_location(uuid) from public, anon;
grant execute on function public.get_pending_import_location(uuid) to authenticated;
