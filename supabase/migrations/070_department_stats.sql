-- 070_department_stats.sql — Sprint 41, WS-C (comptes par département).
--
-- But : afficher honnêtement « N spots + M zones actives » par département (et le
-- détail par source pour la lisibilité curé/communauté/importé). AUCUN geom, aucun
-- gating (comptes publics agrégés). Décision John D2 : les zones actives sont
-- comptées À PART des spots (agrégat k-anon, pas un spot) → pas de gonflage.
--
-- ⚠️ `spots.department` est de type CHAR (paddé : '06 ') → group/return sur btrim.
-- ⚠️ active_zone_count : cellules k-anon (K=3) des prises publiques attribuées au
--    département via le spot de la prise (catches.spot_id → spots.department). Une
--    prise sans spot n'est attribuable à aucun département (exclue). Cellule 0.01°
--    (plancher), même garde-fou que get_active_zones / get_catch_heatmap.
--
-- ⚠️ Numérotation : 069 pris ci-dessus → cette migration = 070.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

create or replace function public.get_department_stats()
returns table(
  department       text,
  spot_count       integer,
  curated_count    integer,
  community_count  integer,
  imported_count   integer,
  active_zone_count integer
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with spot_counts as (
    select
      btrim(s.department)                                        as dept,
      count(*)::integer                                          as spot_count,
      count(*) filter (where s.source = 'curated')::integer      as curated_count,
      count(*) filter (where s.source = 'community')::integer    as community_count,
      count(*) filter (where s.source = 'imported')::integer     as imported_count
    from public.spots s
    where s.visibility = 'public' and s.moderation_status = 'approved'
    group by btrim(s.department)
  ),
  -- Cellules d'activité par département (via le spot de la prise), k-anon K=3.
  zone_cells as (
    select
      btrim(sp.department) as dept,
      ST_SnapToGrid(c.geom_public::geometry, 0.01) as cell,
      c.user_id
    from public.catches c
    join public.spots sp on sp.id = c.spot_id
    where c.privacy = 'public' and c.geom_public is not null
  ),
  zone_kanon as (
    select dept, cell
    from zone_cells
    group by dept, cell
    having count(*) >= 3 and count(distinct user_id) >= 3
  ),
  zone_counts as (
    select dept, count(*)::integer as active_zone_count
    from zone_kanon
    group by dept
  )
  select
    sc.dept as department,
    sc.spot_count,
    sc.curated_count,
    sc.community_count,
    sc.imported_count,
    coalesce(zc.active_zone_count, 0) as active_zone_count
  from spot_counts sc
  left join zone_counts zc on zc.dept = sc.dept
  order by sc.dept;
$function$;

comment on function public.get_department_stats() is
  'Comptes carte par département (sprint 41) : spots publics approuvés (total + curé/communauté/importé) + zones actives k-anon (cellules 0.01° via le spot de la prise, K=3). Non gaté, AUCUN geom. Zones comptées à part des spots (D2, honnêteté).';

grant execute on function public.get_department_stats() to anon, authenticated;
