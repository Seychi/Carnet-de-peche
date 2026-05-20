-- =====================================================================
-- Carnet de Pêche — 012 get_spot_by_id
-- Même logique de gating que get_spot_by_slug mais par UUID.
-- Utilisé par /carnet/nouvelle?spot_id=xxx pour pré-remplir le lieu.
-- =====================================================================

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
    ) as is_precise
  from public.spots s
  where s.id = p_id
    and (
      s.visibility = 'public'
      or (s.visibility = 'subscriber' and public.has_active_subscription(auth.uid()))
      or coalesce(s.created_by = auth.uid(), false)
    )
  limit 1;
$$;

grant execute on function public.get_spot_by_id(uuid) to anon, authenticated;
