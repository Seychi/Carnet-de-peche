# Cache client Next.js 15 App Router — TanStack React Query v5 vs SWR

**Date : 2026-06-22. Sources : Context7 /tanstack/query v5.90.3 + /vercel/swr-site. Lib non installées dans le repo (package.json vérifié).**

---

## Lib + version ciblée

| | TanStack React Query | SWR |
|---|---|---|
| Package | `@tanstack/react-query` | `swr` |
| Version stable | **5.90.3** (npm 2026-06) | **2.3.x** (npm 2026-06) |
| Bundle gzip | ~13 KB gzip | ~4 KB gzip |
| React requis | React 18+ / 19 OK | React 16.8+ / 19 OK |

---

## Reco

**TanStack React Query v5** pour les écrans chauds authentifiés (fil, carnet, profil).

Raisons :

- `invalidateQueries({ queryKey })` est une primitive de 1er ordre, explicite, testable. SWR ne propose que `mutate(key)` pour forcer la revalidation — la sémantique est moins claire pour des mutations croisées (ex. : poster dans le fil invalide aussi le compteur profil).
- `gcTime` (ex-`cacheTime`) contrôle la durée de rétention en mémoire après que l'abonné se démonte — utile pour garder le fil en cache quand l'utilisateur navigue vers le carnet, sans refetch immédiat.
- `useMutation` avec `onSuccess` → `invalidateQueries` est le pattern dominant dans l'écosystème Next 15 / Supabase ; moins de plomberie manuelle que le `mutate()` SWR bound vs global.
- Devtools officielles (`@tanstack/react-query-devtools`) disponibles en dev.

SWR reste pertinent si le besoin se résume à du fetch simple sans mutations croisées (ex. : données publiques open-meteo sur une fiche spot). Mais pour des écrans qui mutent (post, like, suppression) et dont les caches sont couplés, RQ v5 gagne.

---

## Breaking changes v4 → v5 (ce qui compte pour un démarrage propre)

Aucun code legacy ici donc aucune migration à faire, mais à savoir pour ne pas coder en v4 par accident :

| Changement | v4 | v5 |
|---|---|---|
| Signature des hooks | positionnelle `useQuery(key, fn, opts)` | **objet obligatoire** `useQuery({ queryKey, queryFn, ...opts })` |
| `cacheTime` | `cacheTime: 5 * 60 * 1000` | **`gcTime`** : même valeur, même comportement |
| Callbacks `onSuccess` / `onError` sur `useQuery` | existaient | **supprimés** — utiliser `useEffect` ou les mettre sur `useMutation` uniquement |
| `QueryCache.find(key)` | `queryCache.find(key)` | `queryCache.find({ queryKey: key })` |
| `useQueries` | tableau direct | `useQueries({ queries: [...] })` |

---

## Snippet minimal — setup Next.js 15 App Router

### `app/providers.tsx` (use client)

```tsx
'use client'

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query'
import type { ReactNode } from 'react'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avec SSR : évite un refetch immédiat côté client après hydration
        staleTime: 60 * 1000,          // 1 min — données considérées fraîches
        gcTime:    5 * 60 * 1000,      // 5 min — gardées en mémoire après démontage
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### `app/layout.tsx` (Server Component)

```tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Requête + mutation avec invalidation (écran fil)

```tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeedPage, createPost } from '@/app/actions/feed'

export function FeedScreen() {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['feed', 'dept', '29'],   // clé tableau : dept dans le queryKey
    queryFn: () => getFeedPage({ dept: '29', page: 1 }),
    staleTime: 30 * 1000,              // override local : 30 s pour le fil
  })

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Invalide toutes les clés qui commencent par ['feed']
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  if (isPending) return <p>Chargement…</p>

  return (
    <>
      {data?.posts.map(p => <div key={p.id}>{p.content}</div>)}
      <button onClick={() => mutation.mutate({ dept: '29', content: 'Prise du matin !' })}>
        Poster
      </button>
    </>
  )
}
```

---

## Piege a eviter

**Ne pas instantier `QueryClient` directement dans le corps du composant `Providers`** (sans le pattern `getQueryClient` ci-dessus). En App Router, les Server Components re-rendent cote serveur et le client serait recrée à chaque render, cassant le cache. Le pattern `isServer` / singleton browser est **obligatoire** en Next.js 15 App Router (source : docs advanced-ssr v5.90.3).

Secondaire : ne pas mettre `onSuccess` / `onError` sur `useQuery` — callbacks supprimés en v5, le build TypeScript le signalera immédiatement mais c'est une erreur silencieuse si on copie du code v4 sans types.
