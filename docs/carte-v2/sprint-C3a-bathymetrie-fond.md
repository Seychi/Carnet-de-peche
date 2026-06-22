# Sprint Carte-v2 / C3a — Brief d'exécution
## Couche PROFONDEUR + NATURE DU FOND (data GIS) — parité table-stakes

> Rédigé le 2026-06-22. Épique **Carte v2 — AVANT la beta** (cf `docs/excellence/CARTE-V2.md`, pilier 2 ; décision John 2026-06-22) — **chemin critique** (le plus long). Durée : **2-3 semaines** (c'est le **poste le plus cher** de l'épique : ingénierie données géo, pas du front).
> **C'est de la PARITÉ avec spot-de-peche, pas un avantage.** On la fait après C1 (la carte vivante = le vrai différenciateur). La « qualité » colorée vivante vient juste après, en C3b.

**Préalable (manuel John)** :
1. ⚠️ **Compétence GIS** : ce sprint peut justifier une **mission spécialisée** (traitement raster SHOM/EMODnet, tuilage). À arbitrer.
2. Décider l'hébergement des tuiles (CDN statique vs tile-server) — impact coût récurrent.
3. Tier : couche avancée = **Itinérant** (cf. tarifs).

---

## 🚀 Ligne de lancement
> ultracode — effort xhigh. Exécute `docs/carte-v2/sprint-C3a-bathymetrie-fond.md`. **Connecté** : **docs-researcher** pour GDAL / MapLibre raster & vector / Martin / format des données SHOM & EMODnet ; **supabase-guard** si stockage en PostGIS ; **qa-chrome** pour le rendu + le popup. `/verif-sprint` + deploy-watch. Ne push pas. **Docker recommandé ici** (`supabase start` + conteneur GDAL pour reproduire le pipeline). **Effort max, esprit critique.** Garde-fous : **licence des données** (attribution SHOM/EMODnet), perf (couche lourde → lazy + limites de zoom), tier Itinérant.

## ⚙️ Environnement & posture (exigence John)
Docker **utile ici** (pipeline GDAL reproductible). Effort max + esprit critique : valide les formats/licences réels des données, mesure le poids des tuiles, `⚠️ DEMANDER À JOHN` plutôt qu'inventer.

---

## Objectif du sprint en une phrase
La carte affiche une couche activable **profondeur + nature du fond** (grille colorée façon spot-de-peche) et, au clic, un popup **« Fond : Vase · Profondeur : 5.5 m »**.

## Workstreams & dépendances
| WS | Bloc | Durée | Dépend de | Parallèle J1 |
|----|------|-------|-----------|--------------|
| A | Acquisition + licences données (bathy + substrat) | 2 j | — | ✅ |
| B | Pipeline GDAL → tuiles (raster et/ou vecteur) | 4-5 j | A | ❌ |
| C | Hébergement tuiles + sources MapLibre + toggle opacité | 2 j | B | ❌ |
| D | Popup « Fond / Profondeur » au clic | 2 j | C | ❌ |
| E | Gating Itinérant + perf (lazy, zoom) | 1 j | C, D | ❌ |
| VERIF | perf + licences + `/verif-sprint` | 1 j | tous | ❌ (dernier) |

---

## Bloc A — Données (profondeur + substrat)
### Tâches
1. **Profondeur** : récupérer **SHOM** (MNT bathymétriques / **Litto3D** côtier HR) + **EMODnet Bathymetry** (~115 m) + **GEBCO** (fallback large). Open data — vérifier termes + attribution.
2. **Nature du fond** : **SHOM sédimentologie** + **EMODnet Seabed Habitats (EUSeaMap substrate)** → classes vase/sable/gravier/roche.
3. Documenter sources + licences dans `docs/carte-v2/data-sources.md` (attribution obligatoire).

### Garde-fous
- ⚠️ Vérifier la **licence réelle** de chaque jeu (attribution SHOM/EMODnet) ; ne PAS embarquer de donnée sous convention restrictive. `⚠️ DEMANDER À JOHN` si une licence est ambiguë.

## Bloc B — Pipeline GDAL → tuiles
### Tâches
1. **Choisir l'approche** (docs-researcher) :
   - **Raster** : GDAL color-relief de la bathy + classification substrat → MBTiles raster (look « grille colorée », léger à servir, peu interactif).
   - **Vecteur** : substrat polygonal + grille profondeur → MVT via **Martin/pg_tileserv** (cliquable, popup natif, plus lourd).
   - Recommandé : **raster pour la couche visuelle** + **lookup serveur** pour le popup (Bloc D). À trancher selon perf/coût.
2. Pipeline reproductible (script + Docker GDAL), par façade pour limiter le volume.

### Critères d'acceptation
- Tuiles générées pour au moins une façade pilote (ex. Bretagne), rendu cohérent avec la réalité (zones profondes/peu profondes correctes).

## Bloc C — Hébergement + MapLibre
### Tâches
1. Héberger les tuiles (CDN statique / R2 / Vercel, ou tile-server). Mesurer le coût récurrent.
2. Source raster/vector dans `MapView` + **toggle d'opacité** (le composant `Bathy` de la DA devient la vraie couche).
3. Limites de zoom (la bathy fine n'a de sens qu'en zoom rapproché).

### Critères d'acceptation
- La couche s'active/désactive, opacité réglable, n'alourdit pas le 1er load (lazy).

## Bloc D — Popup « Fond / Profondeur »
### Tâches
1. Au clic sur la carte (ou sur un spot) : lookup de la **profondeur** + **nature du fond** au point → popup « Fond : Vase · Profondeur : 5.5 m » (cf. capture spot-de-peche). Lookup = échantillonnage raster serveur (RPC) ou feature vectorielle.
2. Réutiliser/étendre `lib/conditions/bathymetry.ts` (qui fait déjà 1 valeur EMODnet) pour servir ce lookup proprement.

### Critères d'acceptation
- Cliquer un point en mer renvoie une profondeur plausible + un type de fond (ou « donnée indisponible » honnête hors couverture).

## Bloc E — Tier + perf
### Tâches
1. Gating **Itinérant** (aperçu pour donner envie). Via `current_tier`.
2. Perf : la couche reste lazy + limitée en zoom ; ne JAMAIS retomber dans le « 8 s de chargement » (cf. Sprint 16).

## Workstream VERIF
1. `/verif-sprint` + qa-chrome (rendu + popup + device réel).
2. Passe licences : attribution SHOM/EMODnet/OSM visible.
3. Passe perf : poids tuiles, lazy, pas de régression carte.
4. `docs/carte-v2/RECAP-C3a.md` + `data-sources.md`.

## Reste manuel John
- Arbitrage mission GIS, hébergement tuiles (coût), couverture façades à prioriser, application/déploiement.
