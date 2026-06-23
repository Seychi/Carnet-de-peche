-- =====================================================================
-- Carnet de Pêche — 044 : RPC couche « Qualité » par espèce (Carte v2 / C3b)
-- Sprint Carte-v2 C3b « qualité vivante », Bloc A. À jouer APRÈS 043.
-- =====================================================================
-- Objectif : pour une bbox + un zoom + une espèce, renvoyer des cellules de
-- grille avec un score « qualité » 0-100 **DÉCOMPOSABLE** (le popup explique
-- pourquoi). C'est la réponse à la « Qualité : Excellent » figée et opaque des
-- concurrents : la nôtre est par espèce, vivante, et transparente.
--
-- 🔒 HONNÊTETÉ DU SCORE (garde-fou n°1, décision sprint 7.5 — aucun multiplicateur
--    fabriqué, aucune composante simulée). Le score est une combinaison de
--    composantes RÉELLES, et chaque composante absente est OMISE, jamais inventée :
--
--   • COMMUNAUTÉ  — densité de prises PUBLIQUES de l'espèce dans la cellule.
--       Réutilise EXACTEMENT la logique k-anonyme de get_catch_heatmap (040) :
--       on agrège `geom_public` (JAMAIS `geom`), et une cellule n'expose ses
--       counts communautaires QUE si >= 3 prises ET >= 3 pêcheurs distincts
--       (k-anonymat K=3). En deçà → counts à 0 (= « pas assez de prises
--       partagées »), jamais le détail sub-K d'autrui.
--
--   • PERSO       — les prises du PÊCHEUR COURANT (son carnet) dans la cellule.
--       Décision John 2026-06-23 : le « perso » = vrai moat carnet, dérivé des
--       prises du viewer (PAS spot_scores, qui est un score GLOBAL par spot, pas
--       par pêcheur — le multiplicateur perso ayant été neutralisé au 7.5).
--       Calculé via auth.uid() (jamais un uid passé par le client → pas
--       d'usurpation) et UNIQUEMENT si l'appelant est Itinérant (qualité complète
--       = Itinérant). Sur SES propres prises → aucune fuite : une cellule
--       « perso-only » ne révèle que les données du viewer, à lui seul.
--
--   • DONNÉE/FOND — adéquation profondeur+substrat ↔ espèce. C3a est API-only
--       (EMODnet, pas de table DB) → cette composante N'EST PAS calculable en SQL
--       grille-large. Elle est donc volontairement HORS de ce score de grille et
--       récupérée À LA DEMANDE au clic (popup, route /api/seabed gated Itinérant).
--       Ne rien stocker/inventer ici = cohérent avec « si la donnée manque, on le
--       dit ». Cf docs/carte-v2/RECAP-C3b.md.
--
-- INVARIANT GRILLE : une cellule n'apparaît que si (communauté >= K) OU (le viewer
--   y a >= 1 prise perso). Jamais sur la base de prises sub-K d'autres pêcheurs.
--
-- Cellule plancher 0.01° (~1.1 km) comme 040 : jamais plus fine que le flou.
-- SECURITY DEFINER + search_path = public, pg_temp (durcissement 026). N'émet que
-- des centroïdes de grille + des agrégats — aucune coord précise ne sort.
--
-- ⚙️ PONDÉRATION (à arbitrer par John — « Reste manuel John » du brief) : les
--    constantes COMMUNITY_FULL / PERSO_FULL et les poids 0.6/0.4 sont documentés
--    ci-dessous, faciles à ajuster. Pas de boîte noire.
-- =====================================================================

create or replace function public.get_quality_cells(
  min_lng     double precision,
  min_lat     double precision,
  max_lng     double precision,
  max_lat     double precision,
  p_zoom      integer  default 9,
  p_species   text     default null,
  p_technique text     default null,
  p_days      integer  default 30
)
returns table (
  lng             double precision,
  lat             double precision,
  cell_size       double precision,
  community_count integer,   -- prises publiques (0 si < K → counts masqués)
  fishers_count   integer,   -- pêcheurs distincts (0 si < K)
  perso_count     integer,   -- prises du viewer (0 si non-Itinérant / anon / aucune)
  community_norm  integer,   -- 0..100 (composante communauté normalisée)
  perso_norm      integer,   -- 0..100 (composante perso normalisée)
  score           integer,   -- 0..100 (moyenne pondérée des composantes PRÉSENTES)
  quality         text       -- faible|moyenne|bonne|tres_bonne|exceptionnelle
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with params as materialized (
    select
      -- Taille de cellule selon le zoom, PLANCHER 0.01° (~1.1 km) : alignée sur
      -- get_catch_heatmap (040) pour que les grilles coïncident.
      case
        when p_zoom <= 6  then 0.20
        when p_zoom <= 8  then 0.10
        when p_zoom <= 10 then 0.05
        when p_zoom <= 12 then 0.02
        else 0.01
      end as cell_size,
      greatest(coalesce(p_days, 30), 1) as days,
      ST_MakeEnvelope(
        least(min_lng, max_lng), least(min_lat, max_lat),
        greatest(min_lng, max_lng), greatest(min_lat, max_lat), 4326
      )::geography as bbox,
      auth.uid() as viewer,
      -- Perso activé seulement pour l'Itinérant (qualité complète = Itinérant).
      -- CASE (et NON `a and b`) car PostgreSQL ne garantit pas le court-circuit de
      -- AND : current_tier(null) ne doit JAMAIS être appelé pour un anonyme. CASE
      -- évalue ses branches dans l'ordre → current_tier n'est appelé que si uid non
      -- null. current_tier() est SECURITY DEFINER + STABLE ; CTE materialized →
      -- évalué une seule fois (pas par cellule).
      (case
        when auth.uid() is null then false
        else public.current_tier(auth.uid()) = 'itinerant'
      end) as perso_on
  ),
  -- Un seul balayage : prises retenues = publiques (communauté) OU perso du viewer.
  -- On snap geom_public (JAMAIS geom) sur la grille, comme 040. Le tag is_public /
  -- is_perso permet d'agréger les deux composantes en une seule passe (pas de
  -- jointure géométrique fragile).
  pts as (
    select
      ST_SnapToGrid(c.geom_public::geometry, prm.cell_size) as cell,
      c.user_id,
      (c.privacy = 'public')                          as is_public,
      (prm.perso_on and c.user_id = prm.viewer)       as is_perso
    from public.catches c
    cross join params prm
    where c.geom_public is not null
      and c.caught_at > now() - (prm.days || ' days')::interval
      and (p_species   is null or c.species   = p_species)
      and (p_technique is null or c.technique = p_technique)
      and c.geom_public && prm.bbox
      and (c.privacy = 'public'
           or (prm.perso_on and c.user_id = prm.viewer))
  ),
  agg as (
    select
      cell,
      count(*) filter (where is_public)::int                as pub_count,
      count(distinct user_id) filter (where is_public)::int as pub_fishers,
      count(*) filter (where is_perso)::int                 as perso_count
    from pts
    group by cell
  ),
  -- Communauté révélée seulement si K-anon (>=3 prises ET >=3 pêcheurs).
  -- Normalisations + score. Constantes de calibrage (PONDÉRATION — ajustables) :
  --   COMMUNITY_FULL = 8  → 8 prises de l'espèce / 30 j / maille ≈ signal max.
  --   PERSO_FULL     = 4  → 4 de tes prises / maille ≈ signal perso max.
  --   poids 0.6 communauté / 0.4 perso quand les DEUX sont présentes.
  -- Le score = moyenne pondérée des seules composantes PRÉSENTES (aucune invention).
  scored as (
    select
      cell,
      case when pub_count >= 3 and pub_fishers >= 3 then pub_count   else 0 end as community_count,
      case when pub_count >= 3 and pub_fishers >= 3 then pub_fishers else 0 end as fishers_count,
      perso_count,
      least(round(
        (case when pub_count >= 3 and pub_fishers >= 3 then pub_count else 0 end)::numeric
        / 8 * 100), 100)::int as community_norm,
      least(round(perso_count::numeric / 4 * 100), 100)::int as perso_norm
    from agg
    where (pub_count >= 3 and pub_fishers >= 3) or perso_count >= 1
  )
  select
    ST_X(s.cell) as lng,
    ST_Y(s.cell) as lat,
    (select cell_size from params) as cell_size,
    s.community_count,
    s.fishers_count,
    s.perso_count,
    s.community_norm,
    s.perso_norm,
    sc.score,
    case
      when sc.score >= 80 then 'exceptionnelle'
      when sc.score >= 60 then 'tres_bonne'
      when sc.score >= 40 then 'bonne'
      when sc.score >= 20 then 'moyenne'
      else 'faible'
    end as quality
  from scored s
  cross join lateral (
    select (case
      when s.community_count >= 3 and s.perso_count >= 1
        then round(0.6 * s.community_norm + 0.4 * s.perso_norm)
      when s.community_count >= 3 then s.community_norm
      else s.perso_norm
    end)::int as score
  ) sc
  order by sc.score desc, s.community_count desc
  limit 4000;                                         -- garde-fou volume
$$;

comment on function public.get_quality_cells is
  'Couche « Qualité » par espèce (Carte v2 / C3b). Score 0-100 DÉCOMPOSABLE par cellule de grille (plancher ~1.1 km) : communauté (prises publiques k-anon K=3 sur geom_public, JAMAIS geom) + perso (carnet du viewer via auth.uid(), Itinérant uniquement). La composante donnée/fond (C3a, EMODnet) est récupérée à la demande au clic (popup), pas dans ce score SQL. Cellule visible si communauté>=K OU perso>=1 (viewer-own). SECURITY DEFINER, search_path=public,pg_temp. Honnêteté 7.5 : aucune composante simulée.';

grant execute on function public.get_quality_cells(
  double precision, double precision, double precision, double precision,
  integer, text, text, integer
) to anon, authenticated;

-- Pas de nouvel index : la composante communauté réutilise catches_public_heat_idx
-- (GiST partiel sur geom_public WHERE privacy='public', créé en 040) ; la composante
-- perso filtre par user_id sur une table de petite taille (advisor : ne pas ajouter
-- d'index non sollicité).
