# 🏁 Sprint 58 — « Nettoyage, polish & vérif finale » — RECAP de CLÔTURE (chantier 51→58)

> **Statut : CODE-COMPLET. NON commité / NON poussé (feu vert John). Migration 097 APPLIQUÉE en prod.**
> Exécuté le 2026-06-30 (ultracode). Prod de départ = `7f1ee4c` (sprint-57). Dernier sprint du chantier correctifs 51→58.
> Vérif : suite **605/605** (−6 = tests du code mort supprimés), typecheck 0, lint 0, build OK, `lint-copy-dashes` propre, advisors OK.

---

## Décisions John

- **WS-A** chat sortie passée → **GARDER** (débrief post-sortie, choix produit). Documenté (0 code de comportement).
- **WS-E** 5 profils test → **purger, MAIS après confirmation ligne par ligne** (liste ci-dessous, aucune suppression effectuée ce tour).

## Ce qui a été fait

| WS | Détail | Migration |
|---|---|---|
| **A** | Commentaire dans `sendOutingMessage` (`lib/cofishing/actions.ts`) : le chat reste ouvert après `planned_at` (débrief), seul `cancelled` ferme. Choix assumé, pas un oubli. | — |
| **B** | Ville `maxLength={100}` (`profile-form.tsx`, cohérence avec bio/pseudo) ; libellé notif `truncate` (`notifications/page.tsx`) ; **compteur `{n}/2000`** sur le composer fil (`PostComposer.tsx`) via **écriture DOM directe** (ref, PAS de setState par frappe → l'optim INP du composer non contrôlé est préservée ; reset à la publication). | — |
| **C** | **Migration 097** : 4 index couvrants FK (`outing_messages.user_id`, `outing_reviews.reviewer_id`, `spot_confirmations.user_id`, `spots.verified_by`). Appliquée en prod. Index-only → types inchangés. | **097** |
| **D** | **Code mort supprimé** (0 importeur revérifié) : fichiers `home-visuals.tsx`, `brittany-coast.ts`, `home-stats.ts`, test `streaks.test.ts` ; fonctions `parseGeoJSONPoint`/`parseGeoJSONPolygonCentroid` (utils.ts), `getMyBadges` (badges.ts), `computeStreak`+helpers (streaks.ts) + bloc test associé. Exports vivants conservés (recomputeMyBadges, BADGES, getMyStreak, Streak, reste de utils.ts). | — |
| **E** | 5 profils test listés pour accord John (voir ci-dessous). **Aucune suppression.** | — |

## ⚠️ WS-E — 5 profils à arbitrer (username NULL, non onboardés, 0 prise / 0 post)

| # | email | créé | verdict suggéré |
|---|---|---|---|
| 1 | `test-discovery@carnet-peche.dev` | 2026-05-19 | 🗑️ test évident (domaine `.dev`) |
| 2 | `ilyesghab@gmail.com` | 2026-05-23 | ⚠️ **ressemble à un VRAI inscrit** abandonné en onboarding, pas un test |
| 3 | `ssssss@gmail.com` | 2026-06-11 | 🗑️ junk |
| 4 | `testtt@gmai.com` | 2026-06-25 | 🗑️ test (typo `gmai.com`) |
| 5 | `test@gm.com` | 2026-06-25 | 🗑️ test |

**À faire (John)** : confirme lesquels purger. Reco : supprimer 1, 3, 4, 5 ; **garder #2** (vrai utilisateur potentiel). Suppression en cascade via `delete_my_account` (RPC) ou SQL admin, sur ton OK explicite. Aucun de ces 5 ne correspond aux comptes QA flaggés (qui ont un username).

## Vérification finale du chantier 51→58 (WS-F)

- **Tests** : `pnpm test` **605/605** (la baisse de 611→605 = suppression des tests du code mort WS-D, attendu). `typecheck` 0 · `lint` 0 · `build` OK.
- **`lint-copy-dashes`** : propre (chantier copy S56 tenu ; aucun tiret introduit S51-58).
- **Advisors performance** : les **4 FK ciblées sont désormais indexées** (sorties de `unindexed_foreign_keys` ; reste `stripe._managed_webhooks`, schéma Stripe externe = bénin). Les 4 nouveaux index apparaissent « unused » = normal (fraîchement créés, réservoir quasi vide ; servent au cascade/JOIN). « Multiple permissive policies » = pré-existant, hors scope (consolidation = autre chantier).
- **Advisors sécurité** : 3 ERROR + 76 WARN, **tous pré-existants/assumés**, **aucun introduit par 091-097** : `invite_codes` RLS sans policy (fail-closed, voulu, S25) ; vues `catches_for_viewer`/`spots_for_viewer` SECURITY DEFINER (assumées, migration 047) ; HIBP off (décision John, Pro-only) ; RPC `SECURITY DEFINER` exposées anon/authenticated (gatées en interne par tier/k-anon, par design).
- **Invariant GPS** : tenu (aucun changement S58 n'expose de coordonnée ; floutage 3 couches intact).
- **Revue croisée indépendante** : voir verdict ci-dessous.

## Migrations du chantier (091 → 097)

| # | Sprint | Objet |
|---|---|---|
| 091 | 51 | `subscriptions.status` CHECK (paused) |
| 092 | 51 | fix RLS INSERT `outing_reviews` (tautologie) |
| 093 | 51 | anti auto-confirmation spot (`spot_confirmations`) |
| 094 | 53 | tag de 6 espèces invisibles |
| 095 | 53 | nettoyage alose / stickbait |
| 096 | 53 | `username` unique case-insensitive |
| 097 | 58 | 4 index couvrants FK |

## État final des findings (audits 2026-06-28 / 2026-06-29 ×2)

100 % traités : **corrigés** (S51-57 : Stripe, RLS, bugs visibles, liens, données/saisies, nav/résilience/auth, partage/OG, a11y/copy, SEO), **décidés voulus** (chat débrief WS-A ; landing SEO /spots ; HIBP off), ou **explicitement différés** (perf carte WS-A S57 → mesure Lighthouse de John ; PostHog dynamique → suivi ciblé ; consolidation policies permissives → autre chantier ; purge profils → accord John).

## Reste avant merge (John)

1. **QA VISUELLE LIVE desktop + MOBILE RÉEL (390 px)** — jamais faite (plancher de l'extension) : home, carte (légende, chips), carnet, fil, sorties, notifications, fiche espèce, carte de partage story, modération.
2. **Lighthouse CI mobile `/carte`** (tranche WS-A perf S57).
3. **Rich Results** `/tarifs` (AggregateOffer) + fiche espèce.
4. **WS-E** : confirmer la purge des profils test.
5. **Commit + push** (push manuel, §13).

## Suite (hors chantier)
Phase **mobile** (Expo iOS/Android, cf `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`) + **amorçage du réservoir** (cartes recap/records à 0, ~19 prises / 5 espèces — invisibilité du moat faute de données, pas un bug).
