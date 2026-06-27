# Sprint 41 — WS B : note de revue « La carte dense »

> Rédigée le 2026-06-27. Lane OPS du sprint 41 (densification du catalogue de spots).
> **Rien n'a été inséré en base.** Cette note accompagne 3 fichiers de seed PRÊTS pour ta
> revue + insertion à la main (jamais rejoués) :
> - `supabase/seed-spots-import-osm-02.sql` (import OSM, 1471 candidats, `source='imported'`)
> - `supabase/seed-spots-lot-7.sql` (curé Méditerranée, 30 spots, `source` omis → `curated`)
> - `supabase/seed-spots-lot-8.sql` (curé Atlantique sud, 28 spots, `source` omis → `curated`)

---

## 0. État de départ + objectif

- **158 spots publics** aujourd'hui (157 curés + 1 communauté), sur 25 dépts côtiers (24 + 2A/2B).
- Façades **sous-couvertes** ciblées : Atlantique sud (17/33/40/64) et Méditerranée (66/11/34/30/13/83/06). La Bretagne est déjà dense.
- **Objectif John : 400+ spots** (curés + importés), zones actives (WS A) comptées à part.

### Total projeté vs 400+

| Source | Spots | Statut |
|---|---|---|
| Existant (curés + communauté) | 158 | en prod |
| Lot 7 curé (Méditerranée) | +30 | proposé, à valider/insérer |
| Lot 8 curé (Atlantique sud) | +28 | proposé, à valider/insérer |
| **Sous-total curé** | **216** | |
| Import OSM `-02` (candidats bruts) | +1471 | à filtrer par façade (voir §2) |
| Import OSM après filtrage réaliste (~50-60 %) | **~750-900** | estimation après retrait des pontons de marina et des doublons fins |
| **TOTAL PROJETÉ** | **~950-1100** | **largement au-dessus de 400+** |

> Même en gardant une fourchette **conservatrice** sur l'import (si tu ne valides que ~250-300 structures OSM nommées « vraiment pêchables » par façade), le total dépasse 400+ dès l'insertion des 2 lots curés + une première façade OSM. L'objectif est **atteignable sans forcer la qualité.**

---

## 1. Méthodo (rappel des garde-fous tenus)

**Import OSM** (`seed-spots-import-osm-02.sql`, généré par le script du sprint 10, copié en scratchpad avec sortie redirigée vers `-02` pour ne pas écraser le `-01`) :
- Interroge l'API Overpass sur les **24 dépts côtiers** (bboxes de `scripts/import-osm-spots.ts`).
- **Structures NOMMÉES uniquement** (`tags.name` requis → anti spot-burning). Exclut `access=private/customers/no`.
- Mapping : `man_made=pier/breakwater/groyne` → `digue` ; `man_made=quay` → `cale` ; `natural=cape` → `pointe_rocheuse`.
- **Tous `source='imported'`, `verified=false`, `moderation_status='approved'`, `visibility='public'`** (vérifié : ligne 19 du fichier, valeurs littérales, 0 occurrence de `verified=true`/`curated`/`community`).
- **Dédup 150 m** : (a) intra-lot en mémoire (le script écarte deux candidats OSM à < 150 m l'un de l'autre) + (b) **contre l'existant au moment de l'insertion** via `WHERE NOT EXISTS (... ST_DWithin(s.geom, candidat, 150))` (lignes 1493-1500). Aucun candidat ne sera inséré à < 150 m d'un spot déjà en base.
- **Attribution ODbL** présente dans l'en-tête (© OpenStreetMap contributors). La carte affiche déjà l'attribution (MapLegend).
- `geom_public` (flou) **non écrit** : rempli par le trigger `blur_spot_geom` à l'insertion.

> ⚠️ Le script écrit dans `renderSql` un en-tête qui dit encore « seed-spots-import-osm-01.sql » (chaîne en dur). C'est cosmétique, le fichier réel est bien `-02`. À corriger dans le script si tu réutilises (non bloquant).
> ⚠️ `region` est écrit en casse propre (« Occitanie », « Provence-Alpes-Côte d'Azur », « Bretagne ») alors que les lots curés utilisent le slug minuscule (`occitanie`, `provence-alpes-cote-d-azur`). À harmoniser avant insertion si tu veux une cohérence stricte de `region` (sinon, sans impact fonctionnel : `region` est du texte libre).

**Lots curés** (`lot-7`, `lot-8`) : process inchangé du sprint 10 (`docs/sprint-10/spots-curation.md`) :
- Recherche documentaire (structures réelles nommées, OSM/Géoportail + croisement guides/ports). **Aucune invention de spot ni de coordonnée.**
- Coordonnées **approximatives** (poste au bord de l'eau, pas le centre du village ni le sommet d'un phare). ⚠️ **À recaler au satellite Esri spot par spot avant `verified=true`**, exactement comme les lots 1-6.
- `source` **omis** → default `curated`. `verified=false` à l'insert. `visibility='public'` forcé. Structures dans le CHECK, espèces/dangers corrects par façade.
- Slugs **vérifiés uniques** : 30 + 28 sans doublon interne, sans collision croisée, **sans collision avec les slugs existants en prod** (depts 17/33/40/64/66/11/34/30/13/83/06).

---

## 2. Import OSM — candidats par façade et par département

**1471 candidats** retenus au total (Overpass a répondu sur les 24 dépts ; quelques 429 absorbés par le back-off du script). Répartition par structure : **961 `pointe_rocheuse`** (caps/pointes), **491 `digue`** (jetées/môles/épis/brise-lames), **18 `cale`** (slipways).

### Façade MANCHE / Hauts-de-France (5 dépts)

| Dépt | Candidats OSM | Dont pontons génériques* |
|---|---|---|
| 14 (Calvados) | 60 | 4 |
| 50 (Manche) | 58 | 0 |
| 76 (Seine-Maritime) | 15 | 0 |
| 62 (Pas-de-Calais) | 26 | 0 |
| 59 (Nord) | 2 | 0 |
| **Sous-total Manche** | **161** | **4** |

### Façade ATLANTIQUE (Bretagne + Pays de Loire + Atlantique sud, 10 dépts)

| Dépt | Candidats OSM | Dont pontons génériques* |
|---|---|---|
| 22 (Côtes-d'Armor) | 94 | 2 |
| 29 (Finistère) | 235 | 3 |
| 35 (Ille-et-Vilaine) | 26 | 0 |
| 56 (Morbihan) | 131 | 4 |
| 44 (Loire-Atlantique) | 44 | 1 |
| 85 (Vendée) | 39 | 2 |
| 17 (Charente-Maritime) | 74 | 8 |
| 33 (Gironde) | 38 | 3 |
| 40 (Landes) | 15 | 0 |
| 64 (Pyrénées-Atlantiques) | 15 | 0 |
| **Sous-total Atlantique** | **711** | **23** |

### Façade MÉDITERRANÉE (continentale + Corse, 9 dépts)

| Dépt | Candidats OSM | Dont pontons génériques* |
|---|---|---|
| 66 (Pyrénées-Orientales) | 41 | 8 |
| 11 (Aude) | 3 | 1 |
| 34 (Hérault) | 39 | 9 |
| 30 (Gard) | 10 | 6 |
| 13 (Bouches-du-Rhône) | 105 | 0 |
| 83 (Var) | 173 | 1 |
| 06 (Alpes-Maritimes) | 65 | 3 |
| 2A (Corse-du-Sud) | 83 | 0 |
| 2B (Haute-Corse) | 80 | 0 |
| **Sous-total Méditerranée** | **599** | **28** |

\* **Pontons génériques** = noms type « Ponton A/B/C… », « Embarcadère », « Quai J », « Cale » seuls. Au total **~102 noms « Ponton X »** sur les 1471 : ce sont des **fingers de marina**, peu ou pas pêchables. Idem certains caps OSM des Calanques (Sormiou, Morgiou, Cap Morgiou, Bec de Sormiou…) tombent dans le **cœur du Parc National** où la pêche du bord est strictement encadrée/interdite.

### Qualité honnête de l'import (à savoir avant de filtrer)

L'import est **brut** : il faut le passer en revue **par façade** (livré ainsi pour ça). Trois choses à filtrer pendant ta revue :
1. **Les pontons/cales de marina nommés génériquement** (« Ponton C », « Cale de mise à l'eau »…) : structures réelles mais sans intérêt halieutique. ~102+ lignes.
2. **Les caps en zone réglementée** (Calanques cœur de parc, réserves marines, zones militaires) : OSM ne connaît pas la réglementation, le filtre `access=private` ne suffit pas.
3. **Les pointes redondantes** : sur le Finistère (235) et le Var (173), beaucoup de micro-pointes nommées très proches les unes des autres (le dédup 150 m en écarte une partie, mais pas toutes les pointes d'un même massif).

> **Recommandation** : valide l'import **façade par façade** (ou même dépt par dépt sur les gros : 29, 56, 83, 13). Un `DELETE` ciblé des `name LIKE 'Ponton%'` / `name LIKE 'Embarcadère%'` avant insertion réglerait le gros du bruit en une requête. Je peux te préparer ce filtre si tu veux (sans l'exécuter).

---

## 3. Lot 7 curé — MÉDITERRANÉE (30 spots) — PROPOSITION

Façades sous-couvertes, structures réelles nommées, espèces 100 % Med (bar/loup, dorade_royale, sar, orphie, maquereau : **zéro lieu_jaune/vieille**), **zéro `submersion_maree`** (pas de marnage en Med).

| # | Dépt | Spot | Commune | Structure | Source / confiance coord |
|---|---|---|---|---|---|
| 1 | 66 | Pointe Saint-Vincent | Collioure | pointe_rocheuse | OSM (chapelle St-Vincent), à recaler |
| 2 | 66 | Môle du port | Port-Vendres | digue | OSM, viser le musoir |
| 3 | 66 | Anse de Paulilles | Port-Vendres | plage | OSM (site classé) |
| 4 | 66 | Jetée du port | Canet-en-Roussillon | digue | OSM, à recaler |
| 5 | 66 | Digue du port | Cerbère | digue | OSM (lisière réserve Cerbère-Banyuls, flag) |
| 6 | 11 | Jetée nord de Port-Leucate | Leucate | digue | OSM, à recaler |
| 7 | 11 | Roc de la Batterie | Fleury (St-Pierre-la-Mer) | pointe_rocheuse | OSM (relief de la Clape) |
| 8 | 11 | Jetée du port | Narbonne-Plage | digue | OSM, à recaler |
| 9 | 11 | Grande plage de La Franqui | Leucate | plage | OSM |
| 10 | 34 | Plage du Lazaret (la Corniche) | Sète | plage | OSM |
| 11 | 34 | Embouchure de l'Orb | Valras-Plage | estuaire | OSM (jetée/embouchure) |
| 12 | 34 | Digues du grau | Marseillan-Plage | estuaire | à recaler (débouché en mer) |
| 13 | 34 | Embouchure du Libron | Vias-Plage | estuaire | à recaler (zone dunaire) |
| 14 | 30 | Plage Sud de Port-Camargue | Le Grau-du-Roi | plage | OSM |
| 15 | 30 | Épis du Boucanet | Le Grau-du-Roi | digue | OSM |
| 16 | 30 | Plage Rive Gauche | Le Grau-du-Roi | plage | OSM |
| 17 | 30 | Espiguette (section ouest) | Le Grau-du-Roi | plage | OSM |
| 18 | 13 | Môle de la Pointe Rouge | Marseille (8e) | digue | à recaler (digue du large, hors parc) |
| 19 | 13 | Port et jetées de Carro | Martigues | digue | OSM (Parc Marin Côte Bleue, flag) |
| 20 | 13 | Digues du port | Sausset-les-Pins | digue | à recaler (Parc Marin, flag) |
| 21 | 13 | Calanque de Niolon | Le Rove | pointe_rocheuse | OSM (Parc Marin, accès train, flag) |
| 22 | 13 | Plage du Cavaou | Fos-sur-Mer | plage | OSM (hors parc) |
| 23 | 83 | Môle Jean Réveille | Saint-Tropez | digue | OSM |
| 24 | 83 | Digue du port | Bandol | digue | à recaler (digue extérieure) |
| 25 | 83 | Presqu'île du Gaou | Le Brusc (Six-Fours) | pointe_rocheuse | OSM (Natura 2000) |
| 26 | 83 | Digue du port | Le Lavandou | digue | à recaler |
| 27 | 83 | Digue du port | Cavalaire-sur-Mer | digue | à recaler |
| 28 | 06 | Jetée du large du port Lympia | Nice | digue | OSM (phare) |
| 29 | 06 | Digue du Port Vauban | Antibes | digue | à recaler (digue extérieure) |
| 30 | 06 | Pointe de l'Aiguille | Théoule-sur-Mer | pointe_rocheuse | OSM (parc départemental) |

**Répartition** : 66=5 · 11=4 · 34=4 · 30=4 · 13=5 · 83=5 · 06=3 = **30**. Insertion → **158 → 188**.

### Spots à RISQUE LÉGAL ÉCARTÉS du lot (documentés, NON inclus)

| Spot écarté | Dépt | Raison |
|---|---|---|
| Digue + grau de Carnon (×2) | 34 | Arrêté municipal restreignant la pêche sur les digues |
| Jetées du grau de Port-la-Nouvelle | 11 | Port de commerce, accès digues réglementé |
| Digue Est de Port-Camargue | 30 | Périmètre de l'arrêté 2024 incertain (doute sur la digue maritime) |
| Anse de Sainte-Croix / La Couronne | 13 | Limitrophe du cantonnement no-take du Cap Couronne |
| Sormiou, Morgiou | 13 | Cœur du Parc National des Calanques (zones de non-prélèvement) |
| Cap Nègre, Cap Bénat | 83 | Propriété privée fermée |
| Cap Sicié / côte est St-Mandrier | 83 | Zone militaire |
| Cagnes-sur-Mer (bord de mer) | 06 | Arrêté municipal interdisant la pêche à la ligne |

> Si tu veux ré-injecter Carnon / Port-Camargue Est après vérif locale de l'arrêté, ils sont prêts à transformer (coords dans le rapport de recherche).

---

## 4. Lot 8 curé — ATLANTIQUE SUD (28 spots) — PROPOSITION

Espèces atlantiques (bar, dorade_royale, maquereau, sar, orphie + sole, mulet, congre, maigre, alose déjà dans `SPECIES_LABELS` depuis le lot 3 : **aucun lieu_jaune** au sud de la Loire). **Marnage réel** → `submersion_maree` systématique. **⚠️ BAÏNES** sur toutes les plages océaniques + courants landais signalés.

| # | Dépt | Spot | Commune | Structure | Source / confiance coord |
|---|---|---|---|---|---|
| 1 | 17 | Môle du port | La Flotte (Ré) | digue | OSM, viser l'extrémité |
| 2 | 17 | Digue extérieure | Saint-Martin-de-Ré | digue | OSM |
| 3 | 17 | Pointe du Fier / La Patache | Les Portes-en-Ré | passe | OSM (réserve Lilleau des Niges à éviter) |
| 4 | 17 | Digue Richelieu (Le Mail) | La Rochelle | digue | OSM, recaler sur l'enrochement |
| 5 | 17 | Jetée du port | Le Château-d'Oléron | digue | OSM. ⚠️ accès jetée + parcs à huîtres à confirmer |
| 6 | 17 | Plage des Saumonards | Saint-Georges-d'Oléron | plage | OSM (au nord du chenal, hors réserve) |
| 7 | 17 | Pointe de Suzac | Saint-Georges-de-Didonne | pointe_rocheuse | OSM (estuaire Gironde, maigre réaliste) |
| 8 | 33 | Hourtin-Plage | Hourtin | plage | OSM (baïnes) |
| 9 | 33 | Carcans-Plage | Carcans | plage | à recaler (baïnes) |
| 10 | 33 | Lacanau-Océan | Lacanau | plage | OSM (baïnes) |
| 11 | 33 | Digue de Port-Médoc | Le Verdon-sur-Mer | digue | OSM. ⚠️ zone portuaire active, confirmer capitainerie |
| 12 | 33 | Jetée du Canon | Lège-Cap-Ferret | digue | OSM (pêche OK sur jetée, interdite sur ponton) |
| 13 | 33 | Jetée de Grand-Piquey | Lège-Cap-Ferret | digue | à recaler |
| 14 | 33 | Pointe de l'Aiguillon | Arcachon | pointe_rocheuse | à recaler (hors parcs ostréicoles) |
| 15 | 33 | Plage de la Corniche (dune du Pilat) | La Teste-de-Buch | passe | OSM (passe d'Arcachon, courants violents) |
| 16 | 40 | Embouchure du courant de Soustons | Vieux-Boucau | estuaire | à recaler (embouchure mobile) |
| 17 | 40 | Embouchure du courant de Contis | Saint-Julien-en-Born | estuaire | à recaler (sous le phare de Contis) |
| 18 | 40 | Plage de Messanges | Messanges | plage | OSM (baïnes) |
| 19 | 40 | Plage de Moliets (Lette Blanche) | Moliets-et-Maâ | plage | à recaler (au nord d'Huchet = réserve) |
| 20 | 40 | Biscarrosse-Plage | Biscarrosse | plage | OSM (baïnes) |
| 21 | 40 | Le Gouf (depuis la passe) | Capbreton | cassure | à recaler (poste = passe/estacade) |
| 22 | 64 | Fort de Socoa | Ciboure | pointe_rocheuse | OSM (distinct de la digue de Socoa) |
| 23 | 64 | Digue aux Chevaux (bd Thiers) | Saint-Jean-de-Luz | digue | OSM |
| 24 | 64 | Port et estran rocheux | Guéthary | pointe_rocheuse | OSM (cantonnement, flag balisage) |
| 25 | 64 | Récif de Parlementia | Bidart | pointe_rocheuse | OSM (très exposé) |
| 26 | 64 | Plage du Centre | Bidart | plage | OSM |
| 27 | 64 | Embouchure de l'Adour (plage de la Barre) | Anglet | estuaire | à recaler (épi sud) |
| 28 | 64 | Baie de Txingudi (Bidassoa) | Hendaye | estuaire | OSM (estuaire franco-espagnol) |

**Répartition** : 17=7 · 33=8 · 40=6 · 64=7 = **28**. Insertion → **158 → 186** (si inséré seul).

### Spots ÉCARTÉS du lot Atlantique sud (documentés, NON inclus)

| Spot écarté | Dépt | Raison |
|---|---|---|
| Pointe du Cap Ferret côté Bassin | 33 | Pêche INTERDITE (règlement sécurité, extrémité sud → Lavergne) |
| Jetée du Bélisaire, jetée Thiers, jetée d'Eyrac | 33 | Embarcadères, pêche interdite |
| Banc d'Arguin | 33 | Réserve naturelle |
| Estacade de Capbreton (en tant que spot neuf) | 40 | **Doublon du lot 3** (déjà au catalogue) |
| Léon, canal d'Hossegor | 40 | Plans d'eau intérieurs |
| Digue de l'Artha (St-Jean-de-Luz) | 64 | Brise-lames isolé, accès bateau uniquement |
| Corniche basque (estran Socoa↔Hendaye) | 64 | Sentier littoral fermé par arrêté depuis 2021 |
| Digue du Boucau (rive nord Adour) | 64 | Administrativement à Tarnos (40), hors 64 |

---

## 5. Flags d'accès à trancher (inclus dans les lots AVEC caveat explicite)

Ces 2 spots sont **inclus** dans le lot 8 mais avec un avertissement explicite dans `access_notes` : à confirmer/retirer avant `verified=true`.
- **33 #11 Port-Médoc** : enrochement de zone portuaire active (confirmer auprès de la capitainerie que la pêche du bord est autorisée).
- **17 #5 Château-d'Oléron** : jetée portuaire + interdiction < 25 m des parcs ostréicoles.

Plusieurs spots portent un flag réglementaire dans `access_notes` (réserve Cerbère-Banyuls, Parc Marin Côte Bleue, cantonnement de Guéthary, réserve Lilleau des Niges, réserve d'Huchet, interdiction en heures de baignade surveillée). Tous restent pêchables hors zone réglementée, mais le flag doit rester visible en fiche.

---

## 6. Ce qui reste à John

1. **Import OSM** : revoir `seed-spots-import-osm-02.sql` **par façade** (Manche / Atlantique / Méditerranée). Filtrer au minimum les `name LIKE 'Ponton%'`/`Embarcadère`/`Cale` génériques et les caps en cœur de parc avant insertion. Je peux préparer le `DELETE` de nettoyage sur demande (sans l'exécuter). Insérer la façade validée (le `NOT EXISTS ST_DWithin 150` protège des doublons contre l'existant au moment du `RUN`).
2. **Lots curés 7 et 8** : valider spot par spot, **recaler chaque coordonnée au satellite** (ports = musoir ; embouchures landaises = bancs mobiles), insérer, puis passer `verified=true` au fil de ta vérification (la contrainte `spots_verified_only_curated` autorise `verified=true` car `source='curated'`).
3. **Trancher** les spots à risque légal écartés (Carnon, Port-Camargue Est, Château-d'Oléron, Port-Médoc) après vérif d'arrêté local si tu veux les récupérer.
4. **Harmoniser `region`** dans l'import OSM (casse propre → slug minuscule) si tu veux une cohérence stricte (non bloquant).

> **Rappel** : les seeds ne se rejouent jamais (collisions de slug). Insère chaque fichier une seule fois.

---

## 7. Confirmation invariants (vérifiés)

- Import OSM : **tous `source='imported'` + `verified=false`** ; **dédup 150 m** intra-lot + contre l'existant (`ST_DWithin`) ; **ODbL** attribué ; structures nommées only.
- Lots curés : `source` omis (→ `curated`), `verified=false`, `visibility='public'`, structures dans le CHECK, **espèces/dangers corrects par façade** (Med sans lieu_jaune/vieille/submersion_maree ; Atlantique sud sans lieu_jaune, baïnes signalées).
- **Aucune invention de spot ni de coordonnée.** Slugs uniques (30 + 28, sans collision interne, croisée, ni avec la prod).
- **Copy FR sans tiret cadratin en prose** (3 em-dashes corrigés dans le lot 7, 0 dans le lot 8 ; les `—` restants sont des libellés de titre `Nom — Lieu` et des commentaires SQL, hors périmètre du linter qui ne scanne pas les `.sql`).
- **RIEN n'a été inséré en base.** Tout est en fichiers, à insérer par John après revue.
