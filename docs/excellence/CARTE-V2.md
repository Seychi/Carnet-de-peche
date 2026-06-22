# 🗺️ Carte v2 — Vision & architecture (carte vivante + profondeur/fond + 1000 spots)

> Créé le 2026-06-22 (demande John, après comparaison avec spot-de-peche.com). **Décision John 2026-06-22 : Carte v2 construite AVANT la beta** (sprints 16 + 17 + correctifs post-audit = faits). **Exigence n°1** : tout en **qualité production** pour que la carte vivante **marche dès la 1ʳᵉ prise loguée**, pas une démo. État actuel : `MapView` n'a que le cercle de flou + markers/clusters ; `spot_scores` recalculé chaque jour ; `get_spot_activity` (« X prises ici ») ; `lib/conditions/bathymetry.ts` = **une** valeur de profondeur EMODnet par spot.

## L'angle stratégique (à ne pas rater)

La carte de spot-de-peche est **belle mais MORTE** : sa grille colorée (bathymétrie + nature du fond + « qualité ») est **statique et identique pour tous** — de la donnée océanographique publique habillée. **On ne gagne pas en la recopiant**, on gagne en empilant **la couche qu'ils ne peuvent pas avoir** :

> **Leur carte = de la donnée. Notre carte = de la donnée + la communauté + TOI.**

Donc on construit **trois couches distinctes et activables**, par ordre de différenciation :
1. 🟢 **Couche VIVANTE** (catches communautaires + score perso) — *notre moat, pas chère, personne ne l'a*.
2. 🟡 **Couche DONNÉE** (profondeur + nature du fond) — *parité « table stakes » avec eux, chère (data GIS)*.
3. 🔵 **Spots à 1000+** — *changement de modèle : curation → communauté + import*.

---

## Pilier 1 — La carte VIVANTE (réagit à chaque prise) 🟢 *priorité, c'est le moat*

**Idée** : la carte n'affiche pas que des épingles curées, elle montre **où ça mord en ce moment**, alimentée par les prises loguées (publiques, **floutées à 1 km**), et se met à jour **en temps réel**.

- **Heatmap de prises** : agrège les `catches` publiques (via `geom_public`, jamais `geom`) en une **heatmap MapLibre** (ou grille H3/hex). « Zones chaudes » des 7/30 derniers jours, filtrable par espèce/technique. Le flou 1 km est ici un **atout** : on montre des zones, pas le caillou secret — ça respecte la confidentialité ET ça crée l'effet « ça bouge ».
- **Temps réel** : à chaque prise publique loguée → Supabase Realtime → la zone se met à jour (le produit a déjà du Realtime sur le fil, à étendre à la carte). À l'échelle : **agréger côté serveur** (RPC qui renvoie la grille agrégée), ne PAS pousser chaque point brut à chaque client.
- **Couche « ton score »** : par-dessus, l'overlay perso déjà amorcé (`spot_scores` + scoring sprint 7/15) — coloration des zones selon **TES** patterns (« tu pêches mieux ici en marée descendante »). C'est la « qualité » de spot-de-peche, mais **personnalisée et démontrable**.
- **Signal social** existant (`get_spot_activity`) → le rendre **visuel** sur la carte (pastille « 3 prises aujourd'hui »).

**Pourquoi ça gagne** : ça transforme le carnet (notre moat) en spectacle de carte. Coût modéré (la donnée, on la génère déjà). **Aucun concurrent ne peut copier ça sans notre base de prises.**

**Effort** : ~1,5-2 sprints (RPC d'agrégation PostGIS + couche heatmap MapLibre + Realtime + filtres + l'overlay score). **Garde-fou** : uniquement `geom_public`, jamais de point précis exposé ; seuil minimum de prises par cellule avant affichage (anti-désanonymisation).

## Pilier 2 — Couche PROFONDEUR + NATURE DU FOND + qualité 🟡 *parité, c'est le poste cher*

C'est la grille colorée + le popup « Fond : Vase · Profondeur : 5.5 m · Qualité : Excellent » de leur capture.

- **Données (open data, FR)** :
  - **Profondeur** : **SHOM** (MNT bathymétriques, **Litto3D** côtier haute résolution) + **EMODnet Bathymetry** (~115 m) + GEBCO (450 m, fallback large). Téléchargeables (GeoTIFF/ASCII).
  - **Nature du fond** (vase/sable/roche/gravier) : **SHOM sédimentologie** + **EMODnet Seabed Habitats (EUSeaMap substrate)**. C'est **la donnée rare** (celle qui fait « Fond : Vase »).
  - **« Qualité »** : **dérivée, et c'est là qu'on triche bien** — au lieu de leur score générique, on combine la suitability brute (profondeur + fond adaptés à l'espèce) **avec la densité de prises communautaires (Pilier 1) et le score perso**. Leur « qualité » est figée ; la nôtre apprend.
- **Rendu** : pipeline GIS **GDAL** → tuiles. Deux options :
  - **Tuiles raster (MBTiles)** pré-rendues (color-relief de la bathy + classification du substrat) → source raster MapLibre avec **toggle d'opacité** (le composant `Bathy` de la DA devient réel). Look « grille colorée » identique à eux.
  - **Tuiles vectorielles** (substrat polygonal + grille profondeur) via **Martin/pg_tileserv** sur le Postgres → cliquable (popup « Fond : Vase, 5.5 m » exactement comme leur capture). Plus interactif.
  - Hébergement : tuiles statiques sur CDN/R2/Vercel, ou tile-server. (À benchmarker — c'est du volume.)
- **Tier** : couche avancée = **Itinérant** (cf. tarifs §8 CLAUDE.md), avec un aperçu pour donner envie.

**Pourquoi c'est le poste cher** : acquisition + traitement SHOM/EMODnet (rasters lourds), tuilage, hébergement, maintenance. C'est de l'**ingénierie données géo**, le « long pole » de l'épique. Et ça nous met **à parité**, pas devant — d'où la priorité APRÈS le Pilier 1.

**Effort** : ~2-4 sprints (dont le gros est le pipeline data, pas le front). Compétence GIS requise (possible mission spécialisée).

## Pilier 3 — Passer à 1000+ spots 🔵 *changer de modèle, pas faire 40 lots*

La curation manuelle (lots de ~25 validés à la main) **ne scale pas à 1000**. À l'avenir, 3 sources :
1. **Curés** (les ~157 actuels) → deviennent le **socle « Vérifié »** badgé (qualité éditoriale, notre garantie).
2. **Communautaires** : les utilisateurs **proposent des spots** (modération + dédup + anti-doublon géographique). C'est le modèle de Fishing Grid, mais avec notre curation par-dessus.
3. **Importés** : **bulk-géocodage OSM/open data** des structures publiques (chaque port/jetée/môle/cap de France — il y en a des centaines) façon « lots automatiques » + revue légère. (C'est ce que j'ai fait à la main pour les lots 4-6, industrialisable.)

**+ insight clé** : avec le Pilier 1, **le besoin de « 1000 épingles curées » baisse** — la heatmap de prises montre déjà l'activité partout. Les spots curés restent pour le SEO + la garantie qualité ; le reste, c'est la communauté qui le remplit.

**Effort** : ~1,5-2 sprints (formulaire d'ajout de spot + modération + dédup + import OSM scripté). **Garde-fous** : modération anti-spam/secret-spot, dédup géo (pas 5 fois la même jetée), `verified` distinct entre curé et communautaire.

---

## Architecture technique (transverse)

- **PostGIS** : tout existe déjà (geom, geom_public, triggers de flou). Ajouter : tables/MV d'agrégation (grille H3 ou ST_SnapToGrid) pour la heatmap ; tables substrat/bathy (ou tuiles externes).
- **Tuiles** : évaluer **Martin** (tile-server Rust, lit PostGIS → MVT) ou **pg_tileserv**, vs tuiles statiques pré-rendues (GDAL→MBTiles→CDN). Le statique = moins cher à servir, le dynamique = plus frais.
- **MapLibre** : couches activables (heatmap / score / bathy / fond) avec un sélecteur de couches (UI à ajouter à `MapView`/`MapFilters`). Perf : limiter par zoom/bbox, simplifier au dézoom.
- **Realtime** : Supabase Realtime sur les nouvelles prises publiques → invalidation/refresh de la couche vivante (agrégée).
- **Perf** : ⚠️ une carte multi-couches mobile, c'est lourd — **dépend du Sprint 16** (carte < 2,5 s). Les couches bathy/heatmap doivent rester lazy + simplifiées au dézoom, sinon on retombe dans le « 8 s de chargement ».

## Séquencement — Carte v2 AVANT la beta (décision John 2026-06-22)

16 (perf) + 17 (cohérence) + correctifs = **faits**. On réordonne pour sortir d'abord ce qui **ne dépend pas des utilisateurs**, et livrer la couche vivante **prête à s'allumer à la 1ʳᵉ prise**.

| Ordre | Pilier | Dépend des users ? | Effort | Compétence |
|---|---|---|---|---|
| **1** (parallèle) | **C1 — Carte vivante** (catches + score) | construit sans, **vit avec** | ~1,5-2 sprints | app/PostGIS (pas de GIS) |
| **1** (parallèle) | **C2 — Spots 1000+** (import OSM + communauté) | non | ~1,5-2 sprints | app/script |
| **2** (chemin critique) | **C3a — Bathy + fond** (data GIS) | non | ~2-3 sprints | ⚠️ **mission GIS probable** |
| **3** | **C3b — Qualité vivante** | data tout de suite, communauté avec la beta | ~1,5-2 sprints | app |

**Total ~5-8 sprints avant la beta.** **Exigence John** : qualité **production** partout → dès la 1ʳᵉ prise loguée, la carte vivante **marche vraiment**. C1 livré **seedé** (spots curés + prises de test) + fallback « peu de prises pour l'instant » → il prend vie pendant la beta. **Chemin critique = C3a (GIS)** → à staffer en premier.

## La phrase à retenir
**Ne copie pas leur heatmap statique en premier.** Sors d'abord **la carte vivante** (catches + perso) — c'est moins cher, c'est imbattable, et ça a besoin de la beta pour exister. La bathy/fond, c'est de la parité qu'on ajoutera ensuite, en la rendant **vivante** elle aussi (qualité = donnée + communauté + toi), pas figée comme la leur.

*À transformer en briefs de sprint le moment venu (post-beta). Lié : `docs/audits/ANALYSE-COUT-NATIF-FLUIDITE-2026-06-22.md` (perf carte) + `docs/sprint-10/spots-curation.md` (curation actuelle).*
