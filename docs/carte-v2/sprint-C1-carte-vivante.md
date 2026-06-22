# Sprint Carte-v2 / C1 — Brief d'exécution
## La carte VIVANTE (réagit à chaque prise) — le moat

> Rédigé le 2026-06-22. **Épique Carte v2 — AVANT la beta** (cf `docs/excellence/CARTE-V2.md`, pilier 1 ; décision John 2026-06-22, sprints 16/17 + correctifs faits). Durée : 1,5-2 semaines. **C1 + C2 en parallèle = les premiers de l'épique.**
> **Pourquoi en premier** : c'est la couche que spot-de-peche **ne peut pas copier** (leur heatmap est statique/générique). Coût modéré (la donnée = nos prises, on la génère déjà).
> ⚠️ **Exigence clé (John)** : se construit **maintenant** mais doit **fonctionner à la seconde où la 1ʳᵉ prise publique est loguée** en beta. On la livre **seedée** (spots curés + prises de test) + fallback « peu de prises pour l'instant » ; elle **prend vie pendant la beta**. → **qualité production, pas démo.**

**Préalable (manuel John)** :
1. Sprints 16 (perf) + 17 (cohérence) + correctifs = **faits** (✅ John 2026-06-22). Créer **quelques prises de test publiques** pour valider l'activation de la couche.
2. **Décision tier** (Bloc E) : la heatmap communautaire est-elle **gratuite (teaser)** ou réservée payant ? Le score perso reste payant (Local/Itinérant). `⚠️ DEMANDER À JOHN AVANT` de gater.
3. Prochain numéro de migration libre confirmé.

---

## 🚀 Ligne de lancement (à copier-coller par John)

> ultracode — effort xhigh. Exécute `docs/carte-v2/sprint-C1-carte-vivante.md`. **Connecté (CLAUDE.md §20)** : **supabase-guard** (RO) lit d'abord le schéma `catches`/`catches_for_viewer` + les RLS de floutage AVANT toute RPC ; **docs-researcher** verrouille l'API MapLibre (heatmap / sources GeoJSON ou MVT) ; **qa-chrome** vérifie le rendu carte + l'absence de fuite GPS. Termine par `/verif-sprint` + qa-chrome + deploy-watch. Ne push pas. Docker optionnel. **Effort max, très attentif et critique.** Invariant n°1 : **JAMAIS `geom` précis dans une couche carte — uniquement `geom_public` (flou 1 km) + k-anonymat**. Pas de régression gating/floutage.

## ⚙️ Environnement & posture (exigence John)
Docker optionnel. Effort max + esprit critique : vérifie le vrai code, passe adversariale (fuite GPS, désanonymisation, perf, gating), `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase
La carte montre **où ça mord** (heatmap des prises publiques floutées), se met à jour **en temps réel** à chaque nouvelle prise, avec un overlay activable « ton score », **sans jamais exposer une position précise**.

## Workstreams & dépendances

| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Migration : agrégation prises + RPC heatmap (k-anonymat) | 2 j | numéro migration | ✅ |
| B | Couche heatmap MapLibre + filtres espèce/technique/fenêtre | 2-3 j | A | ❌ |
| C | Realtime : rafraîchir à chaque prise publique | 1 j | A, B | ❌ |
| D | Overlay « ton score » + signal social visuel | 1,5 j | A | ⚠️ |
| E | Sélecteur de couches + gating tier | 1 j | B, D | ❌ |
| VERIF | anti-fuite GPS + perf + `/verif-sprint` | 1 j | tous | ❌ (dernier) |

---

## Bloc A — Migration : agrégation + RPC heatmap (sécurité d'abord)
**Garde-fou central** : on agrège des prises **publiques** sur `geom_public` (déjà flouté 1 km), jamais `geom`. Et on impose un **seuil k-anonymat** : une cellule ne s'affiche que si elle contient **≥ K prises de ≥ K pêcheurs distincts** (proposer K=3, à valider) — sinon une cellule à 1 prise = on déduit le spot d'un user. C'est la règle anti-désanonymisation.

### Tâches
1. Migration `0NN_catch_heatmap.sql` : RPC `get_catch_heatmap(bbox, zoom, species[]?, technique[]?, days int default 30)` → agrège `catches` **publiques** par cellule (ST_SnapToGrid adapté au zoom, ou H3 si l'extension dispo) sur `geom_public`, renvoie `{cell_geom, count}` **uniquement** pour `count >= K` ET `distinct user_id >= K`. `security definer` minimal + `search_path` fixé.
2. Index spatial/temporel sur `catches(privacy, caught_at)` + `geom_public`.
3. Régénérer `lib/types.ts`.

### Critères d'acceptation
- La RPC ne renvoie **aucune** cellule sous le seuil K (vérifier en SQL avec un jeu où 1 user a 1 prise isolée → 0 cellule).
- Aucune coordonnée précise (`geom`) ne sort de la RPC.
- Filtrable par espèce/technique/fenêtre temps.

### Garde-fous
- ⚠️ `geom_public` only. K-anonymat strict. `⚠️ DEMANDER À JOHN` sur la valeur de K.

## Bloc B — Couche heatmap MapLibre + filtres
### Tâches
1. Source de la heatmap dans `MapView` (GeoJSON depuis la RPC selon bbox/zoom, ou MVT). **Agrégation serveur** — ne PAS charger les points bruts.
2. Couche `heatmap` MapLibre (intensité = count) + légende « zones chaudes (X derniers jours) ».
3. Filtres UI (espèce / technique / fenêtre 7-30 j) câblés à la RPC (`MapFilters`).
4. Perf : recharger à la fin du pan/zoom (debounce), simplifier la grille au dézoom.

### Critères d'acceptation
- En zoomant sur une zone active, la heatmap apparaît < 1 s après l'arrêt du pan.
- Changer le filtre espèce met à jour la heatmap.
- Pas de jank (cf. Sprint 16) : la couche reste lazy.

## Bloc C — Realtime
### Tâches
1. Sur INSERT d'une prise **publique** (Supabase Realtime, déjà branché pour le fil) → invalider/rafraîchir la couche heatmap de la bbox courante (agrégé, debounce — ne pas re-fetch à chaque prise individuelle).
2. Micro-feedback : pastille « +1 prise » discrète sur la zone si visible.

### Critères d'acceptation
- Loguer une prise publique (2ᵉ onglet) → la zone se met à jour sur la carte ouverte, sans reload.

## Bloc D — Overlay « ton score » + signal social
### Tâches
1. Couche activable « ton score » : réutiliser `spot_scores` + le scoring perso (sprint 7/15) → coloration des zones/markers selon **les patterns du viewer**. **Reste descriptif/honnête** (cf. décision sprint 7.5 : pas de multiplicateur fabriqué).
2. Signal social visuel : `get_spot_activity` (migration 018) → pastilles « N prises aujourd'hui » sur les spots.

### Critères d'acceptation
- L'overlay « ton score » se distingue de la heatmap communautaire (2 couches différentes).
- Sans historique suffisant → message « logue plus pour débloquer ton score » (pas de score inventé).

## Bloc E — Sélecteur de couches + tier
### Tâches
1. UI sélecteur de couches dans `MapView` (Spots / Heatmap communautaire / Ton score / [Bathy plus tard]).
2. **Gating** selon la décision John : heatmap communautaire = teaser gratuit OU payant ; « ton score » = payant (Local/Itinérant). Réutiliser la RPC `current_tier`.

### Critères d'acceptation
- Un compte gratuit voit ce qui est décidé gratuit, et un upsell propre sur le reste.
- Aucune fuite : le gating passe par `current_tier`, pas par le client.

## Workstream VERIF (obligatoire, agent indépendant)
1. `/verif-sprint` (tests + build + types + lint + revue).
2. **Passe anti-fuite GPS** (la plus importante) : prouver qu'aucune couche n'expose `geom` précis ; tester le k-anonymat (cellule sous seuil = invisible) ; un compte gratuit ne voit pas le payant.
3. Perf carte (qa-chrome, device réel) : heatmap + filtres restent fluides, pas de retour aux 8 s.
4. **Test « 1ʳᵉ prise » (exigence John)** : sur preview/prod, loguer une vraie prise publique → la couche vivante réagit en quelques secondes. Prouve qu'elle est **prête pour la beta**, pas une démo vide.
5. `docs/carte-v2/RECAP-C1.md`.

## Reste manuel John
- Valeur de K (k-anonymat), décision tier, application migration + régénération types, QA avec de vraies prises beta.
