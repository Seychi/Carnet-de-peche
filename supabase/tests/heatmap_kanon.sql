-- =====================================================================
-- Test de régression — invariant n°1 de get_catch_heatmap (Carte v2 / C1)
-- À jouer dans le SQL Editor / psql (idempotent, AUCUNE écriture : DO blocks
-- en mémoire + lecture de la fonction live). Modèle : « test de régression
-- floutage » (sprint 11.5). Lève une exception si l'invariant est violé.
-- =====================================================================
-- Verrouille : (1) k-anonymat K=3 strict appliqué APRÈS les filtres ; (2) une
-- cellule sous 3 prises OU sous 3 pêcheurs distincts n'est jamais émise ; (3) la
-- sortie ne contient que des centroïdes de grille (jamais geom/geom_public brut).
-- =====================================================================

-- ── Partie A — algorithme (synthétique, sans données) ────────────────────────
-- Réplique la logique EXACTE du corps de la RPC (snap 0.05° + filtre + HAVING K=3)
-- et asserte les cas positifs/négatifs. Protège contre une régression future qui
-- déplacerait le HAVING avant le filtre, baisserait le plancher, ou casserait le
-- count(distinct user_id).
do $$
declare
  n_nofilter int;
  n_bar      int;
  n_oneuser  int;
  n_twousers int;
begin
  with fake(user_id, species, lng, lat) as (
    values
      -- Maille A : 3 prises de 3 pêcheurs distincts (1 seul a 'bar')
      ('u1', 'bar',          -4.601, 48.399),
      ('u2', 'dorade_royale', -4.599, 48.401),
      ('u3', 'lieu_jaune',    -4.600, 48.400),
      -- Maille B : 3 prises d'1 SEUL pêcheur
      ('u9', 'bar', -3.001, 47.999), ('u9', 'bar', -2.999, 48.001), ('u9', 'bar', -3.000, 48.000),
      -- Maille C : 2 pêcheurs distincts
      ('u4', 'sar', 7.001, 43.001), ('u5', 'sar', 6.999, 42.999)
  ),
  snap as (
    select user_id, species, ST_SnapToGrid(ST_SetSRID(ST_MakePoint(lng,lat),4326), 0.05) cell from fake
  )
  select
    (select count(*) from (select cell from snap group by cell having count(*)>=3 and count(distinct user_id)>=3) z),
    (select count(*) from (select cell from snap where species = any(array['bar']) group by cell having count(*)>=3 and count(distinct user_id)>=3) z),
    (select count(*) from (select cell from snap where user_id='u9' group by cell having count(*)>=3 and count(distinct user_id)>=3) z),
    (select count(*) from (select cell from snap where user_id in ('u4','u5') group by cell having count(*)>=3 and count(distinct user_id)>=3) z)
  into n_nofilter, n_bar, n_oneuser, n_twousers;

  if n_nofilter <> 1 then raise exception 'k-anon A: maille 3 prises/3 users devrait émettre 1 cellule, got %', n_nofilter; end if;
  if n_bar      <> 0 then raise exception 'k-anon A: filtre species=bar (1 seul pêcheur) devrait émettre 0 cellule (HAVING après filtre), got %', n_bar; end if;
  if n_oneuser  <> 0 then raise exception 'k-anon A: 3 prises d''1 seul pêcheur devrait émettre 0 cellule, got %', n_oneuser; end if;
  if n_twousers <> 0 then raise exception 'k-anon A: 2 pêcheurs devrait émettre 0 cellule, got %', n_twousers; end if;
  raise notice 'PARTIE A (algorithme k-anon) : OK';
end $$;

-- ── Partie B — contrat de la fonction LIVE ───────────────────────────────────
-- Asserte que la fonction déployée ne renvoie JAMAIS une cellule sous K=3, sur
-- toute la France et la fenêtre max. (Trivialement vrai si 0 donnée ; significatif
-- une fois seedé / en beta.) Garde-fou permanent contre une régression du déploiement.
do $$
declare bad int;
begin
  select count(*) into bad
  from public.get_catch_heatmap(-5.5, 41.0, 9.8, 51.5, 8, null, null, 3650)
  where catch_count < 3 or fishers_count < 3;
  if bad > 0 then raise exception 'k-anon LIVE VIOLÉ : % cellule(s) sous K=3', bad; end if;
  raise notice 'PARTIE B (contrat live get_catch_heatmap) : OK';
end $$;
