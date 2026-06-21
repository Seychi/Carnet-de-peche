# Lot 1 — résultats de vérification (avant insertion)

> Passe de vérification adversariale du 2026-06-15 : 1 agent par spot (web + géo), sur la proposition `spots-curation.md §5`. Objectif : repérer spots hallucinés, coords fausses, accès/légal douteux, **avant** ta validation ligne par ligne.
> SQL prêt (non inséré) : `supabase/seed-spots-lot-1.sql` (`verified = false`, coords corrigées appliquées).

## Verdict global

- **28/28 spots : réels, publics, département correct.** Aucun spot inventé, aucun département faux. La proposition tient.
- **Coords** : 7 OK (±200 m) · ~14 « bon lieu, recalé sur point canonique » · **7 franchement fausses, corrigées** (détail ci-dessous).
- **Toutes les coords restent à confirmer sur satellite** (c'est ta validation, `verified=false`).

## ⚠️ Les 7 coords FAUSSES (corrigées dans le SQL — à re-vérifier en priorité)

| # | Spot | Problème détecté | Corrigé vers |
|---|---|---|---|
| 3 | Pointe de Dinan | **~5 km hors site, quasi sur Pen-Hir (déjà en seed !)** | 48.2333 / -4.5667 |
| 6 | Rochers de Saint-Guénolé | tombait sur une rue résidentielle du bourg | 47.8195 / -4.3795 |
| 7 | Pointe de Trévignon | ~1 km au SSE, dans l'eau | 47.7983 / -3.8495 |
| 13 | Digue du port d'Erquy | ~850 m trop à l'est (sur la plage, pas le môle) | 48.6358 / -2.4765 |
| 15 | Port de Gwin Zégal | ~800 m trop à l'ouest (sur le plateau/falaise) | 48.7014 / -2.8962 |
| 21 | Plage du Sillon | ~800 m trop à l'est | 48.6555 / -2.004 |
| 22 | Pointe de la Varde | ~1,5 km hors site (vers Rothéneuf) | 48.6828 / -1.9892 |

## ⚠️ Drapeaux légaux / d'accès à trancher

- **#11 Cap Fréhel — RÉSERVE BAR** : pêche du bar **interdite du 1er mars au 31 mai** (arrêté DDAM 22 n°116/2005, les coords sont en plein dedans). Intégré dans la description ; à toi de décider si on garde `bar` en espèce affichée ou si on le retire de la fiche.
- **#20 Môle des Noires** : ne pêche **qu'à marée haute** (3-4 m d'eau) — utile pour le scoring marée.
- **#21 Plage du Sillon** / **#5 La Torche** : plages surveillées l'été → pêche interdite zone de bain (8h-20h / 13h-19h) → pratique de nuit/hors créneau.
- **Ports actifs** (#8 Roscoff, #13 Erquy, #14 Port d'Armor, #17 Arcouest, #26 Port-Navalo) : pas d'arrêté anti-canne trouvé, mais respecter zones de manœuvre / 100 m portuaire.
- **Natura 2000 / Conservatoire** (#9, #10, #18, #22, #25) : pas d'interdiction de pêche, juste rester sur les sentiers balisés.

## Points de jugement (confiance moyenne / suggestions)

- **#16 Pointe du Roselier** (confiance moyenne) : la réputation « canne » de Plérin est surtout documentée sur la **Pointe des Tablettes**, pas le Roselier. À garder ou à remplacer par les Tablettes selon ce que tu connais.
- **#26 Port-Navalo** : du bord, le **lieu jaune** domine les prises (récit local) → envisager de l'ajouter aux espèces ; difficulté **4** plutôt que 3 vu la violence du courant.
- **#9 Primel** : poste réel à recaler ~48.7195 / -3.823 (cœur des postes) sur satellite.
- **#18 Plougrescant** : ne pas approcher Castel Meur (maison privée) ; pêcher les plateaux autour.

## Tableau récap (28)

| # | Spot | Dépt | Réel | Dépt OK | Coords | Confiance |
|---|---|---|---|---|---|---|
| 1 | Pointe Saint-Mathieu | 29 | ✓ | ✓ | OK | high |
| 2 | Phare du Petit Minou | 29 | ✓ | ✓ | recalé | high |
| 3 | Pointe de Dinan | 29 | ✓ | ✓ | **CORRIGÉ** | high |
| 4 | Pointe du Millier | 29 | ✓ | ✓ | recalé | high |
| 5 | Plage de la Torche | 29 | ✓ | ✓ | OK | high |
| 6 | Rochers de Saint-Guénolé | 29 | ✓ | ✓ | **CORRIGÉ** | high |
| 7 | Pointe de Trévignon | 29 | ✓ | ✓ | **CORRIGÉ** | high |
| 8 | Jetée vieux port Roscoff | 29 | ✓ | ✓ | OK | medium |
| 9 | Pointe de Primel | 29 | ✓ | ✓ | recalé | high |
| 10 | Aber Wrac'h — Ste-Marguerite | 29 | ✓ | ✓ | OK | high |
| 11 | Cap Fréhel | 22 | ✓ | ✓ | OK (sommet) | high |
| 12 | Sillon de Talbert | 22 | ✓ | ✓ | recalé (était au village) | high |
| 13 | Digue port d'Erquy | 22 | ✓ | ✓ | **CORRIGÉ** | high |
| 14 | Môle du port d'Armor | 22 | ✓ | ✓ | OK | high |
| 15 | Port de Gwin Zégal | 22 | ✓ | ✓ | **CORRIGÉ** | high |
| 16 | Pointe du Roselier | 22 | ✓ | ✓ | recalé | medium |
| 17 | Pointe de l'Arcouest | 22 | ✓ | ✓ | OK | high |
| 18 | Pointe du Château (Plougrescant) | 22 | ✓ | ✓ | recalé | medium |
| 19 | Pointe du Grouin | 35 | ✓ | ✓ | recalé | high |
| 20 | Môle des Noires | 35 | ✓ | ✓ | OK | high |
| 21 | Plage du Sillon | 35 | ✓ | ✓ | **CORRIGÉ** | high |
| 22 | Pointe de la Varde | 35 | ✓ | ✓ | **CORRIGÉ** | high |
| 23 | Pointe du Moulinet | 35 | ✓ | ✓ | OK | high |
| 24 | Pointe du Percho | 56 | ✓ | ✓ | **CORRIGÉ** | high |
| 25 | Grande plage de Gâvres | 56 | ✓ | ✓ | recalé | high |
| 26 | Port-Navalo | 56 | ✓ | ✓ | OK | high |
| 27 | Pointe du Grand Mont | 56 | ✓ | ✓ | recalé (était au large) | high |
| 28 | Barre d'Étel | 56 | ✓ | ✓ | OK | high |

## Confirmation satellite (2026-06-15) — 2e passe

Après la vérif réel/public/département, **chaque coordonnée a été confirmée sur ortho satellite** (Esri World Imagery) par 28 agents qui ont regardé l'image et calé le pin sur le **vrai poste de pêche** (centre de l'image = la coordonnée). Constat majeur : la plupart des coords « sources » (Wikipédia/OSM) tombaient sur le **plateau herbeux**, **dans l'eau** ou **dans le bourg** — pas sur le poste. Décalages appliqués : de 50 à 570 m.

Résultat :
- **22 spots verrouillés sur le poste exact** (rocher au bord de l'eau / corps du môle).
- **6 spots « zone »** (grandes plages / grandes pointes à postes multiples) : point d'accès représentatif correct, pas un point unique → #5 La Torche, #10 Aber Wrac'h, #12 Sillon de Talbert, #21 Plage du Sillon, #22 Pointe de la Varde, #25 Gâvres.
- **0 spot non verrouillable** (aucun tenu hors lot).
- **#19 Pointe du Grouin** : un agent avait dérivé sur un rocher voisin en croyant le cap ailleurs (à tort). Coord re-calée sur la valeur **Wikipédia (48.7123, -1.8442)** puis re-confirmée au satellite (cap rocheux, GR34, ressac) → OK.
- **#22 Pointe de la Varde** : seul spot en confiance *moyenne* (grande pointe, plateformes multiples) — le pin est sur la roche au bord de l'eau, mais c'est un poste représentatif.

Les coordonnées du SQL `seed-spots-lot-1.sql` sont **ces coords confirmées**.

## ✅ Inséré en prod le 2026-06-21

Les 28 spots sont **insérés en prod** (`seed-spots-lot-1.sql` joué via le MCP Supabase) → la prod passe de **10 à 38 spots** : **29 = 18, 22 = 8, 35 = 5, 56 = 7**. `geom_public` (flou 1 km) généré par le trigger pour les 28, tous `verified = false`. Décisions appliquées : Cap Fréhel (bar conservé + mention interdiction 1ᵉʳ mars–31 mai), Port-Navalo (`+lieu_jaune`, difficulté 4), Roselier (conservé).

**Reste à ta main** : coup d'œil sur `/carte` (les pins sont calés satellite, mais un check humain ne fait pas de mal) puis passage `verified = true` spot par spot. Puis on enchaînera le **lot 2** (Loire-Atlantique 44 + Vendée 85, pré-liste §6) — **après ton autre brief**.
