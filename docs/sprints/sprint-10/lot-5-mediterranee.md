# LOT 5 — Méditerranée (Roussillon → Côte d'Azur) — coordonnées VÉRIFIÉES

> Créé le 2026-06-22, **coordonnées vérifiées via OpenStreetMap** (nœuds réels : phares, caps, môles, marinas) — pas de mémoire. Suite de `docs/sprint-10/spots-curation.md`.
> État : lots 1-4 → **~109 spots en prod**, Atlantique + Manche couverts. Ce lot ouvre la **3ᵉ façade** (Méditerranée continentale, 66→06) → **~139 spots**. La **Corse (2A/2B)** fera un **Lot 6** (façade séparée).
> ⚠️ Liste = **66 · 11 · 34 · 30 · 13 · 83 · 06** (30 spots).

## Méthode & spécificités Méditerranée (honnêteté)

- Chaque spot **géocodé contre OpenStreetMap**, posé sur le **nœud de la structure réelle** (phare du Cap Béar, môle Saint-Louis de Sète, phare de l'Espiguette, phare de Camarat…). Source vérifiable.
- **Espèces Med-correctes** (≠ Atlantique) : `bar` (loup), `dorade_royale`, `sar`, `orphie`, `maquereau` (rare). **JAMAIS `lieu_jaune` ni `vieille`** (espèces atlantiques absentes de la Med). Le sar, lui, est ENFIN à sa place.
- **Dangers Med** : pas de marnage → **pas de `submersion_maree`**. Les vrais risques = `rochers_glissants`, `falaise`, `vagues` (coup de mer / houle d'est qui surprend sur les rochers), `courants_forts` (graus, embouchures), `isolation` (calanques, caps).
- **Accès à vérifier** : ⚠️ **Parc National des Calanques** (#15 Callelongue, #16 Cassis) = zones réglementées / no-take possibles. Cap d'Antibes (#27) = sentier du littoral public mais sections privées. Et beaucoup de **môles portuaires Med interdisent la pêche par arrêté** → à confirmer spot par spot.
- `*` = coord posée sur la **commune/port vérifié** ; poste réel précisé en colonne (dans le flou public d'1 km).

---

## Pyrénées-Orientales (66) — Côte Vermeille / Salanque — 4 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cap Béar (Port-Vendres) | cap-bear | 66 | 42.51557 | 3.13669 | pointe_rocheuse | 4 | leurres, flottante, vif | bar, sar, dorade_royale | Platiers sous le phare ⚠️ rochers_glissants, falaise, vagues (houle d'est) |
| 2 | Cap l'Abeille (Banyuls-sur-Mer) | cap-l-abeille-banyuls | 66 | 42.47619 | 3.15497 | pointe_rocheuse | 4 | leurres, flottante | bar, sar, dorade_royale | Criques rocheuses de la Côte Vermeille ⚠️ rochers_glissants, falaise |
| 3 | Port d'Argelès-sur-Mer | port-d-argeles | 66 | 42.54380 | 3.03717 | digue | 1 | flottante, leurres, surfcasting | bar, dorade_royale, sar | Jetées du port + embouchure du Tech |
| 4 `*` | Le Barcarès — grau de Sainte-Marie | grau-de-sainte-marie-barcares | 66 | 42.79468 | 3.03352 | estuaire | 2 | surfcasting, leurres | bar, dorade_royale | Poste : jetées du grau / lido ⚠️ courants_forts |

## Aude (11) — 3 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 5 | Cap Leucate (Leucate) | cap-leucate | 11 | 42.91773 | 3.06017 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Falaises du cap côté mer ⚠️ falaise, rochers_glissants, vagues (vent) |
| 6 `*` | Gruissan — plage & port | gruissan-plage | 11 | 43.10321 | 3.08584 | plage | 2 | surfcasting, leurres | bar, dorade_royale, sar | Poste : plage + digues du port/grau |
| 7 | Port-la-Nouvelle — jetée | jetee-de-port-la-nouvelle | 11 | 43.01237 | 3.06980 | digue | 1 | flottante, surfcasting, leurres | bar, dorade_royale, maquereau | Jetée au phare ⚠️ vagues |

## Hérault (34) — 5 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 8 | Sète — môle Saint-Louis | mole-saint-louis-sete | 34 | 43.39625 | 3.70141 | digue | 2 | flottante, leurres, surfcasting | bar, dorade_royale, sar, orphie | Le long du môle ⚠️ vagues |
| 9 | Cap d'Agde — rochers volcaniques | cap-d-agde | 34 | 43.29833 | 3.50300 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Rochers basaltiques du cap + môle ⚠️ rochers_glissants, vagues |
| 10 | Palavas-les-Flots — embouchure du Lez | palavas-les-flots | 34 | 43.52781 | 3.93153 | estuaire | 1 | flottante, leurres, surfcasting | bar, dorade_royale | Jetées de l'embouchure du Lez ⚠️ courants_forts |
| 11 | Frontignan-Plage / la Corniche | plage-de-frontignan | 34 | 43.44386 | 3.80080 | plage | 2 | surfcasting, leurres | bar, dorade_royale | Surfcasting le long de la plage |
| 12 | Le Grau-d'Agde — embouchure de l'Hérault | le-grau-d-agde | 34 | 43.28578 | 3.44572 | estuaire | 1 | flottante, surfcasting, leurres | bar, dorade_royale | Jetées de l'embouchure de l'Hérault ⚠️ courants_forts |

## Gard (30) — 2 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 13 `*` | Le Grau-du-Roi — jetées | jetees-du-grau-du-roi | 30 | 43.53601 | 4.13718 | digue | 1 | flottante, leurres, surfcasting | bar, dorade_royale | Poste : jetées du grau / Port-Camargue ⚠️ courants_forts |
| 14 | Pointe de l'Espiguette (Le Grau-du-Roi) | pointe-de-l-espiguette | 30 | 43.48768 | 4.14176 | plage | 2 | surfcasting, leurres | bar, dorade_royale, sar | Plage sauvage au phare ⚠️ courants_forts (bancs) |

## Bouches-du-Rhône (13) — 6 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 15 | Marseille — Callelongue / Cap Croisette | callelongue-cap-croisette | 13 | 43.21273 | 5.35420 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Rochers de Callelongue ⚠️ **Parc National des Calanques (zones réglementées)** ; rochers_glissants, falaise |
| 16 `*` | Cassis — calanque de Port-Miou | cassis-port-miou | 13 | 43.21404 | 5.53963 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Poste : entrée de Port-Miou / rochers du port ⚠️ **Parc National des Calanques** ; falaise |
| 17 | Carry-le-Rouet — port & Côte Bleue | carry-le-rouet | 13 | 43.32937 | 5.15244 | pointe_rocheuse | 2 | leurres, flottante | bar, sar, dorade_royale | Port + criques de la Côte Bleue ⚠️ rochers_glissants |
| 18 | Cap Couronne (Martigues / Carro) | cap-couronne | 13 | 43.32555 | 5.05306 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Platier au phare / Carro ⚠️ rochers_glissants, vagues |
| 19 `*` | Saintes-Maries-de-la-Mer | saintes-maries-de-la-mer | 13 | 43.45159 | 4.42772 | plage | 2 | surfcasting, leurres | bar, dorade_royale | Poste : digue + plages de Camargue ⚠️ courants_forts |
| 20 | Port-Saint-Louis — plage Napoléon (embouchure du Rhône) | plage-napoleon-port-saint-louis | 13 | 43.35641 | 4.88636 | estuaire | 2 | surfcasting, leurres, vif | bar, dorade_royale | Plage Napoléon / embouchure du Grand Rhône ⚠️ courants_forts |

## Var (83) — 6 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 21 | La Ciotat — bec de l'Aigle / port | la-ciotat | 83 | 43.18709 | 5.62700 | pointe_rocheuse | 2 | leurres, flottante | bar, sar, dorade_royale | Port + rochers sous le bec de l'Aigle ⚠️ rochers_glissants |
| 22 | Sanary-sur-Mer — port & pointe de la Cride | sanary-sur-mer | 83 | 43.11616 | 5.80086 | digue | 1 | flottante, leurres | bar, dorade_royale, sar, orphie | Jetées du port + pointe de la Cride |
| 23 | Toulon — plages du Mourillon | mourillon-toulon | 83 | 43.10714 | 5.94971 | plage | 1 | flottante, leurres, surfcasting | bar, dorade_royale, sar | Plages + digues du Mourillon |
| 24 | Presqu'île de Giens (Hyères) | presqu-ile-de-giens | 83 | 43.03919 | 6.11269 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Rochers de la presqu'île (La Madrague) ⚠️ rochers_glissants, vagues |
| 25 | Cap Dramont (Saint-Raphaël) | cap-dramont | 83 | 43.41398 | 6.85272 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Roches rouges sous le sémaphore ⚠️ rochers_glissants, falaise |
| 26 | Cap Camarat (Ramatuelle) | cap-camarat | 83 | 43.20095 | 6.67451 | pointe_rocheuse | 4 | leurres, flottante | bar, sar, dorade_royale | Platiers sous le phare (côté Pampelonne) ⚠️ rochers_glissants, falaise, isolation |

## Alpes-Maritimes (06) — Côte d'Azur — 4 spots

| # | Spot (commune) | Slug | Dépt | Lat | Lng | Structure | Diff. | Techniques | Espèces | Poste & dangers (vérifié OSM) |
|---|---|---|---|---|---|---|---|---|---|---|
| 27 | Cap d'Antibes — phare de la Garoupe | cap-d-antibes | 06 | 43.56434 | 7.13272 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Rochers du sentier de Tirepoil ⚠️ sentier public (sections privées) ; rochers_glissants, falaise |
| 28 | Nice — embouchure du Var | embouchure-du-var-nice | 06 | 43.65583 | 7.18222 | estuaire | 2 | leurres, surfcasting, vif | bar, dorade_royale | Galets de l'embouchure du Var (Nice/Saint-Laurent) ⚠️ courants_forts |
| 29 | Cap Ferrat (Saint-Jean-Cap-Ferrat) | cap-ferrat | 06 | 43.67520 | 7.32687 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Pointe Saint-Hospice / sentier littoral ⚠️ rochers_glissants, falaise |
| 30 `*` | Cap Martin (Roquebrune-Cap-Martin) | cap-martin | 06 | 43.76506 | 7.45994 | pointe_rocheuse | 3 | leurres, flottante | bar, sar, dorade_royale | Poste : pointe de Cap-Martin / sentier Le Corbusier ⚠️ rochers_glissants |

`*` = coord = commune/port vérifié OSM ; poste réel précisé en colonne (dans le flou public d'1 km ; caler le `geom` précis au besoin).

---

## Reste à faire (Claude Code)

1. **Descriptions** `description` + `access_notes` voix pêcheur (tutoiement) par spot, depuis la colonne « Poste & dangers ». **Danger rochers/houle explicite** pour les caps exposés (#1,2,5,9,15,16,18,24,25,26,27,29) ; **mention Parc National des Calanques** pour #15/#16 ; **rappel « vérifier l'arrêté municipal/portuaire »** pour les môles (interdiction de pêche fréquente en Med).
2. **SQL** `supabase/seed-spots-lot-5.sql` (donnée, PAS migration) : `geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)`, `structure` ∈ CHECK, `techniques` ∈ {leurres,surfcasting,flottante,vif}, `species` ∈ {bar,dorade_royale,sar,maquereau,orphie} (zéro lieu_jaune/vieille), `verified = false`, `visibility='public'` ; laisse le trigger générer `geom_public`.
3. **Avant le SQL** : **supabase-guard** (RO) pour confirmer le vrai schéma `spots` + valeurs CHECK.
4. **Insertion prod sous validation** (pas d'écriture MCP sauvage) → puis **qa-chrome** vérifie sur `/carte` que les 30 tombent sur le bon cap/môle/grau (et pas dans les terres pour les `*`).
5. `docs/sprint-10/lot-5-verification.md` + maj compteur `spots-curation.md` (~109 → ~139).

## Ensuite
- **Lot 6 = Corse (2A/2B)** pour compléter la façade Med (Ajaccio, Bonifacio, Cap Corse, Calvi, Porto-Vecchio…) — même méthode OSM.
- Décision parallèle toujours en attente : critère des **« 3 spots gratuits/département »**.
