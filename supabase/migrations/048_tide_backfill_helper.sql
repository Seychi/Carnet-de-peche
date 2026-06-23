-- =====================================================================
-- 048 — Helper de backfill marée (sprint 22, Chantier A / WS-D). NON destructif.
-- =====================================================================
-- La marée des prises est désormais dérivée AU LOG (sprint 22, lib/conditions/
-- openmeteo.ts : sea_level_height_msl → tide_state + marnage). Pour les prises
-- DÉJÀ loguées (tide_state NULL), un script one-shot (scripts/backfill-tide.ts)
-- dérive tide_state via Open-Meteo. Ce helper lui fournit les coordonnées PRÉCISES
-- (depuis `geom`, colonne verrouillée 041) — RÉSERVÉ au service_role (le backfill
-- tourne en service-role, jamais exposé à anon/authenticated).
--
-- ⚠️ Application = John (fichier seulement). Aucune donnée modifiée par cette
--    migration : c'est juste l'outil de lecture pour le script de backfill.
-- =====================================================================

create or replace function public.get_catches_for_tide_backfill()
returns table(id uuid, lng double precision, lat double precision, caught_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    c.id,
    ST_X(c.geom::geometry) as lng,
    ST_Y(c.geom::geometry) as lat,
    c.caught_at
  from public.catches c
  where c.geom is not null
    and c.tide_state is null
    and coalesce((c.conditions->>'out_of_coverage')::boolean, false) = false
  order by c.caught_at desc;
$function$;

-- Défense en profondeur : réservé au backfill service-role.
revoke execute on function public.get_catches_for_tide_backfill() from public;
revoke execute on function public.get_catches_for_tide_backfill() from anon;
revoke execute on function public.get_catches_for_tide_backfill() from authenticated;
grant execute on function public.get_catches_for_tide_backfill() to service_role;
