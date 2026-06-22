-- =====================================================================
-- Carnet de Pêche — 040 : RPC heatmap des prises publiques (Carte v2 / C1)
-- Sprint Carte-v2 C1 « carte vivante », Bloc A. À jouer APRÈS 039.
-- =====================================================================
-- Objectif : agréger les PRISES PUBLIQUES en cellules de grille pour une
-- heatmap « où ça mord », SANS jamais exposer une position précise.
--
-- 🔒 GARDE-FOUS SÉCURITÉ (invariant n°1 du sprint) :
--   1. On agrège UNIQUEMENT `geom_public` (déjà flouté), JAMAIS `geom`.
--      On ne lit même pas la vue catches_for_viewer (dont geom_visible peut être
--      PRÉCIS pour le propriétaire/les amis) : la heatmap communautaire est la
--      MÊME pour tout le monde → on lit geom_public en direct, déterministe.
--   2. K-ANONYMAT K=3 (décision John 2026-06-22) : une cellule n'est renvoyée que
--      si elle contient >= 3 prises ET >= 3 pêcheurs DISTINCTS. Une cellule à 1-2
--      prises (ou 3 prises d'un même pêcheur) = NON renvoyée → impossible de
--      déduire le spot d'un utilisateur depuis la carte.
--   3. Taille de cellule plancher 0.01° (~1.1 km) : jamais plus fine que le flou,
--      même au zoom max. La granularité ne peut pas « dé-flouter » geom_public.
--   4. SECURITY DEFINER + search_path = public (durcissement 026). Aucune coord
--      précise ne sort : la RPC ne renvoie que le centroïde de grille + les counts.
--
-- La RPC est appelable par anon (heatmap = teaser gratuit, tous tiers — décision
-- John 2026-06-22). Aucune donnée sensible : que des agrégats k-anonymes.
--
-- Vérifs (en SQL, cf RECAP-C1 / tests) :
--   * jeu où 1 user a 1 prise isolée → 0 cellule renvoyée.
--   * 3 prises de 3 users dans la même maille ~1 km → 1 cellule.
--   * la sortie ne contient ni geom ni geom_public bruts, seulement lng/lat de grille.
-- =====================================================================

create or replace function public.get_catch_heatmap(
  min_lng          double precision,
  min_lat          double precision,
  max_lng          double precision,
  max_lat          double precision,
  p_zoom           integer  default 8,
  species_filter   text[]   default null,
  technique_filter text[]   default null,
  p_days           integer  default 30
)
returns table (
  lng            double precision,
  lat            double precision,
  catch_count    integer,
  fishers_count  integer
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      -- Taille de cellule selon le zoom, PLANCHER 0.01° (~1.1 km) : jamais plus
      -- fine que le flou geom_public.
      case
        when p_zoom <= 6  then 0.20
        when p_zoom <= 8  then 0.10
        when p_zoom <= 10 then 0.05
        when p_zoom <= 12 then 0.02
        else 0.01
      end as cell_size,
      greatest(coalesce(p_days, 30), 1)  as days,
      ST_MakeEnvelope(
        least(min_lng, max_lng), least(min_lat, max_lat),
        greatest(min_lng, max_lng), greatest(min_lat, max_lat), 4326
      )::geography as bbox
  ),
  pts as (
    select
      c.user_id,
      -- Snap de geom_public (jamais geom) sur la grille. Cast geography→geometry
      -- pour ST_SnapToGrid (degrés). Le nœud de grille = centre de cellule.
      ST_SnapToGrid(c.geom_public::geometry, prm.cell_size) as cell
    from public.catches c
    cross join params prm
    where c.privacy = 'public'
      and c.geom_public is not null
      and c.caught_at > now() - (prm.days || ' days')::interval
      and (species_filter   is null or c.species   = any(species_filter))
      and (technique_filter is null or c.technique = any(technique_filter))
      and c.geom_public && prm.bbox                 -- utilise catches_geom_public_idx (GiST)
  ),
  agg as (
    select
      cell,
      count(*)::integer                as catch_count,
      count(distinct user_id)::integer as fishers_count
    from pts
    group by cell
  )
  select
    ST_X(cell) as lng,
    ST_Y(cell) as lat,
    catch_count,
    fishers_count
  from agg
  where catch_count >= 3 and fishers_count >= 3      -- 🔒 k-anonymat K=3 strict
  order by catch_count desc
  limit 5000;                                         -- garde-fou volume
$$;

comment on function public.get_catch_heatmap is
  'Heatmap des prises publiques (Carte v2 / C1). Agrège geom_public (JAMAIS geom) par cellule de grille (plancher ~1.1 km). N''émet une cellule que si >= 3 prises de >= 3 pecheurs distincts (k-anonymat K=3). SECURITY DEFINER, search_path=public. Aucune coord precise exposee. Appelable anon (teaser gratuit).';

grant execute on function public.get_catch_heatmap(
  double precision, double precision, double precision, double precision,
  integer, text[], text[], integer
) to anon, authenticated;

-- Index partiel dédié : spatial (GiST) restreint aux prises publiques géolocalisées,
-- le sous-ensemble exact balayé par la heatmap (le filtre temporel reste couvert par
-- catches_caught_at_idx). Léger, et évite de scanner les prises privées.
create index if not exists catches_public_heat_idx
  on public.catches using gist (geom_public)
  where privacy = 'public' and geom_public is not null;
