-- =====================================================================
-- Carnet de Pêche — 029 gating de tier DANS les RPC carte (BUG-08)
-- Sprint 11.6 workstream A2. À jouer APRÈS 028.
-- =====================================================================
-- Porte côté SERVEUR ce qui ne vivait que dans app/(map)/carte/page.tsx :
--   * cap 3 spots/dépt pour anon + discovery (row_number par dépt),
--   * local = uniquement son home_department,
--   * itinerant = tous les dépts,
--   * is_precise dérivé du TIER RÉEL via current_tier (021) — plus de
--     has_active_subscription qui ne distingue pas local/itinerant.
-- Signatures et colonnes de sortie IDENTIQUES à 010/004 → aucun breaking
-- change pour les appelants (carte page.tsx, /api/spots/nearby, lib/map/utils.ts).
--
-- current_tier(null) renvoie 'anonymous' (jamais null) ; le coalesce(...,'discovery')
-- ne couvre qu'un cas théorique de NULL. anon/discovery tombent dans la branche
-- « tous dépts, plafonnés à 3 ». local/itinerant ne sont jamais plafonnés.
--
-- Vérifs (en rôle) :
--   anon : get_spots_for_map() → ≤ 3/dépt, is_precise=false partout.
--   local home=29 : seulement dépt 29, is_precise=true, coords exactes (geom).
--   itinerant : tous les dépts, is_precise=true.
-- =====================================================================

create or replace function public.get_spots_for_map(
  dept_filter char(3) default null,
  species_filter text[] default null,
  technique_filter text[] default null
)
returns table (
  id          uuid,
  name        text,
  slug        text,
  department  char(3),
  region      text,
  lng         double precision,
  lat         double precision,
  is_precise  boolean,
  techniques  text[],
  species     text[],
  structure   text,
  difficulty  smallint,
  verified    boolean
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
  visible as (
    select
      s.*,
      v.tier,
      v.uid,
      (v.tier in ('local','itinerant') or coalesce(s.created_by = v.uid, false)) as is_precise
    from public.spots s
    cross join viewer v
    where (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
      and (
        v.tier = 'itinerant'
        or v.tier not in ('local','itinerant')                                    -- anon/discovery : tous dépts (plafonnés à 3 plus bas)
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept,'')))
      )
      and (dept_filter is null or s.department = dept_filter)
      and (species_filter is null or s.species && species_filter)
      and (technique_filter is null or s.techniques && technique_filter)
  ),
  ranked as (
    select *, row_number() over (partition by btrim(department) order by name) as rn
    from visible
  )
  select
    id, name, slug, department, region,
    case when is_precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when is_precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    is_precise, techniques, species, structure, difficulty, verified
  from ranked
  where tier in ('local','itinerant') or rn <= 3                                  -- anon/discovery : 3 max/dépt
  order by name;
$$;

grant execute on function public.get_spots_for_map(char, text[], text[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- nearby_spots : même principe de plafond par tier. Cette RPC ne renvoie
-- PAS de geom (seulement distance_m) → on plafonne uniquement le nombre de
-- lignes (COUNT), pas de coords à flouter. anon/discovery = 3, local/itinerant
-- = tout (limit 100 conservé). Signature et colonnes inchangées vs 004.
-- ---------------------------------------------------------------------
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
    select coalesce(public.current_tier(auth.uid()), 'discovery') as tier
  ),
  matched as (
    select
      s.id, s.name, s.slug, s.department,
      ST_Distance(
        s.geom,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      ) as distance_m,
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
        or coalesce(s.created_by = auth.uid(), false)
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
  where tier in ('local','itinerant') or rn <= 3                                  -- anon/discovery : 3 max
  order by distance_m;
$$;

grant execute on function public.nearby_spots(double precision, double precision, double precision, text[], text[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- get_spot_by_slug / get_spot_by_id (BUG-08) : la fiche spot et le
-- pré-remplissage carnet gateaient le PRÉCIS sur has_active_subscription
-- (tout abonné, sans vérifier le département) → un Local voyait les coords
-- exactes d'un spot HORS de son dépt (= feature Itinérant). On dérive
-- désormais le précis du TIER RÉEL : itinerant = partout, local = son
-- home_department uniquement, owner = ses spots. Signatures et colonnes
-- de sortie IDENTIQUES à 011/012 → aucun breaking change (lib/types.ts inchangé).
-- ---------------------------------------------------------------------
create or replace function public.get_spot_by_slug(p_slug text)
returns table (
  id           uuid,
  name         text,
  slug         text,
  department   char(3),
  region       text,
  lng          double precision,
  lat          double precision,
  is_precise   boolean,
  techniques   text[],
  species      text[],
  structure    text,
  difficulty   smallint,
  description  text,
  access_notes text,
  hazards      text[],
  visibility   text,
  verified     boolean,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.*,
      (
        coalesce(s.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise
    from public.spots s
    cross join viewer v
    where s.slug = p_slug
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
    limit 1
  )
  select
    id, name, slug, department, region,
    case when precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    precise as is_precise,
    techniques, species, structure, difficulty, description, access_notes, hazards, visibility, verified, created_at
  from matched;
$$;

grant execute on function public.get_spot_by_slug(text) to anon, authenticated;

create or replace function public.get_spot_by_id(p_id uuid)
returns table (
  id           uuid,
  name         text,
  slug         text,
  department   char(3),
  region       text,
  lng          double precision,
  lat          double precision,
  is_precise   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      auth.uid() as uid,
      coalesce(public.current_tier(auth.uid()), 'discovery') as tier,
      (select home_department from public.profiles where id = auth.uid()) as home_dept
  ),
  matched as (
    select
      s.*,
      (
        coalesce(s.created_by = v.uid, false)
        or v.tier = 'itinerant'
        or (v.tier = 'local' and btrim(s.department) = btrim(coalesce(v.home_dept, '')))
      ) as precise
    from public.spots s
    cross join viewer v
    where s.id = p_id
      and (
        s.visibility = 'public'
        or (s.visibility = 'subscriber' and v.tier in ('local','itinerant'))
        or coalesce(s.created_by = v.uid, false)
      )
    limit 1
  )
  select
    id, name, slug, department, region,
    case when precise then ST_X(geom::geometry) else ST_X(ST_Centroid(geom_public::geometry)) end as lng,
    case when precise then ST_Y(geom::geometry) else ST_Y(ST_Centroid(geom_public::geometry)) end as lat,
    precise as is_precise
  from matched;
$$;

grant execute on function public.get_spot_by_id(uuid) to anon, authenticated;
