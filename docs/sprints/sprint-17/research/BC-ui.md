# Sprint 17 — Blocs B & C : cartographie UI/code (READ-ONLY)

> Rédigé le 2026-06-22. Périmètre : points d'insertion + plan file:line. Aucun fichier applicatif édité.

---

## Bloc B — Notifications in-app

### Schéma de la base (confirmé lecture code)

- **`notifications` n'existe pas** : confirmé dans `supabase/migrations/` (dernier numéro = `036_avatars_storage`). La migration `037_notifications.sql` est à créer.
- Colonnes cibles : `id uuid pk`, `user_id uuid` (destinataire, FK profiles), `type enum('like','comment','follow')`, `actor_id uuid` (FK profiles), `post_id uuid nullable` (FK feed_posts ON DELETE CASCADE), `read_at timestamptz nullable`, `created_at timestamptz default now()`.
- RLS obligatoire avant tout : SELECT et UPDATE uniquement sur `user_id = auth.uid()`. Pas de RLS INSERT direct — l'insert se fait depuis les Server Actions (avec client server-side, donc authentifié).
- **Realtime** : activer la publication sur la table (cf. migration 020 comme modèle — `alter publication supabase_realtime add table notifications`).

### Événements générateurs (Server Actions existantes)

| Événement | Fichier | Ligne approx. | Point d'injection |
|---|---|---|---|
| Like ajouté | `app/actions/feed.ts` | L.228–238 (après le `insert feed_likes`) | Après le `insert` réussi, insérer une notif `type=like` vers `post.author_id` |
| Commentaire ajouté | `app/actions/feed.ts` | L.279–292 (après le `insert feed_comments`) | Après l'insert réussi, insérer une notif `type=comment` vers l'auteur du post (à lire depuis `feed_posts`) |
| Follow ajouté | `app/actions/follow.ts` | L.63–69 (après le `insert follows`) | Après l'insert réussi, insérer une notif `type=follow` vers `targetUserId` |

**Garde-fous anti-bruit à coder :**
- Anti-soi-même : `if (user.id !== destinataire_id)` avant d'insérer.
- Pour `like` : le post est déjà lu (`post.region` ligne 205 de `feed.ts`) — ajouter `author_id` dans ce select (`L.205`: `.select('region, author_id')`).
- Pour `comment` : idem, récupérer `author_id` du post.
- Pour `follow` : `targetUserId` est déjà le destinataire.
- Erreur d'insert notif = **non-bloquant** (log + continue), sinon un like raté à cause d'une notif casserait le flux.

### Badge + liste : points d'insertion UI

**Badge (cloche) — AppHeader**

Fichier : `components/layout/AppHeader.tsx`

L'`AppHeader` est un Server Component async (L.11). Il récupère déjà le profil (L.16–24). Le badge nécessite un compteur `notifications non lues` → requête Supabase côté serveur au render.

Point d'insertion : **après** le `select profiles` (L.22), ajouter :
```ts
const { count: unreadCount } = await supabase
  .from('notifications')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .is('read_at', null)
```
Puis dans le JSX (L.38–48), à côté du bouton « Loguer » :
```tsx
<NotificationBell unreadCount={unreadCount ?? 0} />
```
`NotificationBell` = nouveau Client Component dans `components/layout/` (ou `components/notifications/`) : affiche `<Bell />` (Lucide) avec un badge rouge si `unreadCount > 0`, lien vers `/notifications`.

**Mise à jour en temps réel du badge :**
- Le badge est rendu côté serveur au chargement → correct à l'arrivée sur la page.
- Pour l'incrément live sans reload : `NotificationBell` écoute un channel Realtime `notifications:user=<uid>` (INSERT sur `notifications` filtré sur `user_id`) → `useNotificationRealtime` hook à créer dans `lib/notifications/useNotificationRealtime.ts`, calqué sur `lib/feed/useFeedRealtime.ts` (import dynamique, ref de callback).
- Le hook reçoit `initialCount` (SSR) et incrémente localement à chaque INSERT Realtime.

**Côté mobile (TabBar) :**
Fichier : `components/layout/TabBar.tsx`

`TabBar` est un Client Component (`'use client'`, L.1). Il ne reçoit aucune prop du serveur. Options :
1. Ajouter un onglet « Notifs » à `TABS` (L.8–14) → remplace ou s'ajoute après « Profil ». 5 onglets = très chargé sur mobile.
2. (recommandé) Passer `unreadCount` depuis le Server Component parent (`AppShell` → `app/(app)/layout.tsx`) et afficher un badge sur l'onglet « Profil » ou sur un onglet « Cloche » dédié.

Point de passage de props : `app/(app)/layout.tsx` (L.58) passe déjà `header={<AppHeader />}` à `AppShell`. `AppShell` (`components/layout/AppShell.tsx` L.15–55) reçoit `header`, `instruments`, `banner`, `children`. Pour passer `unreadCount` à `TabBar`, il faut soit :
- Ajouter une prop `notifications?: number` à `AppShell` → `TabBar` la reçoit.
- Ou laisser `TabBar` faire sa propre requête Realtime (plus simple, sans prop-drilling).

Option la plus propre : **créer `NotificationBell` comme Client Component autonome** qui fait lui-même la requête initiale via un hook, et s'abonne au Realtime. Ainsi `AppHeader` et `TabBar` l'incluent tous les deux sans prop-drilling.

**Page `/notifications` :**
- Nouvelle route : `app/(app)/notifications/page.tsx` (Server Component).
- Lit toutes les notifs de l'utilisateur courant (ORDER BY created_at DESC, LIMIT 50).
- Au chargement, marque toutes en lues (`UPDATE notifications SET read_at = now() WHERE user_id = uid AND read_at IS NULL`) via une Server Action `markAllRead`.
- Affichage groupé : « X a aimé ton post », « Y t'a suivi », « Z a commenté ton post ».
- Lien vers le post concerné (`/fil/<dept>` ou `/u/<username>`).

**Fichiers à créer pour le Bloc B :**
```
app/actions/notifications.ts          ← markAllRead, getNotifications
app/(app)/notifications/page.tsx       ← page liste
components/layout/NotificationBell.tsx ← badge + lien (client component)
lib/notifications/useNotificationRealtime.ts ← hook Realtime
supabase/migrations/037_notifications.sql
```

**Modifications des fichiers existants :**
```
app/actions/feed.ts      L.205 : ajouter author_id au select ; L.228+ : insert notif like ; L.284+ : insert notif comment
app/actions/follow.ts    L.63+ : insert notif follow
components/layout/AppHeader.tsx  L.22+ : requête unreadCount ; L.44+ : ajouter <NotificationBell>
components/layout/TabBar.tsx     optionnel : badge sur onglet Profil ou onglet Cloche
```

---

## Bloc C — Modération : page + fix policy

### Bug confirmé (code vérifié)

Fichier : `supabase/migrations/024_perf_rls.sql` L.482–487

Migration 024 (réécriture perf de 002) a recopié le bug original de `002_rls.sql` L.211–216 : la policy `reports_select_own_or_mod` teste `is_ambassador = true` au lieu de `is_moderator()`.

```sql
-- BUG ligne 486 dans 024_perf_rls.sql :
or exists (select 1 from public.profiles where id = (select auth.uid()) and is_ambassador = true)
-- CORRECT (comme reports_update_moderator ligne 497) :
or (select public.is_moderator())
```

La fonction `is_moderator()` existe (migration `023_moderation.sql` L.32–42, SECURITY DEFINER). L'utiliser en `(select public.is_moderator())` suit le pattern perf de 024 (sous-requête scalaire pour éviter l'initplan).

**Migration 038 à créer :** `supabase/migrations/038_moderation_reports_policy.sql`
```sql
drop policy if exists "reports_select_own_or_mod" on public.reports;
create policy "reports_select_own_or_mod"
  on public.reports for select
  using (
    reporter_id = (select auth.uid())
    or (select public.is_moderator())
  );
```
Aucune autre colonne à toucher. `is_ambassador` reste sur `profiles` (utilisé ailleurs, cf. `lib/types.ts` L.442).

### Helpers existants à réutiliser

Fichier : `app/actions/feed.ts`

- `viewerIsModerator()` : L.378–386 — helper privé async, lit `profiles.is_moderator`. À importer ou dupliquer dans la page serveur.
- `moderatorDeletePost(postId)` : L.421–466 — Server Action complète (check moderator, suppression Storage, audit report, revalidate). **Prête à l'emploi**, pas à recoder.
- `moderatorDeleteComment(commentId)` : L.469–496 — idem pour les commentaires.
- `resolveReportsForTarget()` : L.389–418 — appelée automatiquement par les fonctions ci-dessus.
- `reportPost()` : L.509–547 — création d'un signalement (côté reporter).

Il manque une action pour **ignorer un signalement sans supprimer le post** → `dismissReport(reportId)` à ajouter dans `app/actions/feed.ts` ou un nouveau `app/actions/moderation.ts` :
```ts
// UPDATE reports SET status='dismissed', resolved_by=uid, resolved_at=now()
// WHERE id = reportId AND status = 'pending'
```

### Page `/moderation`

**Nouvelle route :** `app/(app)/moderation/page.tsx` (Server Component)

**Gate serveur (sécurité primaire) :**
```ts
const { data: me } = await supabase.from('profiles').select('is_moderator').eq('id', user.id).single()
if (!me?.is_moderator) notFound() // ou redirect('/home')
```
Ne pas exposer une 403 verbeuse — `notFound()` est plus discret.

**Données à afficher :**
Requête : `supabase.from('reports').select('*, feed_posts(*), profiles!reporter_id(username)').eq('status', 'pending').order('created_at', { ascending: false }).limit(50)`

NB : vérifier avec supabase-guard que la join `feed_posts` est faisable (reports.target_id est uuid, pas FK déclarée). Sinon, deux requêtes séquentielles.

**Actions disponibles dans l'UI :**
1. « Supprimer le post » → appelle `moderatorDeletePost(report.target_id)` (Server Action existante)
2. « Ignorer » → appelle `dismissReport(report.id)` (à créer)

**Pas de pagination côté client nécessaire** au démarrage : 50 signalements pending en SSR suffisent pour le volume attendu. Ajouter `revalidatePath('/moderation')` dans les deux actions.

**Accès à la page :**
- Ajouter un lien « Modération » dans `components/layout/UserMenu.tsx` conditionnel à `is_moderator` (le `UserMenu` est un Client Component, donc il faut lui passer `isModerator` comme prop depuis `AppHeader`).
- `AppHeader.tsx` L.17–24 : étendre le select profiles avec `is_moderator` → passer à `UserMenu`.
- `UserMenu.tsx` L.8–12 : ajouter `isModerator?: boolean` aux props, afficher le lien si `true`.

Optionnellement : entrée dans `AppSidebar.tsx` ITEMS array (L.8–13) — mais visible de tous (pas de gating côté sidebar, seulement côté page). Recommandé : ne PAS ajouter à la sidebar (visible de tous) → garder dans le UserMenu seulement.

**Fichiers à créer pour le Bloc C :**
```
app/(app)/moderation/page.tsx             ← liste des reports pending
app/actions/moderation.ts (optionnel)     ← dismissReport, ou ajouter dans feed.ts
supabase/migrations/038_moderation_reports_policy.sql
```

**Modifications des fichiers existants :**
```
components/layout/AppHeader.tsx   L.20 : ajouter is_moderator au select ; L.46 : passer isModerator à UserMenu
components/layout/UserMenu.tsx    L.8 : ajouter prop isModerator ; L.64+ : lien conditionnel vers /moderation
```

---

## Ordre d'exécution conseillé

1. Migration `038` (fix policy reports) — indépendante, sans risque de régression.
2. Migration `037` (table notifications + RLS + Realtime) — avant tout code B.
3. `regen lib/types.ts` après chaque migration.
4. Bloc C : page modération + dismissReport + lien UserMenu.
5. Bloc B : Server Actions (inject notifs dans feed.ts/follow.ts) + NotificationBell + page /notifications + hook Realtime.

## Points de vigilance (passe adversariale)

- **RLS notifications** : `INSERT` via Server Action (client server-side = authentifié) → la policy INSERT doit autoriser `auth.uid() IS NOT NULL` **et** `user_id != auth.uid()` (le destinataire n'est pas l'acteur). Attention : si on autorise l'INSERT au role `authenticated` sur `user_id = <n'importe qui>`, un utilisateur pourrait spammer un autre. Préférer l'INSERT en `service_role` depuis la Server Action (via `createAdminClient()`) ou une fonction SECURITY DEFINER.
- **Notifs et suppression de post** : si le post est supprimé, les notifs liées deviennent orphelines → ajouter `post_id uuid references feed_posts(id) ON DELETE CASCADE` dans 037.
- **Page /moderation** : la gate `is_moderator` côté serveur est obligatoire (la RLS SELECT sur reports ne suffit pas à sécuriser la route entière).
- **UserMenu isModerator** : `UserMenu` est un Client Component (`'use client'`) — la prop `isModerator` vient du Server Component `AppHeader`. Si John n'est pas modérateur, le lien est absent. Pas de fuite d'information.
- **Realtime notifications** : la table doit être ajoutée à `supabase_realtime` publication (cf. migration 020 comme modèle). Le filtre `user_id=eq.<uid>` côté client est sécurisé par RLS Realtime (Supabase filtre côté serveur si RLS est activé).
