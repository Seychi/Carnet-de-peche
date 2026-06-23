-- =====================================================================
-- Carnet de Pêche — 049 : RPC get_top_spots_for_species (fiche espèce, sprint 23)
-- À jouer APRÈS 044. Migration additive (CREATE FUNCTION) — non destructive.
-- =====================================================================
-- Objectif (WS-B / D-B4) : « les meilleurs spots pour CETTE espèce », triés par un
-- signal RÉEL (densité de prises publiques de l'espèce au spot), et non plus la
-- liste brute `.contains('species', [dbKey])` non triée de /especes/[slug].
--
-- 🔒 GATING — réutilise EXACTEMENT les invariants existants (pas de réinvention) :
--   • COORDS : précises (geom) si Itinérant, OU Local sur son home_department, OU
--     propriétaire du spot ; sinon centroïde flou (geom_public). Même règle que
--     nearby_spots (039) / get_spots_for_map (029). `geom`/`geom_public` ne sortent
--     jamais bruts — uniquement un point (lng/lat) déjà gaté.
--   • COMMUNAUTÉ : k-anonymat K=3 (>=3 prises ET >=3 pêcheurs distincts) comme
--     get_quality_cells (044) / get_catch_heatmap (040) — sinon counts masqués à 0.
--   • PERSO : prises du viewer (auth.uid(), jamais un uid client → anti-usurpation),
--     UNIQUEMENT si Itinérant (cohérent avec le moat carnet, qualité complète = Itinérant).
--
-- N'expose que des spots PUBLICS portant l'espèce, un point gaté, et des agrégats.
-- SECURITY DEFINER + search_path = public, pg_temp (durcissement 026).
-- =====================================================================

create or replace function public.get_top_spots_for_species(
  p_species text,
  p_dept    text    default null,
  p_limit   integer default 6,
  p_days    integer default 90
)
returns table (
  id              uuid,
  name            text,
  slug            text,
  department      char(3),
  structure       text,
  lng             double precision,  -- point GATÉ (précis si autorisé, sinon centroïde flou)
  lat             double precision,
  is_precise      boolean,
  species_catches integer,           -- prises publiques de l'espèce au spot (0 si < K)
  fishers         integer,           -- pêcheurs distincts (0 si < K)
  perso_catches   integer            -- prises du viewer au spot (Itinérant uniquement)
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with viewer as materialized (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  cand as (
    select s.id, s.name, s.slug, s.department, s.structure, s.geom, s.geom_public, s.created_by
    from public.spots s
    where s.visibility = 'public'
      and s.species && array[p_species]
      and (p_dept is null or btrim(s.department) = btrim(p_dept))
  ),
  -- Signal communauté (k-anon K=3) : prises publiques de l'espèce au spot sur p_days.
  sig as (
    select
      c.spot_id,
      count(*) filter (where c.privacy = 'public')::int                as pub_count,
      count(distinct c.user_id) filter (where c.privacy = 'public')::int as pub_fishers
    from public.catches c
    where c.spot_id in (select id from cand)
      and c.species = p_species
      and c.caught_at > now() - (greatest(coalesce(p_days, 90), 1) || ' days')::interval
    group by c.spot_id
  ),
  -- Perso : prises du viewer (Itinérant uniquement). CASE-free : la jointure n'a lieu
  -- que si v.tier = 'itinerant' ET c.user_id = v.uid (sur ses propres prises → zéro fuite).
  perso as (
    select c.spot_id, count(*)::int as perso_count
    from public.catches c
    cross join viewer v
    where v.tier = 'itinerant'
      and v.uid is not null
      and c.user_id = v.uid
      and c.spot_id in (select id from cand)
      and c.species = p_species
      and c.caught_at > now() - (greatest(coalesce(p_days, 90), 1) || ' days')::interval
    group by c.spot_id
  ),
  resolved as (
    select
      cand.id, cand.name, cand.slug, cand.department, cand.structure,
      (
        coalesce(cand.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(cand.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise,
      cand.geom, cand.geom_public,
      case when sig.pub_count >= 3 and sig.pub_fishers >= 3 then sig.pub_count   else 0 end as kc,
      case when sig.pub_count >= 3 and sig.pub_fishers >= 3 then sig.pub_fishers else 0 end as kf,
      coalesce(perso.perso_count, 0) as pc
    from cand
    cross join viewer v
    left join sig   on sig.spot_id   = cand.id
    left join perso on perso.spot_id = cand.id
  )
  select
    r.id, r.name, r.slug, r.department, r.structure,
    case when r.precise then ST_X(r.geom::geometry) else ST_X(ST_Centroid(r.geom_public::geometry)) end as lng,
    case when r.precise then ST_Y(r.geom::geometry) else ST_Y(ST_Centroid(r.geom_public::geometry)) end as lat,
    r.precise as is_precise,
    r.kc as species_catches,
    r.kf as fishers,
    r.pc as perso_catches
  from resolved r
  order by r.kc desc, r.pc desc, r.name asc
  limit greatest(least(coalesce(p_limit, 6), 24), 1);
$$;

comment on function public.get_top_spots_for_species is
  'Meilleurs spots publics pour une espèce (fiche /especes, sprint 23). Tri par signal réel : prises publiques de l''espèce au spot (k-anon K=3) puis perso (viewer, Itinérant). Coords gatées (précises si Itinérant/Local-home/propriétaire, sinon centroïde flou) comme nearby_spots (039). SECURITY DEFINER, search_path=public,pg_temp.';

grant execute on function public.get_top_spots_for_species(text, text, integer, integer)
  to anon, authenticated;
