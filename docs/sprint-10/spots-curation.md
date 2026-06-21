# Curation de spots — plan vers 100+ spots curés

> Créé le 2026-06-11 (décision John : riposte Fishing Grid). Objectif : **100-120 spots curés**, priorité **Bretagne → façade Atlantique**, par lots validés par John avant insertion en prod.
> Pourquoi : la prod compte 10 spots (29 + 56), la home promet « 100+ spots curés au lancement », et les spots curés sont un de nos 4 différenciateurs vs Fishing Grid (leur carte = contenu communautaire uniquement, zéro curation).

---

## 1. Règles qualité (ce qui rend un spot « curé »)

1. **Spots publics et connus uniquement.** Pointes célèbres, digues, jetées, grandes plages, cales — des lieux documentés dans les guides papier et la presse pêche. On ne publie JAMAIS un « spot secret » repéré sur un forum : ce serait griller la confiance de la communauté locale.
2. **Coords vérifiées sur vue satellite par John avant insertion.** Les lat/lng proposés dans les lots sont approximatifs (±200 m) : ils placent le bon lieu, pas le bon caillou. John ajuste le point sur le poste de pêche réel (bout de digue, plateforme rocheuse, etc.).
3. **Accès légal et praticable à pied.** Pas de propriété privée, pas de zone portuaire interdite, pas de réserve intégrale. En cas de doute sur un arrêté local (pêche interdite sur certaines digues portuaires) → noter le doute dans `access_notes`, John tranche.
4. **`verified = false` à l'insertion**, passé à `true` seulement après validation terrain/satellite de John. Le front peut s'en servir plus tard (badge « Vérifié »).
5. **Dangers systématiquement renseignés** pour les postes exposés (ressac, rochers glissants, submersion, courants). C'est de la responsabilité produit, pas du remplissage.

## 2. Format des données (aligné sur le schéma prod, vérifié 2026-06-11)

| Champ | Convention (observée sur les 10 spots existants) |
|---|---|
| `name` | Nom usuel, FR (« Pointe du Raz ») |
| `slug` | kebab-case (« pointe-du-raz ») |
| `department` | `char` — « 29 », « 56 »… |
| `region` | minuscules : `bretagne`, `pays-de-la-loire`, … |
| `geom` | `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` — `geom_public` généré par trigger (flou 1 km) |
| `structure` | ⚠️ CHECK en base — valeurs autorisées UNIQUEMENT : `digue` · `plage` · `pointe_rocheuse` · `estuaire` · `cale` · `passe` · `cassure`. Toute nouvelle valeur (`estacade`…) = migration d'abord |
| `difficulty` | 1 (familial) → 5 (expert exposé) |
| `techniques` | `leurres`, `surfcasting`, `flottante`, `vif`, `stickbait` |
| `species` | `bar`, `dorade_royale`, `lieu_jaune`, `maquereau`, `sar`, `orphie` (+ `vieille` déjà utilisé) |
| `hazards` | snake_case libre : `ressac`, `rochers_glissants`, `courants_forts`, `submersion_maree`, `vagues`, `isolation`… |
| `visibility` | `public` (le gating freemium est géré par la vue/RPC, pas par ce champ) |

**Insertion** : Claude Code génère un fichier `supabase/seed-spots-lot-N.sql` (pas une migration — c'est de la donnée, pas du schéma) à partir du lot validé. Description + access_notes rédigées en voix pêcheur (tutoiement) au moment du SQL.

## 3. Workflow par lot

1. Claude propose un lot (~25-30 spots) dans ce fichier → 2. **John valide ligne par ligne** (coords sur satellite, accès, suppressions/ajouts) → 3. Claude Code rédige descriptions + SQL → 4. Insertion prod + vérif sur la carte → 5. Lot suivant.

## 4. Répartition cible (~110 spots)

| Façade | Dépts | Cible | Lot |
|---|---|---|---|
| Bretagne | 29 (≈18) · 22 (≈12) · 35 (≈8) · 56 (≈15) | ~53 | Lots 1-2 |
| Atlantique sud | 44 (≈12) · 85 (≈12) · 17 (≈10) · 33 (≈6) · 40 (≈4) · 64 (≈5) | ~49 | Lots 1-3 |
| Manche (ensuite) | 50 · 14 · 76 · 80 · 62 · 59 | ~25 | Lot 4 |
| Méditerranée (ensuite) | 66 · 11 · 34 · 30 · 13 · 83 · 06 | ~30 | Lot 5 |

Les façades Manche/Méditerranée passent après : loin des zones que John peut valider, et l'essentiel du trafic SEO initial vise l'Atlantique.

---

## 5. LOT 1 — Bretagne (~28 spots) — PROPOSITION à valider ligne par ligne

> ⚠️ **John, avant toute insertion** : (1) **valide chaque coordonnée sur vue satellite** — les lat/lng ci-dessous sont à ±200 m, ils placent le bon lieu, pas le bon caillou ; (2) **vérifie l'accès réel** (arrêtés portuaires, réserves, sentiers fermés) ; (3) **retire sans hésiter** tout spot que tu ne le sens pas — mieux vaut 24 spots solides que 28 moyens. `verified = false` à l'insertion, SQL généré seulement APRÈS ta validation (workflow §3).
>
> Uniquement des lieux **publics et célèbres** (GR34, grands sites naturels, digues portuaires fréquentées, plages de surfcasting réputées) — zéro spot secret. Répartition : 10 × 29 + 8 × 22 + 5 × 35 + 5 × 56 = **28**, en complément des 10 spots seed existants (8 dans le 29, 2 dans le 56, non re-proposés ici). Techniques limitées à `leurres / surfcasting / flottante / vif` ; structures limitées aux valeurs du CHECK (§2).

### Finistère (29) — 10 spots (compléments du seed)

| # | Spot (commune) | Slug | Dépt | Lat ≈ | Lng ≈ | Structure | Diff. | Techniques | Espèces | Dangers | Pourquoi c'est connu |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pointe Saint-Mathieu (Plougonvelin) | pointe-saint-mathieu | 29 | 48.3303 | -4.7707 | pointe_rocheuse | 4 | leurres | bar, lieu_jaune | ressac, rochers_glissants | Site emblématique (phare + abbaye) sur le GR34, postes à bar réputés à l'entrée du goulet de Brest |
| 2 | Phare du Petit Minou (Plouzané) | phare-du-petit-minou | 29 | 48.3367 | -4.6175 | pointe_rocheuse | 3 | leurres, flottante | bar, lieu_jaune, maquereau | courants_forts, rochers_glissants | Entrée du goulet de Brest, classique bar/lieu des pêcheurs brestois, parking + GR34 |
| 3 | Pointe de Dinan (Crozon) | pointe-de-dinan | 29 | 48.2556 | -4.6286 | pointe_rocheuse | 4 | leurres | bar, lieu_jaune, vieille | falaise, ressac, isolation | Grand site de la presqu'île de Crozon (GR34), postes rocheux profonds documentés presse pêche |
| 4 | Pointe du Millier (Beuzec-Cap-Sizun) | pointe-du-millier | 29 | 48.1011 | -4.4658 | pointe_rocheuse | 3 | leurres, flottante | bar, lieu_jaune, maquereau | rochers_glissants, sentier_expose | Phare du Millier, rive nord du Cap Sizun, classique du bar au leurre en baie de Douarnenez |
| 5 | Plage de la Torche / Pors Carn (Plomeur) | plage-de-la-torche | 29 | 47.8389 | -4.3556 | plage | 3 | surfcasting, leurres | bar | vagues, courants_forts | Spot de surf mondialement connu ; bancs de sable et baïnes = référence surfcasting du pays Bigouden |
| 6 | Rochers de Saint-Guénolé (Penmarc'h) | rochers-de-saint-guenole | 29 | 47.8089 | -4.3764 | pointe_rocheuse | 5 | leurres | bar, lieu_jaune | vagues_scelerats, submersion_maree, rochers_glissants | Spot à bar documenté (guides, forums) ET tristement célèbre pour ses lames de fond mortelles — danger max à afficher |
| 7 | Pointe de Trévignon (Trégunc) | pointe-de-trevignon | 29 | 47.7906 | -3.8400 | pointe_rocheuse | 2 | leurres, flottante | bar, maquereau, sar | rochers_glissants | Pointe + petit port très fréquentés du sud-Finistère, postes faciles, classique familial |
| 8 | Jetée du vieux port de Roscoff (Roscoff) | jetee-du-vieux-port-de-roscoff | 29 | 48.7275 | -3.9840 | digue | 1 | flottante, leurres | maquereau, orphie, vieille | — | Vieille jetée emblématique de Roscoff, pêche familiale au maquereau, accès libre |
| 9 | Pointe de Primel (Plougasnou) | pointe-de-primel | 29 | 48.7211 | -3.8267 | pointe_rocheuse | 3 | leurres, flottante | bar, lieu_jaune, vieille | rochers_glissants, ressac | Massif granitique célèbre de la baie de Morlaix (GR34), postes profonds connus des locaux |
| 10 | Aber Wrac'h — dunes de Sainte-Marguerite (Landéda) | aber-wrach-sainte-marguerite | 29 | 48.5953 | -4.6047 | estuaire | 2 | leurres, surfcasting | bar, dorade_royale | courants_forts, submersion_maree | Embouchure de l'Aber Wrac'h, secteur réputé pour le bar en chasse, accès par les dunes publiques |

### Côtes-d'Armor (22) — 8 spots

| # | Spot (commune) | Slug | Dépt | Lat ≈ | Lng ≈ | Structure | Diff. | Techniques | Espèces | Dangers | Pourquoi c'est connu |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 11 | Cap Fréhel — plateformes basses (Plévenon) | cap-frehel | 22 | 48.6850 | -2.3190 | pointe_rocheuse | 5 | leurres | bar, lieu_jaune, vieille | falaise, ressac, isolation | Site naturel majeur de Bretagne (GR34), pêche du bord documentée sous le cap, réservé aux expérimentés |
| 12 | Sillon de Talbert (Pleubian) | sillon-de-talbert | 22 | 48.8656 | -3.0922 | plage | 3 | surfcasting, leurres | bar, maquereau | submersion_maree, isolation | Flèche de galets de 3,2 km unique en France ; pêche maintenue dans la réserve naturelle (⚠️ règlement en renouvellement 2026, à confirmer) |
| 13 | Digue du port d'Erquy (Erquy) | digue-du-port-d-erquy | 22 | 48.6356 | -2.4664 | digue | 1 | flottante, leurres | maquereau, orphie, sar | — | Port de la coquille Saint-Jacques, digue accessible, pêche familiale connue |
| 14 | Môle du port d'Armor (Saint-Quay-Portrieux) | mole-du-port-d-armor | 22 | 48.6489 | -2.8175 | digue | 1 | flottante, leurres | maquereau, orphie, bar | — | Seul port en eau profonde de la baie de Saint-Brieuc, môle = spot maquereau réputé |
| 15 | Port de Gwin Zégal (Plouha) | port-de-gwin-zegal | 22 | 48.7000 | -2.9067 | pointe_rocheuse | 4 | leurres | bar, lieu_jaune | sentier_expose, falaise, isolation | Port à pieux unique en Europe sous les falaises de Plouha (GR34), secteur pêche réputé — ⚠️ coords à caler précisément, sentier raide |
| 16 | Pointe du Roselier (Plérin) | pointe-du-roselier | 22 | 48.5570 | -2.7240 | pointe_rocheuse | 3 | leurres, flottante | bar, maquereau | rochers_glissants, falaise | Belvédère célèbre de la baie de Saint-Brieuc, postes rocheux connus des locaux |
| 17 | Pointe de l'Arcouest (Ploubazlanec) | pointe-de-l-arcouest | 22 | 48.8203 | -3.0208 | pointe_rocheuse | 3 | leurres, vif | bar, lieu_jaune | courants_forts | Embarcadère pour Bréhat, courants violents de l'estuaire du Trieux = secteur bar réputé, cale + rochers |
| 18 | Pointe du Château — Gouffre de Plougrescant (Plougrescant) | pointe-du-chateau-plougrescant | 22 | 48.8717 | -3.2278 | pointe_rocheuse | 4 | leurres | bar, lieu_jaune, vieille | ressac, rochers_glissants, vagues | Site naturel ultra-célèbre (maison entre les rochers), plateaux rocheux pêchables le long du GR34 |

### Ille-et-Vilaine (35) — 5 spots

| # | Spot (commune) | Slug | Dépt | Lat ≈ | Lng ≈ | Structure | Diff. | Techniques | Espèces | Dangers | Pourquoi c'est connu |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 19 | Pointe du Grouin (Cancale) | pointe-du-grouin | 35 | 48.7103 | -1.8445 | pointe_rocheuse | 3 | leurres | bar, lieu_jaune, maquereau | courants_forts, falaise | Pointe emblématique entre baie du Mont-Saint-Michel et Saint-Malo, courants puissants, spot bar documenté |
| 20 | Môle des Noires (Saint-Malo) | mole-des-noires | 35 | 48.6447 | -2.0322 | digue | 2 | flottante, leurres | maquereau, orphie, bar | vagues | Digue historique de 500 m à l'entrée du port de Saint-Malo, pêche au maquereau classique (⚠️ vérifier arrêté portuaire + fermetures gros temps) |
| 21 | Plage du Sillon (Saint-Malo) | plage-du-sillon | 35 | 48.6606 | -1.9952 | plage | 2 | surfcasting | bar, dorade_royale | submersion_maree, vagues | Plage urbaine iconique de 3 km, surfcasting de nuit réputé sur les plus grandes marées d'Europe |
| 22 | Pointe de la Varde (Saint-Malo / Rothéneuf) | pointe-de-la-varde | 35 | 48.6900 | -1.9714 | pointe_rocheuse | 2 | leurres, flottante | bar, sar, orphie | rochers_glissants | Site naturel protégé entre le Sillon et Rothéneuf, plateformes rocheuses connues des Malouins |
| 23 | Pointe du Moulinet (Dinard) | pointe-du-moulinet | 35 | 48.6358 | -2.0542 | pointe_rocheuse | 2 | leurres, flottante | bar, sar, orphie | — | Pointe célèbre face à Saint-Malo (promenade du Clair de Lune), postes faciles d'accès |

### Morbihan (56) — 5 spots (compléments du seed)

| # | Spot (commune) | Slug | Dépt | Lat ≈ | Lng ≈ | Structure | Diff. | Techniques | Espèces | Dangers | Pourquoi c'est connu |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 24 | Pointe du Percho (Saint-Pierre-Quiberon) | pointe-du-percho | 56 | 47.5269 | -3.1494 | pointe_rocheuse | 3 | leurres | bar, lieu_jaune | ressac, rochers_glissants | Pointe phare de la Côte Sauvage de Quiberon, classique du bar au leurre (complète le spot seed « côte sauvage » plus au sud) |
| 25 | Grande plage de Gâvres (Gâvres/Plouhinec) | grande-plage-de-gavres | 56 | 47.6892 | -3.3400 | plage | 2 | surfcasting | bar, dorade_royale | courants_forts | Plus long cordon dunaire de Bretagne (Gâvres-Quiberon), référence régionale du surfcasting (concours) |
| 26 | Port-Navalo — passe du Golfe (Arzon) | port-navalo | 56 | 47.5481 | -2.9190 | passe | 3 | leurres, vif | bar, dorade_royale | courants_forts | Entrée du Golfe du Morbihan, l'un des courants de marée les plus violents d'Europe = spot bar/dorade archi-connu |
| 27 | Pointe du Grand Mont (Saint-Gildas-de-Rhuys) | pointe-du-grand-mont | 56 | 47.4890 | -2.8430 | pointe_rocheuse | 3 | leurres, surfcasting | bar, sar, dorade_royale | rochers_glissants | Pointe la plus marquée de la presqu'île de Rhuys (GR34), postes mixtes roche/sable connus |
| 28 | Barre d'Étel — rive Plouhinec (Plouhinec) | barre-d-etel | 56 | 47.6420 | -3.2130 | estuaire | 3 | leurres, surfcasting | bar, dorade_royale | courants_forts, submersion_maree, vagues | Embouchure mythique (et dangereuse) de la ria d'Étel, spot bar/dorade très documenté côté Magouër |

**Retiré du brouillon initial** : Citadelle de Port-Louis (doute sur le droit de pêcher depuis les remparts — monument national ; à re-proposer en lot 2 si John confirme un poste légal dans la rade).

---

## 6. Pré-liste LOT 2 — Atlantique sud (44 + 85) — candidats NON validés

> Reportés du brouillon initial du lot 1 (recentré 100 % Bretagne le 2026-06-12). À re-vérifier et compléter (17/33/40/64) au moment du lot 2. Numérotation héritée de l'ancien brouillon.

### Loire-Atlantique (44)

| # | Spot | Commune | Lat ≈ | Lng ≈ | Structure | Diff. | Techniques | Espèces | Dangers |
|---|---|---|---|---|---|---|---|---|
| 20 | Pointe de Chémoulin | Saint-Nazaire | 47.2336 | -2.2992 | pointe_rocheuse | 2 | leurres, surfcasting | bar, dorade_royale | — |
| 21 | Pointe Saint-Gildas | Préfailles | 47.1367 | -2.2486 | pointe_rocheuse | 2 | leurres, flottante | bar, maquereau, sar | — |
| 22 | Côte sauvage du Croisic | Batz-sur-Mer | 47.2772 | -2.5236 | pointe_rocheuse | 3 | leurres, stickbait | bar, sar | ressac, rochers_glissants |
| 23 | Jetée de La Turballe | La Turballe | 47.3464 | -2.5142 | digue | 1 | flottante, leurres | maquereau, orphie, dorade_royale | — |
| 24 | Plage de Saint-Brevin (estuaire) | Saint-Brevin-les-Pins | 47.2467 | -2.1675 | plage | 2 | surfcasting | bar, dorade_royale | courants (estuaire) |
| 25 | Corniche de Gourmalon | Pornic | 47.1106 | -2.1119 | pointe_rocheuse | 2 | leurres, flottante | bar, dorade_royale, sar | — |

### Vendée (85)

| # | Spot | Commune | Lat ≈ | Lng ≈ | Structure | Diff. | Techniques | Espèces | Dangers |
|---|---|---|---|---|---|---|---|---|
| 26 | Grande jetée de Saint-Gilles | Saint-Gilles-Croix-de-Vie | 46.6906 | -1.9494 | digue | 1 | flottante, leurres, surfcasting | bar, maquereau, orphie, dorade_royale | — |
| 27 | Jetée de la Chaume | Les Sables-d'Olonne | 46.4894 | -1.7947 | digue | 2 | leurres, flottante | bar, dorade_royale, maquereau | vagues (gros temps) |
| 28 | Jetée de L'Herbaudière | Noirmoutier-en-l'Île | 47.0264 | -2.2989 | digue | 1 | flottante, leurres | bar, dorade_royale | — |
| 29 | Estacade de Saint-Jean-de-Monts | Saint-Jean-de-Monts | 46.7861 | -2.0717 | digue | 1 | flottante, surfcasting | bar, dorade_royale | — |
| 30 | Pointe du Payré | Jard-sur-Mer | 46.4047 | -1.6219 | pointe_rocheuse | 3 | leurres | bar, sar | rochers_glissants |
| 31 | Plage des Conches | Longeville-sur-Mer | 46.3733 | -1.4239 | plage | 2 | surfcasting | bar, dorade_royale | courants |

---

## 7. Prochaines étapes

> ✅ **Lot 1 inséré en prod le 2026-06-21** — 28 spots (prod 10 → 38 : 29=18, 22=8, 35=5, 56=7). Vérif réel/public/département + **confirmation satellite de chaque coordonnée** faites (cf `docs/sprint-10/lot-1-verification.md`). Reste : revue `/carte` + `verified=true` par John. Décisions appliquées : Cap Fréhel (bar + mention interdiction), Port-Navalo (+lieu_jaune, diff. 4), Roselier (conservé).

1. **John** : valider/corriger le lot 1 (§5) ligne par ligne — coords sur satellite, accès, retraits, ajouts de spots que tu connais.
2. **Claude Code** : descriptions voix pêcheur + `supabase/seed-spots-lot-1.sql` + insertion + vérif carte.
3. **Lot 2** : repartir de la pré-liste §6 (44 + 85) + Charente-Maritime (17), Gironde (33), Landes (40), Pays basque (64) + densification éventuelle 29/22/56.
4. Quand on passe ~50 spots : re-vérifier le gating freemium « 3 spots populaires/dépt » (critère de sélection des 3 à définir — popularité = prises loguées ? choix édito ?).
