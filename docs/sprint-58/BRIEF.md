# 🎯 Sprint 58 — « Nettoyage, polish & vérif finale »

> **Brief exécutable** (format Fable `ultracode` / effort `xhigh`). Source : `docs/ROADMAP-CORRECTIFS-2026-06-29-SPRINTS-51-58.md` §11 + `docs/audits/AUDIT-2026-06-29-ADDENDUM-PROFONDEUR.md`.
> **Prod = HEAD `aa4a28d` (sprint-51, déployé) — à réactualiser** (les S52-57 auront avancé HEAD au moment d'exécuter). Objectif : **solder la dette**, les derniers détails, **et faire la passe de vérification globale** du chantier 51→58. Migration **097** (index). C'est le sprint de clôture.

---

## 🚀 Ligne de lancement (copier-coller)

```
ultracode effort xhigh — Exécute le Sprint 58 (docs/sprint-58/BRIEF.md). WS-A chat sortie passée, WS-B détails UI (city/compteur/troncature), WS-C index FK (migration 097), WS-D code mort, WS-E nettoyage seed. Finis par WS-F = VÉRIF FINALE du chantier 51→58 (verif-sprint global + advisors + lint-copy-dashes + QA mobile réelle 390px). Esprit critique : confirme que rien des sprints précédents n'a régressé. NE PUSH PAS sans validation.
```

**Prérequis** : dépôt local réparé + **réactualiser HEAD** (`git rev-parse HEAD`) et les numéros de migration libres (091-096 pris par S51/S53 ; prochain probable = **097**, à confirmer).

---

## Posture & invariants

Effort max + critique. Dernier sprint → c'est aussi le **filet de sécurité** du chantier entier. Invariants : RLS d'abord, migration numérotée + regen `lib/types.ts` si schéma, zéro coordonnée exposée, **pas de tiret cadratin dans la copy visible**, pas de push sans John. Supprimer du code = vérifier **zéro importeur** avant.

---

## WS-A — Chat co-pêchage : fermer sur sortie passée 🟢 [finding B2]

**Constat** : le chat `outing_messages` est bloqué quand la sortie est `cancelled`, mais **il n'existe pas de statut `done`** : une sortie passée reste `open`/`full`, donc son chat reste **écrivable indéfiniment** (`sendOutingMessage` n'a pas de garde `planned_at < now`). La policy INSERT (migration 068, réaffirmée 089) gate sur le statut de la sortie + participant `accepted`.

**Correctif (décision John)** :
- **(A) Fermer** : ajouter une garde `planned_at < now() - grâce` à la policy INSERT `outing_messages` (migration **097** ou suivante) + au serveur `sendOutingMessage` → chat **lecture seule** après la sortie. Confirmer d'abord la **localisation exacte** de la policy (068 vs 089) et son texte.
- **(B) Garder** (débrief post-sortie) : c'est un choix produit légitime → documenter « voulu » et **ne rien faire**.

*Reco : (B) avec une petite mention UI « sortie passée » (déjà affichée « Passée » live), ou (A) si tu veux verrouiller. À trancher.*

**Critères** : comportement du chat sur sortie passée **explicitement décidé** (fermé OU documenté voulu) ; aucune fuite de coordonnée (invariant tenu).

---

## WS-B — Détails UI 🟢

- **`city` sans `maxLength`** : `app/(app)/profil/profile-form.tsx` — l'input ville n'a **pas** de `maxLength` (le serveur cape à 100 → erreur générique au-delà), alors que `bio` a un compteur `{bioLength}/200` (`:160,166`) et le pseudo `maxLength={30}` (`:151`). → ajouter `maxLength={100}` à l'input ville (cohérence).
- **Composer fil sans compteur** : `components/feed/PostComposer.tsx:305` `maxLength={2000}` (troncature silencieuse au collage). → ajouter un compteur visible style `bio` (`{length}/2000`). Idem `access_notes`/`description` de `/spots/proposer` si même cas.
- **Libellé notif non tronqué** : `app/(app)/notifications/page.tsx:159` — la ligne `describe()` (qui embarque `actor_username`) rend dans un `<p>` sans `truncate`/`line-clamp`, alors que le `preview_text` adjacent (`:161`) est tronqué. → ajouter `truncate`/`line-clamp-1` (le pseudo est capé 30, donc bénin, mais cohérence de discipline).

**Critères** : ville bornée inline ; compteur sur le composer ; libellé notif tronqué comme son preview.

---

## WS-C — Index FK manquants 🟢 [finding M]

**Constat advisors (perf, INFO)** : FK sans index couvrant sur `outing_messages.user_id`, `outing_reviews.reviewer_id`, `spot_confirmations.user_id`, `spots.verified_by`.

**Correctif** : **Migration `097_fk_covering_indexes.sql`** :
```sql
create index if not exists outing_messages_user_id_idx     on public.outing_messages (user_id);
create index if not exists outing_reviews_reviewer_id_idx  on public.outing_reviews (reviewer_id);
create index if not exists spot_confirmations_user_id_idx  on public.spot_confirmations (user_id);
create index if not exists spots_verified_by_idx           on public.spots (verified_by);
```
- **Laisser `spatial_ref_sys`** (table système PostGIS, advisor bénin) et les **policies permissives multiples** (impact réel faible aux volumes actuels ; consolidation = autre chantier).

**Critères** : `get_advisors(performance)` ne liste plus ces 4 FK non indexées ; aucune régression de requête.

---

## WS-D — Supprimer le code mort 🟢

**Vérifié : 0 importeur réel** (hors définitions + tests) pour :
- `lib/map/utils.ts` — `parseGeoJSONPoint` (`:91`), `parseGeoJSONPolygonCentroid` (`:102`) (garder le reste du fichier s'il est utilisé).
- `lib/marketing/home-stats.ts` — `getHomeStats` (orphelin depuis la refonte home S34).
- `lib/marketing/brittany-coast.ts` + son **unique** consommateur `components/marketing/home-visuals.tsx` (chaîne ~200 lignes morte).
- `lib/gamification/badges.ts` `getMyBadges` (`:95`) et `streaks.ts` `computeStreak` (`:54`) — référencés **seulement par leurs tests**.

**Correctif** : supprimer les exports/fichiers morts + leurs tests dédiés (si le test ne teste qu'une fonction supprimée). **Re-vérifier zéro importeur** juste avant suppression (`git grep <symbole> HEAD`), au cas où un sprint 52-57 l'aurait réutilisé.

**Critères** : build + types verts après suppression ; aucune référence pendante ; bundle marketing allégé.

---

## WS-E — Nettoyage du réservoir / seed 🟢

- **5 profils `username = NULL` / non onboardés** (comptes de test) : décision John — purger (via `delete_my_account` ou SQL admin **avec son accord explicite**, données de test uniquement) ou laisser. **Ne PAS auto-supprimer.**
- **Documenter l'état du réservoir** : cartes `recap`/`records` encore à 0 (promues au S55), 19 prises / 5 espèces, etc. — note dans le RECAP pour piloter l'amorçage (hors périmètre dev).

**Critères** : état seed décidé/documenté ; aucune suppression de donnée sans accord John.

---

## WS-F — VÉRIFICATION FINALE du chantier 51→58 ✅ (le vrai livrable de clôture)

1. **`/verif-sprint` global** : suite Vitest **complète** verte (incl. tous les tests ajoutés S51-57 : Stripe, RLS reviews, gardes de date, nav-reachability étendu, pagination fil…), `pnpm build` OK, lint + types OK, **regen `lib/types.ts`** à jour.
2. **`node scripts/lint-copy-dashes.mjs`** propre (chantier copy S56 tenu).
3. **Advisors** (`get_advisors security` + `performance`) : aucune **nouvelle** alerte introduite par les migrations 091-097 ; les 4 FK indexées ; pas de table sans RLS/policy.
4. **Lighthouse CI mobile `/carte`** : perf cible tenue (S57).
5. **QA VISUELLE LIVE — desktop ET mobile RÉEL (390 px)** : la passe mobile n'a **jamais** pu être faite (plancher de largeur de l'extension navigateur) → **à faire sur appareil/émulateur réel** : home, carte (légende sans Zone active, chips honnêtes), carnet, fil, sorties, notifications (libellés corrects), une fiche espèce 0-spot devenue peuplée, une carte de partage story (belle), modération.
6. **Revue croisée anti-régression** (agent indépendant) sur l'ensemble : floutage GPS 3 couches intact, gating de tier, RLS, webhook Stripe signé/idempotent, copy sans tiret, aucune route nouvellement orpheline ou 404.
7. **RECAP de clôture** : `docs/sprint-58/RECAP.md` listant, pour chaque finding des 3 audits, l'état final (corrigé / décidé voulu / différé), + le diff de migrations 091-097.
8. **NE PAS PUSH** : laisser à John.

---

## Récap

| WS | Findings | Fichiers clés | Migration |
|---|---|---|---|
| A | B2 chat sortie passée | policy `outing_messages` (068/089), `lib/cofishing/actions.ts` | 097 (si option A) |
| B | city maxLength / compteur composer / notif truncate | `profile-form.tsx`, `PostComposer.tsx`, `notifications/page.tsx` | — |
| C | FK non indexées | migration | **097** |
| D | code mort | `map/utils`, `home-stats`, `brittany-coast`+`home-visuals`, `badges`/`streaks` | — |
| E | seed 5 profils NULL | (SQL admin, accord John) | — |
| F | **vérif finale chantier 51→58** | tout | regen types |

**Décisions ouvertes** :
1. **WS-A** : fermer le chat sur sortie passée (A) ou garder le débrief (B, reco) ?
2. **WS-E** : purger ou garder les 5 profils de test ?

**Parallélisme** : WS-A/B/C/D/E indépendants → agents en parallèle, **puis WS-F en barrière de clôture** (la plus importante). Effort ~2 j. **Dépendance** : WS-F doit tourner **après** que 52-57 soient mergés (c'est la vérif d'ensemble).

---

> 🏁 **Fin du chantier correctifs 51→58.** À ce stade : 100 % des findings des audits 2026-06-28 et 2026-06-29 (×2) sont traités (corrigés, décidés voulus, ou explicitement différés au mobile). La suite logique (hors ce chantier) = phase **mobile** (Expo iOS/Android, cf `docs/ROADMAP-PRE-MOBILE-2026-06-26.md`) + amorçage du réservoir.

*Brief Sprint 58 rédigé le 2026-06-29. Vérifié contre HEAD `aa4a28d` : 6 fichiers de code mort présents avec 0 importeur réel, policy chat `outing_messages` (statut), `profile-form` (city sans maxLength, bio compteur), `PostComposer` (maxLength 2000 sans compteur), `notifications/page.tsx` libellé. Dernier brief du chantier.*
