-- 069_active_zones.sql — Sprint 41, WS-A (couche « Zones actives »).
--
-- But : une couche carte qui montre OÙ ça produit (cellules d'activité des prises
-- publiques récentes), gratuite tous tiers, distincte des spots curés. C'est un
-- AGRÉGAT k-anon, pas des spots → jamais de coordonnée précise ni de geom.
--
-- ⚠️ CLONE ADVERSARIAL de get_catch_heatmap (040) : on REPREND À L'IDENTIQUE ses
-- garde-fous (snap de cellule plancher 0.01°, privacy='public' + geom_public only,
-- K=3 = catch_count>=3 AND fishers_count>=3, SECURITY DEFINER, search_path public,
-- grant anon/authenticated). On n'invente AUCUNE cellule plus fine. On enrichit la
-- sortie : rang de densité + espèce dominante UNIQUEMENT si elle est elle-même k-anon.
--
-- ⚠️ Numérotation : 059→068 pris (sprints 37-40) → cette migration = 069.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

create or replace function public.get_active_zones(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  p_zoom integer default 8,
  species_filter text[] default null::text[],
  technique_filter text[] default null::text[],
  p_days integer default 90
)
returns table(
  lng double precision,
  lat double precision,
  catch_count integer,
  fishers_count integer,
  rank integer,
  dominant_species text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with params as (
    select
      -- Snap de cellule IDENTIQUE à get_catch_heatmap : plancher 0.01° (~1,1 km),
      -- jamais plus fin que le flou GPS, même au zoom max.
      case
        when p_zoom <= 6  then 0.20
        when p_zoom <= 8  then 0.10
        when p_zoom <= 10 then 0.05
        when p_zoom <= 12 then 0.02
        else 0.01
      end as cell_size,
      greatest(coalesce(p_days, 90), 1) as days,
      ST_MakeEnvelope(
        least(min_lng, max_lng), least(min_lat, max_lat),
        greatest(min_lng, max_lng), greatest(min_lat, max_lat), 4326
      )::geography as bbox
  ),
  pts as (
    select
      c.user_id,
      c.species,
      ST_SnapToGrid(c.geom_public::geometry, prm.cell_size) as cell
    from public.catches c
    cross join params prm
    where c.privacy = 'public'
      and c.geom_public is not null
      and c.caught_at > now() - (prm.days || ' days')::interval
      and (species_filter   is null or c.species   = any(species_filter))
      and (technique_filter is null or c.technique = any(technique_filter))
      and c.geom_public && prm.bbox
  ),
  -- Agrégat par cellule : ne sort QUE si k-anon (K=3 prises ET 3 pêcheurs distincts).
  agg as (
    select
      cell,
      count(*)::integer                as catch_count,
      count(distinct user_id)::integer as fishers_count
    from pts
    group by cell
    having count(*) >= 3 and count(distinct user_id) >= 3
  ),
  -- Espèce dominante par cellule, exposée SEULEMENT si elle est elle-même k-anon
  -- (≥3 prises ET ≥3 pêcheurs pour CETTE espèce dans CETTE cellule). Sinon null.
  species_agg as (
    select cell, species,
      count(*) as sp_catch,
      count(distinct user_id) as sp_fishers
    from pts
    where species is not null
    group by cell, species
    having count(*) >= 3 and count(distinct user_id) >= 3
  ),
  dominant as (
    select distinct on (cell) cell, species
    from species_agg
    order by cell, sp_catch desc
  )
  select
    ST_X(a.cell) as lng,
    ST_Y(a.cell) as lat,
    a.catch_count,
    a.fishers_count,
    row_number() over (order by a.catch_count desc)::integer as rank,
    d.species as dominant_species
  from agg a
  left join dominant d on d.cell = a.cell
  order by a.catch_count desc
  limit 5000;
$function$;

comment on function public.get_active_zones(double precision, double precision, double precision, double precision, integer, text[], text[], integer) is
  'Couche « zones actives » : cellules d''activité des prises PUBLIQUES récentes (p_days). Clone k-anon de get_catch_heatmap (K=3, cellule plancher 0.01°, geom_public only, JAMAIS geom). Gratuit tous tiers (agrégat). dominant_species exposée seulement si elle-même k-anon.';

grant execute on function public.get_active_zones(double precision, double precision, double precision, double precision, integer, text[], text[], integer) to anon, authenticated;
