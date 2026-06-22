# LOT 6 — Corse (2A / 2B) — coordonnées VÉRIFIÉES

> Créé le 2026-06-22, **coordonnées vérifiées via OpenStreetMap** (phares, caps, marinas) — pas de mémoire. Suite de `docs/sprint-10/spots-curation.md`.
> État : lots 1-5 → **~139 spots en prod** (Atlantique + Manche + Méditerranée continentale). Ce lot ajoute la **Corse** → **~157 spots, couverture nationale complète**.
> 18 spots : **2B Haute-Corse (9)** + **2A Corse-du-Sud (9)**.

## ⚠️ GARDE-FOU n°1 — codes département corses (à confirmer AVANT d'insérer)

La Corse utilise **`2A`** (Corse-du-Sud) et **`2B`** (Haute-Corse) — **alphanumériques**, pas `20`. **Claude Code DOIT vérifier** que l'app les gère partout avant d'insérer ce lot :
- `lib/geo/departments.ts` (`DEPARTMENT_LABELS` + la liste des 24 départements côtiers) contient-il bien `2A`/`2B` ?
- `can_post_in_department`, les filtres carte, l'onboarding, le fil (`/fil/[department]`) acceptent-ils `2A`/`2B` ?
- La colonne `spots.department` (`char`) accepte-t-elle 2 caractères dont une lettre ? (les lots précédents n'utilisaient que des chiffres)

→ Si l'un de ces points manque, **`⚠️ DEMANDER À JOHN`** : il faut aligner `lib/geo/departments.ts` (et peut-être une migration) **avant** ce lot, sinon les spots corses seront orphelins (pas de page dépt, pas de fil, filtres cassés).

## Méthode & spécificités Corse

- Chaque spot géocodé sur OSM (nœud réel : *Phare de Pertusato*, *Pointe de la Parata*, *Phare de la Pietra*…). **Filtre `countrycodes=fr` obligatoire** (sans lui, « Porto-Vecchio » tombe sur un homonyme à l'Île Maurice — vérifié).
- **Espèces** : `bar` (loup), `dorade_royale`, `sar`, `orphie`. **Pas de `lieu_jaune`/`vieille`** (atlantiques).
- **Dangers spécifiques** : **Bouches de Bonifacio (Pertusato/Bonifacio) = courants + vents parmi les plus violents de Méditerranée** ; **Cap Corse** idem (libeccio/houle). `rochers_glissants`, `falaise`, `vagues`, `courants_forts`, `isolation`.
- **Accès** : zones de **réserves naturelles** (Bouches de Bonifacio / Lavezzi, Scandola côté Porto) — la pêche du bord reste possible sur la plupart des postes publics, mais **noter les zones réglementées** ; Sanguinaires = réserve (la pointe de la Parata reste publique).
- `*` = coord = commune/port vérifié ; poste précisé (dans le flou public d'1 km).

---

## Haute-Corse (2B) — 9 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Barcaggio — pointe du Cap Corse (Ersa) | barcaggio-cap-corse | 2B | 43.00611 | 9.40216 | pointe_rocheuse | 4 | leurres, flottante | bar, sar, dorade_royale | Pointe N du Cap Corse face à la Giraglia ⚠️ courants_forts, vagues, isolation |
| 2 | Port de Centuri (Centuri) | port-de-centuri | 2B | 42.96616 | 9.35055 | digue | 1 | flottante, leurres | bar, dorade_royale, sar, orphie | Petit port de pêche emblématique du Cap Corse ⚠️ vagues |
| 3 | Port de Macinaggio (Rogliano) | port-de-macinaggio | 2B | 42.95942 | 9.45479 | digue | 1 | flottante, leurres | bar, dorade_royale, sar | Marina E du Cap Corse, jetées accessibles |
| 4 | Saint-Florent — port | port-de-saint-florent | 2B | 42.67994 | 9.29932 | digue | 1 | flottante, leurres, surfcasting | bar, dorade_royale, sar | Jetées du port au fond du golfe ⚠️ vagues |
| 5 | L'Île-Rousse — phare de la Pietra | phare-de-la-pietra-ile-rousse | 2B | 42.64456 | 8.93208 | digue | 2 | flottante, leurres | bar, sar, dorade_royale | Jetée/îlot de la Pietra (par la chaussée) ⚠️ rochers_glissants, vagues |
| 6 | Bastia — jetée du Dragon / Vieux-Port | jetee-du-dragon-bastia | 2B | 42.69372 | 9.45399 | digue | 1 | flottante, leurres | bar, dorade_royale, sar, orphie | Le long de la jetée ⚠️ vagues |
| 7 | Plage de la Marana (Borgo) | plage-de-la-marana | 2B | 42.57267 | 9.52313 | plage | 2 | surfcasting, leurres | bar, dorade_royale | Long lido sableux E de Bastia, surfcasting ⚠️ courants_forts |
| 8 | Plage de Padulone — embouchure du Tavignano (Aléria) | plage-de-padulone-aleria | 2B | 42.10784 | 9.55021 | estuaire | 2 | surfcasting, leurres, vif | bar, dorade_royale | Embouchure du Tavignano + plage, loup réputé ⚠️ courants_forts |
| 9 | Port de Taverna / Campoloro (Santa-Maria-Poghju) | port-de-campoloro | 2B | 42.34012 | 9.54099 | digue | 1 | flottante, leurres, surfcasting | bar, dorade_royale, sar | Plus grand port de la côte E, jetées accessibles |

## Corse-du-Sud (2A) — 9 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | Pointe de la Parata / Sanguinaires (Ajaccio) | pointe-de-la-parata | 2A | 41.89865 | 8.61243 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Pointe rocheuse face aux Sanguinaires (tour génoise) ⚠️ rochers_glissants, vagues ; réserve (îles) |
| 11 | Ajaccio — port Tino Rossi / jetée | port-tino-rossi-ajaccio | 2A | 41.91873 | 8.74136 | digue | 1 | flottante, leurres | bar, dorade_royale, sar, orphie | Jetées du vieux port sous la citadelle |
| 12 | Capo di Feno (Ajaccio) | capo-di-feno | 2A | 41.96332 | 8.59237 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Pointe rocheuse sauvage NO d'Ajaccio ⚠️ rochers_glissants, vagues, isolation |
| 13 | Marine de Porto — tour génoise (Ota) | marine-de-porto | 2A | 42.26750 | 8.69628 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Postes rocheux au pied de la tour (golfe de Porto) ⚠️ rochers_glissants, falaise ; réserve de Scandola à proximité |
| 14 | Port de Propriano (Golfe du Valinco) | port-de-propriano | 2A | 41.67726 | 8.89862 | digue | 1 | flottante, leurres, surfcasting | bar, dorade_royale, sar | Jetées du port au fond du Valinco |
| 15 | Tour de Campomoro (Belvédère-Campomoro) | tour-de-campomoro | 2A | 41.63885 | 8.80725 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Pointe rocheuse sous la plus grande tour génoise de Corse ⚠️ rochers_glissants, isolation |
| 16 | Phare de Pertusato (Bonifacio) | phare-de-pertusato | 2A | 41.36751 | 9.18443 | pointe_rocheuse | 5 | leurres, flottante | bar, sar, dorade_royale | Pointe S de la Corse ⚠️ **Bouches de Bonifacio : courants + vents extrêmes**, falaise, isolation — experts |
| 17 `*` | Bonifacio — goulet / port | port-de-bonifacio | 2A | 41.38772 | 9.16858 | digue | 2 | flottante, leurres | bar, dorade_royale, sar | Poste : quais du goulet sous les falaises ⚠️ courants_forts (Bouches de Bonifacio) |
| 18 `*` | Porto-Vecchio — port / golfe | port-de-porto-vecchio | 2A | 41.59114 | 9.27945 | digue | 1 | flottante, leurres, surfcasting | bar, dorade_royale, sar | Poste : jetées de la marina au fond du golfe |

`*` = coord = commune/port vérifié OSM ; poste réel = jetées du port (dans le flou public d'1 km).

---

## Reste à faire (Claude Code)

0. **D'ABORD le garde-fou n°1** : confirmer que `2A`/`2B` sont gérés (departments, fil, filtres, schéma). Sinon `⚠️ DEMANDER À JOHN` / aligner avant.
1. `description` + `access_notes` voix pêcheur par spot depuis « Poste & dangers » — **danger courants/vents explicite** pour Pertusato/Bonifacio (#16/#17) et Cap Corse (#1) ; mention **réserves naturelles** (#10 Sanguinaires, #13 Scandola/Porto).
2. `supabase/seed-spots-lot-6.sql` (donnée, PAS migration) : `geom = ST_SetSRID(ST_MakePoint(lng,lat),4326)`, `department` ∈ {`2A`,`2B`}, `structure` ∈ CHECK, `species` ∈ {bar,dorade_royale,sar,orphie} (zéro lieu_jaune/vieille), `verified=false`, `visibility='public'`, trigger pour `geom_public`.
3. **supabase-guard** (RO) avant le SQL ; **insertion prod sous validation** ; **qa-chrome** vérifie sur `/carte` (les 18 sur le bon cap/port, et que les pages `/fil/2A` `/fil/2B` existent).
4. `docs/sprint-10/lot-6-verification.md` + maj `spots-curation.md` (~139 → ~157, **couverture nationale complète**).

## Bilan curation
Lots 1-6 = **~157 spots curés** sur **toutes les façades** (Bretagne, Atlantique, Manche, Méditerranée, Corse). Promesse « 100+ spots » largement tenue. Reste la décision **« 3 spots gratuits/département »** à trancher avant la beta.
