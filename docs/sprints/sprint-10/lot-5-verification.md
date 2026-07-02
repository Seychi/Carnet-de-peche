# Lot 5 (Méditerranée) — résultats de vérification (avant insertion)

> Passe de vérification du 2026-06-22, sur la proposition `docs/sprint-10/lot-5-mediterranee.md` (30 spots, coords sourcées OpenStreetMap par John).
> SQL prêt (NON inséré, en attente de validation John) : `supabase/seed-spots-lot-5.sql` (`verified = false`, `visibility = 'public'`).
> Méthode : **2 workflows multi-agents** (1 agent/spot, ortho **Esri World Imagery** téléchargée + lue avec Read — chrome-devtools/Playwright indispo de façon fiable chez John, cf. mémoire `spots-curation-pipeline`). Le centre de l'image = la coordonnée. Schéma prod re-confirmé en amont (supabase-guard, lecture seule).

## Verdict global

- **30/30 spots : réels, publics, bon département.** Aucun spot inventé. Façade Méditerranée vierge (0 spot existant sur 66/11/34/30/13/83/06), 0 collision de slug.
- **Schéma confirmé** (supabase-guard) : 19 colonnes ; `geom = geography(Point,4326)` → cast `::geography` ; `structure` ∈ CHECK {digue,plage,pointe_rocheuse,estuaire,cale,passe,cassure} ; `techniques`/`species`/`hazards` text[] libres ; `region` text libre → `'occitanie'` (66/11/34/30) et `'provence-alpes-cote-d-azur'` (13/83/06) ; `visibility` défaut `'subscriber'` → forcé `'public'` ; `difficulty` CHECK 1..5 ; `department` char(3) (zéro initial de `'06'` gardé) ; `geom_public` (flou recentré ~500-900 m) généré par le trigger `spots_blur` → non écrit. Verrou colonne `geom` (anon ne lit pas le précis) intact.
- **Spécificités Méditerranée appliquées** : espèces Med-correctes uniquement (`bar`=loup, `dorade_royale`, `sar`, `orphie`, `maquereau`) — **zéro `lieu_jaune`, zéro `vieille`** ; **zéro `submersion_maree`** (pas de marnage en Med) → dangers = `rochers_glissants`, `falaise`, `vagues`, `courants_forts`, `isolation`.
- **Coords** : **18 OK** + **1 review gardée** = 19 conservées telles quelles (dont les 6 spots de port/commune `*` = pin sur bassin/village, dans le flou 1 km, anticipé). **11 coords hors-structure → corrigées** (2ᵉ passe satellite).
- ⚠️ **`verified = false`** à l'insertion (règle produit verrouillée) — passage à `true` par John après revue terrain/`/carte`.

## ⚠️ Cause systématique des erreurs OSM (leçon)

Le brief annonçait « coords vérifiées OSM, fais-leur confiance ». La passe satellite a trouvé **11 coords sur 30 hors-structure** (vs 4/26 au lot 4). Cause récurrente : le **nœud OSM a capté l'objet NOMMÉ** (un phare au sommet du cap, un village perché, le centre-ville d'une commune, un mont) **et non le poste de pêche au bord de l'eau**. Exemples : « phare de la Garoupe » = sommet boisé à ~700 m du rivage ; « Cap Martin » = village médiéval de Roquebrune sur la colline ; « Cassis Port-Miou » = centre-ville de Cassis à ~1,8 km de la calanque ; « Cap d'Agde rochers volcaniques » = Mont Saint-Loup (colline) au lieu des basaltes du rivage. **→ La passe satellite reste OBLIGATOIRE même quand les coords sont annoncées vérifiées.** (Confirme la leçon du lot 4.)

## Tableau récap (30) — passe 1

| # | Spot | Dépt | Structure | Réel | Dépt OK | Verdict passe 1 |
|---|---|---|---|---|---|---|
| 1 | Cap Béar | 66 | pointe_rocheuse | ✓ | ✓ | **keep** ✅ (pile sur la pointe rocheuse) |
| 2 | Cap l'Abeille | 66 | pointe_rocheuse | ✓ | ✓ | **keep** ✅ (transition rocher/mer) |
| 3 | Port d'Argelès | 66 | digue | ✓ | ✓ | ⚠️ **à corriger** (village, pas la marina) |
| 4 `*` | Grau de Sainte-Marie (Barcarès) | 66 | estuaire | ✓ | ✓ | ⚠️ **à corriger** (lotissement, pas le grau) |
| 5 | Cap Leucate | 11 | pointe_rocheuse | ✓ | ✓ | **keep** ✅ (rochers au ras de l'eau) |
| 6 `*` | Gruissan — plage & port | 11 | plage | ✓ | ✓ | **keep** (port/commune `*`, plage à ~1,5 km) |
| 7 | Port-la-Nouvelle — jetée | 11 | digue | ✓ | ✓ | **keep** ✅ (pile sur la digue sud) |
| 8 | Sète — môle Saint-Louis | 34 | digue | ✓ | ✓ | **keep** ✅ (racine du môle, musoir dans le flou) |
| 9 | Cap d'Agde — rochers volcaniques | 34 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (Mont Saint-Loup, pas le rivage) |
| 10 | Palavas — embouchure du Lez | 34 | estuaire | ✓ | ✓ | **keep** ✅ (chenal du Lez, zone grau) |
| 11 | Frontignan-Plage | 34 | plage | ✓ | ✓ | **keep** ✅ (cordon de sable au bord de l'eau) |
| 12 | Le Grau-d'Agde — embouchure Hérault | 34 | estuaire | ✓ | ✓ | ⚠️ **à corriger** (bâti à ~100 m du chenal) |
| 13 `*` | Le Grau-du-Roi — jetées | 30 | digue | ✓ | ✓ | **keep** (port/commune `*`, jetées dans le flou) |
| 14 | Pointe de l'Espiguette | 30 | plage | ✓ | ✓ | ⚠️ **à corriger** (massif dunaire, plage à ~350 m) |
| 15 | Callelongue / Cap Croisette | 13 | pointe_rocheuse | ✓ | ✓ | **keep** (village/route, rivage rocheux < 150 m) |
| 16 `*` | Cassis — calanque de Port-Miou | 13 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (centre-ville Cassis, calanque à ~1,8 km) |
| 17 | Carry-le-Rouet — Côte Bleue | 13 | pointe_rocheuse | ✓ | ✓ | **keep** ✅ (bassin du port, môles < 150 m) |
| 18 | Cap Couronne | 13 | pointe_rocheuse | ✓ | ✓ | **keep** ✅ (pointe rocheuse, ressac sur les rochers) |
| 19 `*` | Saintes-Maries-de-la-Mer | 13 | plage | ✓ | ✓ | **keep** (commune `*`, plage à ~150-200 m) |
| 20 | Port-Saint-Louis — plage Napoléon | 13 | estuaire | ✓ | ✓ | **keep** (plage au bord de l'eau ; cf. note structure) |
| 21 | La Ciotat — bec de l'Aigle | 83 | pointe_rocheuse | ✓ | ✓ | **keep** (commune, port + rivage < 150 m) |
| 22 | Sanary-sur-Mer | 83 | digue | ✓ | ✓ | **keep** ✅ (bassin du port, digue) |
| 23 | Toulon — Mourillon | 83 | plage | ✓ | ✓ | **keep** ✅ (sable d'une anse du Mourillon) |
| 24 | Presqu'île de Giens | 83 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (lotissement, pointes au sud) |
| 25 | Cap Dramont | 83 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (sommet boisé, rochers à ~200 m) |
| 26 | Cap Camarat | 83 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (plateau garrigue, platier au SE) |
| 27 | Cap d'Antibes — Garoupe | 06 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (phare au sommet, rivage à ~700 m) |
| 28 | Nice — embouchure du Var | 06 | estuaire | ✓ | ✓ | 🟠 **revue** (pin sur marina St-Laurent, pas l'embouchure) |
| 29 | Cap Ferrat | 06 | pointe_rocheuse | ✓ | ✓ | **keep** ✅ (pointe rocheuse, écume au centre) |
| 30 `*` | Cap Martin | 06 | pointe_rocheuse | ✓ | ✓ | ⚠️ **à corriger** (village Roquebrune perché, pointe au sud) |

## ⚠️ Corrections (passe 2 satellite) — À VALIDER PAR JOHN

> ✅ **Passe 2 terminée** : re-vérification/affinage satellite de chaque candidat (amorces ré-estimées à la main quand la suggestion brute du 1er passage était suspecte — ex. Port d'Argelès suggéré à 7 km au nord, écarté ; les agents ont alors fait du vrai travail satellite et trouvé la marina réelle à 42.544/3.054). **12/12 coords vérifiées, toutes sur la bonne structure, haute confiance, 0 restée hors-structure.** Patchées dans le SQL (marquées « COORD CORRIGÉE satellite »). **Aucune insertion avant ton OK coord par coord.**

| # | Spot | Coord d'origine (OSM, brief) lat,lng | Problème | **Coord vérifiée (passe 2) lat,lng** | Ce qu'on voit au centre | Conf. |
|---|---|---|---|---|---|---|
| 3 | Port d'Argelès | 42.54380, 3.03717 | centre-ville ; la marina est plus au S/SE | **42.54420, 3.05400** | môle d'enrochement de la marina Port-Argelès | high |
| 4 `*` | Grau de Sainte-Marie | 42.79468, 3.03352 | port intérieur, pas la passe | **42.79840, 3.04140** | débouché en mer du grau entre les 2 jetées | high |
| 9 | Cap d'Agde volcanique | 43.29833, 3.50300 | Mont Saint-Loup (colline) | **43.27550, 3.51520** | rochers basaltiques noirs au ras de l'eau | high |
| 12 | Le Grau-d'Agde | 43.28578, 3.44572 | bâti à ~290 m | **43.28090, 3.44360** | passe de l'Hérault entre les 2 môles | high |
| 14 | Pointe de l'Espiguette | 43.48768, 4.14176 | massif dunaire | **43.48405, 4.13490** | estran sableux à la ligne de ressac | high |
| 16 `*` | Cassis Port-Miou | 43.21404, 5.53963 | centre-ville Cassis (~1,8 km E) | **43.20485, 5.51490** | pointe rocheuse à l'entrée de la calanque | high |
| 24 | Presqu'île de Giens | 43.03919, 6.11269 | lotissement central | **43.03400, 6.11200** | platier rocheux côte sud (La Madrague) | high |
| 25 | Cap Dramont | 43.41398, 6.85272 | sommet boisé | **43.41140, 6.85250** | roches rouges Estérel au ras de l'eau | high |
| 26 | Cap Camarat | 43.20095, 6.67451 | plateau garrigue (~430 m) | **43.19936, 6.67942** | platier rocheux sous le phare | high |
| 27 | Cap d'Antibes | 43.56434, 7.13272 | phare de la Garoupe (sommet, ~450-700 m) | **43.56420, 7.13880** | rochers du sentier de Tirepoil (flanc E) | high |
| 28 | Embouchure du Var | 43.65583, 7.18222 | marina St-Laurent-du-Var (~1,2 km O) | **43.65380, 7.20080** | galets de l'embouchure du Var, rive est (Nice) | high |
| 30 `*` | Cap Martin | 43.76506, 7.45994 | village perché de Roquebrune (~800 m) | **43.75095, 7.47650** | platier rocheux, sentier Le Corbusier (pointe S) | high |

## Notes d'honnêteté produit (à l'attention de John)

- **#20 Port-Saint-Louis — plage Napoléon** : structure déclarée `estuaire` mais le satellite montre une **plage de sable** (l'embouchure du Grand Rhône est à quelques km). ✅ **Tranché par John : basculé en `plage`** (plus fidèle au satellite ; la description garde la mention du Grand Rhône).
- **#28 Nice — embouchure du Var** : la coord OSM est sur la **marina de Saint-Laurent-du-Var** (digue pêchable valable), pas sur les **galets de l'embouchure du Var** que décrit le spot. La passe 2 propose les galets de l'embouchure (rive est). **À trancher : embouchure vs digue de la marina.**
- **#17 Carry / #18 Cap Couronne** : ajout dans `access_notes` d'un rappel **Parc Marin de la Côte Bleue** (zones de cantonnement / no-take) — non demandé au brief mais nécessaire (responsabilité produit).
- **#15 / #16** : rappel **Parc National des Calanques** (zonage strict, zones de protection renforcée où la pêche est interdite) dans `access_notes`.

## ✅ Inséré en prod le 2026-06-22

Les 30 spots sont **insérés en prod** (`seed-spots-lot-5.sql` joué via MCP `execute_sql`, OK explicite de John) → la prod passe de **109 à 139 spots** : **66=4, 11=3, 34=5, 30=2, 13=6, 83=6, 06=4**. Décisions John appliquées : **12 coords corrigées validées** + **#20 plage Napoléon → `plage`**. Vérifié par requête : `geom_public` (flou) généré par le trigger `spots_blur` pour les 30, **flou effectif 503-866 m** (garde-fou GPS intact), `visibility='public'`, `verified=false`, 2 régions (`occitanie` + `provence-alpes-cote-d-azur`).

## Reste à faire

1. ✅ Passe 2 satellite faite → 12 coords vérifiées (high) patchées dans `seed-spots-lot-5.sql`.
2. ✅ Décisions John : 12 coords validées + #20 → `plage`.
3. ✅ Insertion prod faite → **139 spots**, 3ᵉ façade (Méditerranée) ouverte.
4. **John** : revue `/carte` des 30 pins (les pins publics sont au centre du flou ~500-866 m, pas au caillou exact — c'est voulu ; le placement précis du `geom` a été satellite-vérifié) puis passage **`verified=true`** spot par spot.
5. **Lot 6 = Corse (2A/2B)** pour compléter la façade Méditerranée.
