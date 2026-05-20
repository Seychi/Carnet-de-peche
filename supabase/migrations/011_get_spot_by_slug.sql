-- =====================================================================
-- Carnet de Pêche — 011 get_spot_by_slug
-- RPC pour la fiche spot : retourne lng/lat en floats avec la même
-- logique de sécurité que get_spots_for_map (SECURITY DEFINER).
-- Coords précises si propriétaire ou abonné actif, sinon centroïde
-- du buffer public (1 km).
-- =====================================================================

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
  select
    s.id,
    s.name,
    s.slug,
    s.department,
    s.region,
    case
      when coalesce(s.created_by = auth.uid(), false)
           or public.has_active_subscription(auth.uid())
        then ST_X(s.geom::geometry)
      else ST_X(ST_Centroid(s.geom_public::geometry))
    end as lng,
    case
      when coalesce(s.created_by = auth.uid(), false)
           or public.has_active_subscription(auth.uid())
        then ST_Y(s.geom::geometry)
      else ST_Y(ST_Centroid(s.geom_public::geometry))
    end as lat,
    (
      coalesce(s.created_by = auth.uid(), false)
      or public.has_active_subscription(auth.uid())
    ) as is_precise,
    s.techniques,
    s.species,
    s.structure,
    s.difficulty,
    s.description,
    s.access_notes,
    s.hazards,
    s.visibility,
    s.verified,
    s.created_at
  from public.spots s
  where s.slug = p_slug
    and (
      s.visibility = 'public'
      or (s.visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
      or coalesce(s.created_by = auth.uid(), false)
    )
  limit 1;
$$;

grant execute on function public.get_spot_by_slug(text) to anon, authenticated;
