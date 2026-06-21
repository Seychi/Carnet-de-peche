# Lot 2 — Atlantique sud (44 + 85) — résultats de vérification

> Sourçage + vérification du 2026-06-21 : 1 agent/spot (web+géo + confirmation satellite Esri + rédaction FR), en une passe. 24 candidats Loire-Atlantique (44) + Vendée (85).
> SQL : `supabase/seed-spots-lot-2.sql` — **NON inséré, NON commité**. ⚠️ **À insérer seulement APRÈS le fix GPS** (`docs/sprint-11.5/ADDENDUM-gps.md`) + validation John.

## Verdict global
- **24/24 réels, publics, bon département.** Aucun rejeté, aucun `cannot_lock`.
- **20 verrouillés sur le poste exact** (rocher au bord de l'eau / corps de digue / sable au flot).
- **4 zones** (grandes plages/embouchure, point d'accès représentatif) : #11 Tharon, #17 Payré/Veillon, #18 Conches, #21 La Tranche.
- **1 confiance moyenne** : #17 Pointe du Payré — le candidat mélangeait la plage du Veillon (Talmont) et les rochers de la Pointe du Payré (rive Jard, accès sentier 2,5 km). Le poste loggé = l'embouchure du Payré au sud du Veillon (estuaire, bar/dorade). À trancher si tu veux plutôt les rochers de la rive sud.

## Normalisations appliquées (les agents ont parfois débordé du set)
- **Espèces** ramenées au set supporté `{bar, dorade_royale, lieu_jaune, maquereau, sar, orphie, vieille}` : `"dorade royale"`→`dorade_royale` ; **`chinchard` et `sole` retirés** (réels localement mais hors set actuel → à réintroduire avec l'extension « nouvelles espèces » + le fix grammaire SEO `Le/La/L'`).
- **Techniques** ramenées à `{leurres, surfcasting, flottante, vif, stickbait}` : `buldo`/`flotteur`/`peche_a_soutenir`/`appat`→`flottante` ; `lancer_leurre`/`lancer_leger`/`peche_aux_leurres`/`leurre`→`leurres`.
- **Aucun `lieu_jaune`** : les agents l'ont écarté à raison (rare au sud de la Loire) — bon réflexe métier.
- `region = 'pays-de-la-loire'` pour les 24 (44 et 85).

## Flags d'accès / saison à connaître
- **#20 Estacade de Saint-Jean-de-Monts** : pêche sur la **plage interdite 1er juillet–31 août** (l'estacade reste ouverte).
- **Ports actifs** (#5 La Turballe, #19 L'Herbaudière, #23 Jard) : respecter zones de manœuvre ; pêche à pied interdite < 100 m des jetées (la canne reste OK).
- **#8 Pornichet** : ne pas confondre la digue du port moderne (le poste) avec le « vieux môle » de 1923.
- Plages exposées (#9, #11, #12, #18, #21, #22) : **baïnes** + courants de retour signalés.

## Récap (24)
| # | Spot | Dépt | Structure | Statut | Conf. |
|---|---|---|---|---|---|
| 1 | Pointe de Chémoulin | 44 | pointe_rocheuse | poste | high |
| 2 | Pointe Saint-Gildas | 44 | pointe_rocheuse | poste | high |
| 3 | Pointe du Croisic | 44 | pointe_rocheuse | poste | high |
| 4 | Jetée du Tréhic | 44 | digue | poste | high |
| 5 | Jetée de La Turballe | 44 | digue | poste | high |
| 6 | Môle du Pouliguen | 44 | digue | poste | high |
| 7 | Pointe de Penchâteau | 44 | pointe_rocheuse | poste | high |
| 8 | Môle de Pornichet | 44 | digue | poste | high |
| 9 | Plage de la Courance | 44 | plage | poste | high |
| 10 | Corniche de Gourmalon | 44 | pointe_rocheuse | poste | high |
| 11 | Plage de Tharon | 44 | plage | zone | high |
| 12 | Plage de Saint-Brevin | 44 | plage | poste | high |
| 13 | Grande jetée de Saint-Gilles | 85 | digue | poste | high |
| 14 | Jetée de la Chaume | 85 | digue | poste | high |
| 15 | Pointe de Grosse Terre | 85 | pointe_rocheuse | poste | high |
| 16 | Rochers de la Normandelière | 85 | pointe_rocheuse | poste | high |
| 17 | Pointe du Payré — Le Veillon | 85 | estuaire | zone | **medium** |
| 18 | Plage des Conches | 85 | plage | zone | high |
| 19 | Jetée de L'Herbaudière | 85 | digue | poste | high |
| 20 | Estacade de Saint-Jean-de-Monts | 85 | digue | poste | high |
| 21 | Plage de La Tranche-sur-Mer | 85 | plage | zone | high |
| 22 | Plage de Notre-Dame-de-Monts | 85 | plage | poste | high |
| 23 | Jetée de Jard-sur-Mer | 85 | digue | poste | high |
| 24 | Corniche vendéenne (Sion) | 85 | pointe_rocheuse | poste | high |

## Prochaine étape
1. Tu valides ligne par ligne (priorité au #17, et arbitre le doublon possible Tharon/Saint-Brevin/Courance qui couvrent la même côte de Jade si tu veux densifier ou pas).
2. **Fix GPS appliqué en prod** (addendum) — préalable bloquant.
3. J'insère `seed-spots-lot-2.sql` → prod 38 → **62 spots** (44=12, 85=12), vérif `/carte`, `verified=true`.
4. **Lot 3** : Charente-Maritime 17, Gironde 33, Landes 40, Pays basque 64 (~25 spots) → puis Manche (lot 4) et Méditerranée (lot 5) pour finir la couverture ~110.
