-- =====================================================================
-- Carnet de Pêche — 009 map helpers
-- Fonction RPC pour la carte MapLibre : retourne lng/lat en floats
-- au lieu du WKB opaque renvoyé par spots_for_viewer.
-- geom_public des spots est un POLYGON (buffer 1 km), donc on prend
-- ST_Centroid pour obtenir le centre du disque de floutage.
-- =====================================================================

-- RPC principale utilisée par /carte et les fiches spots.
-- Retourne lng/lat directement exploitables par MapLibre, plus is_precise
-- pour que le frontend sache s'il doit afficher un marker ou un disque flouté.
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
    -- Coords précises si proprio ou abonné actif ; centroïde du disque flouté sinon
    case
      when s.created_by = auth.uid() or public.has_active_subscription(auth.uid())
        then ST_X(s.geom::geometry)
      else ST_X(ST_Centroid(s.geom_public::geometry))
    end as lng,
    case
      when s.created_by = auth.uid() or public.has_active_subscription(auth.uid())
        then ST_Y(s.geom::geometry)
      else ST_Y(ST_Centroid(s.geom_public::geometry))
    end as lat,
    (s.created_by = auth.uid() or public.has_active_subscription(auth.uid())) as is_precise,
    s.techniques,
    s.species,
    s.structure,
    s.difficulty,
    s.verified
  from public.spots s
  where (
    s.visibility = 'public'
    or (s.visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
    or s.created_by = auth.uid()
  )
  and (dept_filter is null or s.department = dept_filter)
  and (species_filter is null or s.species && species_filter)
  and (technique_filter is null or s.techniques && technique_filter)
  order by s.name;
$$;

-- Grant d'accès public (la RLS est gérée par la logique interne de la fonction)
grant execute on function public.get_spots_for_map(char, text[], text[]) to anon, authenticated;
