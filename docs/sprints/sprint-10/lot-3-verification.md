# Lot 3 — Atlantique sud-ouest (17/33/40/64) — résultats de vérification

> Sourçage + vérification du 2026-06-21 : 24 candidats, 1 agent/spot (web+géo + confirmation satellite Esri + rédaction FR). Région Nouvelle-Aquitaine.
> SQL : `supabase/seed-spots-lot-3.sql` — **NON inséré** (fix GPS en place, insertion sûre dès ton OK).

## Verdict
- **21 retenus** (tous réels, publics, bon département, calés satellite). **3 écartés** (ci-dessous).
- Espèces : **vraies espèces conservées** (sole, mulet, congre, maigre) — ajoutées à `lib/labels.ts` `SPECIES_LABELS` pour l'affichage (fiches/carte/filtres). Le carnet/onboarding restent sur les 6 cœur (listes séparées, `catchSpeciesEnum`). Aucun `lieu_jaune` (rare au sud de la Loire).

## ⚠️ 3 spots écartés — à trancher (NON dans le SQL)
| Spot | Dépt | Raison |
|---|---|---|
| **jetee-de-belisaire** | 33 | 🚫 **Pêche interdite** : embarcadère navettes Cap Ferret (interdiction depuis 2006, reconduite à la rénovation). Rejeté. |
| **pointe-sainte-anne** (Corniche basque) | 64 | ⏸️ **Accès estran interdit par arrêtés municipaux** (pointe Sainte-Anne → baie de Loya) + sentier littoral fermé depuis 2021. Spot réel mais postes légalement proscrits. À décider. |
| **digue-du-bourret** | 40 | ⏸️ Tombe à **~60 m de l'estacade de Capbreton** (quasi-doublon). À recoordonner sur la vraie digue nord du Boucarot, ou dropper. |

## Corrections notables (agents)
- **Angoulins** : candidat « Pointe du Rocher » → vrai poste = **Pointe du Chay** (toponyme corrigé).
- **wharf-de-la-salie** : le wharf est un **émissaire d'eaux usées, fermé/interdit** → re-scopé sur la **plage de la Salie Sud** adjacente.
- **plage-du-cap-ferret** : pointe sud = pêche interdite (érosion) → recalé sur la **plage du Truc Vert** (nord, autorisée).
- **mimizan / huchet** : re-scopés en **estuaire** (embouchures, le vrai poste).

## Flags d'accès / sécurité à connaître
- **Réserve naturelle du courant d'Huchet** : pêche INTERDITE dans le courant/étang → côté océan uniquement.
- **Écluses à poissons** (Chassiron, Baleines, Chay) : pêche interdite < 50 m, ne pas toucher les pierres.
- **Baïnes** (courants de retour mortels) sur toutes les plages océanes Gironde/Landes (#6, #8-12, #14-16, #21).
- Ports actifs (Cotinière), zones baignade été (Châtelaillon, Hossegor), bouchots/concessions (<50 m).

## Récap des 21 retenus
| Dépt | Spots |
|---|---|
| 17 (7) | Phare de Chassiron · Pointe de la Fumée · Estacade de Châtelaillon · Phare des Baleines · La Cotinière · Pointe de la Coubre · Pointe du Chay |
| 33 (5) | Pointe de Grave · Plage de Soulac · Plage de la Salie Sud · Plage du Truc Vert · Plage de Montalivet |
| 40 (4) | Estacade de Capbreton · Plage d'Hossegor · Embouchure du courant de Mimizan · Courant d'Huchet |
| 64 (5) | Pointe Saint-Martin · Rocher de la Vierge · Digue de Socoa · Pointe Sainte-Barbe · Plage d'Hendaye |

## Prochaine étape
1. Insertion des 21 → prod **62 → 83 spots** (17=7, 33=5, 40=4, 64=5).
2. Décider des 3 écartés (Sainte-Anne, Bourret, Belisaire).
3. Vérif `/carte` + `verified=true`.
4. Lot 4 (Manche : 50, 14, 76, 62, 59) puis lot 5 (Méditerranée : 66, 11, 34, 30, 13, 83, 06) → cible ~110.
