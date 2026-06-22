# Sprint 17 — Bloc B : notifications in-app (rapport d'implémentation)

> Agent Bloc B. Date : 2026-06-22. Migrations 037 (table `notifications` + RLS +
> Realtime + trigram `profiles.username`) et 038 déjà appliquées en prod, `lib/types.ts`
> régénéré (table `notifications` typée). Aucun git, aucun typecheck/build lancé
> (arbre partagé avec d'autres agents). Schéma DB vérifié en lecture seule (MCP RO).

## Vérification du schéma live (read-only, avant de coder)

`execute_sql` (RO) a confirmé l'état réel de la prod :
- `notifications` existe (1).
- Réplication Realtime active : présente dans `pg_publication_tables` / `supabase_realtime` (1).
- `profiles_username_trgm_idx` existe (1).
- `notifications` REPLICA IDENTITY = `f` (FULL) → les payloads UPDATE portent `read_at` (badge live correct).
- Policy `feed_posts_select_approved` : `author_id = auth.uid()` → l'auteur lit ses propres posts (utilisé pour résoudre la région du lien notif, sans contourner aucune vue).

Schéma colonnes (037, source de vérité) : `type` ∈ {`new_follower`,`post_liked`,`post_commented`,`catch_commented`,`mention`} ; `target_type` ∈ {`post`,`catch`,`comment`,NULL} ; + `actor_id`, `actor_username`, `preview_text` (≤140), `read_at`, `created_at`. Policy INSERT = `WITH CHECK (false)` pour `authenticated`.

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `lib/notifications/create.ts` | `createNotification(...)` — insert via `createAdminClient` (service_role), non bloquant, anti-auto-notif |
| `lib/notifications/useNotificationRealtime.ts` | Hook compteur non-lues live (INSERT ++ / UPDATE read_at --), calqué sur `lib/feed/useFeedRealtime.ts` |
| `app/actions/notifications.ts` | `getUnreadCount`, `getNotifications`, `markAllRead` (Server Actions) |
| `components/layout/NotificationBell.tsx` | Cloche Client Component (badge + lien `/notifications`) |
| `app/(app)/notifications/page.tsx` | Page liste (Server Component) |
| `app/(app)/notifications/MarkAllRead.tsx` | Client Component : marque lues à l'arrivée + `router.refresh()` |

## Fichiers existants modifiés (avant → après)

### `app/actions/feed.ts`
- **L7 (import)** : ajout `import { createNotification } from '@/lib/notifications/create'`.
- **`toggleLike`, select post** `.select('region')` → `.select('region, author_id')` (besoin du destinataire).
- **`toggleLike`, après l'insert like réussi** (avant `revalidateFeed`) : ajout
  ```ts
  if (post.author_id) {
    await createNotification({ userId: post.author_id, type: 'post_liked', actorId: user.id, targetType: 'post', targetId: postId })
  }
  ```
- **`addComment`, select post** `.select('region')` → `.select('region, author_id, catch_id')`.
- **`addComment`, après l'insert commentaire réussi** : ajout
  ```ts
  if (post.author_id) {
    await createNotification({
      userId: post.author_id,
      type: post.catch_id ? 'catch_commented' : 'post_commented',
      actorId: user.id,
      targetType: post.catch_id ? 'catch' : 'post',
      targetId: postId,
      previewText: parsedText.data,
    })
  }
  ```
  > Choix : un post partageant une prise (`catch_id` non null) → `catch_commented` ; sinon `post_commented`. Il n'existe pas de fil de commentaires directement sur une prise (les commentaires ne portent que sur `feed_posts`), donc `target_id` reste l'id du post pour que le lien `/fil/<dept>` fonctionne.

### `app/actions/follow.ts`
- **L5 (import)** : ajout `import { createNotification } from '@/lib/notifications/create'`.
- **`toggleFollow`, après l'insert follow réussi** (avant `revalidatePath('/follows')`) : ajout
  ```ts
  await createNotification({ userId: targetUserId, type: 'new_follower', actorId: user.id, targetType: null, targetId: user.id })
  ```
  > `targetId = user.id` (l'acteur) pour que le lien pointe vers `/u/<actor_username>`.

### `components/layout/AppHeader.tsx`
- **import** : ajout `NotificationBell`.
- **après le select `profiles`** : ajout d'un `count` `notifications` non-lues (`user_id = user.id`, `read_at IS NULL`, head:true) → `unreadCount` (valeur SSR).
- **JSX, entre « Loguer » et `UserMenu`** : `{user && <NotificationBell userId={user.id} initialCount={unreadCount} />}`.

> NB : `components/layout/TabBar.tsx` **non touché** (point optionnel du plan BC-ui §mobile, et fichier susceptible d'être édité par un autre agent en parallèle). La cloche est dans le header, présent sur toutes les routes app (desktop et mobile via `AppShell`).

## Comment les invariants sont préservés

- **RLS jamais contournée pour la lecture.** `getUnreadCount`/`getNotifications`/`markAllRead` et le compteur de `AppHeader` passent par le **client user** (`createClient` server) → soumis aux policies `notifications_select_own` / `notifications_update_own` (`user_id = auth.uid()`). Un utilisateur ne peut lire/marquer que SES notifs. `markAllRead` filtre en plus `.eq('user_id', user.id)` (ceinture + bretelles).
- **INSERT réservé au service_role.** La policy 037 `notifications_insert_service_only` = `WITH CHECK (false)` pour `authenticated`. `createNotification` insère exclusivement via `createAdminClient()` (service_role, bypass RLS) — jamais via le client browser/RSC user. Import dynamique de `@/lib/supabase/admin` dans un `try/catch` (pattern `lib/feed/media.ts`) : en dev/test sans `SUPABASE_SERVICE_ROLE_KEY`, on log et on continue, l'action métier n'est jamais cassée.
- **Anti-auto-notif.** `createNotification` retourne immédiatement si `userId === actorId` (et si l'un des deux manque). On ne reçoit jamais de notif pour sa propre action.
- **Non-bloquant.** Tout est `try/catch` + `console.error` (jamais silencieux, jamais `throw`). Un like/commentaire/follow qui réussit reste un succès même si la notif échoue (clé manquante, erreur DB).
- **Pas d'accès brut à une table à la place d'une vue `*_for_viewer`.** Les notifs ne touchent ni `catches` ni `spots` → aucun risque GPS. La seule lecture de table brute ajoutée est `feed_posts (id, region)` filtrée sur les **propres posts du viewer** (destinataire = auteur), pour résoudre le département du lien : pas de géométrie, pas de contournement de `feed_posts_for_viewer` (cette vue ne porte pas `region` autrement, et on ne lit que SES posts via la RLS base `author_id = auth.uid()`).
- **Floutage GPS + gating de tier préservés.** Aucune logique de tier ni de géoloc modifiée. Les inserts de notif sont purement additifs après le succès de l'action existante ; je n'ai retiré aucun check ni modifié la logique feed/follow (selects étendus de colonnes seulement).
- **Modèle social = abonnés (unilatéral).** `new_follower` notifie la personne suivie, sans réciprocité ni notion d'amis mutuels. Aucune copy/logique privacy/follows changée.
- **Realtime sécurisé.** Le hook filtre `user_id=eq.${userId}` (filtre Walrus) MAIS la vraie barrière reste la RLS `notifications_select_own` que `postgres_changes` applique avec le JWT du client. Import dynamique de supabase-js dans l'effet (hors first-load), `removeChannel` au cleanup, flag `cancelled` — strictement le pattern `useFeedRealtime.ts`.

## Points de vigilance / décisions

- **REPLICA IDENTITY FULL confirmée en prod** → l'event UPDATE porte `read_at` (et `old.read_at`), donc le décrément du badge à la lecture est fiable (`next.read_at && !prev.read_at`).
- **`preview_text`** tronqué à 140 dans le helper (respecte la contrainte CHECK 037) ; alimenté uniquement pour les commentaires.
- **`AppHeader` fait une requête `count` supplémentaire** (head:true, index partiel `notifications_user_unread_idx`) à chaque rendu d'une page app. Coût négligeable (index couvrant, COUNT sur lignes non-lues).
- **Régénération `lib/types.ts`** : déjà faite par John (table typée, vérifié L405-443). Aucune action requise.
- **Non testé via build/typecheck** (consigne : arbre partagé). Les nouveaux fichiers ont été relus à l'œil ; tokens couleur vérifiés contre `app/globals.css` (remplacé `navy-50`/`teal-50/40` non définis par `sand-100`/`teal-50`).

## Reste hors périmètre Bloc B (pour mémoire, NON fait)

- Badge sur la `TabBar` mobile (optionnel BC-ui) — la cloche du header couvre desktop + mobile.
- Notifications de type `mention` (le type existe en 037 mais aucune détection de @mention n'est branchée — relève d'un autre bloc/sprint).
- Tests Vitest des Server Actions notifications (à ajouter par le workstream de vérification).
