# Lot 4 (Manche) — résultats de vérification (avant insertion)

> Passe de vérification du 2026-06-22, sur la proposition `docs/sprint-10/lot-4-manche.md` (26 spots, coords sourcées OpenStreetMap par John).
> SQL prêt (NON inséré) : `supabase/seed-spots-lot-4.sql` (`verified = false`, `visibility = 'public'`).
> Méthode : confirmation satellite (ortho Esri World Imagery) de **chaque** coordonnée — un agent par spot télécharge l'image centrée sur la coord et cale le pin sur le vrai poste. Le centre de l'image = la coordonnée. Schéma prod re-confirmé en amont (supabase-guard, lecture seule).

## Verdict global

- **26/26 spots : réels, publics, bon département.** Aucun spot inventé.
- **Schéma confirmé** : `geom = geography(Point,4326)` → cast `::geography` ; `structure` ∈ CHECK {digue,plage,pointe_rocheuse,estuaire,cale,passe,cassure} ; `techniques`/`species` text[] libres ; `visibility` défaut `subscriber` → on force `'public'` ; `geom_public` (flou ~1 km) généré par le trigger `spots_blur`. 0 doublon de slug, 0 spot existant sur 50/76/14/62/59, total de départ = 83.
- **Coords** : **22 OK** (dont 5 spots de port marqués `*` au brief = pin sur le bassin/port, musoir réel à quelques centaines de mètres, dans le flou 1 km — anticipé par le brief). **4 coords décalées hors structure → CORRIGÉES au satellite** (détail ci-dessous).
- ⚠️ **`verified = false`** à l'insertion (règle produit verrouillée, `spots-curation.md` §4) — passage à `true` par John après revue terrain/`/carte`. *(Note : supabase-guard suggérait `verified=true` pour un lot curé — écarté, la règle prime.)*

## ⚠️ Les 4 coords corrigées (à valider par John)

Le brief disait « coords vérifiées OSM, fais-leur confiance ». La passe satellite (qui existe pour ça) a trouvé **4 coords qui ne tombaient PAS sur la structure**. Corrections re-vérifiées au satellite (pas inventées), appliquées dans le SQL et marquées par un commentaire (original noté pour revert). **John tranche : garder / revenir à l'OSM / tenir hors lot.**

| # | Spot | Problème (origine OSM) | Coord corrigée (satellite) | Confiance |
|---|---|---|---|---|
| 9 | Sainte-Adresse / Cap de la Hève | Pin sur la **falaise** boisée du cap, plage ~70 m à l'ouest | `49.51650, 0.06600` (estran) | high (fix_ok) |
| 10 | Étretat — plage de galets | Pin **en plein bourg**, plage 150-200 m au NO | `49.70780, 0.20080` (plage/front de mer) | high (fix_ok) |
| 16 | Port-en-Bessin — jetées | Pin **~800 m DANS LES TERRES**, en plein champ (nœud OSM erroné) | `49.35020, -0.75620` (môle du port) | high (fix_ok) |
| 19 | Cap Gris-Nez | Pin sur le **plateau agricole**, rochers 200-300 m à l'ouest | `50.87100, 1.58140` (rochers au ras de l'eau) | high (1ʳᵉ candidate surcorrigeait dans l'eau → recalée SE et re-vérifiée) |

> Le plus grave = **#16 Port-en-Bessin** : la coord OSM d'origine est en plein champ à ~800 m du port. À ne PAS insérer telle quelle. Les 3 autres restaient dans le flou 1 km mais le pin précis (vue abonné) n'était pas sur la structure.

## Spots de port (`*` au brief) — pin sur le bassin = normal

Pour ces 5, le pin est posé sur le port/bassin vérifié ; le poste réel = le musoir de la jetée, à quelques centaines de mètres vers le large, **dans le flou public d'1 km**. Conforme à la note du brief — gardés tels quels (caler le `geom` précis au musoir possible plus tard).

- **#8 Diélette** : racine SO du port, musoir ~150-250 m N/NE.
- **#12 Dieppe** : racine des jetées de l'avant-port, corps de digue < 100 m.
- **#14 Le Tréport** : front de port, jetée Ouest ~250-350 m N.
- **#15 Ouistreham** : chenal/écluse de l'embouchure de l'Orne (estuaire), jetées adjacentes.
- **#18 Courseulles** : bassins du port, jetées du chenal ~400-600 m N.

## Tableau récap (26)

| # | Spot | Dépt | Structure | Réel | Dépt OK | Satellite | Statut |
|---|---|---|---|---|---|---|---|
| 1 | Cap de la Hague — Goury | 50 | pointe_rocheuse | ✓ | ✓ | pin sur littoral/port au pied du cap, rochers < 150 m | keep |
| 2 | Pointe de Barfleur — Gatteville | 50 | pointe_rocheuse | ✓ | ✓ | pile sur pointe/récif rocheux | keep ✅ |
| 3 | Saint-Vaast-la-Hougue — digue | 50 | digue | ✓ | ✓ | bassin marina, digue 150-250 m (abrité) | keep |
| 4 | Digue de Querqueville | 50 | digue | ✓ | ✓ | sur le brise-lames en dur | keep ✅ |
| 5 | Cap de Carteret | 50 | pointe_rocheuse | ✓ | ✓ | sur le cap, rivage rocheux < 150 m | keep ✅ |
| 6 | Pointe du Roc — Granville | 50 | pointe_rocheuse | ✓ | ✓ | pile sur la pointe rocheuse | keep ✅ |
| 7 | Pointe d'Agon | 50 | plage | ✓ | ✓ | dunes de la flèche sableuse, estran adjacent | keep |
| 8 `*` | Diélette — digue du port | 50 | digue | ✓ | ✓ | racine du port, musoir proche (port) | keep |
| 9 | Sainte-Adresse — Cap de la Hève | 76 | plage | ✓ | ✓ | **CORRIGÉ** falaise → estran | keep (corrigé) |
| 10 | Étretat — plage de galets | 76 | plage | ✓ | ✓ | **CORRIGÉ** bourg → plage | keep (corrigé) |
| 11 | Fécamp — jetée du phare | 76 | digue | ✓ | ✓ | sur le musoir de la jetée nord | keep ✅ |
| 12 `*` | Dieppe — jetées avant-port | 76 | digue | ✓ | ✓ | racine des jetées < 100 m (port) | keep |
| 13 | Saint-Valery-en-Caux — jetées | 76 | digue | ✓ | ✓ | bassin marina, musoirs ~400 m N | keep (nudge N possible) |
| 14 `*` | Le Tréport — jetée Ouest | 76 | digue | ✓ | ✓ | front de port, jetée ~300 m N (port) | keep |
| 15 `*` | Ouistreham — embouchure Orne | 14 | estuaire | ✓ | ✓ | chenal/écluse de l'embouchure (estuaire) | keep |
| 16 | Port-en-Bessin — jetées | 14 | digue | ✓ | ✓ | **CORRIGÉ** champ (~800 m) → môle | keep (corrigé) |
| 17 | Trouville — jetée de la Touques | 14 | estuaire | ✓ | ✓ | sur la jetée du chenal | keep ✅ |
| 18 `*` | Courseulles — jetées du chenal | 14 | digue | ✓ | ✓ | bassins du port, jetées ~400-600 m N (port) | keep |
| 19 | Cap Gris-Nez | 62 | pointe_rocheuse | ✓ | ✓ | **CORRIGÉ** plateau → rochers | keep (corrigé) |
| 20 | Cap Blanc-Nez | 62 | plage | ✓ | ✓ | estran/plateforme au pied de la falaise | keep |
| 21 | Boulogne — digue Carnot | 62 | digue | ✓ | ✓ | pile sur le corps de la digue | keep ✅ |
| 22 | Wimereux — digue de promenade | 62 | digue | ✓ | ✓ | pile sur la digue/promenade | keep ✅ |
| 23 | Calais — jetée Ouest | 62 | digue | ✓ | ✓ | au bord du musoir (< 30 m) | keep ✅ |
| 24 | Dunkerque — Malo-les-Bains | 59 | digue | ✓ | ✓ | front de la digue de mer (« digue de Malo » = mur/promenade) | keep |
| 25 | Gravelines — Petit-Fort-Philippe | 59 | estuaire | ✓ | ✓ | dans le chenal de l'Aa, jetées adjacentes | keep ✅ |
| 26 | Bray-Dunes — grande plage | 59 | plage | ✓ | ✓ | sur le sable de l'estran | keep ✅ |

## Méthode (honnêteté)

- 2 workflows multi-agents : (1) 26 agents — 1 par spot — ortho Esri + lecture image + verdict structuré (zoom serré ~360 m, seconde passe zoom large pour les douteux) ; (2) 4 agents pour re-vérifier les coords corrigées candidates.
- Pas de chrome-devtools/Playwright (indispo de façon fiable côté John) : la voie « image satellite + Read » est la méthode du pipeline (cf. mémoire `spots-curation-pipeline`).
- `qa-chrome` sur `/carte` reste à faire **après insertion** (les 26 ne sont pas encore en prod, rien à afficher avant). Étape post-insertion : revue `/carte` des 26 pins + passage `verified=true` spot par spot par John.

## ✅ Inséré en prod le 2026-06-22

Les 26 spots sont **insérés en prod** (`seed-spots-lot-4.sql` joué via MCP `execute_sql`, OK explicite de John) → la prod passe de **83 à 109 spots** : **50=8, 76=6, 14=4, 62=5, 59=3**. Vérifié par requête : `geom_public` (flou) généré par le trigger `spots_blur` pour les 26, **flou effectif 503-877 m** (garde-fou GPS intact), `visibility='public'`, `verified=false`. Les 4 coords corrigées (#9, #10, #16, #19) ont été validées par John (« garder mes corrections »).

## Reste à faire

1. ✅ Corrections satellite validées par John + insertion prod faite.
2. **John** : revue `/carte` des 26 pins (les pins publics sont au centre du flou ~1 km, pas au caillou exact — c'est voulu ; le placement précis du `geom` a été satellite-vérifié) puis passage `verified=true` spot par spot.
3. Résultat : **83 → 109 spots**, 2ᵉ façade (Manche → Hauts-de-France) ouverte, promesse « 100+ spots » tenue. Restera le **lot 5 (Méditerranée)** pour la 3ᵉ façade.
