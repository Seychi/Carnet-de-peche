# 🔒 Audit RLS — Sprint 8 (Bloc A1)

> **But** : valider, AVANT d'ajouter la couche tier (migration 017), que les policies RLS existantes (`002_rls.sql`) ne laissent rien fuiter sur les tables sociales `feed_posts` / `feed_comments` / `feed_likes` / `follows` (+ le cross-cutting `catches`).
>
> **Méthode** : analyse statique ligne par ligne des policies réelles (`002_rls.sql`, `003_indexes_views.sql`, `004_functions_triggers.sql`) + matrice acteur × verbe × ressource. La **vérification empirique** (exécution des requêtes ci-dessous avec les 5 comptes du seed `seed_test_accounts.sql`) est à lancer sur une **stack locale** (`supabase start`) ou une **preview branch** — jamais sur le cloud prod.
>
> **État audité** : schéma **001→016 tel qu'en prod**, policies **pré-017** (pas encore tier-gated).
>
> Date : 2026-05-21 · Auditeur : Claude Code.

---

## Acteurs (cf `seed_test_accounts.sql`)

| Code | Compte | `auth.uid()` | `home_department` | Plan effectif |
|---|---|---|---|---|
| **ANON** | (non authentifié) | `null` | — | — |
| **DISCO** | `test_disco_29` | `a0…029` | `29` | `discovery` (trigger) |
| **LOC29** | `test_local_29` | `b0…029` | `29` | `local` |
| **LOC56** | `test_local_56` | `b0…056` | `56` | `local` |
| **ITIN** | `test_itin` | `c0…029` | `29` | `itinerant` |

Légende cellules : ✅ autorisé / ⛔ refusé / 🟥 **écart** (comportement non conforme au modèle tier 0.4 ou fuite potentielle).

---

## Modèle cible (rappel décision 0.4)

| Tier | Lecture fil | Écriture/likes/comments |
|---|---|---|
| anonymous | ❌ (redirect login, **app-level**) | ❌ |
| discovery | ✅ home_department uniquement | ❌ |
| local | ✅ tous depts | ✅ home_department uniquement |
| itinerant | ✅ tous depts | ✅ tous depts côtiers |

> Le filtrage de **lecture par dept** (discovery limité à son dept) est traité **au niveau routing/UI** (`/fil/[dept]`), pas en RLS — décision F2 du brief. Le SELECT RLS reste donc ouvert à tous les tiers authentifiés sur tous les depts. Ce n'est pas un écart tant que la lecture est réservée aux **authentifiés** (cf finding **RLS-FIX-04/05**).

---

## 1. `feed_posts`

Policies actuelles (`002_rls.sql` l.127-143) :

- `feed_posts_select_approved` — SELECT `using (moderation_status = 'approved' or author_id = auth.uid())`
- `feed_posts_insert_own` — INSERT `with check (auth.uid() = author_id)`
- `feed_posts_update_own` — UPDATE `using (author_id = auth.uid())`
- `feed_posts_delete_own` — DELETE `using (author_id = auth.uid())`

| Verbe | Ressource | ANON | DISCO | LOC29 | LOC56 | ITIN | Conforme ? |
|---|---|---|---|---|---|---|---|
| SELECT | post `approved` (n'importe quel dept) | ✅ 🟥 | ✅ | ✅ | ✅ | ✅ | 🟥 ANON ne devrait pas lire (RLS-FIX-04) |
| SELECT | post `pending`/`flagged` d'un autre | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| SELECT | mon propre post non-approuvé | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| INSERT | post `author_id = self`, dept = home | ⛔ | ✅ 🟥 | ✅ | ✅ | ✅ | 🟥 DISCO ne devrait pas poster (RLS-FIX-01) |
| INSERT | post `author_id = self`, dept ≠ home | ⛔ | ✅ 🟥 | ✅ 🟥 | ✅ 🟥 | ✅ | 🟥 LOC ne devrait poster que sur home (RLS-FIX-01) |
| INSERT | post `author_id = autre` | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| UPDATE | mon post | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ (pas de check tier sur update — acceptable, on possède déjà) |
| UPDATE | post d'un autre | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ (WITH CHECK hérite du USING → pas de réassignation possible) |
| DELETE | mon post | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DELETE | post d'un autre | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |

**Note fuite données** : `feed_posts` ne contient **aucune geom**. Le seul champ sensible est `catch_id` (UUID). Lire un post ne donne pas le contenu de la catch (il faut la joindre, et la jointure passe par `catches_for_viewer` qui floute). Pas de fuite GPS au niveau table.

---

## 2. `feed_comments`

Policies (`002_rls.sql` l.149-158) :

- `feed_comments_select_all` — SELECT `using (true)`
- `feed_comments_insert_own` — INSERT `with check (auth.uid() = author_id)`
- `feed_comments_delete_own` — DELETE `using (author_id = auth.uid())`
- (pas d'UPDATE → édition impossible, conforme : pas d'édition de commentaire en v1)

| Verbe | Ressource | ANON | DISCO | LOC29 | LOC56 | ITIN | Conforme ? |
|---|---|---|---|---|---|---|---|
| SELECT | n'importe quel commentaire | ✅ 🟥 | ✅ | ✅ | ✅ | ✅ | 🟥 ANON lit tous les commentaires (RLS-FIX-05) |
| INSERT | commentaire `author_id = self` | ⛔ | ✅ 🟥 | ✅ 🟥 (sur post autre dept) | ✅ 🟥 | ✅ | 🟥 pas de check tier/dept (RLS-FIX-02) |
| INSERT | commentaire `author_id = autre` | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| DELETE | mon commentaire | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DELETE | commentaire d'un autre | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |

---

## 3. `feed_likes`

Policies (`002_rls.sql` l.160-169) :

- `feed_likes_select_all` — SELECT `using (true)`
- `feed_likes_insert_own` — INSERT `with check (auth.uid() = user_id)`
- `feed_likes_delete_own` — DELETE `using (user_id = auth.uid())`

| Verbe | Ressource | ANON | DISCO | LOC29 | LOC56 | ITIN | Conforme ? |
|---|---|---|---|---|---|---|---|
| SELECT | n'importe quel like | ✅ 🟥 | ✅ | ✅ | ✅ | ✅ | 🟥 ANON lit qui a liké quoi (RLS-FIX-05) |
| INSERT | like `user_id = self` | ⛔ | ✅ 🟥 | ✅ 🟥 (post autre dept) | ✅ 🟥 | ✅ | 🟥 pas de check tier/dept (RLS-FIX-03) |
| INSERT | like `user_id = autre` | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| DELETE | mon like | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DELETE | like d'un autre | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |

---

## 4. `follows`

Policies (`002_rls.sql` l.175-184) :

- `follows_select_all` — SELECT `using (true)`
- `follows_insert_own` — INSERT `with check (auth.uid() = follower_id)`
- `follows_delete_own` — DELETE `using (auth.uid() = follower_id)`
- (pas d'UPDATE ; PK composite `(follower_id, following_id)` + check `follower_id <> following_id`)

| Verbe | Ressource | ANON | DISCO | LOC29 | LOC56 | ITIN | Conforme ? |
|---|---|---|---|---|---|---|---|
| SELECT | tout le graphe de follows | ✅ 🟧 | ✅ | ✅ | ✅ | ✅ | 🟧 ANON lit tout le graphe social (RLS-FIX-05, sévérité moindre) |
| INSERT | `follower_id = self` | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ (suivre est gratuit, **voulu** — pas de check tier) |
| INSERT | `follower_id = autre` | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| INSERT | `follower_id = following_id` | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ (CHECK constraint table) |
| DELETE | un follow où je suis follower | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DELETE | un follow d'un autre | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |

> Le follow reste **non gaté par tier** (décision brief C2) : sinon l'onglet « Tes follows » d'un discovery serait toujours vide. Conforme.

---

## 5. `catches` (cross-cutting — le fil partage des catches)

Policies (`002_rls.sql` l.88-120) pertinentes pour la lecture :

- `catches_select_own` — `using (user_id = auth.uid())`
- `catches_select_friends` — `using (privacy in ('friends','public') and exists(follow follower=me, following=owner))`
- `catches_select_public` — `using (privacy = 'public')`

| Verbe | Ressource | ANON | DISCO | LOC* (non-ami) | ami (le suit) | propriétaire | Conforme ? |
|---|---|---|---|---|---|---|---|
| SELECT (table) | catch `private` d'autrui | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ✅ |
| SELECT (table) | catch `friends` d'autrui | ⛔ | ⛔ | ⛔ | ✅ | ✅ | ✅ |
| SELECT (table) | catch `public` d'autrui | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (mais voir 🟥 geom ci-dessous) |

### 🟥 Finding majeur **CATCH-GEOM** (pré-existant, hors périmètre strict sprint 8)

La policy `catches_select_friends` autorise un follower à lire **la ligne entière**, colonne `geom` (précise) incluse, **sans vérifier `precise_for_friends`**. De même `catches_select_public` expose la ligne `public` entière, `geom` précise incluse, **sans vérifier `reveal_precise_to_public`**.

Le floutage n'est **PAS** dans le RLS : il est dans la fonction `catch_visible_geom()` (`004` l.118), utilisée **uniquement par la vue** `catches_for_viewer`. Donc :

- ✅ Lire via la vue `catches_for_viewer` → floutage correct (respecte `precise_for_friends` / `reveal_precise_to_public`).
- 🟥 Lire la **table `catches` en direct** (REST `from('catches')`, ou une RPC/vue qui joint `catches` au lieu de `catches_for_viewer`) → **un follower voit la geom précise même si `precise_for_friends = false`**, et n'importe qui voit la geom précise d'une catch `public` même si `reveal_precise_to_public = false`.

**Impact sprint 8** : nul SI on respecte la règle CLAUDE.md #6 (toujours la vue). La vue `feed_posts_for_viewer` (B1) et la RPC `get_spot_activity` (B2) lisent bien via `catches_for_viewer` → **pas de fuite introduite par le fil**. Le risque est qu'un futur dev lise `catches` en direct.

**Recommandation** : durcir le RLS de `catches` pour déplacer la logique de floutage au niveau ligne (defense-in-depth), OU au minimum interdire l'exposition directe de `geom`. **Décision périmètre à prendre par John** — c'est une dette pré-existante, pas un régression sprint 8. Tracké ci-dessous comme **RLS-FIX-06** (proposé hors-sprint-8).

---

## Synthèse des écarts (RLS-FIX)

| ID | Sévérité | Écart | Tables | Correctif | Dans le brief ? |
|---|---|---|---|---|---|
| **RLS-FIX-01** | 🟠 Gating | INSERT non tier-gaté (n'importe quel authentifié poste, n'importe quel dept) | `feed_posts` | policy `feed_posts_insert_tier_gated` (`can_post_in_department`) | ✅ B1 |
| **RLS-FIX-02** | 🟠 Gating | INSERT commentaire non tier-gaté | `feed_comments` | policy `feed_comments_insert_tier_gated` | ✅ B1 |
| **RLS-FIX-03** | 🟠 Gating | INSERT like non tier-gaté | `feed_likes` | policy `feed_likes_insert_tier_gated` | ✅ B1 |
| **RLS-FIX-04** | 🟡 Privacy | SELECT `feed_posts approved` lisible par **ANON** (clé publishable) — viole la décision « fil = login requis » | `feed_posts` | ajouter `auth.uid() is not null` à la policy SELECT | ❌ **NOUVEAU — pas dans B1** |
| **RLS-FIX-05** | 🟡 Privacy | SELECT `using(true)` → **ANON** lit tous commentaires, likes, et **tout le graphe de follows** | `feed_comments`, `feed_likes`, `follows` | remplacer `using(true)` par `using(auth.uid() is not null)` | ❌ **NOUVEAU — pas dans B1** |
| **RLS-FIX-06** | 🟠 GPS (pré-existant) | Lecture directe de `catches` expose `geom` précise sans respecter `precise_for_friends` / `reveal_precise_to_public` | `catches` | durcir RLS `catches` (defense-in-depth) — **hors périmètre sprint 8, à arbitrer** | ❌ dette pré-existante |

**RLS-FIX-01/02/03** : déjà couverts par la migration 017 (Bloc B1). ✅

**RLS-FIX-04/05** : **découverte de l'audit, non prévue par le brief.** Ce sont des écarts au modèle « fil = login requis » (0.4). Décision John requise (cf section suivante). Si validés, ils s'ajoutent à la migration 017.

**RLS-FIX-06** : dette pré-existante hors sprint 8. Mitigé par l'usage strict des vues. À arbitrer séparément.

---

## Décisions de John (tranchées 2026-05-21)

1. **RLS-FIX-04/05 — verrouiller le fil aux authentifiés au niveau RLS** → ✅ **OUI.**
   `auth.uid() is not null` ajouté aux SELECT de `feed_posts`/`feed_comments`/`feed_likes`/`follows`. Implémenté dans la **migration 017 §9** (cf brief B1). Defense-in-depth en plus du redirect app.

2. **RLS-FIX-06 — durcir le RLS de `catches`** → ✅ **Backlog hors sprint 8.**
   Dette pré-existante. On ne touche pas au RLS de `catches` ce sprint (risque carnet sprint 3). Mitigé par l'usage strict des vues, respecté partout dans le fil. Tâche ajoutée au `docs/ROADMAP.md` (backlog technique).

---

## Procédure de vérification empirique (à lancer hors-prod)

Sur une stack locale (`supabase start` → `supabase db reset` → exécuter `seed_test_accounts.sql`) :

```sql
-- Gabarit : simuler un utilisateur et tester une requête.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000029"}'; -- LOC29
  -- attendu : voit les posts approuvés
  select count(*) from public.feed_posts;
rollback;

-- Simuler l'anonyme (clé publishable) :
begin;
  set local role anon;
  -- attendu APRÈS RLS-FIX-04 : 0 ligne. AVANT : toutes les approuvées.
  select count(*) from public.feed_posts;
  -- attendu APRÈS RLS-FIX-05 : 0 ligne sur follows. AVANT : tout le graphe.
  select count(*) from public.follows;
rollback;

-- Tester can_post_in_department (après migration 017) :
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000056"}'; -- LOC56
  select public.can_post_in_department('56'); -- attendu true
  select public.can_post_in_department('29'); -- attendu false (LOC56 ne poste pas dans le 29)
rollback;
```

**Critère de sortie A1** : matrice ci-dessus complète (✅), écarts listés en RLS-FIX (✅), décisions John tranchées sur RLS-FIX-04/05/06 (⏳ en attente), puis vérif empirique exécutée sur stack locale/preview avant de marquer A1 « vert ».
