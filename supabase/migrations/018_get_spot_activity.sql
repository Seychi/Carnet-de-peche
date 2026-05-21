-- ============================================================
-- Migration 018 — Sprint 8 : RPC get_spot_activity (signal social fiche spot)
-- ============================================================
-- Activité publique récente sur un spot. Lit via catches_for_viewer qui
-- applique déjà privacy + floutage geom. Aucune coord précise n'est renvoyée
-- (la vue ne renvoie que geom_visible, et on ne la sélectionne même pas ici).
-- Séparée de 017 pour une rollback granulaire.
-- ============================================================

create or replace function public.get_spot_activity(p_spot_id uuid, p_days integer default 7)
returns table (
  catches_count   integer,
  fishers_count   integer,
  last_catch_at   timestamptz,
  recent_catches  jsonb  -- array, max 3 items
)
language sql
stable
security definer
set search_path = public
as $$
  with relevant as (
    select c.*
    from public.catches_for_viewer c
    where c.spot_id = p_spot_id
      and c.caught_at > now() - (p_days || ' days')::interval
  ),
  agg as (
    select
      count(*)::integer                as catches_count,
      count(distinct user_id)::integer as fishers_count,
      max(caught_at)                   as last_catch_at
    from relevant
  ),
  top3 as (
    select jsonb_agg(t) as items
    from (
      select
        id,
        username, display_name, avatar_url,
        species, size_cm, weight_g, caught_at
      from relevant
      order by caught_at desc
      limit 3
    ) t
  )
  select
    agg.catches_count,
    agg.fishers_count,
    agg.last_catch_at,
    coalesce(top3.items, '[]'::jsonb) as recent_catches
  from agg, top3;
$$;

comment on function public.get_spot_activity is
  'Activité publique récente sur un spot. Lit via catches_for_viewer (privacy + floutage déjà appliqués). Renvoie agrégats + 3 catches détaillées max. Aucune coord précise exposée.';
