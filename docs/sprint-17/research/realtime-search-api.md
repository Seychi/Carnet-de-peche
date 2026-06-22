# Sprint 17 — API verrou : Realtime v2 + recherche username

> Agent : docs-researcher. Date : 2026-06-22.
> Lib cible : `@supabase/supabase-js ^2.105.4` (package.json).
> Versions Context7 : `/supabase/supabase-js` (score 79, High reputation).
> READ-ONLY : aucun fichier applicatif modifié.

---

## 1. Realtime v2 — badge notifications (Bloc B)

### Lib + version

`@supabase/supabase-js ^2.105.4` — API Realtime v2 inchangée depuis 2.x.
La migration **037** devra ajouter `notifications` à la publication : `alter publication supabase_realtime add table public.notifications;`
Et `replica identity full` si on veut que les payloads UPDATE/DELETE portent toutes les colonnes (nécessaire pour `read_at` en UPDATE) :
`alter table public.notifications replica identity full;`

### Pattern exact (v2)

```ts
// 'use client'
import { useEffect, useRef, useState } from 'react'

export function useNotificationsBadge(userId: string) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let cleanup: (() => void) | undefined

    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return
      const supabase = createClient()

      // Charge le compteur initial (Server Component ou refetch)
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)
        .then(({ count }) => { if (!cancelled) setUnread(count ?? 0) })

      const channel = supabase
        .channel(`notif:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => setUnread((n) => n + 1),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          // read_at passe de null à une valeur → la notif est lue
          (payload) => {
            const row = payload.new as { read_at: string | null }
            if (row.read_at) setUnread((n) => Math.max(0, n - 1))
          },
        )
        .subscribe()

      cleanup = () => { supabase.removeChannel(channel) }
    })

    return () => { cancelled = true; cleanup?.() }
  }, [userId])

  return unread
}
```

### Alignement avec le pattern existant du repo

Le pattern ci-dessus est strictement identique à `lib/feed/useFeedRealtime.ts` et `lib/feed/usePostInteractionsRealtime.ts` :
- import dynamique de `@/lib/supabase/client` dans l'effet (coupe le bundle first-load)
- flag `cancelled` + `cleanup` (évite la souscription après démontage)
- `supabase.removeChannel(channel)` au cleanup

### Piege critique : RLS + postgres_changes

`postgres_changes` vérifie la RLS **avec le JWT du client**. Si la policy `notifications_select_own` (`user_id = auth.uid()`) est bien en place, le filtre `user_id=eq.${userId}` est respecté côté serveur. Sans la publication Realtime (`alter publication supabase_realtime add table ...`), aucun event n'arrive — exactement comme pour `feed_posts` avant la migration 020. **Ajouter les deux lignes `alter publication` + `replica identity full` dans la migration 037, avant tout autre statement.**

Attention : `filter: \`user_id=eq.${userId}\`` n'est pas un filtre RLS — c'est un filtre Realtime côté serveur (Walrus). La RLS reste la barrière de sécurité réelle. Les deux doivent être en place.

---

## 2. Recherche de pêcheurs par username (Bloc D)

### Etat du repo (vérifié)

- `pg_trgm` installée : `001_init.sql` ligne 10 — `create extension if not exists "pg_trgm"`
- Index trigram GIN sur `spots.name` : `003_indexes_views.sql` ligne 37-38 — `spots_name_trgm_idx`
- **Aucun index trigram sur `profiles.username`** — absent de toutes les migrations (001→036).
- `profiles.username` est de type `citext` (case-insensitive text, extension `citext`).

### Recommandation : ILIKE + index trigram GIN — approche correcte

Pour une recherche de pseudo (`username`), trois options existent :

| Approche | Pour | Contre |
|---|---|---|
| `ILIKE '%term%'` sans index | Zéro setup | Seq scan, inutilisable dès >1k lignes |
| `ILIKE '%term%'` + GIN `gin_trgm_ops` | Rapide, exact partial match, nat pour `citext` | Index à créer (migration 037) |
| `websearch_to_tsquery` / `tsvector` | Pertinence ranking, stemming | Overkill pour un username exact/partiel, pas de partial-match natif sans `prefix` |

**Choix : ILIKE + index GIN trigram.** Pour une recherche de pseudo (max 30 chars, alphanumérique + underscore + tiret), `ILIKE '%term%'` avec un index `gin_trgm_ops` est la solution la plus simple et la plus performante. `websearch_to_tsquery` est fait pour du texte naturel (titres, bios) — pas pour des identifiants courts.

### Index à ajouter dans la migration 037

```sql
-- Recherche de pêcheur par pseudo (ILIKE fuzzy via pg_trgm)
-- citext + gin_trgm_ops : les opérateurs ILIKE sont couverts.
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);
```

### Requête côté Server Action

```ts
// app/actions/search.ts
'use server'
import { createServerClient } from '@/lib/supabase/server'

export type SearchedProfile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  home_department: string | null
}

export async function searchProfiles(term: string): Promise<SearchedProfile[]> {
  if (!term || term.trim().length < 2) return []
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, home_department')
    .ilike('username', `%${term.trim()}%`)
    .eq('onboarded', true)         // n'expose pas les profils non finis
    .order('username')
    .limit(10)
  return (data ?? []) as SearchedProfile[]
}
```

### Piege : citext + ILIKE

`citext` rend les comparaisons case-insensitive au niveau SQL, donc `username ILIKE '%jean%'` et `username ILIKE '%Jean%'` sont équivalents — pas besoin de `.toLowerCase()` côté TS. En revanche, l'index `gin_trgm_ops` sur une colonne `citext` fonctionne correctement en Postgres 14+ (extension `citext` + `pg_trgm` installées toutes deux ici dès 001). Ne pas créer un index `gin (lower(username) gin_trgm_ops)` — `citext` le rend redondant et ce type d'expression-index sur `citext` peut provoquer des erreurs de type selon la version PG.

---

## 3. Cohérence avec les invariants du projet

- RLS `notifications` : `user_id = (select auth.uid())` pour SELECT + UPDATE (lire/marquer lu), policy INSERT réservée au service_role ou à une fonction SECURITY DEFINER appelée depuis les Server Actions `toggleLike`/`addComment`/`toggleFollow`.
- Pas d'accès brut à `catches` ou `spots` dans les Server Actions de recherche — `searchProfiles` ne touche que `profiles` (pas de GPS).
- Le badge `useNotificationsBadge` passe `userId` depuis le Server Component parent (pas de `useUser()` client) — compatible App Router.

---

## 4. Résumé actionnable

| Point | Décision |
|---|---|
| Realtime badge | `channel(...).on('postgres_changes', { event: 'INSERT', ..., filter: \`user_id=eq.${userId}\` })` + `removeChannel` au cleanup — pattern identique à `useFeedRealtime.ts` |
| Publication Realtime | `alter publication supabase_realtime add table public.notifications` DANS 037 (sinon aucun event) |
| Replica identity | `alter table public.notifications replica identity full` DANS 037 (sinon UPDATE ne porte pas `read_at`) |
| Recherche username | ILIKE + index GIN `gin_trgm_ops` sur `profiles.username` (pg_trgm déjà installée) |
| Index à créer | `profiles_username_trgm_idx` — à inclure dans la migration 037 |
| websearch_to_tsquery | NON retenu pour les pseudos — overkill, pas de partial-match natif |
