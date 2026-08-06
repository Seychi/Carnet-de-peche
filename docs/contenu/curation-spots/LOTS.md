# LOTS — État vivant de la curation des spots importés

> Compagnon de `PLAYBOOK.md`. Chaque session de curation met à jour ce fichier (compteurs + journal). Le backlog réel se re-vérifie en début de session (SQL live).

**Mode de validation (décision John 2026-08-05)** : les lots éditoriaux **1 à 3** = RECAP en attente de **GO John** avant écriture DB (mode A). À partir du 4e lot publié : **mode délégué** (publication directe, spot-check a posteriori ; le doute reste `pending`).

## 🎯 Stratégie (décision John 2026-08-05) : un département à la fois, ~100 spots complets

On finit un département avant d'attaquer le suivant, pour remplir la carte par zones denses. **Objectif par département : ~100 fiches publiées et complètes** (espèces, difficulté, dangers, accès, description). Ordre INTERNE au département = **par notoriété** (pointes/caps/digues/môles/estacades/phares → plages et anses → estuaires/passes/cales → micro-toponymes en dernier), pas alphabétique : c'est ce qui remplit la carte utilement. Détail : `PLAYBOOK.md` §9.

**Ordre des départements** : **29 (en cours)** → 56 → 22 → 17 → 44 → 50 → 14 → puis Méditerranée 13 → 83 → 66 → 34 → petits départements.

⚠️ **Contrainte mesurée (SQL live 05/08)** : au taux de publication du lot 1 (64 %), seul le **29** atteint 100 avec le backlog seul (34 publiés + 183 pending ≈ 151). Ailleurs : 56 ≈ 76 · 13 ≈ 71 · 22 ≈ 58 · 17 ≈ 48 · 50 ≈ 43 · 44 ≈ 36 · 14 ≈ 26. Pour tenir l'objectif hors 29, il faut **enrichir le backlog avant d'attaquer le département** (ré-import OSM élargi, `PLAYBOOK.md` §9.3, puis recherche éditoriale).

## Lot 0 — Assainissement ✅ (exécuté le 2026-08-05)

941 → **813 pending**. 128 rejetés (94 noms invalides, 15 doublons du catalogue curé, 19 doublons internes) + 3 fiches curées normalisées (hazards). Détail : `lots/lot-00-assainissement.md`.

## Backlog par département (ordre de traitement, chiffres post-lot 0)

| # | Dépt | Spots | Lots (~20/lot) | Publiés | Rejetés (édito) | Statut |
|---|---|---|---|---|---|---|
| 1 | 29 Finistère | 183 | ~9 | 16 | 9 | 🟢 lot 1 publié |
| 2 | 56 Morbihan | 108 | ~5 | 0 | 0 | ⬜ |
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

**Backlog : 788 pending · publiés (édito) : 16 · rejetés : 137 (128 lot 0 + 9 lot 1).**
Vérifié en SQL live le 2026-08-05 après écriture : 788 pending · 16 imported approved · 138 imported rejected (dont 1 antérieur au lot 0) · 233 spots approved au total (215 curés + 16 importés + 2 communautaires) · 0 slug dupliqué · 0 `verified`/`verification_level` posé à tort · 0 tiret cadratin en base.

## ⏳ En attente de GO John

*Aucun lot en attente.*

**Garde-fou playbook** : à partir de 2 lots en attente sans GO, la tâche planifiée ne traite plus de nouveau lot et se contente d'un rappel.

## Décisions tranchées (lot 1)

1. **Renommage des slugs : OUI** (GO John du 2026-08-05). Les spots publiés perdent le suffixe `-osmNNNN` et prennent un slug lisible suffixé par la commune ou le lieu (`beg-ar-skeiz-guisseny`, `pointe-du-kador-crozon`). Unicité vérifiée avant chaque UPDATE. À appliquer aux lots suivants.
2. **Règle « série OSM »** : un micro-toponyme issu d'une série d'objets OSM créés d'un bloc (noms bretons de rochers) n'est publié que si une source indépendante en fait un lieu identifiable ET accessible. Sinon reject. C'est ce qui produit 6 des 9 rejects du lot 1.

## Décisions tranchées (suite)

3. **Ordre de traitement dans un département : PAR NOTORIÉTÉ** (arbitrage John du 2026-08-05, avec la stratégie « un département à la fois »). Fini l'ordre alphabétique qui faisait commencer par 200 micro-toponymes « Beg ar … ». Barème dans `PLAYBOOK.md` §9.1.
4. **Vocabulaire `hazards` : CORRIGÉ le 2026-08-05** (hors curation, fix de rendu). `HAZARDS_LABELS` (`lib/labels.ts`) couvre désormais AUSSI le vocabulaire éditorial réellement stocké (`submersion_maree`, `rochers_glissants`, `vagues_scelerats`, `falaise`, `isolation`, `baines`, `baignade_dangereuse`, `rejet_eaux_usees`, `sentier_expose`, `vagues`), et la fiche spot affiche le libellé accentué au lieu de la valeur brute (`app/(marketing)/spots/[slug]/page.tsx`). Les deux familles de clés cohabitent volontairement : le formulaire de curation propose les siennes, la base contient les deux. `tsc` vert.

## Journal des sessions

| Date | Lot | Spots traités | full / light / merge / reject | Mode | RECAP |
|---|---|---|---|---|---|
| 2026-08-05 | 0 (assainissement) | 941 analysés | 0 / 0 / 15 / 113 | GO John | `lots/lot-00-assainissement.md` |
| 2026-08-05 | 1 (29, A à B) | 25 | 10 / 6 / 0 / 9 | GO John, publié | `lots/lot-01-29.md` |
