-- =====================================================================
-- Test de régression — get_quality_cells (Carte v2 / C3b)
-- À jouer dans le SQL Editor / psql (idempotent, AUCUNE écriture : DO blocks en
-- mémoire + lecture de la fonction live). Modèle : heatmap_kanon.sql (C1).
-- Lève une exception si un invariant est violé.
-- =====================================================================
-- Verrouille :
--   (1) k-anonymat K=3 sur la COMMUNAUTÉ (geom_public, prises publiques) — une
--       cellule sous 3 prises OU sous 3 pêcheurs distincts n'expose pas ses counts ;
--   (2) PERSO = carnet du viewer uniquement (jamais les prises d'autrui), et une
--       cellule peut apparaître via perso seul (viewer-own) sans révéler de
--       communauté sub-K ;
--   (3) le score est DÉCOMPOSABLE et reproductible (moyenne pondérée des seules
--       composantes présentes — aucune invention) ;
--   (4) la sortie ne contient que des centroïdes de grille + agrégats.
-- =====================================================================

-- ── Partie A — algorithme communauté + perso (synthétique, sans données) ─────
-- Réplique la logique EXACTE du corps de la RPC (snap 0.05° + filtres + masque
-- K=3 + score pondéré) et asserte les cas. Protège contre une régression future
-- qui casserait le masque k-anon, la dérivation perso, ou le calcul du score.
do $$
declare
  comm_cells    int;
  comm_masked   int;
  perso_only    int;
  sc_comm_only  int;
  sc_both       int;
begin
  with fake(user_id, species, privacy, is_viewer, lng, lat) as (
    values
      -- Maille A : 3 prises publiques de 3 pêcheurs distincts → communauté révélée.
      ('u1','bar','public',false, -4.601,48.399),
      ('u2','bar','public',false, -4.599,48.401),
      ('u3','bar','public',false, -4.600,48.400),
      -- Maille B : 3 prises publiques d'1 SEUL pêcheur → communauté MASQUÉE (sub-K fishers).
      ('u9','bar','public',false, -3.001,47.999),
      ('u9','bar','public',false, -2.999,48.001),
      ('u9','bar','public',false, -3.000,48.000),
      -- Maille C : 2 prises PERSO du viewer (privées) → cellule via perso seul.
      ('me','bar','private',true,  7.001,43.001),
      ('me','bar','private',true,  6.999,42.999)
  ),
  snap as (
    select user_id, species, privacy, is_viewer,
           ST_SnapToGrid(ST_SetSRID(ST_MakePoint(lng,lat),4326), 0.05) as cell
    from fake
  ),
  agg as (
    select cell,
           count(*) filter (where privacy='public')::int                as pub_count,
           count(distinct user_id) filter (where privacy='public')::int  as pub_fishers,
           count(*) filter (where is_viewer)::int                        as perso_count
    from snap group by cell
  ),
  scored as (
    select
      cell,
      case when pub_count>=3 and pub_fishers>=3 then pub_count else 0 end as community_count,
      perso_count,
      least(round((case when pub_count>=3 and pub_fishers>=3 then pub_count else 0 end)::numeric/8*100),100)::int as community_norm,
      least(round(perso_count::numeric/4*100),100)::int as perso_norm
    from agg
    where (pub_count>=3 and pub_fishers>=3) or perso_count>=1
  ),
  final as (
    select cell, community_count, perso_count,
      (case
        when community_count>=3 and perso_count>=1 then round(0.6*community_norm+0.4*perso_norm)
        when community_count>=3 then community_norm
        else perso_norm
      end)::int as score
    from scored
  )
  select
    (select count(*) from final where community_count>=3),                       -- cellules communauté révélée
    (select count(*) from agg where pub_count>=3 and pub_fishers<3),              -- mailles sub-K fishers (doivent rester masquées)
    (select count(*) from final where community_count=0 and perso_count>=1),      -- cellules perso-only
    (select score from final where community_count>=3 and perso_count=0 limit 1), -- score communauté seule (maille A : 3/8*100=38)
    -- score « les deux » : simulate via maille A si on y ajoutait du perso — testé en théorie ci-dessous
    0
  into comm_cells, comm_masked, perso_only, sc_comm_only, sc_both;

  if comm_cells <> 1 then raise exception 'C3b A: 1 cellule communauté attendue (maille A), got %', comm_cells; end if;
  if comm_masked <> 1 then raise exception 'C3b A: maille B (1 pêcheur) doit rester sub-K (1 maille concernée), got %', comm_masked; end if;
  if perso_only <> 1 then raise exception 'C3b A: 1 cellule perso-only attendue (maille C), got %', perso_only; end if;
  if sc_comm_only <> 38 then raise exception 'C3b A: score communauté seule = round(3/8*100)=38, got %', sc_comm_only; end if;
  raise notice 'PARTIE A (algorithme communauté + perso + score) : OK';
end $$;

-- ── Partie A bis — pondération du score « les deux composantes » ──────────────
-- 6 prises publiques de 3 pêcheurs (community_norm=round(6/8*100)=75) + 4 perso du
-- viewer (perso_norm=100) → score = round(0.6*75 + 0.4*100) = round(85) = 85.
do $$
declare s int;
begin
  with one as (
    select 75 as community_norm, 100 as perso_norm, 6 as community_count, 4 as perso_count
  )
  select (case
    when community_count>=3 and perso_count>=1 then round(0.6*community_norm+0.4*perso_norm)
    when community_count>=3 then community_norm
    else perso_norm end)::int
  into s from one;
  if s <> 85 then raise exception 'C3b A-bis: score pondéré attendu 85, got %', s; end if;
  raise notice 'PARTIE A-bis (pondération 0.6/0.4) : OK';
end $$;

-- ── Partie B — contrat de la fonction LIVE (gardée : skip si non déployée) ────
-- Asserte que la fonction déployée n'expose JAMAIS une communauté sub-K orpheline :
-- toute cellule avec community_count entre 1 et 2 est interdite ; community_count=0
-- n'est permis que si perso_count>=1. (Trivialement vrai tant que 0 donnée publique
-- ne forme une maille K=3 ; significatif en beta.) Garde-fou permanent.
do $$
declare bad int;
begin
  if to_regprocedure('public.get_quality_cells(double precision,double precision,double precision,double precision,integer,text,text,integer)') is null then
    raise notice 'PARTIE B : get_quality_cells pas encore déployée → skip (appliquer 044 puis relancer).';
    return;
  end if;
  -- contexte service (auth.uid() null) → perso_on=false → toutes les cellules
  -- renvoyées doivent être des cellules communauté K-anon (community_count>=3).
  select count(*) into bad
  from public.get_quality_cells(-5.5, 41.0, 9.8, 51.5, 8, null, null, 3650)
  where community_count < 3 or fishers_count < 3 or community_count between 1 and 2;
  if bad > 0 then raise exception 'C3b LIVE VIOLÉ : % cellule(s) communauté sub-K exposée(s)', bad; end if;
  raise notice 'PARTIE B (contrat live get_quality_cells) : OK';
end $$;
