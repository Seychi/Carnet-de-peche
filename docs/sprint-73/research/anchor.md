# Sprint 73 — Bloc 0 Ancrage (recherche lecture seule)

> Agent ANCRAGE. Lecture du VRAI code + DB live (projet `glgciwwnpmgifyhbvxsw`, eu-west-1), 2026-07-03.
> Objectif : connecter une SORTIE au FIL sans jamais exposer une coordonnée ni une prise privée.
> **Verdict global : le modèle N'EST PAS aussi prêt que le brief le dit. Voir « Hypothèses invalidées ».**

---

## ⚠️ Finding structurant n°1 — DEUX familles « sortie » DISJOINTES

Le brief parle d'« une SORTIE (table `outings` + `outing_participants`) ». **C'est faux : ces deux tables n'ont AUCUN lien.** Il existe deux mondes séparés, jamais reliés en base :

| | **`outings`** (S25, carnet solo) | **`outing_proposals`** (S40/S50, co-pêchage groupe) |
|---|---|---|
| Rôle | Sortie perso / log de bredouille | Proposition de sortie groupée |
| Scope RLS | **owner-only** (`user_id = auth.uid()`) | authenticated (host + participants acceptés voient) |
| A des participants ? | **NON** | OUI → `outing_participants` (FK `proposal_id`) |
| A `ended_at` (clôture) ? | **OUI** (`started_at`, `ended_at`) | **NON** (`planned_at`, `status`) |
| Lien vers les prises ? | **OUI** : `catches.outing_id` FK → `outings` | **NON** (aucune colonne ne relie une prise à une proposal) |
| A un spot ? | `spot_id` uuid nullable (FK→spots) | **NON** (juste `department` + `area_label` texte libre) |
| Chat / avis ? | non | `outing_messages`, `outing_reviews` (FK `proposal_id`) |

FK prouvées en base :
- `catches.outing_id` → **`outings`.id** (`ON DELETE SET NULL`)
- `outing_participants.proposal_id` → **`outing_proposals`.id** (`ON DELETE CASCADE`)
- `outing_messages.proposal_id` → `outing_proposals`.id · `outing_reviews.proposal_id` → `outing_proposals`.id

**Conséquence pour le sprint (STOP-niveau design)** : « 1 sortie GROUPÉE = 1 post riche avec prises agrégées des participants + participants tagués + ended_at » n'est **pas** réalisable tel quel :
- La chose qui a des **participants** (`outing_proposals`) n'a **ni `ended_at`, ni lien vers les prises**.
- La chose qui a **`ended_at` + les prises** (`outings`) est **strictement solo** (owner-only, zéro participant).
- Les prises de chaque participant pointent vers **SON PROPRE `outings` solo**, jamais vers la proposal partagée → **il n'existe aucune clé pour agréger les prises de plusieurs participants d'une même sortie groupée.**

→ Bloc 1 devra trancher AVANT de coder : sur quelle table `feed_posts.outing_id` pointe, et comment (ou si) on agrège des prises multi-pêcheurs. C'est une **décision produit + modélisation**, pas un simple « CONNECTE ». `⚠️ DEMANDER À JOHN`.

---

## Question 1 — RLS + policies live (définitions collées)

RLS **activée** sur les 6 tables : `outings`, `outing_participants`, `outing_messages`, `feed_posts`, `feed_post_photos`, `catches` (toutes `relrowsecurity = true`).

### `outings` (solo, owner-only)
- `outings_select_own` SELECT : `user_id = (select auth.uid())`
- `outings_insert_own` INSERT WITH CHECK : `user_id = (select auth.uid())`
- `outings_update_own` UPDATE USING+CHECK : `user_id = (select auth.uid())`
- `outings_delete_own` DELETE : `user_id = (select auth.uid())`
- rôle `{authenticated}`. **Aucune lecture tierce** → un tiers ne voit jamais la sortie solo d'autrui. Un post de sortie ne pourra donc PAS lire `outings` d'un autre auteur côté viewer.

### `outing_participants` (appartient à `outing_proposals`)
- `outing_participants_select_scoped` SELECT USING :
  `(user_id = auth.uid()) OR (status = 'accepted') OR EXISTS(select 1 from outing_proposals p where p.id = proposal_id and p.host_id = auth.uid())`
  → les participants **acceptés sont lisibles par tout authentifié** (pratique pour taguer). Une demande `requested`/`declined` n'est visible que par l'intéressé et l'hôte.
- `outing_participants_insert_self` INSERT WITH CHECK : `user_id = auth.uid() AND status = 'requested' AND EXISTS(proposal open)`
- `outing_participants_update_host` UPDATE : hôte de la proposal uniquement (USING+CHECK `p.host_id = auth.uid()`)
- `outing_participants_delete_scoped` DELETE : l'intéressé OU l'hôte.

### `outing_messages` (chat groupe)
- SELECT/INSERT réservés à l'hôte OU aux participants `status='accepted'` de la proposal (fail-closed). Non pertinent pour le post fil, sauf comme précédent RLS.

### `feed_posts`
- `feed_posts_select_approved` SELECT : `auth.uid() IS NOT NULL AND (moderation_status='approved' OR author_id=auth.uid())` → **fil réservé aux connectés** (anon ne lit pas le fil).
- `feed_posts_insert_authenticated` INSERT WITH CHECK : `auth.uid()=author_id AND region IS NOT NULL AND can_post_in_department(region)`
- `feed_posts_update_own` UPDATE : author_id=auth.uid() (+ mêmes checks region).
- `feed_posts_delete_own` DELETE : author_id=auth.uid(). `feed_posts_delete_moderator` DELETE : `is_moderator()`.

### `feed_post_photos`
- SELECT : existe un `feed_posts` parent (donc lisible dès que le post est visible).
- INSERT WITH CHECK : `user_id=auth.uid() AND EXISTS(feed_posts fp where fp.id=post_id AND fp.author_id=auth.uid())` → **seul l'auteur du post attache des photos**.
- DELETE : `user_id=auth.uid()`.

### `catches` (table directe — NE JAMAIS lire pour l'affichage)
- SELECT own / public / friends (via `follows`). INSERT/UPDATE/DELETE own. Toujours passer par la vue (cf Q3/Q4).

### Colonnes `feed_posts` (confirmé)
`id, author_id, catch_id (FK→catches SET NULL), text, region (character), moderation_status, moderated_at, moderated_by (FK→profiles SET NULL), likes_count, comments_count, created_at, updated_at`.
- **PAS de colonne `type`/`kind`** (aucun discriminant de type de post — le « post de sortie » se distinguera uniquement par `outing_id IS NOT NULL`).
- **PAS de colonne `outing_id`** aujourd'hui → à créer (Bloc 1). ✅ conforme au brief.
- Seule FK « métier » = `catch_id` → `catches`. Pas de FK vers un spot. `author_id` référence `auth.users` (pas de FK exposée vers profiles).

---

## Question 2 — Flux « sortie » existant

### Monde SOLO (`outings`, S25) — `lib/outings/actions.ts`, `lib/outings/schema.ts`, `lib/outings/list.ts`
- **Création** : `createOuting(input)` (`lib/outings/actions.ts:15`). Insert owner-scopé. `started_at` obligatoire, `ended_at` **optionnel et posé DÈS la création** (`ended_at: d.ended_at ?? null`, ligne 39). Département obligatoire (côtier), spot/technique/species/notes optionnels. Émet XP série + notifs dopamine (défis solo).
- **Clôture** : **il n'existe AUCUNE action dédiée de « clôture » qui pose `ended_at` a posteriori.** `ended_at` n'est écrit qu'à l'insert dans `createOuting`. (grep `ended_at` : seulement lu ailleurs — list, share, OG.) → Le « À la clôture (ended_at posé) » du Bloc 2.1 **n'a pas de hook existant** ; il faudra soit une nouvelle action, soit brancher sur la création.
- **Log de bredouille** : une `outings` sans prise rattachée (`catchCount === 0` → `blank: true`, `lib/outings/list.ts:98`). C'est un flag calculé, pas une colonne. Cohérent avec « la bredouille compte ».
- **Schéma** (`lib/outings/schema.ts`) : jamais de coordonnée (département + label), garde `ended_at >= started_at`, `notFuture`.

### Monde GROUPE (`outing_proposals`, S40/S50) — `lib/cofishing/actions.ts`, `lib/cofishing/queries.ts`
- **Proposer** : `proposeOuting()` insère dans `outing_proposals` (host_id, department, area_label, planned_at, capacity, species). Rate-limit DB 5/24h. Notifie le département.
- **Demander à rejoindre** : `requestJoin(proposalId)` insère `outing_participants{status:'requested'}`. Anti-spam 10/24h. Notifie l'hôte (`outing_join`).
- **Accepter/refuser** : `respondToParticipant(proposalId, userId, accept)` → `status = 'accepted' | 'declined'` (UPDATE réservé hôte par RLS). Notifie `outing_accepted`. Le trigger DB 067 peut basculer la proposal en `full`.
- **Statuts proposal** (CHECK) : `open | full | cancelled | done`. **Pas de `ended_at`.**
- **Pas de clôture productrice de prises** : rien ne relie une proposal terminée aux prises des participants.

### `participant accepté` = définition exacte
`outing_participants.status = 'accepted'` (CHECK autorise `requested | accepted | declined`). **L'hôte n'est PAS une ligne de `outing_participants`** : hôte = `outing_proposals.host_id`. Donc « participants d'une sortie groupée » = `host_id` ∪ `{outing_participants where status='accepted'}`.

---

## Question 3 — Rendu du fil (galeries + compteurs) à RÉUTILISER

Le fil lit **la vue `feed_posts_for_viewer`** (jamais la table), pas d'accès direct :
- Lecture paginée : `getFeedPage()` dans `app/actions/feed.ts:713` (curseur `created_at|id`, filtre onglet dept/all/follows). Enrichit via `attachPostMedia` (`lib/feed/media.ts`) qui signe les URLs Storage.
- La vue expose : `author_*`, `catch_*` (via `catches_for_viewer`, donc déjà flouté), `liked_by_me`, et **`photo_paths = array_agg(feed_post_photos.storage_path ORDER BY position, created_at)`**.

**Composants de rendu (à réutiliser tels quels pour le post de sortie)** :
- `components/feed/PostCard.tsx` — carte d'un post. Contient :
  - `PostGallery` (fonction interne, ligne ~393) : layouts 1/2/3/4 photos, « +N » au-delà. **C'est le rendu galerie `feed_post_photos`.**
  - `PhotoGalleryLightbox` (`components/feed/PhotoGalleryLightbox.tsx`, lazy) : plein écran.
  - `CatchEmbed` (ligne ~435) : encart prise partagée (badge `CARNET` si `catch_id`, bandeau data mono, lien `/spots/{slug}`).
  - Compteurs **likes/commentaires** : optimistic + Realtime via `usePostInteractionsRealtime` (`lib/feed/usePostInteractionsRealtime`). `likes_count`/`comments_count` viennent de `feed_posts`.
- `components/feed/CommentThread.tsx`, `ReportDialog.tsx`, `PostDeleteDialog.tsx` (tous lazy), `PostList.tsx`, `FeedClient.tsx`, `PostComposer.tsx`.
- **Composer** : `components/feed/PostComposer.tsx` (`export function PostComposer`, ligne 53) → upload photos client dans `feed-photos/<uid>/…` puis appelle `createPost({text, catchId, region, photos})` (`app/actions/feed.ts:105`). Max 4 photos. **Le post de sortie doit passer par ce même `createPost` (étendu d'un `outingId`) pour hériter du rendu + rate-limit + realtime.**

→ Pour que le post de sortie réutilise ce rendu SANS régression : ajouter `outing_id` à `feed_posts` + à la vue `feed_posts_for_viewer` + aux photos via `feed_post_photos` existant, et laisser `PostCard` brancher un bandeau « sortie » quand `outing_id` est présent.

Rate-limit posts : `MAX_POSTS_PER_24H = 10` (app) + trigger DB `feed_posts_rate_limit` (backstop) → **s'appliquera automatiquement au post de sortie s'il passe par `createPost`/table `feed_posts`**.

---

## Question 4 — Où `catches.outing_id` est écrit aujourd'hui

**Nulle part au log.** Faits :
- La colonne existe (FK → `outings`, SET NULL) et est **exposée par `catches_for_viewer`** (migration 063, présente dans la def de vue).
- Live : `select count(*) from catches where outing_id is not null` = **0**. `outings` total = 1, `outing_proposals` total = 1, participants `accepted` = 0, `feed_posts` total = 1.
- Grep code : `outing_id` n'est **jamais écrit** — il est seulement **lu** :
  - `lib/outings/list.ts:57` (agrégat des prises d'une sortie solo, via la vue),
  - `app/actions/share.ts:484` (`createOutingCard` agrège `species/size_cm` d'une sortie solo via la vue),
  - `components/feed` / `lib/og/types.ts` (payload OG partage).
- L'action de log de prise (catch) **ne pose pas `outing_id`**. Donc le lien prise→sortie n'est **posé nulle part pendant une sortie active**.

→ Bloc 2.2 « Regrouper en sortie » serait le **premier writer** de `catches.outing_id` (création d'une `outings` rétroactive solo puis `update catches set outing_id`). Le pattern d'agrégation existe déjà et est SÛR : `app/actions/share.ts:createOutingCard` lit `catches_for_viewer` scopé `user_id + outing_id` (owner-only, geom-free) — **c'est le précédent à copier pour `get_outing_summary`** (mais lui est solo/owner ; le cross-participant reste bloqué, cf Finding n°1).

### `catches_for_viewer` — comment on l'appelle
Vue **SECURITY DEFINER** (assumée, cf advisor ci-dessous). Filtre interne : `c.user_id = auth.uid() OR c.privacy='public' OR (c.privacy='friends' AND EXISTS follows)`. Expose `geom_visible` (déjà **flouté** : `COALESCE(catch_visible_geom(c.*), c.geom_public)`), `lng/lat` dérivés de `geom_visible`, `species, size_cm, weight_g, photo_path, photo_verified_at, outing_id, conditions (jsonb), privacy, released`, profil auteur. **Ne PAS lire la table `catches` pour l'affichage** (règle d'or §11.6). Appel type : `supabase.from('catches_for_viewer').select(...).eq('outing_id', id)`.

---

## Question 5 — Baseline advisors (à comparer après migration 107)

### Sécurité (`get_advisors security`) — état AVANT sprint 73
- ERROR `security_definer_view` **x2** : `public.catches_for_viewer`, `public.spots_for_viewer` → **connu/assumé** (invariant floutage, CLAUDE.md + mémoire). Ne pas « corriger ».
- ERROR `rls_disabled_in_public` **x1** : `public.spatial_ref_sys` (table système PostGIS) → connu/inévitable.
- INFO `rls_enabled_no_policy` **x1** : `public.season_results` (S67, verrouillé délibérément → lu via `get_season_results` definer). Connu.
- WARN `authenticated_security_definer_function_executable` x51 · `anon_security_definer_function_executable` x38 · `function_search_path_mutable` x3 · `extension_in_public` x3 · `auth_leaked_password_protection` x1 (**HIBP OFF assumé, plan Free — ne pas re-signaler**).

### Performance (`get_advisors performance`) — état AVANT
- INFO `unused_index` x44 · WARN `multiple_permissive_policies` x30 · INFO `unindexed_foreign_keys` x1 (schéma `stripe`).
- Note : `feed_posts_created_approved_idx` et `feed_posts_catch_id_idx` apparaissent en `unused_index` (fil quasi vide).

**Critère Bloc 1** : après 107, **aucun NOUVEL ERROR** de sécurité, et pas de nouvelle vue SECURITY DEFINER non justifiée. Si `get_outing_summary` doit être DEFINER, l'accompagner de `search_path` fixe + REVOKE/GRANT maison (sinon elle grossira les compteurs WARN `*_security_definer_function_executable`).

---

## Hypothèses du brief : validées / invalidées

### ✅ Validées
- `feed_posts` **n'a pas** de colonne `outing_id` aujourd'hui, ni de colonne `type`/`kind`. (à créer en 107)
- `catches.outing_id` **existe** (FK → `outings`, SET NULL) et est exposé par `catches_for_viewer`.
- Tables `outings`, `outing_participants`, `outing_messages`, `outing_reviews`, `feed_posts`, `feed_post_photos` existent.
- « participant accepté » a bien une notion de statut : `outing_participants.status='accepted'`.
- `catches_for_viewer` **existe** et est le bon vecteur (geom flouté, filtrage own/public/friends).
- Le rendu galerie + compteurs est réutilisable (`feed_posts_for_viewer` + `PostCard`/`PostGallery`/`PhotoGalleryLightbox`).
- Rate-limit posts existant s'appliquera au post de sortie via `feed_posts`.

### ❌ Invalidées / à corriger (STOP potentiels)
1. **« connecter une SORTIE (table `outings` + `outing_participants`) » / « le gros du modèle est là »** — FAUX. `outing_participants` appartient à **`outing_proposals`**, PAS à `outings`. Les deux familles sont disjointes (aucune FK entre elles). Le modèle « sortie groupée = participants + prises + ended_at » **n'existe pas** en une entité.
2. **« prises publiques agrégées » d'une sortie groupée** — **irréalisable en l'état** : `catches.outing_id` pointe vers des `outings` SOLO (une par pêcheur), jamais vers la proposal partagée. Aucune clé n'agrège les prises de plusieurs participants d'une même sortie groupée. → décision de modélisation requise (`⚠️ DEMANDER À JOHN`).
3. **« À la clôture d'une sortie (`ended_at` posé) »** — il n'existe **aucune action de clôture** ; `ended_at` n'est écrit qu'à la création dans `createOuting`. Et `outing_proposals` (le monde groupe) **n'a pas d'`ended_at` du tout**. Le hook « clôture → composer » du Bloc 2.1 est à construire, pas à brancher.
4. **`catches.outing_id` posé « au log pendant une sortie active »** — NON, jamais écrit aujourd'hui (0 ligne). Le premier writer serait « Regrouper en sortie » (Bloc 2.2), en solo.
5. **Spot précis d'une sortie groupée** — `outing_proposals` n'a **pas** de `spot_id` (juste `department` + `area_label` texte). Un post de sortie groupée ne peut afficher qu'une zone (département/label), jamais un spot. Cohérent avec le floutage, mais à noter pour l'UX PostCard.

---

## Chemins de fichiers exacts (référence pour les Blocs 1-2)
- Actions fil : `app/actions/feed.ts` (`createPost` :105, `getFeedPage` :713, rate-limit :26)
- Précédent agrégation sortie : `app/actions/share.ts` (`createOutingCard` :443 — pattern `catches_for_viewer.eq('outing_id')`)
- Carte du fil : `components/feed/PostCard.tsx` (`PostGallery` ~393, `CatchEmbed` ~435)
- Composer : `components/feed/PostComposer.tsx`
- Lightbox galerie : `components/feed/PhotoGalleryLightbox.tsx`
- Sortie solo : `lib/outings/actions.ts` (`createOuting` :15, `ended_at` :39), `lib/outings/schema.ts`, `lib/outings/list.ts`
- Co-pêchage groupe : `lib/cofishing/actions.ts`, `lib/cofishing/queries.ts`
- Notifications : `lib/notifications/create.ts` (`createNotification` :95, union `NotificationType`)
- Composants sortie : `components/outings/OutingForm.tsx`, `OutingListRow.tsx`, `OutingStats.tsx`
