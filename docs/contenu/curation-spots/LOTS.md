# LOTS — État vivant de la curation des spots importés

> Compagnon de `PLAYBOOK.md`. Chaque session de curation met à jour ce fichier (compteurs + journal). Le backlog réel se re-vérifie en début de session (SQL live).

**Mode de validation (décision John 2026-08-05)** : les lots éditoriaux **1 à 3** = RECAP en attente de **GO John** avant écriture DB (mode A). À partir du 4e lot publié : **mode délégué** (publication directe, spot-check a posteriori ; le doute reste `pending`).

## Lot 0 — Assainissement ✅ (exécuté le 2026-08-05)

941 → **813 pending**. 128 rejetés (94 noms invalides, 15 doublons du catalogue curé, 19 doublons internes) + 3 fiches curées normalisées (hazards). Détail : `lots/lot-00-assainissement.md`.

## Backlog par département (ordre de traitement, chiffres post-lot 0)

| # | Dépt | Spots | Lots (~20/lot) | Publiés | Rejetés (édito) | Statut |
|---|---|---|---|---|---|---|
| 1 | 29 Finistère | 208 | ~10 | 0 | 0 | ⬜ |
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

**Backlog : 813 · publiés : 0 · rejetés (lot 0) : 128.**

## Journal des sessions

| Date | Lot | Spots traités | full / light / merge / reject | Mode | RECAP |
|---|---|---|---|---|---|
| 2026-08-05 | 0 (assainissement) | 941 analysés | 0 / 0 / 15 / 113 | GO John | `lots/lot-00-assainissement.md` |
