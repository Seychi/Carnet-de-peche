# RECAP — Sprint Carte-v2 / C3b « Qualité vivante »

> Exécuté le 2026-06-23 (ultracode / effort xhigh). Branche `carte-v2-c3b` (partie de `main` après C1+C2+C3a). **Non commité, non poussé, non déployé** (feu vert John requis, §13). Brief : `docs/carte-v2/sprint-C3b-qualite-vivante.md`.

## En une phrase
La carte a une couche **« Qualité »** colorée **par espèce**, calculée à partir de la **communauté** (prises publiques k-anon) **+ ton carnet** (perso, Itinérant), et le **popup explique la note** — décomposée en 3 lignes sourcées. C'est l'inverse de la « Qualité : Excellent » figée et opaque des concurrents.

## Précondition (vérifiée AVANT de démarrer)
- **C1 + C3a sur `main`** : confirmé. `main` HEAD = `e4c14e6` = tip C3a qui a mergé `origin/main` (C1+C2). Artefacts présents : `get_catch_heatmap` (040/041/042, k-anon K=3), `bathymetry.ts` + `/api/seabed` (C3a, API-only). supabase-guard a confirmé en prod : 040-043 effectifs, `get_catch_heatmap` live, `spots`/`catches` sans colonne profondeur/substrat (C3a bien API-only).

## Décision produit (DEMANDÉE À JOHN — garde-fou n°1)
L'inspection a révélé que **`spot_scores` est un score GLOBAL par spot (aucune colonne `user_id`)** — pas un score perso (le multiplicateur perso avait été *neutralisé au sprint 7.5*). Le brief définit la composante perso comme « **TES** meilleures conditions ». Relabéliser un score global en « perso » aurait violé l'honnêteté 7.5. → **John a tranché : Perso = dérivé de TON carnet** (les prises du pêcheur courant), omis si pas d'historique.

## Honnêteté du score (garde-fou n°1 — le cœur du sprint)
Le score 0-100 est **décomposable** en 3 composantes RÉELLES, chacune sourcée, chacune omise (jamais simulée) si absente :

| Composante | Source | Où | Gating |
|---|---|---|---|
| **Communauté** | prises **publiques** de l'espèce, **k-anon K=3** sur `geom_public` (JAMAIS `geom`) — réutilise la logique de `get_catch_heatmap` (040) | colore la grille (SQL) | tous (aperçu) |
| **Perso** | **ton carnet** : tes prises de l'espèce dans la cellule, via `auth.uid()` (jamais un uid client) | bump grille + popup | **Itinérant** (RPC) |
| **Donnée / fond** | profondeur + substrat EMODnet (C3a) ↔ habitat de l'espèce | **récupérée au clic** (popup), pas dans le score SQL (C3a est API-only, pas calculable grille-large) | **Itinérant** (`/api/seabed` 403 sinon) |

- **Score grille** = moyenne pondérée des **seules composantes présentes** (`0.6·communauté + 0.4·perso` si les deux ; sinon la seule présente). Pondération + constantes (`COMMUNITY_FULL=8`, `PERSO_FULL=4`) **documentées dans la migration**, à arbitrer par John.
- **Popup** = la note PUIS le pourquoi (3 lignes). Composante manquante = mention honnête (« pas encore assez de prises partagées », « fond inconnu ici »), jamais un chiffre inventé.

## Ce qui a été produit
**Bloc A — RPC (migration `044_quality_cells.sql`)**
- `get_quality_cells(bbox, p_zoom, p_species, p_technique, p_days)` → par cellule de grille : `{ community_count, fishers_count, perso_count, community_norm, perso_norm, score, quality }`.
- `SECURITY DEFINER` + `SET search_path = public, pg_temp`. Grille alignée sur 040 (plancher 0.01° ≈ 1,1 km). Perso gardé Itinérant via `CASE … current_tier(auth.uid())` (CASE et non `AND` → `current_tier(null)` jamais appelé pour un anon).
- **Invariant grille** : une cellule n'apparaît que si **communauté ≥ K** OU **perso ≥ 1** (viewer-own). Communauté sub-K → counts masqués (0). Aucune donnée sub-K d'autrui n'est exposée.
- Test SQL : `supabase/tests/quality_cells_kanon.sql` (k-anon + perso-only + pondération + contrat live gardé).

**Bloc A bis — `lib/conditions/species-habitat.ts`** : règle d'habitat éditoriale **indicative** (substrat + profondeur par espèce, 6 cœur + additionnelles), `substrateCategory()` (EMODnet → catégorie), `assessSuitability()` (favorable/moyen/peu/pélagique/inconnu — honnête : pleine eau = « fond peu déterminant », hors couverture = « inconnu »).

**Bloc B — `lib/map/quality.ts` + `lib/map/useQualityLayer.ts`** : carrés GeoJSON (props **scalaires** — MapLibre stringifie les objets), couleur cividis **colorblind-safe** (palette partagée `QUALITY_MARKER_COLORS`) + opacité croissante + **chiffre du score en label** (2e/3e canal daltonien), fetch RPC debouncé (300 ms, `minzoom 7`, limite 4000), refetch realtime (`version`).

**Bloc C — popup décomposé** (dans `quality.ts`) : en-tête (pastille + libellé + score font-mono) + Communauté (k-anon) + Fond (Itinérant, lookup `/api/seabed` à la demande + verdict habitat ; sinon verrou + upsell) + Perso (Itinérant, si >0) + lien fiche spot curé + bandeau « aucune donnée simulée ».

**Bloc D — sélecteur + tier** : entrée **Qualité** dans `MapLayerSelector` (toggle tous tiers = aperçu, sélecteur d'espèce dédié, légende, état vide honnête, note upsell Itinérant) ; orchestration dans `MapShell` (état + `useQualityLayer`). Toutes les couches indépendantes.

**Garde anti-double-popup** : `useBathyLayer` (C3a) étendu pour céder le clic sur une cellule qualité (un Itinérant avec Fond marin + Qualité actifs → 1 seul popup, le plus riche).

## Vérification (`/verif-sprint`)
- **`pnpm test`** : **386 verts** (35 fichiers ; +20 nouveaux : `quality.test.ts`, `species-habitat.test.ts`).
- **`pnpm typecheck`** : ✅ clean.
- **`pnpm lint`** (full) : ✅ « No ESLint warnings or errors ».
- **`pnpm build`** (Node 24) : ✅ (manifeste complet, `/carte` compilée).
- **Validation SQL read-only en prod** : le corps de la RPC tourne (syntaxe PG valide — les erreurs IDE étaient un parser T-SQL) ; sur les 5 prises publiques réelles, **0 cellule communauté ≥ K=3** (gate correct). Assertions algo (k-anon, perso-only, pondération) : vertes.
- **Revue croisée indépendante** (agent fresh-context, adversarial) : **GO**, 0 bug bloquant. Confirme honnêteté (aucune composante simulée), k-anon préservé, perso non-fuyant (auth.uid only), gating double défense, anti-double-popup, props scalaires.

## ⚠️ Reste manuel John (avant merge/déploiement)
1. **Appliquer la migration 044 en prod** (fichier numéroté + CLI/SQL Editor) — **NON appliquée** : le classifieur a (correctement) bloqué l'apply MCP en prod (§20.4). Puis régénérer `lib/types.ts` (l'entrée `get_quality_cells` y est déjà ajoutée à la main, identique au générateur) et relancer `get_advisors`. Penser au `migration repair` (dérive d'historique connue ≤ 043).
2. **Arbitrer la pondération** : poids `0.6/0.4` + `COMMUNITY_FULL=8`/`PERSO_FULL=4`, et la **fenêtre temporelle du perso** (aujourd'hui = `p_days`, 30 j ; pour le « moat carnet » tu voudras peut-être plus long/illimité). Tout est centralisé et commenté dans `044`.
3. **QA réelle (qa-chrome) — différée au déploiement** : non réalisable ce sprint (la RPC n'est pas en prod et le code n'est pas déployé). Après ton déploiement, vérifier : toggle Qualité, changement d'espèce → la carte change, popup décomposé (Itinérant : fond + perso ; gratuit : verrou + upsell), pas de double-popup avec Fond marin, perf multi-couches. Pour voir des cellules : seeder via `/dev/seed-heatmap` (les prises publiques alimentent aussi la qualité) ou en beta.
4. **Décision tier** : confirmée par le brief (complète = Itinérant, aperçu pour les autres) — implémentée ainsi.

## Fin de l'épique Carte v2
Après C1+C2+C3a+C3b : carte **vivante** (réagit aux prises) + **profonde** (bathy/fond) + **plus intelligente** (qualité décomposée, par espèce, communautaire + perso) sur 1000+ spots multi-sources. Leur carte figée, à côté, paraît plate.
