# LOTS — État vivant de la curation des spots importés

> Compagnon de `PLAYBOOK.md`. Chaque session de curation met à jour ce fichier (compteurs + journal). Le backlog réel se re-vérifie en début de session (SQL live).

**Mode de validation (décision John 2026-08-05)** : les lots éditoriaux **1 à 3** = RECAP en attente de **GO John** avant écriture DB (mode A). À partir du 4e lot publié : **mode délégué** (publication directe, spot-check a posteriori ; le doute reste `pending`).

## 🎯 Stratégie (décision John 2026-08-05) : un département à la fois, ~100 spots complets

On finit un département avant d'attaquer le suivant, pour remplir la carte par zones denses. **Objectif par département : ~100 fiches publiées et complètes** (espèces, difficulté, dangers, accès, description). Ordre INTERNE au département = **par notoriété** (pointes/caps/digues/môles/estacades/phares → plages et anses → estuaires/passes/cales → micro-toponymes en dernier), pas alphabétique : c'est ce qui remplit la carte utilement. Détail : `PLAYBOOK.md` §9.

**Ordre des départements** : **29 ✅ bouclé (101 fiches)** → **56 Morbihan (en cours)** → puis les 22 autres, cf le **plan de couverture complète** ci-dessous.

### 📍 Plan de couverture — les 24 départements côtiers (mis à jour 2026-08-06, SQL live)

Périmètre = `COASTAL_DEPARTMENTS` (`lib/geo/departments.ts`) : 24 départements, métropole + Corse, **sans la Somme (80)** (décision produit, sprint 11.6). Aucun n'est laissé de côté.

**Objectif par département = `min(100, couverture exhaustive des postes réels)`.** Les 100 fiches sont une cible pour les façades longues, pas un quota à remplir de force : le Nord (40 km de côte) ou le Gard (20 km) n'ont pas 100 postes de pêche du bord, et en inventer violerait les invariants §2. Un département est **fini** quand il atteint sa cible OU que tous ses postes réels documentés sont traités.

| Vague | Dépt | Publiés | Backlog | Cible | Ré-import requis | Statut |
|---|---|---|---|---|---|---|
| 1 | **29** Finistère | 101 | 112 | 100 | non | ✅ **fini** |
| 1 | **56** Morbihan | 29 | 84 | 100 | oui (plages) | 🟢 en cours (lots 6-7) |
| 1 | 22 Côtes-d'Armor | 8 | 78 | 100 | oui | ⬜ |
| 1 | 50 Manche | 8 | 54 | 100 | oui | ⬜ |
| 1 | 35 Ille-et-Vilaine | 5 | 23 | 40 | oui | ⬜ |
| 1 | 14 Calvados | 4 | 34 | 60 | oui | ⬜ |
| 2 | 17 Charente-Maritime | 14 | 53 | 100 | oui | ⬜ |
| 2 | 44 Loire-Atlantique | 12 | 37 | 60 | oui (+ grappe 56→44, cf ⚠️) | ⬜ |
| 2 | **85** Vendée | 12 | **0** | 60 | **indispensable** | ⬜ jamais importé |
| 2 | 33 Gironde | 13 | 15 | 60 | oui | ⬜ |
| 2 | 40 Landes | 10 | 5 | 40 | oui | ⬜ |
| 2 | 64 Pyrénées-Atl. | 12 | 7 | 30 | oui | ⬜ |
| 3 | 13 Bouches-du-Rhône | 11 | 94 | 100 | non | ⬜ |
| 3 | 83 Var | 11 | 19 | 100 | oui | ⬜ |
| 3 | **06** Alpes-Maritimes | 9 | **0** | 60 | **indispensable** | ⬜ jamais importé |
| 3 | 34 Hérault | 9 | 12 | 60 | oui | ⬜ |
| 3 | 66 Pyrénées-Or. | 9 | 26 | 60 | oui | ⬜ |
| 3 | 11 Aude | 7 | 2 | 30 | oui | ⬜ |
| 3 | 30 Gard | 6 | 1 | 20 | oui | ⬜ |
| 4 | 76 Seine-Maritime | 6 | 13 | 50 | oui | ⬜ |
| 4 | 62 Pas-de-Calais | 5 | 22 | 50 | oui | ⬜ |
| 4 | 59 Nord | 3 | 2 | 20 | oui | ⬜ |
| 4 | **2A** Corse-du-Sud | 9 | **0** | 60 | **indispensable** | ⬜ jamais importé |
| 4 | **2B** Haute-Corse | 9 | **0** | 60 | **indispensable** | ⬜ jamais importé |

**Total actuel : 322 fiches publiées · 693 en backlog · cible ≈ 1 475 fiches.** À 20 spots/jour et ~75 % de publication, l'horizon complet est de **4 à 5 mois** de tâche quotidienne.

**Logique des vagues** : 1 = Bretagne (densité de postes et de pêcheurs la plus forte, le 29 sert de modèle) · 2 = façade atlantique sud · 3 = Méditerranée · 4 = Manche-Nord et Corse (linéaires courts ou logistique OSM plus pauvre). L'ordre reste ajustable si un signal produit le justifie (département d'un fondateur actif, pic de trafic SEO).

**Les 4 départements à zéro backlog** (85, 06, 2A, 2B) n'ont jamais rien remonté de l'import initial : les 6 anciens tags OSM (`pier`, `breakwater`, `groyne`, `quay`, `cape`) ne trouvent rien de *nommé* dans leurs bbox, alors que le script les couvre bien. Le ré-import élargi (8 tags, dont `natural=beach`) est le déblocage pour ces quatre-là : sans lui, ils resteraient à ~10 fiches indéfiniment.

✅ **Ré-import OSM élargi : GO John du 2026-08-06, script modifié et livré.** `scripts/import-osm-spots.ts` requête désormais **8 tags de plus** (`natural=beach`, `bay`, `reef`, `strait` · `man_made=lighthouse`, `dyke`, `embankment` · `leisure=slipway`), embarque le **filtre de noms invalides du lot 0** (`isInvalidName`, validé sur 40 cas : 27 rejets et 13 conservations, tous corrects) et accepte **`--dept`** / **`--out`** pour cibler un département. Mapping structure étendu (`beach→plage`, `strait→passe`, `slipway→cale`, `dyke`/`embankment→digue`) ; `bay`, `reef` et `lighthouse` restent **NULL volontairement**, la curation tranche.

⚠️ **Reste à exécuter par John** (l'environnement de session n'a pas d'accès réseau vers `overpass-api.de`). Le ré-import est le **préalable de 21 des 24 départements** (tous sauf 29, 56 partiellement, 13) : à lancer département par département, juste avant sa vague. Priorité immédiate = 56, puis les 4 départements jamais importés (85, 06, 2A, 2B).

```bash
# le département en cours
pnpm tsx scripts/import-osm-spots.ts --dept=56 --out=supabase/seed-spots-import-osm-02-56.sql

# les 4 départements à zéro backlog (à faire une bonne fois)
pnpm tsx scripts/import-osm-spots.ts --dept=85,06,2A,2B --out=supabase/seed-spots-import-osm-03-vides.sql
```

Le script **écrit un fichier SQL, jamais en base**. Relire puis exécuter : les lignes entrent en `pending` (masquées de la carte) et le `NOT EXISTS ST_DWithin(150 m)` déduplique contre tout l'existant. Détail : `lots/lot-07-56.md` §4.

⚠️ **Contrainte mesurée (SQL live 05/08)** : au taux de publication du lot 1 (64 %), seul le **29** atteint 100 avec le backlog seul (34 publiés + 183 pending ≈ 151). Ailleurs : 56 ≈ 76 · 13 ≈ 71 · 22 ≈ 58 · 17 ≈ 48 · 50 ≈ 43 · 44 ≈ 36 · 14 ≈ 26. Pour tenir l'objectif hors 29, il faut **enrichir le backlog avant d'attaquer le département** (ré-import OSM élargi, `PLAYBOOK.md` §9.3, puis recherche éditoriale).

## Lot 0 — Assainissement ✅ (exécuté le 2026-08-05)

941 → **813 pending**. 128 rejetés (94 noms invalides, 15 doublons du catalogue curé, 19 doublons internes) + 3 fiches curées normalisées (hazards). Détail : `lots/lot-00-assainissement.md`.

## Backlog par département (ordre de traitement, chiffres post-lot 0)

| # | Dépt | Spots | Lots (~20/lot) | Publiés | Rejetés (édito) | Statut |
|---|---|---|---|---|---|---|
| 1 | 29 Finistère | 112 | — | 83 | 13 | ✅ **OBJECTIF ATTEINT : 101 approved sur ~100** (lots 1 à 5) |
| 2 | 56 Morbihan | 84 | ~4 | 22 | 2 | 🟢 lots 6 et 7 publiés · **29 approved sur ~100** |
| 3 | 22 Côtes-d'Armor | 78 | ~4 | 0 | 0 | ⬜ |
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

**Backlog : 693 pending · publiés (édito) : 105 · rejetés : 144.**
Vérifié en SQL live le 2026-08-06 **après écriture du lot 7** : 693 pending · 112 pending sur le 29 · 84 pending sur le 56 · 105 imported approved · **322 spots approved au total** · **101 approved sur le 29** (objectif ATTEINT) · **29 approved sur le 56** · 0 slug dupliqué · 0 `verified`/`verification_level` posé à tort · 0 fiche incomplète · 0 tiret cadratin en base. Aucun DDL aux lots 5 à 7, donc pas de nouvel advisor possible. *(Chiffres hors ré-import élargi, qui reste à exécuter.)*
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

## Décisions tranchées (lot 5)

9. **Pointe de Lanvéoc : ACCESSIBLE, publiée** (cas laissé en suspens au lot 4). La base d'aéronautique navale occupe le secteur de **Poulmic**, à l'est de la commune, pas la pointe. L'office de tourisme de la presqu'île de Crozon documente la plage de la cale au pied de la pointe, le passage du GR34 et un fort du XIXe siècle qui « se visite librement ». Leçon : une présomption de zone militaire tirée du nom d'une commune se vérifie, elle ne se suppose pas.
10. **Pointe des Espagnols : `pending` reconduit.** Revérifiée au lot 5, aucune date de réouverture publiée. Chantier de valorisation de 1,7 M€ (Conservatoire du littoral + comcom), GR34 toujours dévié.
11. **Trou structurel du backlog OSM (constat du lot 5)** : le niveau 2 du playbook §9.1 (plages et grandes anses nommées) **n'existe pas dans le backlog**, le script d'import ne requêtant que 6 tags dont aucun `natural=beach`. Le lot 5 est donc passé directement au niveau 3 (ports, cales, rias). Ce trou vaut pour tous les départements suivants et motive l'enrichissement §9.3.

## Décisions tranchées (lot 6)

12. **Deux ouvrages du même port à moins de 400 m = un seul spot.** Le môle des Pêcheurs est à 162 m du môle Éric Tabarly, dans le port de La Trinité-sur-Mer. Publier les deux créerait deux fiches pour le même poste. Règle de merge du playbook §3 appliquée telle quelle, y compris pour des ouvrages portuaires distincts et nommés.

🔴 **Anomalie de département à trancher (relevée au lot 6).** Une grappe d'une dizaine de spots rattachés au **56** est géographiquement en **Loire-Atlantique (44)** : cluster autour de 47.34 N / 2.87 O, secteur de Piriac-sur-Mer et pointe du Castelli (Beg er Faut, Beg Lagad, Beg er Sennerion, Beg en Argol, Beg Er Lannegui, Pointe de Casperaquiz, Pointe du Vieux Château, et voisins). Ils gonflent le backlog du 56 et manqueront au 44. **Non corrigés** : `department` n'est pas dans le périmètre d'écriture par défaut de la curation. Deux options pour John : UPDATE ciblé de `department` sur la grappe (avec vérification par point), ou correction différée au moment du 44. La première est préférable, sinon le compteur du 56 reste faux. Détail : `lots/lot-06-56.md` §5.

**Prochaine étape — lot 8 sur le 56.** 84 pending restants avant l'apport du ré-import : pointes d'Arzon (Kerners, Monteno, Penbert, la Palisse), Baden et Larmor-Baden (Blair, Locmiquel), île d'Arz et île aux Moines (Liouse, Nénézic, Bilhervé, Trec'h), côte sauvage (Kervihan, Scouro, Marie Venell, Kergroix), ria d'Étel (Verdon, Kerantréh, Mané-Hellec, Listrec, Perche), Groix (Grognon, Saint-Nicolas, jetée de Locmaria), Belle-Île (Grand Guet, Taillefer, Vieux Château, Fri-Mez, Penmarc'h) et Rhuys (Duer, l'Ours, Bréhuidic). **Lancer le ré-import (bloc ✅ en tête de fichier) avant le lot 8** pour que les plages entrent dans la sélection.

Deux dossiers du 29 restent ouverts et sont à reprendre plus tard : la **pointe des Espagnols** (à la réouverture du site) et le doublet **Bouillennou / Bouillenou**.
