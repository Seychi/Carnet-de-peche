-- =====================================================================
-- Carnet de Pêche — 039 : fix fuite GPS RLS-FIX-07 (nearby_spots trilatérable)
-- À jouer APRÈS 029. Migration de sécurité (pas de changement de signature).
-- =====================================================================
-- PROBLÈME : nearby_spots renvoyait distance_m = ST_Distance(geom PRÉCIS, observateur)
--   pour TOUS les tiers (anon inclus, RPC GRANT to anon/authenticated). 3 appels
--   depuis 3 points => trilatération du geom exact => contourne le floutage
--   geom_public (anti spot-burning). Le gating 029 ne plafonne que le COUNT.
--
-- FIX : distance_m calculée sur le point AUTORISÉ pour le viewer, exactement
--   comme get_spots_for_map (029) dérive ses coords :
--     - précis (geom)            si itinerant, OU local sur son home_department,
--                                OU propriétaire du spot ;
--     - flou (centroïde public)  sinon (anon, discovery, local hors dépt).
--   Le ST_DWithin du filtre reste sur geom (booléen non exposé). Plafond COUNT
--   3/global conservé pour anon/discovery (parité 029).
--
-- Signature & colonnes IDENTIQUES à 029/004 => zéro breaking change applicatif.
-- =====================================================================

create or replace function public.nearby_spots(
  lat double precision,
  lng double precision,
  radius_km double precision default 50,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id uuid,
  name text,
  slug text,
  department char(3),
  distance_m double precision,
  techniques text[],
  species text[],
  difficulty smallint
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.id, s.name, s.slug, s.department,
      case
        when (
          coalesce(s.created_by = v.uid, false)
          or v.tier = 'itinerant'
          or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
        )
        then ST_Distance(
               s.geom,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
        else ST_Distance(
               ST_Centroid(s.geom_public)::geography,
               ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
             )
      end as distance_m,
      s.techniques, s.species, s.difficulty,
      v.tier
    from public.spots s
    cross join viewer v
    where ST_DWithin(
            s.geom,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000
          )
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (species_filter is null   or s.species   && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
    order by distance_m
    limit 100
  ),
  ranked as (
    select *, row_number() over (order by distance_m) as rn from matched
  )
  select id, name, slug, department, distance_m, techniques, species, difficulty
  from ranked
  where tier in ('local','itinerant') or rn <= 3
  order by distance_m;
$$;

grant execute on function public.nearby_spots(
  double precision, double precision, double precision, text[], text[]
) to anon, authenticated;
