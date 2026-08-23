# LOTS — État vivant de la curation des spots importés

> Compagnon de `PLAYBOOK.md`. Chaque session de curation met à jour ce fichier (compteurs + journal). Le backlog réel se re-vérifie en début de session (SQL live).

**Mode de validation (décision John 2026-08-05)** : les lots éditoriaux **1 à 3** = RECAP en attente de **GO John** avant écriture DB (mode A). À partir du 4e lot publié : **mode délégué** (publication directe, spot-check a posteriori ; le doute reste `pending`).

## 🎯 Stratégie (décision John 2026-08-05) : un département à la fois, ~100 spots complets

On finit un département avant d'attaquer le suivant, pour remplir la carte par zones denses. **Objectif par département : ~100 fiches publiées et complètes** (espèces, difficulté, dangers, accès, description). Ordre INTERNE au département = **par notoriété** (pointes/caps/digues/môles/estacades/phares → plages et anses → estuaires/passes/cales → micro-toponymes en dernier), pas alphabétique : c'est ce qui remplit la carte utilement. Détail : `PLAYBOOK.md` §9.

**Ordre des départements** : **29 ✅ bouclé (94 fiches après dépublication des 7 fausses coordonnées)** → **56 ✅ BOUCLÉ le 2026-08-10 (105 fiches, cible 100 dépassée au lot 14)** → **22 Côtes-d'Armor 🟠 OUVERT le 2026-08-10 (lot 15, 33 fiches / 100)** → puis les 21 autres, cf le **plan de couverture complète** ci-dessous.

🟢 **LE RÉ-IMPORT EST INSÉRÉ (2026-08-08, vérifié SQL live).** 3 400 lignes créées le 08/08, dernière à 16h11 UTC, **sur les 24 départements** et pas seulement sur les deux fichiers connus. Le backlog passe de **624 à 4 069 pending**, la base de 1 160 à 4 605 spots. **Plus aucun département n'a un backlog nul** : 85, 06, 2A et 2B sont débloqués. Le **niveau 2 du playbook §9.1** (plages et grandes anses nommées), jamais traité sur aucun département, est ouvert : le 56 compte désormais **191 spots de structure `plage`**.

🔴 **Le ré-import n'avait jamais eu sa passe de relecture en base : elle est faite, elle trouve 5 familles d'anomalies. Détail et verdicts proposés : `lots/lot-13-audit-reimport.md`. En attente d'arbitrage John, rien n'est écrit.**
1. **35 spots du Marais poitevin rattachés au 85** (eau douce, 40-60 km de la mer, longitude jusqu'à -0,612) : hors périmètre v1.
2. ~~**13 spots rattachés au 22 mais situés en 35**~~ → **RE-MESURÉ AU LOT 15 (2026-08-10) : ils sont 26, en trois familles.** 19 clairement en **35** (Dinard, Saint-Lunaire, Saint-Briac, Saint-Malo, Pleurtuit, La Richardais), 2 en **eau douce** (cales de Dinan et Taden, amont de l'écluse du Châtelier), 5 dans la **zone frontière du Frémur** que la coordonnée seule ne tranche pas. Tous laissés `pending`, aucun curé. Tableau nominatif et proposition de correction : `lots/lot-15-22.md` §1.1. **`department` ne s'écrit que sur GO de John.**
3. **9 spots en Italie rattachés au 06** (Vintimille, Grimaldi : « Spiaggia di Capo Mortola », « Punta Garavano »…).
4. **3 spots de la réserve de Scandola rattachés au 2A** alors qu'ils sont en 2B (Osani), et réglementés.
5. **49 noms de quais d'exploitation** (« Quai de Normandie » terminal ferry, « Quai n°1 », « Quai nul », « Slipway »…) : prolongement des décisions 14 et 27.
6. **5 spots d'eau douce ou de bassin** (« Étang du Hénant », « Plage du Lac Marin », « La Piscine »…).

✅ **Ce que l'audit valide** : **0 coordonnée arrondie** sur les 4 069 pending, **0 « Ponton »**, **0 nom d'une lettre**, **0 débordement de bbox sur le 56**. Le correctif `out geom` et le filtre `isInvalidName` ont bien tourné.

✅ **AUDIT GÉO DU 29 REJOUÉ ET CLOS le 2026-08-09 : 0 fiche mal placée, 0 dépublication.** La demande ouverte depuis le lot 8 est traitée, par les **deux** voies, et elles concordent.

1. **Par homonymie** (la voie qu'on croyait morte). Elle fonctionne en fait, à condition de comparer chaque fiche publiée à son homonyme **le plus proche** et non à tous ses homonymes. Sur les 94 fiches du 29 : 3 écarts supérieurs à 500 m, **les 3 sont des faux positifs vérifiés à la coordonnée** :
   - « Beg an Tour » (Moëlan) est à **0 m** de son objet OSM ; l'homonyme à 120 km est un **autre** Beg an Tour, à Landunvez (« pointe de la tour » est un toponyme breton courant).
   - « Pointe de Trévignon » : 680 m, mais les deux points sont sur la même pointe.
   - « Plage de la Torche / Pors Carn » : 616 m, la fiche couvre volontairement **deux** plages voisines et se place entre leurs deux objets OSM.
   ➡️ La décision 30 est donc **à nuancer** : le `ST_DWithin(150 m)` écarte bien le témoin exact, mais le ré-import complet fournit assez d'homonymes voisins pour que le test redevienne exploitable. Ce qu'il faut, c'est prendre le **min** de distance et vérifier chaque hit à la main.
2. **Par Open-Meteo Marine** (le test exhaustif recommandé), passé sur **les 94 fiches publiées du 29** : **94/94 renvoient des données de houle**, donc aucune n'est tombée dans les terres. Le même test passé sur **48 plages nouvellement importées** (2 par département, les 24 départements) : **48/48 OK**.

**Conclusion : le correctif `out geom` tient, et aucune fiche publiée du 29 n'est à dépublier.** Le script de test est réutilisable tel quel pour les 4 069 `pending` avant curation.

### 📍 Plan de couverture — les 24 départements côtiers (mis à jour **2026-08-08**, SQL live post ré-import)

Périmètre = `COASTAL_DEPARTMENTS` (`lib/geo/departments.ts`) : 24 départements, métropole + Corse, **sans la Somme (80)** (décision produit, sprint 11.6). Aucun n'est laissé de côté.

**Objectif par département = `min(100, couverture exhaustive des postes réels)`.** Les 100 fiches sont une cible pour les façades longues, pas un quota à remplir de force : le Nord (40 km de côte) ou le Gard (20 km) n'ont pas 100 postes de pêche du bord, et en inventer violerait les invariants §2. Un département est **fini** quand il atteint sa cible OU que tous ses postes réels documentés sont traités.

| Vague | Dépt | Publiés | Backlog | Cible | Ré-import | Statut |
|---|---|---|---|---|---|---|
| 1 | **29** Finistère | 94 | 638 | 100 | ✅ inséré | ✅ **fini** (94, cf ⚠️ fiches dépubliées) |
| 1 | **56** Morbihan | **105** | **343** | 100 | ✅ inséré | ✅ **FINI le 2026-08-10** (105/100, lot 14 = niveau 2 plages) |
| 1 | 22 Côtes-d'Armor | **33** | **245** | 100 | ✅ inséré | 🟠 **DÉPARTEMENT EN COURS** (lot 15 publié) · 26 spots situés en 35 ou en eau douce, exclus et en attente de GO |
| 1 | 50 Manche | 8 | 165 | 100 | ✅ inséré | ⬜ |
| 1 | 35 Ille-et-Vilaine | 5 | 100 | 40 | ✅ inséré | ⬜ |
| 1 | 14 Calvados | 4 | 63 | 60 | ✅ inséré | ⬜ |
| 2 | 17 Charente-Maritime | 14 | 222 | 100 | ✅ inséré | ⬜ |
| 2 | 44 Loire-Atlantique | 12 | 149 | 60 | ✅ inséré | ⬜ |
| 2 | **85** Vendée | 12 | **184** | 60 | ✅ inséré | ⬜ ⚠️ 35 spots du Marais poitevin à retirer |
| 2 | 33 Gironde | 13 | 92 | 60 | ✅ inséré | ⬜ |
| 2 | 40 Landes | 10 | 56 | 40 | ✅ inséré | ⬜ |
| 2 | 64 Pyrénées-Atl. | 12 | 53 | 30 | ✅ inséré | ⬜ |
| 3 | 13 Bouches-du-Rhône | 11 | 303 | 100 | ✅ inséré | ⬜ |
| 3 | 83 Var | 11 | **448** | 100 | ✅ inséré | ⬜ |
| 3 | **06** Alpes-Maritimes | 9 | **139** | 60 | ✅ inséré | ⬜ ⚠️ 9 spots en Italie à retirer |
| 3 | 34 Hérault | 9 | 72 | 60 | ✅ inséré | ⬜ |
| 3 | 66 Pyrénées-Or. | 9 | 86 | 60 | ✅ inséré | ⬜ |
| 3 | 11 Aude | 7 | 24 | 30 | ✅ inséré | ⬜ |
| 3 | 30 Gard | 6 | 12 | 20 | ✅ inséré | ⬜ |
| 4 | 76 Seine-Maritime | 6 | 28 | 50 | ✅ inséré | ⬜ |
| 4 | 62 Pas-de-Calais | 5 | 49 | 50 | ✅ inséré | ⬜ |
| 4 | 59 Nord | 3 | 10 | 20 | ✅ inséré | ⬜ |
| 4 | **2A** Corse-du-Sud | 9 | **375** | 60 | ✅ inséré | ⬜ ⚠️ 3 spots de Scandola (2B) à retirer |
| 4 | **2B** Haute-Corse | 9 | **153** | 60 | ✅ inséré | ⬜ |

**Total au 2026-08-10 (SQL live, post-lot 15) : 416 fiches publiées (206 curées + 208 importées + 2 communautaires) · 4 018 en backlog · 171 rejetées · 4 605 spots en base · cible ≈ 1 475 fiches.** Deux départements sur 24 sont finis (29 et 56) et le 22 est ouvert à 33/100, soit **232 fiches sur les 1 475 visées**.

Le backlog n'est plus la contrainte : il est passé de 624 à 4 069, soit **2,7 fois la cible totale**. La contrainte devient le **débit de curation** (20 spots/jour) et la **qualité du tri** : avec 4 069 candidats pour 1 105 fiches à écrire, on peut se permettre d'être exigeant et de ne garder que les postes réels et documentables. À 20 spots/jour et ~75 % de publication, l'horizon reste de **4 à 5 mois**.

**Logique des vagues** : 1 = Bretagne (densité de postes et de pêcheurs la plus forte, le 29 sert de modèle) · 2 = façade atlantique sud · 3 = Méditerranée · 4 = Manche-Nord et Corse (linéaires courts ou logistique OSM plus pauvre). L'ordre reste ajustable si un signal produit le justifie (département d'un fondateur actif, pic de trafic SEO).

**Les 4 départements à zéro backlog** (85, 06, 2A, 2B) n'ont jamais rien remonté de l'import initial : les 6 anciens tags OSM (`pier`, `breakwater`, `groyne`, `quay`, `cape`) ne trouvent rien de *nommé* dans leurs bbox, alors que le script les couvre bien. Le ré-import élargi (8 tags, dont `natural=beach`) est le déblocage pour ces quatre-là : sans lui, ils resteraient à ~10 fiches indéfiniment.

🔴🔴 **INCIDENT QUALITÉ DU 2026-08-06 — COORDONNÉES FAUSSES. Note complète : `INCIDENT-2026-08-06-coordonnees.md`. À lire avant tout autre chose.**
Signalé par John (« Plage de Penhors au milieu de la terre », « Le Diben (Brest) au milieu de la mer »). **Deux causes distinctes, les deux traitées.**
1. **Le catalogue curé contient 9 fiches à coordonnées saisies à la main, arrondies à 2 décimales** (grille de 1,1 km). Penhors est à 5 km dans les terres, Le Diben à 60 km de son vrai emplacement (c'est un port de Plougasnou, pas de Brest). Les imports sont propres sur cet axe (0 coordonnée arrondie sur 942). **Les 9 fiches sont DÉPUBLIÉES** (`pending`, réversible) en attendant un re-géocodage sourcé. Liste dans la note.
2. **Le script d'import plaçait les objets étendus au centre de leur boîte englobante** (`out center`) : pour une plage en arc ou un polygone d'anse, ce centre tombe dans les terres ou au large. Inoffensif tant qu'on n'importait que des digues ; **rédhibitoire dès l'ajout de `natural=beach`**. Corrigé : `out geom` + **sommet médian de la géométrie**, donc un point qui appartient à l'objet par construction. Les **deux fichiers déjà générés sont périmés et renommés `*.PERIME-NE-PAS-INSERER.sql`** ; aucun n'avait été inséré, aucun dégât en base. **À relancer avec le script corrigé.**
➡️ Deux règles ajoutées : *une coordonnée arrondie est fausse jusqu'à preuve du contraire* · *ne jamais dériver une position d'un centre de boîte englobante*.
➡️ **Contrôle exhaustif encore à faire** : pas de trait de côte en base, donc pas de test automatique « en mer ou à terre » sur les 1 160 spots. Piste recommandée : passer les spots à Open-Meteo Marine, qui renvoie une erreur sur un point terrestre.

✅ **Ré-import OSM élargi : GO John du 2026-08-06, script modifié et livré.** `scripts/import-osm-spots.ts` requête désormais **8 tags de plus** (`natural=beach`, `bay`, `reef`, `strait` · `man_made=lighthouse`, `dyke`, `embankment` · `leisure=slipway`), embarque le **filtre de noms invalides du lot 0** (`isInvalidName`, validé sur 40 cas : 27 rejets et 13 conservations, tous corrects) et accepte **`--dept`** / **`--out`** pour cibler un département. Mapping structure étendu (`beach→plage`, `strait→passe`, `slipway→cale`, `dyke`/`embankment→digue`) ; `bay`, `reef` et `lighthouse` restent **NULL volontairement**, la curation tranche.

🔴 **ERREUR CORRIGÉE le 2026-08-06 — audit géographique du 56 : `lots/lot-08-audit-geo.md`.**
La relecture du fichier d'import a révélé qu'une fiche publiée au lot 6, « Pointe du Bile », reposait sur un **objet OSM mal placé de 12 km** (positionné à Ambon-Damgan, alors que la vraie pointe du Bile est en Pénestin). La fiche décrivait donc Pénestin sur une coordonnée qui n'y est pas. **Repassée en `pending`, contenu vidé.** Second retrait par prudence : « Beg er Lann (château Turpault) » du lot 7, à ~1 km du château réel.
**Audit systématique des 22 fiches du 56 fait** (croisement avec les 522 objets OSM du ré-import) : **1 erreur sur 22**, les 20 autres sont saines.
➡️ **Nouvelle règle de méthode, applicable dès le lot 8** : *avant de rédiger, confronter la coordonnée du spot à une source donnant la position du toponyme, ou aux objets OSM homonymes du même import. Écart > ~1 km = objet mal nommé ou mal placé, on ne publie pas. Ne jamais déduire la commune du seul nom de l'objet.* À reporter dans `PLAYBOOK.md` §4.
➡️ ~~**À planifier** : rejouer cet audit sur les 101 fiches du **29** après son ré-import~~ → ✅ **FAIT le 2026-08-09, 0 anomalie** (détail en tête de fichier).

✅ **RÉ-IMPORT TERMINÉ SUR LES 24 DÉPARTEMENTS (2026-08-08 → 09). Plus rien à exécuter par John.** L'accès réseau vers `overpass-api.de` fonctionne depuis la session : les 24 départements ont été générés, relus et insérés en autonomie. Historique des fichiers ci-dessous, RECAP par fichier dans `lots/reimport-*.md`.

| Fichier | Départements | Lignes insérées | RECAP |
|---|---|---|---|
| `seed-spots-import-osm-04-56.sql` | 56 | 508 | `lots/reimport-56.md` |
| `seed-spots-import-osm-05-vides.sql` | 85, 06, 2A, 2B | 875 | `lots/reimport-85-06-2A-2B.md` |
| `seed-spots-import-osm-06-vague1.sql` | 22, 50, 35, 14 | 621 | `lots/reimport-22-50-35-14.md` |
| `seed-spots-import-osm-07-vague2.sql` | 17, 44, 33, 40, 64 | 656 (+31 écartés doublon) | `lots/reimport-17-44-33-40-64.md` |
| `seed-spots-import-osm-08-vague3.sql` | 83, 34, 66, 11, 30 | 652 (+19 écartés doublon) | `lots/reimport-83-34-66-11-30.md` |
| `seed-spots-import-osm-09-vague4.sql` | 76, 62, 59 | 81 (+3 écartés doublon) | `lots/reimport-76-62-59.md` |
| `seed-spots-import-osm-10-dept29.sql` | 29 | 655 (+101 écartés doublon) | `lots/reimport-29.md` |
| `seed-spots-import-osm-11-dept13.sql` | 13 | 277 (+23 écartés doublon) | `lots/reimport-13.md` |

⚠️ Les fichiers `*.PERIME-NE-PAS-INSERER.sql` (02-56, 03-vides) sont ceux d'avant le correctif `out geom` : **ne jamais les insérer**, ils sont conservés uniquement comme trace de l'incident.

★ **Deux correctifs durables ont été apportés au générateur pendant la campagne**, en amont plutôt qu'en nettoyage par fichier :

1. `scripts/import-osm-spots.ts` — `isInvalidName()` : ajout de `navix` à `GENERIC_NAMES`, **normalisation des apostrophes** avant comparaison (« l'estacade » ne matchait pas `estacade`) et rejet des noms purement numériques. Trouvé au 56, il a protégé les 7 vagues suivantes.
2. Scripts d'audit du scratchpad — le contrôle point-in-polygon ne réassignait que vers les 24 départements côtiers dans son **repli**, pas dans son test principal : deux objets du Calvados partaient dans l'**Eure**. Restreint aux deux endroits.

Le correctif `out geom` est mesuré : sur 502 objets comparables, **163 ont bougé** par rapport à l'ancienne méthode, dont **2 de plus d'un kilomètre** (« Plage des Sables Blancs » 1 836 m, « La Grande Plage » 1 206 m) et **28 de plus de 300 m**. Ce sont tous des `plage` ou des polygones d'anse : exactement la famille d'objets que l'ancien centre de bbox plaçait dans les terres. La correction est donc validée par les chiffres, pas seulement par le raisonnement.
Correction manuelle appliquée en plus : **42 lignes réassignées au 44** (débordement de bbox sur la presqu'île guérandaise). ⚠️ **Le critère écrit ici comme « `lat < 47.435` » est trompeur et a été re-contrôlé au lot 10** : pris seul, il capturerait aussi Belle-Île (47.30-47.38), Houat (47.39-47.40) et Hœdic (47.33-47.35), qui sont bien en Morbihan. Vérification faite sur le fichier livré : les 42 lignes réassignées sont **toutes entre 2.44 O et 2.63 O**, donc bien la presqu'île guérandaise, et les objets des trois îles sont restés en `'56'`. **Le fichier est sain**, mais tout futur arbitrage de bbox doit se formuler en **deux dimensions** (lat ET lon).

Rappel de méthode pour un futur ré-import : le script **écrit un fichier SQL, jamais en base**. Relire, puis insérer **par petits lots vérifiés** (décision 31) : les lignes entrent en `pending`, masquées de la carte, et les deux gardes (`ST_DWithin(150 m)` + unicité de slug, décision 32) dédupliquent contre tout l'existant.

⚠️ **La ligne « Positionnement » du script ne mesure plus rien, c'est normal et c'est documenté.** Les modes de géométrie d'Overpass (`geom`, `center`, `bb`) sont **exclusifs** : depuis le passage à `out geom`, l'API ne renvoie plus le centre de bbox, donc l'écart entre ancienne et nouvelle méthode n'est pas calculable en une requête (vérifié : `out geom center tags` renvoie le center et *pas* la géométrie). Le script le dit désormais explicitement au lieu d'afficher un « 0 objet » trompeur. Le chiffre historique de 163 objets déplacés ci-dessus reste valable : il a été obtenu en comparant deux fichiers générés, pas en une passe.

```bash
pnpm tsx scripts/import-osm-spots.ts --dept=29 --out=supabase/seed-spots-import-osm-NN.sql
```

~~⚠️ **Contrainte mesurée (SQL live 05/08)** : au taux de publication du lot 1 (64 %), seul le **29** atteint 100 avec le backlog seul.~~ ✅ **Contrainte levée par le ré-import.** Chaque département a maintenant de quoi tenir sa cible : le plus tendu est le **59** (10 pending pour une cible de 20, mais 40 km de côte, la cible sera revue à la baisse par exhaustivité), puis le **30** (12 pour 20) et le **11** (24 pour 30). Tous les autres ont un backlog supérieur à leur cible, souvent d'un facteur 3 à 5.

## Lot 0 — Assainissement ✅ (exécuté le 2026-08-05)

941 → **813 pending**. 128 rejetés (94 noms invalides, 15 doublons du catalogue curé, 19 doublons internes) + 3 fiches curées normalisées (hazards). Détail : `lots/lot-00-assainissement.md`.

## Backlog par département (ordre de traitement, chiffres post-lot 0)

| # | Dépt | Spots | Lots (~20/lot) | Publiés | Rejetés (édito) | Statut |
|---|---|---|---|---|---|---|
| 1 | 29 Finistère | 112 | — | 83 | 13 | ⚠️ **94 approved** (101 moins les 7 fiches curées dépubliées) |
| 2 | 56 Morbihan | 343 | — | **100** | **37** | ✅ **FINI (105 approved dont 5 curés)** · lots 6, 7, 9, 10, 11, 12 et **14** publiés |
| 3 | 22 Côtes-d'Armor | 245 | ~4 restants | **25** | **6** | 🟠 **département en cours (33 approved dont 8 curés)** · lot **15** publié |
| 4 | 17 Charente-Maritime | 53 | ~3 | 0 | 0 | ⬜ |
| 5 | 44 Loire-Atlantique | 37 | ~2 | 0 | 0 | ⬜ |
| 6 | 50 Manche | 54 | ~3 | 0 | 0 | ⬜ |
| 7 | 14 Calvados | 34 | ~2 | 0 | 0 | ⬜ |
| 8 | 35 Ille-et-Vilaine | 23 | ~1 | 0 | 0 | ⬜ |
| 9 | 33 Gironde | 15 | 1 | 0 | 0 | ⬜ |
| 10 | 62 Pas-de-Calais (+59) | 24 | ~1 | 0 | 0 | ⬜ |
| 11 | 76 Seine-Maritime | 13 | 1 | 0 | 0 | ⬜ |
| 12 | 64 Pyrénées-Atl. | 7 | 1 | 0 | 0 | ⬜ |
| 13 | 40 Landes | 5 | avec le 64 | 0 | 0 | ⬜ |
| 14 | 13 Bouches-du-Rhône | 94 | ~5 | 0 | 0 | ⬜ |
| 15 | 34 Hérault (+30) | 13 | 1 | 0 | 0 | ⬜ |
| 16 | 66 Pyrénées-Or. (+11) | 28 | ~1 | 0 | 0 | ⬜ |
| 17 | 83 Var | 19 | 1 | 0 | 0 | ⬜ |

**Backlog : 4 018 pending · publiés (édito) : 208 · rejetés : 171.** Vérifié en SQL live le **2026-08-10 après le lot 15** : **416 spots approved au total** · **105 approved sur le 56** (cible atteinte) · **33 approved sur le 22** · **0 slug `-osmNNNN` publié** · 0 slug dupliqué · **0 fiche importée incomplète** · **0 espèce hors référentiel** · **0 hazard hors vocabulaire** · **0 technique hors vocabulaire** · **0 tiret cadratin sur les importés publiés** · 0 `verified`/`verification_level` posé à tort. Aucun DDL aux lots 14 et 15.

<details><summary>Chiffres du 2026-08-10 (post-lot 14), conservés</summary>

**Backlog : 4 040 pending · publiés (édito) : 183 · rejetés : 164.** **391 spots approved au total** · **105 approved sur le 56** (cible atteinte) · 0 slug `-osmNNNN` publié · 0 slug dupliqué · 0 fiche importée incomplète · 0 espèce hors référentiel · 0 hazard hors vocabulaire · 0 tiret cadratin · 0 `verified`/`verification_level` posé à tort. Aucun DDL au lot 14.

</details>

<details><summary>Chiffres du 2026-08-07 (post-lot 12), conservés</summary>

Vérifié en SQL live le 2026-08-07 **après le lot 12** : **370 spots approved au total** (206 curés + 162 importés + 2 communautaires) · **94 approved sur le 29** · **84 approved sur le 56** · 624 pending · **0 coordonnée arrondie encore publiée** · 0 slug dupliqué · **0 slug `-osmNNNN` publié** · 0 `verified`/`verification_level` posé à tort · 0 fiche importée incomplète · **0 espèce hors référentiel** · **0 hazard hors vocabulaire** · **0 tiret cadratin sur les 942 importés**. Aucun DDL aux lots 5 à 12.

</details>

🟠 **Deux dettes relevées au lot 10, hors périmètre de la curation** (détail : `lots/lot-10-56.md` §8) :
1. **104 des 215 fiches `curated` ont un tiret cadratin dans leur prose** (`description`/`access_notes`), et 113 dans leur `name`. Le tiret du nom suit le patron « Commune — poste » et relève de l'exception « libellés data » (CLAUDE.md §6) ; celui de la prose, non. Dette antérieure au chantier, sur du contenu publié.
2. **2 spots `community` approuvés sont incomplets** (« port de la salis » sans description ni accès, « digue golfe juan » sans description, tous deux dans le 06). Contenu utilisateur.
⚠️ Le 29 repasse sous la barre des 100 (94) : **l'objectif n'est plus atteint** tant que les 7 fiches curées bretonnes dépubliées ne sont pas re-géocodées. C'est le prix de la correction, et il est juste : mieux vaut 94 fiches exactes que 101 dont 7 fausses.
⚠️ Écart de comptage : la base contient 1 rejet `imported` de plus que la somme des RECAP. Sans impact produit, à éclaircir au prochain passage sur le lot 0.

## ⏳ En attente de GO John

*Aucun lot en attente.*

**Garde-fou playbook** : à partir de 2 lots en attente sans GO, la tâche planifiée ne traite plus de nouveau lot et se contente d'un rappel.

🔴 **Incident de concurrence du 2026-08-06, résolu. Note complète : `lots/lot-03-RECONCILIATION.md`.**
Deux sessions ont préparé un lot 3 en parallèle sans se voir. La session Cowork a reçu le GO de John et **a écrit ses 21 spots en base** ; la session Claude Code est restée en attente de GO et **son RECAP a écrasé le fichier `lots/lot-03-29.md` sur le disque**. Conséquence : le fichier décrit une sélection de 23 spots qui n'est pas exactement celle qui est publiée.
**État réel après réconciliation : 19 spots publiés.** Les deux verdicts où la session Claude Code était plus prudente ont été appliqués contre la publication : **pointe du Portzic** repassée en `rejected` (phare et fort militaires, pas de descente à l'eau) et **pointe de Kerdéniel** repassée en `pending` (belvédère sans accès à l'eau documenté), contenus vidés et slugs OSM restaurés.
**À faire : ne jamais lancer deux sessions de curation sur le même département.** Si tu veux paralléliser, découpe par département.

## Décisions tranchées (lot 1)

1. **Renommage des slugs : OUI** (GO John du 2026-08-05). Les spots publiés perdent le suffixe `-osmNNNN` et prennent un slug lisible suffixé par la commune ou le lieu (`beg-ar-skeiz-guisseny`, `pointe-du-kador-crozon`). Unicité vérifiée avant chaque UPDATE. À appliquer aux lots suivants.
2. **Règle « série OSM »** : un micro-toponyme issu d'une série d'objets OSM créés d'un bloc (noms bretons de rochers) n'est publié que si une source indépendante en fait un lieu identifiable ET accessible. Sinon reject. C'est ce qui produit 6 des 9 rejects du lot 1.

## Décisions tranchées (suite)

3. **Ordre de traitement dans un département : PAR NOTORIÉTÉ** (arbitrage John du 2026-08-05, avec la stratégie « un département à la fois »). Fini l'ordre alphabétique qui faisait commencer par 200 micro-toponymes « Beg ar … ». Barème dans `PLAYBOOK.md` §9.1. **Effet mesuré au lot 2 : 18 full / 0 light / 3 reject-merge (82 % de publication), contre 10 full / 6 light / 9 reject au lot 1 alphabétique (64 %).**
5. **Fermeture temporaire ≠ reject** (lot 2, pointe des Espagnols ; confirmé au lot 3 avec la pointe de Barnénez, sentier fermé par arrêté municipal de Plouezoc'h) : un accès fermé pour travaux ou dégradation, avec réouverture attendue, reste `pending`. Rejeter serait faux, publier enverrait les gens dans un chantier. À reprendre quand la source officielle annonce la réouverture.
6. **Deux spots en suspens à trancher** (relevé le 06/08, hors lot) : « Pointe de Bouillennou » et « Pointe de Bouillenou », deux objets OSM distants de 840 m en baie de Morlaix dont les noms ne diffèrent que d'une lettre. Vraies pointes voisines ou doublon d'import avec faute de saisie : impossible de trancher sans source, ils restent `pending`.
7. **Un belvédère n'est pas un poste** (lot 3, pointe de Kerdéniel) : une pointe décrite uniquement comme point de vue perché, sans descente à l'eau documentée, reste `pending`. On publie le voisin qui a une grève sourcée (pointe de l'Armorique), pas le promontoire.
8. **Site naturel à passage volontairement limité = reject** (lot 3, pointe de Castelmeur, Conservatoire du littoral) : quand le gestionnaire restreint l'accès pour laisser la faune et la flore se réinstaller, on ne publie pas, même si le GR34 passe à côté.
13. ★ **Vérification toponymique croisée OBLIGATOIRE** (audit du 2026-08-06, `lots/lot-08-audit-geo.md`). Avant de rédiger, confronter la coordonnée du spot à une source donnant la position du toponyme, ou aux objets OSM homonymes du même import. **Écart supérieur à ~1 km = objet mal nommé ou mal placé, on ne publie pas.** Ne JAMAIS déduire la commune du seul nom de l'objet OSM : c'est ce qui a produit la fiche « Pointe du Bile » décrivant Pénestin sur une coordonnée située 12 km plus loin, à Ambon-Damgan.
14. **Un « Ponton » n'est jamais un poste de bord** (relevé au ré-import du 56) : appontement de marina, inaccessible ou interdit à la ligne. Rejeté à l'import depuis le durcissement du filtre.
4. **Vocabulaire `hazards` : CORRIGÉ le 2026-08-05** (hors curation, fix de rendu). `HAZARDS_LABELS` (`lib/labels.ts`) couvre désormais AUSSI le vocabulaire éditorial réellement stocké (`submersion_maree`, `rochers_glissants`, `vagues_scelerats`, `falaise`, `isolation`, `baines`, `baignade_dangereuse`, `rejet_eaux_usees`, `sentier_expose`, `vagues`), et la fiche spot affiche le libellé accentué au lieu de la valeur brute (`app/(marketing)/spots/[slug]/page.tsx`). Les deux familles de clés cohabitent volontairement : le formulaire de curation propose les siennes, la base contient les deux. `tsc` vert.

## Journal des sessions

| Date | Lot | Spots traités | full / light / merge / reject | Mode | RECAP |
|---|---|---|---|---|---|
| 2026-08-05 | 0 (assainissement) | 941 analysés | 0 / 0 / 15 / 113 | GO John | `lots/lot-00-assainissement.md` |
| 2026-08-05 | 1 (29, A à B) | 25 | 10 / 6 / 0 / 9 | GO John, publié | `lots/lot-01-29.md` |
| 2026-08-05 | 2 (29, notoriété) | 22 | 18 / 0 / 2 / 1 (+1 laissé `pending`) | GO John, publié | `lots/lot-02-29.md` |
| 2026-08-06 | 3 (29, notoriété) | 22 traités, 19 publiés | 18 / 1 / 0 / 1 (+2 laissés `pending`) | GO John, publié, puis réconcilié | `lots/lot-03-29.md` + `lots/lot-03-RECONCILIATION.md` |

| 2026-08-06 | 4 (29, mode délégué) | 19 | 19 / 0 / 0 / 0 | Mode délégué, publié | `lots/lot-04-29.md` |
| 2026-08-06 | 5 (29, bouclage) | 11 | 11 / 0 / 0 / 0 | Mode délégué, publié | `lots/lot-05-29.md` |
| 2026-08-06 | 6 (56, ouverture) | 14 | 12 / 0 / 2 / 0 | Mode délégué, publié | `lots/lot-06-56.md` |
| 2026-08-06 | 7 (56, golfe/îles/ria) | 10 | 10 / 0 / 0 / 0 | Mode délégué, publié | `lots/lot-07-56.md` |
| 2026-08-06 | 8 (audit géo + relecture import) | 22 auditées, 522 relues | 0 / 0 / 0 / 0 · **2 fiches dépubliées** | Correctif | `lots/lot-08-audit-geo.md` |
| 2026-08-06 | 9 (56, pointes du golfe et Groix) | 10 | 10 / 0 / 0 / 0 | Mode délégué, publié | `lots/lot-09-56.md` |
| 2026-08-06 | 10 (56, golfe, Rhuys, Belle-Île, Groix, ria d'Étel) | 21 | 20 / 0 / 0 / 1 (+2 laissés `pending`) | Mode délégué, publié | `lots/lot-10-56.md` |
| 2026-08-07 | 11 (56, baie de Quiberon, côte sauvage, ria d'Étel, Pénerf, cales de Séné) | 16 | 10 / 2 / 2 / 2 (+16 laissés `pending` avec raison) | Mode délégué, publié | `lots/lot-11-56.md` |
| 2026-08-07 | 12 (56, les îles : Hœdic, Houat, Groix, Belle-Île + revue des quais) | 24 | 15 / 2 / 0 / 7 (+15 laissés `pending` avec raison) | Mode délégué, publié | `lots/lot-12-56.md` |
| 2026-08-08 | 13 (audit du ré-import massif) | 4 069 analysées | 0 / 0 / 0 / 0 · **rien écrit en base** | Audit, en attente d'arbitrage | `lots/lot-13-audit-reimport.md` |
| 2026-08-08→09 | **Ré-import des 24 départements** | 4 976 candidats relus, **3 445 insérés** | — · **0 publication, tout en `pending`** | Autonome | `lots/reimport-*.md` (8 fichiers) |
| 2026-08-09 | **Audit géo du 29 rejoué (clôture lot 8)** | 94 fiches publiées + 48 plages importées | **0 dépublication** | Audit | en tête de ce fichier |
| 2026-08-10 | **14 (56, niveau 2 : les plages nommées) → BOUCLE LE 56** | 29 | **21 / 0 / 6 / 2** (+6 laissés `pending` avec raison) | Mode délégué, publié | `lots/lot-14-56.md` |
| 2026-08-10 | **15 (22, OUVERTURE du département : niveaux 1 et 2)** | 37 | **25 / 0 / 2 / 4** (+6 laissés `pending` avec raison) | Mode délégué, publié | `lots/lot-15-22.md` |

## Décisions tranchées (lot 5)

9. **Pointe de Lanvéoc : ACCESSIBLE, publiée** (cas laissé en suspens au lot 4). La base d'aéronautique navale occupe le secteur de **Poulmic**, à l'est de la commune, pas la pointe. L'office de tourisme de la presqu'île de Crozon documente la plage de la cale au pied de la pointe, le passage du GR34 et un fort du XIXe siècle qui « se visite librement ». Leçon : une présomption de zone militaire tirée du nom d'une commune se vérifie, elle ne se suppose pas.
10. **Pointe des Espagnols : `pending` reconduit.** Revérifiée au lot 5, aucune date de réouverture publiée. Chantier de valorisation de 1,7 M€ (Conservatoire du littoral + comcom), GR34 toujours dévié.
11. **Trou structurel du backlog OSM (constat du lot 5)** : le niveau 2 du playbook §9.1 (plages et grandes anses nommées) **n'existe pas dans le backlog**, le script d'import ne requêtant que 6 tags dont aucun `natural=beach`. Le lot 5 est donc passé directement au niveau 3 (ports, cales, rias). Ce trou vaut pour tous les départements suivants et motive l'enrichissement §9.3.

## Décisions tranchées (lot 6)

12. **Deux ouvrages du même port à moins de 400 m = un seul spot.** Le môle des Pêcheurs est à 162 m du môle Éric Tabarly, dans le port de La Trinité-sur-Mer. Publier les deux créerait deux fiches pour le même poste. Règle de merge du playbook §3 appliquée telle quelle, y compris pour des ouvrages portuaires distincts et nommés.

~~🔴 **Anomalie de département à trancher (relevée au lot 6).** Une grappe d'une dizaine de spots rattachés au **56** est géographiquement en **Loire-Atlantique (44)** : cluster autour de 47.34 N / 2.87 O, secteur de Piriac-sur-Mer et pointe du Castelli.~~

✅ **FAUSSE ALERTE, levée au lot 10 (2026-08-06). Aucune correction de `department` à faire.** Le cluster à **47.34 N / 2.87 O** est l'**île d'Hœdic** (Beg er Faut, Beg Lagad, Beg er Sennerion, Beg en Argol, Beg Er Lannegui, pointe de Casperaquiz, pointe du Vieux Château), et le cluster voisin à **47.39 N / 2.96 O** est l'**île de Houat** (Beg er Gorlé, Beg er Vachif, Beg Run er Vilaine, Beg Salus, En Tal, er Hastellic). Les deux sont des communes du Morbihan. Piriac-sur-Mer est à **2.546 O** et la pointe du Castelli à **2.549 O**, soit plus de 24 km à l'est : c'est une erreur de lecture de la longitude. Preuve indépendante : le fichier de ré-import du 56 contient « Rade de Hoëdic » à 2.8647 O / 47.3710 N.
➡️ **Conséquence** : le compteur du 56 n'est pas faussé, le 44 ne perd rien, et **Houat et Hœdic restent deux viviers de postes réels du 56** (13 spots au backlog) qui allaient être exclus par erreur.
➡️ **Règle ajoutée, symétrique de la règle 13** : *une anomalie de rattachement départemental se démontre sur les deux coordonnées, jamais sur la seule latitude ni sur une impression de proximité.* Détail : `lots/lot-10-56.md` §6.

## Décisions tranchées (lot 10)

15. ★ **Clause de sécurité obligatoire sur les UPDATE de curation** (suite à l'incident du lot 10 §5 : une fiche écrite sur le mauvais identifiant, corrigée en séance). Chaque UPDATE doit porter **`and slug = '[slug d'origine]'`** en plus de l'`id`, en plus des garde-fous existants `source='imported' and moderation_status='pending'`. Un identifiant mal recopié ne modifie alors plus rien, au lieu de modifier le mauvais spot. Coût nul. À reporter dans `PLAYBOOK.md` §8.5.
16. **Une pointe de ria se classe en `estuaire`, pas en `pointe_rocheuse`** (Mané-Hellec, Listrec). C'est géographiquement une pointe, mais `structure` pilote la matrice espèces et la lecture du poste : la logique de pêche y est estuarienne (veines de courant, bar qui monte avec le flot, mulet, sole). La géologie ne prime pas sur l'usage.
17. **Réserve ornithologique = reject**, comme toute interdiction d'accès (pointe du Vieux Château, Belle-Île). À distinguer de la décision 8 (passage volontairement limité par un gestionnaire) : ici l'accès est purement et simplement interdit.
18. **Suspension de servitude de passage = `pending`, pas reject** (pointe du Bréhuidic, Sarzeau). Quand le sentier est dévié pour la tranquillité des oiseaux avec un itinéraire de substitution, rien ne dit que le poste lui même reste atteignable : on ne publie pas, on ne rejette pas.
19. **Source de contrôle de référence pour le golfe du Morbihan** : la page Wikipédia [Liste des pointes du golfe du Morbihan](https://fr.wikipedia.org/wiki/Liste_des_pointes_du_golfe_du_Morbihan), dont les coordonnées sont sourcées **Géoportail** et qui donne la commune de rattachement. Elle a validé 13 candidats d'un coup au lot 10, avec des écarts de 10 à 140 m. À utiliser systématiquement pour la vérification toponymique croisée (règle 13) sur ce secteur.

## Décisions tranchées (lot 11)

20. **Le contrôle de proximité contre les spots déjà approuvés attrape ce que la recherche web ne voit pas.** « Pointe de Royanec » était à **366 m** de « Pointe de **Roquenec** », publiée au lot 6 : même poste à la confluence du Sac'h et de la ria d'Étel, deux graphies. Sans ce contrôle je publiais un doublon **et** une commune fausse (mapcarta disait Plouhinec, la fiche existante dit Belz). À lancer systématiquement sur toute la sélection, avant la recherche web, pas après.
21. **Un `pending` doit toujours porter sa raison au RECAP.** Le lot 11 laisse 16 spots en attente : la moitié du backlog restant du 56 n'est pas publiable en l'état (objets OSM mal placés, communes indéterminées, séries sans source, réserves au statut de pêche inconnu). Écrire la raison évite qu'un lot suivant re-dépense la même recherche pour rien.
22. **Une cale se classe en `structure='cale'`.** L'import OSM range tous les ouvrages en `digue` ; la valeur `cale` existe dans la contrainte et décrit mieux le poste (plain-pied, familial, découvre à basse mer). Corrigé à la curation.

## Décisions tranchées (lot 12)

23. ★ **Les 400 m déclenchent un examen, ils ne décident pas d'un merge.** Beg Lagad et Beg er Sennerion (Hœdic) sont à **394 m** et ont été publiés séparément : le playbook §3 conditionne le merge à « < 400 m **ET même poste** », et ce sont deux toponymes attestés distincts, avec chacun son repère physique (fort Vauban d'un côté, ruines du phare de 1836 de l'autre) sur deux orientations de côte différentes. Le merge du lot 6 (deux môles d'un même port) portait bien sur le même poste. La distance est un signal, jamais le critère.
24. ★ **Un nom homonyme déjà rejeté ne vaut pas rejet pour son homonyme.** Il existe **deux « Pointe du Vieux Château » dans le 56** : celle de Belle-Île (47.371 / -3.263), rejetée au lot 10 pour réserve ornithologique, et celle d'Hœdic (47.346 / -2.891), publiée ici. 30 km les séparent. Avant d'appliquer une décision passée à un spot, vérifier que c'est bien le même objet, par la coordonnée et par le slug, pas par le nom.
25. **Les relevés toponymiques de [tchinggiz.org](https://www.tchinggiz.org/) sont la meilleure source de contrôle trouvée pour les îles bretonnes** (pages par commune : Hœdic, Houat, Groix). Ils donnent la position décimale et l'étymologie bretonne de chaque micro-toponyme. Ils ont validé **9 spots d'un coup au lot 12, avec des écarts de 5 à 196 m**. ⚠️ Les libellés « Long: » et « Lat: » y sont **inversés** : le premier nombre est la latitude. À utiliser avec la règle 13, aux côtés des listes Wikipédia sourcées Géoportail (décision 19, golfe du Morbihan).
26. **Une zone Natura 2000 ou une propriété du Conservatoire du littoral n'interdit pas la pêche à la ligne du bord.** Vérifié pour Houat et Hœdic : les mesures préfectorales visent les **engins dormants** (filets, palangres, casiers) sur une zone de 0,22 km² au nord de Houat, et les arrêtés de 2013-2014 encadrent la **pêche à pied**. Rien sur la canne depuis le rivage. On publie, en portant la mention « reste sur le sentier balisé » dans l'accès. Ne pas confondre protection d'habitat et interdiction de pêche : la première se mentionne, seule la seconde fait rejeter (invariant §2.4).
27. **Un nom de panne, de poste de carburant ou de compagnie de vedettes est un rejet, même sur un vrai port.** Six d'un coup au lot 12 (« Epices », « Visiteur », « l'estacade » à Port-Louis, « Jetée » en rade de Lorient, « Navix » et « Avitaillement » à Arzon). Prolonge la décision 14 sur les pontons : ce sont des équipements d'exploitation d'un port de plaisance, pas des postes ouverts à la ligne.

## Décisions tranchées (lot 13)

28. **Un lot éditorial ne s'exécute pas sans recherche web.** Le lot 13 devait ouvrir le niveau 2 du 56 sur ses plages les plus notoires (Mine d'Or, Donnant, Kerhillio, Sainte-Barbe, Kerguelen…). La recherche web est tombée en cours de session (quota). Sans elle, ces fiches seraient toutes `light`, ce qui aurait grillé le meilleur du backlog en thin content, exactement ce que le garde-fou §3 interdit. **Un run sans recherche se réaffecte à autre chose, il ne dégrade pas le standard.** La session a servi à l'audit du ré-import, qui n'exige que du SQL.
29. **Un ré-import élargi ramène de l'eau douce et du hors-frontière.** `natural=beach` et les tags de digue attrapent les embarcadères du Marais poitevin (35 lignes en 85), les plages de Vintimille (9 lignes en 06) et les lacs. Les 6 anciens tags ne posaient pas ce problème. **Tout ré-import élargi exige donc une passe hors périmètre** (eau douce, hors France) en plus des contrôles de noms et de bbox déjà en place.
30. **Le `ST_DWithin(150 m)` du script détruit le témoin de l'audit géographique.** Un objet OSM proche d'un spot déjà publié n'est jamais inséré : on ne peut donc pas rejouer par homonymie l'audit qui avait attrapé la « Pointe du Bile » (2 correspondances sur 83 fiches du 29). Le contrôle de position des fiches publiées doit passer par **Open-Meteo Marine**, qui renvoie une erreur sur un point terrestre. C'est le seul test exhaustif disponible, et il couvre aussi les 4 069 `pending`.
    ➡️ **Nuancé le 2026-08-09 (audit rejoué, 0 anomalie).** La conclusion « seul Open-Meteo marche » était trop forte : l'audit par homonymie **fonctionne** une fois le ré-import complet en base, parce qu'un toponyme a presque toujours des homonymes ailleurs sur la côte. Ce qui le rendait inexploitable, c'est de comparer une fiche à **tous** ses homonymes au lieu du **plus proche** : sur le 29, les 3 seuls écarts > 500 m étaient tous des faux positifs (un vrai homonyme distant, une pointe large, une fiche couvrant deux plages). Les deux tests sont complémentaires : l'homonymie attrape le **mauvais objet**, Open-Meteo attrape la **mauvaise coordonnée**.

## Décisions tranchées (campagne de ré-import, 2026-08-08→09)

31. ★ **Une insertion « sans erreur SQL » n'est pas une insertion vérifiée.** Un bloc `INSERT` de ~380 lignes recopié à la main a renvoyé un succès alors que **143 lignes n'étaient jamais parties** : elles n'avaient pas été rejetées, elles n'avaient simplement pas été tapées. Aucune erreur ne pouvait le signaler. **Méthode retenue pour toute insertion en masse : petits lots (~35 lignes) générés par script, puis diff exhaustif slug-par-slug entre le fichier source et la base.** C'est ce diff, et lui seul, qui prouve la complétude. Il a été appliqué aux 8 fichiers de la campagne.
32. **Les collisions de slug ne se voient pas au filtre spatial.** Le slug OSM est déterministe (`nom-osmID`) : une ligne du **premier** import (mal positionnée, centre de bbox) porte le même slug que la ligne corrigée du ré-import, mais à une coordonnée différente que le `ST_DWithin(150 m)` ne rapproche pas. Résultat : violation de contrainte d'unicité et **rollback de tout le bloc**. Garde ajoutée à toutes les insertions, à conserver : `and not exists (select 1 from public.spots s2 where s2.slug = c.slug)`.
33. **Le taux de doublon mesure la maturité du catalogue, pas la qualité de l'import.** Écarts sur les 24 départements : ~0 % sur les départements vierges (85, 06, 2A, 2B, 59, 62), **13 % sur le 29** et **8 % sur le 13**. C'est normal et sain : le 29 a déjà 94 fiches curées, le ré-import retombe dessus (souvent à **0 m**). Un fort taux de rejet sur un département déjà travaillé n'est pas un symptôme.
34. **Sur un littoral de calanques, OSM cartographie l'anse ET la pointe qui la borde.** Dans le 13, la majorité des 23 écartés sont des paires « Calanque de X » / « Pointe de X » distantes de 47 à 65 m, fusionnées par le filtre. Voulu (un seul poste par lieu réel), mais **à savoir au curage** : le spot conservé porte parfois le nom de la pointe alors que le pêcheur cherchera la calanque.
35. ⚠️ **Ce que la relecture de cette campagne a laissé passer, et que l'audit du lot 13 a rattrapé.** La relecture par fichier a retiré une cinquantaine de non-postes (marinas, passerelles ferry, SNSM, sentiers, mairie, détroit du Pas-de-Calais, un point aberrant à 25 km dans les terres) et un lac d'eau douce, mais elle a **manqué trois familles**, toutes détectées ensuite par l'audit transverse : les **35 embarcadères du Marais poitevin** (85), les **9 spots italiens** (06) et les **49 quais d'exploitation**. Leçon : *une relecture fichier par fichier voit les anomalies unitaires, pas les familles géographiques.* Un audit transverse en SQL après insertion n'est pas redondant avec la relecture, il attrape une autre classe d'erreurs. Les verdicts de ces trois familles restent en attente d'arbitrage John (§ audit en tête de fichier).

## Décisions tranchées (lot 14)

36. ★ **Ouvrir le niveau 2 (plages nommées) AVANT les micro-toponymes, sur tous les départements.** Le lot 14 sort **21 fiches full et 0 light** sur 29 spots traités, le meilleur ratio de tout le chantier. La raison est structurelle : offices de tourisme, guides locaux et forums de pêche parlent tous des plages nommées, presque jamais des rochers. Le niveau 4 du playbook §9.1 produit du `light` parce que la matière n'existe pas, pas parce que le tri est mauvais. Le trou signalé au lot 5 (décision 11) est refermé par le ré-import.
37. ★ **Sur un toponyme générique, le voisinage en base tranche plus vite que le web.** Une seule requête listant les spots dans un rayon de 1,4 km a localisé six candidats homonymes : « Grande Plage » ×2 (Carnac, confirmé par Beaumer et pointe Churchill ; Damgan, par Saint-Guérin), « Port Blanc » ×2 (Saint-Pierre-Quiberon ; Hœdic, confirmé par Kastel a Plouz et Port de l'Église), « La Grande Plage » ×2 (Quiberon ; Penthièvre). **À lancer en premier, avant toute recherche web, dès qu'un nom ne porte pas sa commune.** Corollaire de la décision 24 : sur un nom générique, l'homonymie est la règle, jamais l'exception, et le slug part toujours suffixé par la commune.
38. **Une « basse » n'est pas un poste de bord.** « Basse Suscinio » est un haut-fond au large, à 4,4 km du trait de côte publié le plus proche. Le vocabulaire maritime (`basse`, `roche`, `plateau` suivis d'un nom) désigne des dangers de navigation, pas des postes accessibles à pied. Rejet, comme les pontons (14) et les quais d'exploitation (27).
39. ★ **La copy s'écrit accentuée dès le premier UPDATE.** Les 6 premières fiches du lot sont parties désaccentuées (« kilometre », « extremite ») par prudence mal placée sur l'encodage du connecteur SQL, et ont dû être réécrites. Le connecteur passe les accents et les emojis sans difficulté. Une copy désaccentuée en base est un défaut de qualité visible par l'utilisateur, pas un détail technique : en cas de doute, relire une fiche existante avant d'écrire, pas après.

## Décisions tranchées (lot 15)

40. ★ **Une falaise haute est un signal de rejet, pas une difficulté 5.** Trois pointes du lot 15 (pointe de Plouha 104 m, Minard 70 m, Bilfot) sont des sommets de falaise dont aucune source ne documente une descente à l'eau. Publier « difficulté 5 » sur un belvédère enverrait des gens chercher un accès qui n'existe pas. La bonne réponse est `pending` avec la raison, **et la recherche du vrai poste voisin au niveau de la mer** (ici Port Lazo, Gwin Zégal, Bréhec). Généralisation de la décision 7.
41. ★ **Le chiffre d'un audit transverse est un ordre de grandeur, pas un inventaire.** L'audit du lot 13 annonçait 13 spots du 22 situés en 35 ; la requête au moment d'ouvrir le département en trouve **26**, en trois familles au statut différent (35 avéré, eau douce, zone frontière indécidable). Re-mesurer coûte une requête et évite de curer sous le mauvais code département.
42. **Un guide de pêche local qui publie ses coins vaut mieux que dix pages d'office de tourisme.** Les deux articles de `guidedepechebretagne.fr` (Pêche Évasion, Erquy) ont documenté **7 fiches** du lot 15 avec de la matière utilisable : espèce, saison, technique, et le point précis de la plage qui marche. **À chercher en tout début de département** : « guide de pêche en mer [secteur] coins du bord ».
43. **Un phare posé sur une roche ou une île isolée au large n'est pas un poste.** Quatre rejets d'un coup au lot 15 (Triagoz, Sept-Îles, Grand Léjon, Ost-Pic). Prolonge la décision 38 au vocabulaire des feux de navigation : `phare de [roche]` sans continuité terrestre = rejet, à distinguer des phares de digue ou de pointe qui sont, eux, d'excellents postes (Petite Muette, Pointe à l'Aigle, Mean Ruz, tous publiés au même lot).

## Lot 16 — Bouches-du-Rhône (13), Porte 2 seule · 19/08/2026

**Statut : Porte 2 livrée + 13 fiches publiées** (batch `S89-MED-13-01`, secteur Côte Bleue).
Ouverture du département dans le cadre de `BRIEF-CAMPAGNE-MED-2026-08-24.md`.
Document : **`lots/lot-16-13-ZNP-CALANQUES.md`**, réutilisable pour tous les lots suivants du 13.

**Deux batches écrits** : `S89-MED-13-01` (13 fiches, Côte Bleue) et `S89-MED-13-02` (8 fiches,
Camargue et golfe de Fos).

Compteurs 13 : **278 → 253 pending**, 10 → **14 rejected**, 36 → **57 publiées**.
Base entière : **632 fiches publiées**. Sitemap 1 158 → **1 179 URLs**, soit +21 exactement.

Contrôles post-lot : 13/13 descriptions distinctes, longueurs 305-362 et 173-196, espèces 4-7,
hazards 2-4, 0 tiret cadratin, `verified` et `source` intacts, 13/13 au sitemap, 3 pages testées
en HTTP 200. Communes obtenues par **géocodage inverse**, jamais déduites du nom OSM.

**4 rejets secs, sourcés :**

| Spot | Motif | Source |
|---|---|---|
| Anse de la Baume | dans la **ZNP Devenson** | coordonnées GPS officielles du parc |
| Anse des Enfers | dans la **ZNP Devenson** | idem |
| Anse du Grand Mugel | **pêche du bord interdite depuis avril 2025** (réserve marine des enfants) | Réglementations en mer, PN Calanques |
| Plage Calanque du Grand Mugel | idem | idem |

## Décisions tranchées (lot 16)

44. ★★★ **En Méditerranée, la Porte 2 remplace la Porte 1 comme filtre discriminant.** Les 45 candidats
    du 13 passent le test « en mer » d'Open-Meteo : **45 sur 45**, zéro écarté. Sur un littoral aussi
    découpé, ce test ne trie rien. Ce qui trie, c'est la réglementation : **2 spots dans une ZNP** et
    **33 à moins d'un kilomètre**. Ne jamais se croire couvert parce que la Porte 1 est verte.
45. ★★★ **Un poste hors zone interdite peut quand même être illégal à pêcher : le lancer compte, pas
    le point.** Onze spots du 13 sont à moins de 300 m d'une ZNP, dont la Pointe de Cacau à **1 m** et
    la Crique des Morgerets à **13 m**. Un surfcasting normal y tombe dans la zone où tout prélèvement
    est interdit. Règle **validée par John le 19/08/2026** : **moins de 300 m → reste `pending`** ;
    300 m à 1 km → publiable, mais la fiche **doit** nommer la ZNP et sa direction dans `access_notes`.
    S'applique à tous les lots du 13 et, par extension, au 83 quand Port-Cros s'ouvrira.
46. ★★ **L'ordre de notoriété peut mener droit dans le problème.** Le brief prévoyait d'ouvrir le 13
    par les spots les plus connus : ce sont précisément les calanques, donc le secteur le plus exposé
    aux ZNP. Ordre corrigé : Côte Bleue, puis Camargue et golfe de Fos, puis Marseille nord, puis la
    corniche, **et les calanques en dernier**. Publier vite ce qui est sûr, garder pour la fin ce qui
    demande une précaution rédactionnelle.
47. ★★ **Deux jeux de polygones se cumulent sur le 13, il faut tester contre les DEUX.** Le décret du
    parc national (7 ZNP) et l'**arrêté du 01/07/2014** sur les cantonnements de pêche de
    **Carry-le-Rouet** et du **Cap Couronne** sont indépendants. Sur les 22 spots de la Côte Bleue
    testés : **aucun dans une réserve**, 2 sous 300 m (Cap Rousset, les Bouchons), 8 entre 300 m et
    1 km. Le secteur reste donc le bon point de départ du département.
48. ★★★ **Trois régimes réglementaires cohabitent sur le seul département du 13, et ils ne se
    traitent pas pareil.** Les **ZNP du parc national** (interdiction totale, au rivage) appellent la
    règle des 300 m. Les **cantonnements de la Côte Bleue** (arrêté 2014, au rivage aussi) l'appellent
    également. Le **cantonnement du golfe de Beauduc** (2013, 6 balises jaunes) est **au large** : la
    pêche du bord y reste légale et la règle des 300 m ne s'applique pas. Lire chaque zonage pour ce
    qu'il dit, jamais par analogie avec le précédent.
49. ★★ **Le contrôle d'homonymie contre les fiches DÉJÀ publiées est ce qui rattrape le défaut du
    lot S78.** Il a écarté « Plage Napoléon » (doublon d'une fiche curée à 1,4 km, même commune) et
    « Anse de Carteau » (même toponyme qu'une fiche publiée à 1,9 km). Le seuil mécanique de 500 m ne
    les aurait pas vus : c'est la **coïncidence de toponyme dans la même commune** qui tranche.
50. ★★ **Une interdiction récente ne sort d'aucun test géométrique.** L'interdiction de pêche du bord
    au Mugel date d'**avril 2025** et ne figure dans aucun polygone : elle vient d'un arrêté, et il
    fallait aller la lire. Le test de polygone est nécessaire, il n'est pas suffisant.

## Lot 17 — Bouches-du-Rhône (13), Côte Bleue et Camargue · 19/08/2026

**Statut : 21 fiches publiées.** Détail : **`lots/lot-17-13-COTE-BLEUE-CAMARGUE.md`**.
Batches `S89-MED-13-01` (13 fiches, Côte Bleue) et `S89-MED-13-02` (8 fiches, Camargue et golfe de Fos).

Compteurs 13 : **36 → 57 publiées**, 278 → **253 pending**, 10 → **14 rejected**.
Sitemap de production 1 158 → **1 179 URLs**, vérifié en direct. Reste **43 fiches** pour la cible de 100.

Contrôles post-lot : 21/21 descriptions et `access_notes` distinctes, 21/21 dans le calibre,
0 tiret cadratin, **0 mention de marée**, 0 `submersion_maree`, `verified`/`source` intacts,
3 pages live en 200, les 4 rejetés absents du sitemap.

## Décisions tranchées (lot 17)

48. ★★★ **Renommer une fiche ne renomme pas son slug, et l'oubli est invisible.** « Zone naturiste de
    la plage de Piémanson » a été correctement renommée en « Plage de Piémanson » (Porte 3), mais
    l'URL est restée `/spots/zone-naturiste-de-la-plage-de-piemanson-…`. Le titre affiché et l'URL se
    contredisaient, et l'URL portait un mot-clé qui attire exactement le mauvais trafic. **Le nom et le
    slug se décident ensemble, avant l'approbation**, parce que l'URL devient stable à la publication.
    Contrôle à rejouer en fin de lot : comparer `name` et `slug` de chaque fiche du batch.
49. ★★★ **Ne jamais sonder une URL qui n'existe pas encore : on empoisonne son propre cache.** J'ai
    testé le nouveau slug **avant** de faire le changement en base, pour vérifier qu'il était libre.
    Ce `curl` a mis un **404 en cache ISR pour 30 minutes**, et la page correcte a renvoyé 404 juste
    après la correction. Vérifier la disponibilité d'un slug **en SQL**, jamais en HTTP.
50. ★★ **En Méditerranée, le contrôle « aucune mention de marée » doit être une requête, pas une
    relecture.** `select count(*) ... where description ~ 'mar[ée]e|coefficient|[ée]tale|descendante'`
    plus `'submersion_maree' = any(hazards)`. Les deux à zéro sur ce lot, mais c'est le réflexe le plus
    facile à perdre en recopiant le ton des fiches bretonnes.
51. ★★ **Une fiche curée voisine n'est pas forcément un doublon : compare les granularités.** Trois
    fiches du lot sont à moins de 350 m d'une fiche curée, mais les curées sont des fiches de
    **secteur** (« Carry-le-Rouet — Côte Bleue », « Carro — port et jetées ») et les nouvelles décrivent
    un **poste précis**. Vérifier par la coordonnée et le type de poste, pas par la distance seule.

---

**Prochaine étape — poursuivre le 22 Côtes-d'Armor** (245 pending, **33 publiés**, cible 100, soit ~4 lots).

**Ce qui reste à traiter dans le 22, dans l'ordre :**

1. **Finir le niveau 1** : pointes du Goëlo et du Trégor encore non traitées (Guilben, Berjul, Kerlite, Castel Erek, Servel, Château à Plougrescant côté Perros), digues et môles des ports (Binic, Paimpol, Saint-Quay, Tréguier), estacades.
2. **Niveau 2, les plages nommées** (décision 36) : le 22 en a un gros gisement encore intact, notamment Trégastel, Trévou-Tréguignec, Louannec, Bréhat, Étables, Binic, Sables-d'Or, Saint-Jacut, Lancieux.
3. **Chercher les postes de bas de falaise** que le lot 15 a laissés ouverts : **Port Lazo** (au pied de Bilfot et Minard), Gwin Zégal, Port Moguer.
4. **Estuaires du Trieux et du Jaudy, cales** → micro-toponymes en dernier.

**Trois arbitrages John ouverts sur le 22** (rien n'est écrit sans GO) :

- Les **26 spots situés en 35 ou en eau douce** (`lots/lot-15-22.md` §1.1) : 19 à passer en `department='35'`, 2 à rejeter (Dinan, Taden), 5 à vérifier sur la limite du Frémur.
- Les **quais d'exploitation** du 22, laissés `pending` (décisions 14/27/38).
- **Pors Kamor**, à 173 m du phare de Mean Ruz publié : merge probable, à trancher au prochain lot.

⚠️ **L'arbitrage John sur les 5 familles d'anomalies du lot 13 reste ouvert** (Marais poitevin en 85, spots italiens en 06, quais d'exploitation, Scandola en 2A, eau douce). Elles sont toutes en `pending`, donc invisibles des utilisateurs et sans urgence.

Deux dossiers du 29 restent ouverts et sont à reprendre plus tard : la **pointe des Espagnols** (à la réouverture du site) et le doublet **Bouillennou / Bouillenou**. Six spots du 56 restent `pending` avec leur raison (`lots/lot-14-56.md` §4), dont la grappe **Île-aux-Moines** et le cordon de **Penthièvre**, à traiter d'un bloc si le 56 est rouvert.
