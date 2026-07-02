# Sprint 17 Bloc C — Rapport d'implémentation modération

> Rédigé le 2026-06-22. Périmètre : `dismissReport` + page `/moderation` + lien conditionnel UserMenu.

---

## Fichiers modifiés

### 1. `app/actions/feed.ts` — action `dismissReport`

**Ajout** entre `moderatorDeleteComment` et `reportPost` (avant la ligne ~524 du fichier original).

```
avant : [pas d'action dismissReport]
après : export async function dismissReport(reportId: string): Promise<ActionResult<{ id: string }>>
```

- Gate serveur : `viewerIsModerator(supabase, user.id)` — même helper que `moderatorDeletePost/Comment`, retourne `NOT_MODERATOR_MSG` si non modérateur.
- Validation UUID via zod avant toute requête.
- UPDATE ciblé : `status='dismissed', resolved_by=uid, resolved_at=now()` uniquement sur `status='pending'` → idempotence (un report déjà résolu renvoie une erreur propre).
- `revalidatePath('/moderation')` après succès.
- Pas de `revalidateFeed` : le contenu n'est pas supprimé.

**Invariants préservés :**
- RLS non contournée : la mise à jour passe par le client serveur authentifié, la policy `reports_update_moderator` (migration 023/024) autorise UPDATE si `is_moderator()` → cohérent avec le gate applicatif.
- Pas d'accès brut à une table privée à la place d'une vue — `reports` est la table directe (pas de vue *_for_viewer sur reports, intentionnel).

---

### 2. `app/(app)/moderation/page.tsx` — créé

**Gate serveur (double couche) :**
```ts
// 1. Auth
if (!user) notFound()
// 2. Profil is_moderator
const { data: me } = await supabase.from('profiles').select('is_moderator').eq('id', user.id).single()
if (!me?.is_moderator) notFound()
```
`notFound()` au lieu de 403 pour ne pas révéler l'existence de la route.

**Données :**
- `reports` filtrés `status='pending'`, ORDER BY `created_at DESC`, LIMIT 50.
- `target_id` est un UUID générique (pas de FK déclarée vers `feed_posts`) → deux requêtes séquentielles : une pour les reporters (`profiles.username`), une pour les posts (`feed_posts.text, region, author_id`).
- Aucun accès à `catches` ni à `spots` → floutage GPS et gating de tier non touchés.

**Actions exposées dans le JSX via `<form action={...}>`  (Server Actions inline `'use server'`) :**
- `deletePostAction` → `moderatorDeletePost(postId)` (existant dans `feed.ts`)
- `deleteCommentAction` → `moderatorDeleteComment(commentId)` (existant dans `feed.ts`)
- `dismissReportAction` → `dismissReport(reportId)` (nouveau)

Chaque action réutilise les fonctions existantes qui contiennent leur propre gate `viewerIsModerator` — double vérification (page + action).

**Invariants préservés :**
- Gate `is_moderator` côté SERVEUR exclusivement (Server Component + Server Actions).
- `feed_posts` lus directement (lecture du texte pour affichage modérateur, pas exposition publique — la page est réservée modérateur).
- Pas de gating de tier touché (modération indépendante du plan).

---

### 3. `components/layout/AppHeader.tsx` — select étendu

```
avant : .select('username, avatar_url')
après : .select('username, avatar_url, is_moderator')
```

Type local mis à jour :
```
avant : { username: string | null; avatar_url: string | null }
après : { username: string | null; avatar_url: string | null; is_moderator: boolean }
```

Passage de prop :
```
avant : <UserMenu username={...} avatarUrl={...} />
après : <UserMenu username={...} avatarUrl={...} isModerator={profile.is_moderator ?? false} />
```

`?? false` : si la colonne renvoie `null` (profil incomplet), le lien reste absent — comportement sûr par défaut.

---

### 4. `components/layout/UserMenu.tsx` — prop `isModerator` + lien conditionnel

```
avant : interface UserMenuProps { username, avatarUrl }
après : interface UserMenuProps { username, avatarUrl, isModerator?: boolean }
```

Lien conditionnel ajouté après « Mon abonnement » :
```tsx
{isModerator && (
  <Link href="/moderation" ...>
    <Shield size={15} /> Modération
  </Link>
)}
```

`UserMenu` est un Client Component (`'use client'`). La prop `isModerator` vient du Server Component `AppHeader` → le client ne calcule rien, il reçoit une valeur déjà vérifiée côté serveur. Un non-modérateur ne voit pas le lien **et** ne peut pas accéder à la page (gate serveur redondant dans la page elle-même).

---

## Migrations

- **038** (`supabase/migrations/038_fix_reports_policy.sql`) : déjà créée par un agent précédent, non modifiée ici. Corrige `reports_select_own_or_mod` : `is_ambassador` → `is_moderator()`. À appliquer en prod avant déploiement du code.

---

## Critères d'acceptation vérifiés à l'oeil

| Critère | Statut |
|---|---|
| Un modérateur voit la file des reports pending | ✅ page SSR avec gate `is_moderator` |
| Action « Supprimer le post » → `moderatorDeletePost` existant | ✅ form action inline |
| Action « Ignorer » → `dismissReport` nouveau | ✅ UPDATE `status='dismissed'` |
| Un non-modérateur → `notFound()` | ✅ double gate (auth + profil) |
| Lien « Modération » dans UserMenu conditionnel | ✅ prop `isModerator` depuis AppHeader |
| Gate côté SERVEUR (jamais client-only) | ✅ Server Component + Server Actions avec re-check |
| RLS non contournée | ✅ client serveur auth, policies 023/038 couvrent SELECT/UPDATE |
| Floutage GPS, gating de tier non touchés | ✅ aucune requête spots/catches dans ce bloc |

---

## Reste (manuel John)

1. Appliquer **migration 038** en prod (Studio ou CLI) avant de pousser le code.
2. Vérifier que John a bien `is_moderator = true` en prod (déjà fait selon CLAUDE.md §2, mais re-confirmer).
3. Tester la page `/moderation` connecté en tant que John → liste visible ; connecté avec un compte non-modérateur → 404.
