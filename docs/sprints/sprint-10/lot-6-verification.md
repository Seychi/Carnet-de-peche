# Lot 6 (Corse 2A/2B) — résultats de vérification (avant insertion)

> Passe de vérification du 2026-06-22, sur la proposition `docs/sprint-10/lot-6-corse.md` (18 spots, coords sourcées OpenStreetMap `countrycodes=fr`).
> SQL prêt (NON inséré, en attente de validation John) : `supabase/seed-spots-lot-6.sql` (`verified = false`, `visibility = 'public'`, `region = 'corse'`).
> Méthode : **2 workflows multi-agents** (1 agent/spot, ortho **Esri World Imagery** téléchargée + lue avec Read). Schéma + garde-fou 2A/2B vérifiés en amont.

## ✅ GARDE-FOU n°1 (codes 2A/2B) — VERT, aucune migration

Avant tout, vérification que l'app gère les codes alphanumériques `2A`/`2B` (et pas `20`) de bout en bout :

| Point | État |
|---|---|
| `lib/geo/departments.ts` (`COASTAL_DEPARTMENTS` + `DEPARTMENT_LABELS` + `DEPARTMENT_OPTIONS`) | ✅ `2A`/`2B` présents, tri numérique-puis-Corse correct |
| `lib/geo/department-centroids.ts` (`DEPARTMENT_CENTROIDS`, flyTo carte) | ✅ `2A` [8.95, 41.72], `2B` [9.22, 42.40] |
| `/fil/[department]` (validation) | ✅ `isCoastalDepartment('2A')` → page existe |
| `can_post_in_department` (RPC tier gating) | ✅ liste inclut explicitement `'2A','2B'` + `trim(dept)` |
| Filtre carte itinérant (`availableDepartments`) | ✅ **dynamique** (`new Set(spots.department)`) → 2A/2B apparaissent dès l'insertion |
| `spots.department` `char(3)` | ✅ `'2A '` (même padding que `'66 '`, déjà en prod) |
| Onboarding + profil (sélecteur dépt) | ✅ via `DEPARTMENT_OPTIONS` |

⚠️ **Seul bémol mineur (non bloquant)** : `/fil/2a` en **minuscule** ferait `notFound()` (la validation est sensible à la casse). Les liens générés par l'app sont en majuscule `2A` (depuis `DEPARTMENT_OPTIONS` / `spots.department`), donc le parcours réel fonctionne. À garder en tête si on ajoute un jour des liens externes.

**Conclusion : RAS, on peut insérer les spots Corse sans migration ni alignement.** (Le support 2A/2B a été mis en place au sprint 11.6 — liste canonique des 24 départements côtiers dont la Corse.)

## Verdict global

- **18/18 spots : réels, publics, bon département.** Aucun spot inventé. Façade Corse vierge (0 spot existant sur 2A/2B), 0 collision de slug, total de départ 139.
- **Schéma** identique au lot 5 (`geom geography ::geography`, `structure` CHECK, `visibility='public'`, `verified=false`, trigger `spots_blur`).
- **Espèces Med-correctes** : `bar` (=loup), `dorade_royale`, `sar`, `orphie` — **zéro `lieu_jaune`, zéro `vieille`, pas de `maquereau`** (conforme au brief). **Zéro `submersion_maree`** (pas de marnage).
- **Coords** : **12 OK** (dont les spots de port `*` + Centuri/Saint-Florent = pin bassin/commune, normal dans le flou 1 km). **6 coords hors-structure → corrigées** (2ᵉ passe satellite).
- **`verified = false`** à l'insertion — passage à `true` par John après revue `/carte`.

## ⚠️ Cause des erreurs OSM (« erreur corse classique »)

6 coords sur 18 hors-structure : le **nœud OSM a capté l'objet NOMMÉ** — un **phare en haut de falaise** (#16 Pertusato), une **tour génoise dans le maquis** (#15 Campomoro), un **village** (#1 Barcaggio), un flanc de colline (#13 Porto), ou la **vieille ville perchée** (#17 Bonifacio à ~850 m du port, #18 Porto-Vecchio à ~800 m) — au lieu du poste de pêche au bord de l'eau. Même schéma qu'aux lots 4 et 5. **→ Passe satellite obligatoire confirmée une 3ᵉ fois.**

## Tableau récap (18) — passe 1

| # | Spot | Dépt | Structure | Verdict passe 1 |
|---|---|---|---|---|
| 1 | Barcaggio — pointe du Cap Corse | 2B | pointe_rocheuse | ⚠️ **à corriger** (village, pas la pointe) |
| 2 | Port de Centuri | 2B | digue | **keep** (bord du port, bassin < 220 m) |
| 3 | Port de Macinaggio | 2B | digue | **keep** ✅ (pile dans le bassin) |
| 4 | Saint-Florent — port | 2B | digue | **keep** ✅ (bassin du port) |
| 5 | L'Île-Rousse — phare de la Pietra | 2B | digue | **keep** ✅ (îlot rocheux, jetée dans le flou) |
| 6 | Bastia — jetée du Dragon | 2B | digue | **keep** ✅ (pile sur la jetée) |
| 7 | Plage de la Marana | 2B | plage | **keep** ✅ (cordon sableux au ressac) |
| 8 | Plage de Padulone — Tavignano | 2B | estuaire | **keep** (plage au grau, embouchure < 150 m) |
| 9 | Port de Campoloro | 2B | digue | **keep** ✅ (bassin du port) |
| 10 | Pointe de la Parata — Sanguinaires | 2A | pointe_rocheuse | **keep** ✅ (promontoire rocheux, rochers < 100 m) |
| 11 | Ajaccio — port Tino Rossi | 2A | digue | **keep** ✅ (bassin du vieux port) |
| 12 | Capo di Feno | 2A | pointe_rocheuse | **keep** ✅ (pointe rocheuse au ras de l'eau) |
| 13 | Marine de Porto — tour génoise | 2A | pointe_rocheuse | ⚠️ **à corriger** (maquis, ~400 m dans les terres) |
| 14 | Port de Propriano | 2A | digue | **keep** ✅ (bassin du port) |
| 15 | Tour de Campomoro | 2A | pointe_rocheuse | ⚠️ **à corriger** (tour dans le maquis, ~280 m) |
| 16 | Phare de Pertusato | 2A | pointe_rocheuse | ⚠️ **à corriger** (phare sur la falaise, rivage ~160 m S) |
| 17 `*` | Bonifacio — goulet / port | 2A | digue | ⚠️ **à corriger** (vieille ville, ~850 m du port) |
| 18 `*` | Porto-Vecchio — port / golfe | 2A | digue | ⚠️ **à corriger** (vieille ville, ~800 m du port) |

## ⚠️ Corrections (passe 2 satellite) — À VALIDER PAR JOHN

> ✅ **Passe 2 terminée** : re-vérification satellite des 6 candidats. **6/6 coords vérifiées, toutes sur structure, 0 restée hors-structure** (1 medium — Campomoro, plusieurs petits caps rocheux équivalents le long du même platier). Patchées dans le SQL (« COORD CORRIGÉE satellite »). **Aucune insertion avant ton OK.**

| # | Spot | Coord d'origine (OSM) lat,lng | Problème | **Coord vérifiée (passe 2)** | Ce qu'on voit au centre | Conf. |
|---|---|---|---|---|---|---|
| 1 | Barcaggio — Cap Corse | 43.00611, 9.40216 | village (~280 m SE) | **43.00870, 9.40030** | platier rocheux + ressac, pointe N du Cap Corse | high |
| 13 | Marine de Porto | 42.26750, 8.69628 | maquis (~430 m intérieur) | **42.27220, 8.68820** | promontoire granit rouge au ras de l'eau (sous la tour) | high |
| 15 | Tour de Campomoro | 41.63885, 8.80725 | tour dans le maquis (~290 m) | **41.63900, 8.80330** | pointe rocheuse à l'eau, O de la tour | medium |
| 16 | Phare de Pertusato | 41.36751, 9.18443 | phare sur le plateau | **41.36630, 9.18470** | rochers calcaires de Capu Pertusato au ras de l'eau (~160 m S du phare) | high |
| 17 `*` | Bonifacio — port | 41.38772, 9.16858 | vieille ville (~850 m E) | **41.38910, 9.15870** | quais/pontons de la marina dans le goulet | high |
| 18 `*` | Porto-Vecchio — port | 41.59114, 9.27945 | vieille ville perchée (~700 m) | **41.59020, 9.28480** | bassin de la marina (pontons, quais, môles) au bord du golfe | high |

> Note : #13 et #15 (caps rocheux corses) — le pin précis est satellite-vérifié sur le rocher au ras de l'eau, mais ces façades offrent plusieurs petits caps équivalents ; un coup d'œil `/carte` au moment du passage `verified=true` est recommandé. Le flou public (~500-900 m) couvre de toute façon ces variations.

## ✅ Inséré en prod le 2026-06-22

Les 18 spots sont **insérés en prod** (`seed-spots-lot-6.sql` joué via MCP `execute_sql`, OK explicite de John) → la prod passe de **139 à 157 spots** : **2B=9, 2A=9**. **Couverture nationale complète** (Bretagne, Atlantique, Manche, Méditerranée continentale, Corse). Décisions John : 6 coords corrigées validées. Vérifié : `geom_public` généré pour les 18, **flou 522-887 m**, `visibility='public'`, `verified=false`, `region='corse'`, **`anon` ne lit pas `geom`** (verrou GPS intact).

## Reste à faire

1. ✅ Passe 2 satellite → 6 coords vérifiées + patchées + validées John.
2. ✅ Insertion prod faite → **157 spots**, couverture nationale complète (5 façades).
3. ✅ `qa-chrome` (live, Playwright) — **verdict GO** : pins Méditerranée **ET** Corse (2A+2B) visibles sur `/carte` (71 markers, confirmés par les titres : Ajaccio, Bastia, Bonifacio, Barcaggio, Capo di Feno, L'Île-Rousse… + ~22 Med) ; `/fil/2A` et `/fil/2B` **existent** (redirigent vers login en anonyme, pas de 404) ; floutage GPS confirmé sans fuite (503-887 m, `anon` sans GRANT sur `geom`) ; console propre (seul un `favicon.ico` 404 cosmétique, présent sur tout le site). *Note : le contrôle négatif `/fil/99` n'est pas observable en anonyme (le middleware redirige vers login avant la garde `notFound()`) — la validation `isCoastalDepartment` est confirmée par le code (2A/2B oui, 99 non).*
4. **John** : revue `/carte` (les pins publics sont au centre du flou ~500-887 m ; le `geom` précis a été satellite-vérifié) puis passage **`verified=true`** spot par spot. Coup d'œil conseillé sur #13 Porto et #15 Campomoro.
5. **Push** : lots 5+6 (seeds + docs) poussés ensemble par John (seeds = traces, données déjà en prod).
