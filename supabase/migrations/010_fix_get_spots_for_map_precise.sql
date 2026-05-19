-- =====================================================================
-- Carnet de Pêche — 010 fix get_spots_for_map is_precise null
-- En anonyme, auth.uid() = null → s.created_by = null → NULL (pas false)
-- COALESCE force false pour les non-authentifiés.
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
  select
    s.id,
    s.name,
    s.slug,
    s.department,
    s.region,
    case
      when coalesce(s.created_by = auth.uid(), false) or public.has_active_subscription(auth.uid())
        then ST_X(s.geom::geometry)
      else ST_X(ST_Centroid(s.geom_public::geometry))
    end as lng,
    case
      when coalesce(s.created_by = auth.uid(), false) or public.has_active_subscription(auth.uid())
        then ST_Y(s.geom::geometry)
      else ST_Y(ST_Centroid(s.geom_public::geometry))
    end as lat,
    coalesce(s.created_by = auth.uid(), false) or public.has_active_subscription(auth.uid()) as is_precise,
    s.techniques,
    s.species,
    s.structure,
    s.difficulty,
    s.verified
  from public.spots s
  where (
    s.visibility = 'public'
    or (s.visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
    or coalesce(s.created_by = auth.uid(), false)
  )
  and (dept_filter is null or s.department = dept_filter)
  and (species_filter is null or s.species && species_filter)
  and (technique_filter is null or s.techniques && technique_filter)
  order by s.name;
$$;

grant execute on function public.get_spots_for_map(char, text[], text[]) to anon, authenticated;
