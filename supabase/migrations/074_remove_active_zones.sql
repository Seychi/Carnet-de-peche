-- 074_remove_active_zones.sql — Sprint 42.1 (nettoyage carte).
--
-- Décision John : la couche « Zones actives » (get_active_zones, 069) fait DOUBLON
-- avec la heatmap « Zones de prises » (get_catch_heatmap, 040) — même donnée (prises
-- publiques agrégées k-anon K=3, cellule 0.01°, geom_public), seul le rendu diffère.
-- On la SUPPRIME entièrement (front + RPC) et on garde la heatmap inchangée.
--
-- ⚠️ Ne touche PAS get_catch_heatmap (040) ni get_quality_cells (044).
-- ⚠️ get_department_stats (070) calcule active_zone_count EN INTERNE (il n'appelle pas
--    get_active_zones) → le drop ne le casse pas, mais la colonne devient inutile.
--    Le type de retour change → DROP + CREATE (pas de CREATE OR REPLACE). Grant préservé.
-- ⚠️ Prochain libre = 074 (073 = sprint 43). Migration APPLIQUÉE en prod. Regen types ensuite.

-- 1) Drop de la RPC « Zones actives » (signature exacte de 069).
drop function if exists public.get_active_zones(
  double precision, double precision, double precision, double precision,
  integer, text[], text[], integer
);

-- 2) get_department_stats SANS active_zone_count (ni ses CTE zone_*).
drop function if exists public.get_department_stats();
create function public.get_department_stats()
returns table(
  department       text,
  spot_count       integer,
  curated_count    integer,
  community_count  integer,
  imported_count   integer
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    btrim(s.department)                                        as department,
    count(*)::integer                                          as spot_count,
    count(*) filter (where s.source = 'curated')::integer      as curated_count,
    count(*) filter (where s.source = 'community')::integer    as community_count,
    count(*) filter (where s.source = 'imported')::integer     as imported_count
  from public.spots s
  where s.visibility = 'public' and s.moderation_status = 'approved'
  group by btrim(s.department)
  order by 1;
$function$;

comment on function public.get_department_stats() is
  'Comptes carte par département (sprint 41, simplifié 42.1) : spots publics approuvés (total + curé/communauté/importé). Non gaté, AUCUN geom. Les zones actives ont été retirées (doublon heatmap).';

grant execute on function public.get_department_stats() to anon, authenticated;
