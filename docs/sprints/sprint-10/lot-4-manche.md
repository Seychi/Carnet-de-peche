# LOT 4 — Manche (Normandie → Hauts-de-France) — coordonnées VÉRIFIÉES

> Créé le 2026-06-22, **coordonnées vérifiées le 2026-06-22 via OpenStreetMap** (nœuds réels : phares, caps, digues, jetées, plages) — pas d'estimation de mémoire. Suite de `docs/sprint-10/spots-curation.md`.
> État : lots 1-3 insérés → **83 spots en prod**, **toute la façade Atlantique couverte**. Il reste **zéro spot sur la Manche** (carte vide pour un pêcheur de Cherbourg à Dunkerque) et on est sous « 100+ spots ». Ce lot ouvre la 2ᵉ façade et fait passer à **~109 spots**.
> ⚠️ **Somme (80) EXCLUE** (liste canonique des 24 départements côtiers, sprint 11.6). Lot 4 = **50 · 76 · 14 · 62 · 59**.

## Comment ces coordonnées ont été obtenues (honnêteté)

- Chaque spot a été **géocodé contre OpenStreetMap** et posé sur le **nœud de la structure réelle** (ex. *Gatteville lighthouse* `man_made=lighthouse`, *Pointe du Roc* `natural=cape`, *digue Carnot* la voie sur la digue). **Source vérifiable, pas de mémoire.**
- **21 spots** tombent sur la structure exacte (cap / phare / falaise / digue / jetée / plage).
- **5 spots de port** (marqués `*`) sont posés sur le **bassin/port vérifié** ; le **poste réel = le musoir de la jetée**, à quelques centaines de mètres vers le large — **dans le flou public d'1 km de toute façon**. La colonne « Poste » le précise ; le `geom` précis (abonnés) peut être calé au musoir si tu veux.
- **« Le caillou exact » reste le choix du pêcheur sur place** : la carte le pose sur la bonne structure (digue, cap, jetée), il marche jusqu'à son poste. C'est la bonne granularité pour une épingle de carte (et plus honnête que d'inventer un rocher au mètre).
- ⚠️ Les **postes exposés** (Hague, Gris-Nez, Blanc-Nez, Étretat) : coord sur le repère sûr ; le danger marée/falaise est dans la colonne Poste & dangers.

---

## Manche (50) — Cotentin — 8 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cap de la Hague — Goury (Auderville) | cap-de-la-hague-goury | 50 | 49.71570 | -1.94442 | pointe_rocheuse | 5 | leurres, vif | bar, lieu_jaune, vieille | Platiers autour du petit port de Goury, face au **Raz Blanchard** ⚠️ courants_forts, rochers_glissants, isolation — experts |
| 2 | Pointe de Barfleur — phare de Gatteville | pointe-de-barfleur-gatteville | 50 | 49.69645 | -1.26584 | pointe_rocheuse | 4 | leurres, flottante | bar, lieu_jaune, maquereau, vieille | Platier au pied du phare ⚠️ courants_forts, rochers_glissants, submersion_maree |
| 3 | Saint-Vaast-la-Hougue — digue / fort de la Hougue | digue-de-saint-vaast | 50 | 49.58805 | -1.26406 | digue | 1 | flottante, leurres | bar, maquereau, dorade_royale | Digue du port vers le fort, abritée, familiale ; dorade en été |
| 4 | Digue de Querqueville (Cherbourg) | digue-de-querqueville | 50 | 49.67168 | -1.66360 | digue | 2 | leurres, flottante, surfcasting | bar, maquereau, lieu_jaune | Le long de la digue (extrémité O de la grande rade) ⚠️ vagues gros temps |
| 5 | Cap de Carteret (Barneville-Carteret) | cap-de-carteret | 50 | 49.37277 | -1.80851 | pointe_rocheuse | 3 | leurres, flottante | bar, lieu_jaune, maquereau | Platiers sous le phare/cap (côte O) ⚠️ rochers_glissants, courants_forts |
| 6 | Pointe du Roc (Granville) | pointe-du-roc-granville | 50 | 48.83410 | -1.61418 | pointe_rocheuse | 3 | leurres, flottante | bar, maquereau, vieille | Postes rocheux autour de la pointe + sémaphore ⚠️ courants_forts, submersion_maree (marnage énorme) |
| 7 | Pointe d'Agon (Agon-Coutainville) | pointe-d-agon | 50 | 49.00165 | -1.57551 | plage | 2 | surfcasting, leurres | bar, dorade_royale | Pointe sableuse à l'embouchure du havre de Régneville ⚠️ submersion_maree (montée très rapide), courants_forts |
| 8 `*` | Diélette (Flamanville) — digue du port | digue-de-dielette | 50 | 49.54888 | -1.86613 | digue | 2 | leurres, flottante, surfcasting | bar, lieu_jaune, maquereau | Poste : digue du port de plaisance ⚠️ **proximité centrale de Flamanville — confirmer les zones autorisées** ; vagues |

## Seine-Maritime (76) — Pays de Caux — 6 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 9 | Le Havre — Sainte-Adresse / Cap de la Hève | sainte-adresse-cap-de-la-heve | 76 | 49.51676 | 0.06721 | plage | 2 | surfcasting, leurres, flottante | bar, maquereau, orphie | Perré et estran de Sainte-Adresse jusqu'au pied du cap de la Hève ⚠️ vagues |
| 10 | Étretat — plage de galets | plage-d-etretat | 76 | 49.70746 | 0.20319 | plage | 3 | surfcasting, leurres | bar, maquereau | Galets au centre, au pied des falaises ⚠️ **chutes de pierres + marée qui coupe le retour** |
| 11 | Fécamp — jetée (phare) | jetee-de-fecamp | 76 | 49.76563 | 0.36329 | digue | 1 | flottante, leurres, surfcasting | bar, maquereau, orphie | Musoir de la jetée, au phare ⚠️ vagues |
| 12 `*` | Dieppe — jetées de l'avant-port | jetees-de-dieppe | 76 | 49.93257 | 1.08881 | digue | 1 | flottante, leurres | bar, maquereau, orphie | Poste : jetées Ouest/Pollet à l'entrée du port ⚠️ vagues |
| 13 | Saint-Valery-en-Caux — jetées | jetees-de-saint-valery-en-caux | 76 | 49.86599 | 0.71085 | digue | 1 | flottante, leurres | bar, maquereau | Jetées du port entre les falaises ⚠️ vagues |
| 14 `*` | Le Tréport — jetée Ouest | jetee-du-treport | 76 | 50.06120 | 1.37140 | digue | 1 | flottante, surfcasting, leurres | bar, maquereau | Poste : jetée Ouest + digue de galets ⚠️ vagues |

## Calvados (14) — Côte de Nacre / Fleurie — 4 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 15 `*` | Ouistreham — embouchure de l'Orne | embouchure-de-l-orne-ouistreham | 14 | 49.27990 | -0.24789 | estuaire | 2 | leurres, surfcasting | bar, dorade_royale | Poste : digue de Riva-Bella / jetées à l'embouchure de l'Orne (≈1 km N du phare) ⚠️ courants_forts |
| 16 | Port-en-Bessin — jetées | jetees-de-port-en-bessin | 14 | 49.34961 | -0.77306 | digue | 1 | flottante, leurres | bar, maquereau | Jetées Est/Ouest (au pied des tours) ⚠️ vagues |
| 17 | Trouville-sur-Mer — jetée de la Touques | jetees-de-trouville | 14 | 49.36644 | 0.07558 | estuaire | 1 | flottante, leurres | bar, dorade_royale | Jetée de la Touques (Trouville/Deauville) ⚠️ courants_forts |
| 18 `*` | Courseulles-sur-Mer — jetées du chenal | jetees-de-courseulles | 14 | 49.33407 | -0.46215 | digue | 1 | flottante, leurres, surfcasting | bar, maquereau, dorade_royale | Poste : jetées du chenal du port ; dorade en été |

## Pas-de-Calais (62) — Côte d'Opale — 5 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 19 | Cap Gris-Nez (Audinghen) | cap-gris-nez | 62 | 50.86970 | 1.58485 | pointe_rocheuse | 4 | leurres, flottante | bar, maquereau | Platiers rocheux sous le cap ⚠️ rochers_glissants, falaise, courants_forts, ressac |
| 20 | Cap Blanc-Nez (Escalles) | cap-blanc-nez | 62 | 50.92543 | 1.70695 | plage | 3 | surfcasting, leurres | bar, maquereau | Estran rocheux/galets sous la falaise ⚠️ submersion_maree (montée rapide), falaise |
| 21 | Boulogne-sur-Mer — digue Carnot | digue-carnot-boulogne | 62 | 50.73240 | 1.56589 | digue | 2 | surfcasting, leurres, flottante | bar, maquereau | Le long de la digue Carnot (spot bar mythique) ⚠️ **confirmer l'accès (port en activité, fermetures gros temps)** ; vagues |
| 22 | Wimereux — digue de promenade | digue-de-wimereux | 62 | 50.76503 | 1.60587 | digue | 2 | surfcasting, leurres | bar, maquereau | Le long de la digue de promenade ⚠️ vagues, submersion_maree |
| 23 | Calais — jetée Ouest | jetee-ouest-de-calais | 62 | 50.96941 | 1.84110 | digue | 1 | flottante, surfcasting, leurres | bar, maquereau | Jetée Ouest du port ⚠️ vagues |

## Nord (59) — Côte flamande — 3 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 24 | Dunkerque — digue de Malo-les-Bains | jetee-de-malo-les-bains | 59 | 51.04897 | 2.38463 | digue | 1 | flottante, surfcasting, leurres | bar, maquereau | Digue de Malo + jetées du port Est ⚠️ vagues |
| 25 | Gravelines — phare de Petit-Fort-Philippe | chenal-de-l-aa-gravelines | 59 | 51.00384 | 2.10916 | estuaire | 2 | leurres, surfcasting | bar, maquereau | Jetées du chenal de l'Aa, au pied du phare ⚠️ **proximité centrale — confirmer les zones autorisées** ; courants_forts |
| 26 | Bray-Dunes — plage la plus au nord de France | plage-de-bray-dunes | 59 | 51.08169 | 2.51997 | plage | 2 | surfcasting | bar, maquereau | Vaste estran (frontière belge), surfcasting ⚠️ submersion_maree |

`*` = coordonnée posée sur le **port/bassin vérifié OSM** ; poste réel = **musoir de la jetée** indiqué en colonne (dans le flou public d'1 km ; caler le `geom` précis au musoir si besoin).

---

## Reste à faire (Claude Code)

1. **Rédiger `description` + `access_notes`** voix pêcheur (tutoiement) par spot — en reprenant la colonne « Poste & dangers » (le danger marée/falaise des #1/2/6/7/10/15/20/25 doit être explicite, responsabilité produit).
2. **Générer `supabase/seed-spots-lot-4.sql`** (donnée, pas migration) : `geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)`, `structure` ∈ CHECK, `verified = false`, `visibility = public`.
3. **Insérer + vérifier sur `/carte`** (les 26 doivent tomber sur la bonne digue/cap/jetée) → `docs/sprint-10/lot-4-verification.md`.
4. Résultat : **83 → ~109 spots**, promesse « 100+ » tenue, **3 façades couvertes** une fois le Lot 5 (Méditerranée) fait.

## À trancher en parallèle (rappel)
Le critère des **« 3 spots gratuits par département »** (popularité = prises loguées ? choix édito ? difficulté familiale ?) — à définir avant la beta.
