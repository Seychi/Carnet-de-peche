'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getFeedPage, type FeedPostEnriched } from '@/app/actions/feed'
import { useFeedRealtime } from '@/lib/feed/useFeedRealtime'
import type { FeedTab } from '@/lib/feed/types'
import { PostCard } from './PostCard'
import { PostCardSkeleton } from './PostCardSkeleton'
import { EmptyFeed } from './EmptyFeed'
import { PostComposer, type ComposerUser, type RecentCatch } from './PostComposer'

type EmptyVariant = 'dept' | 'follows-none' | 'follows-empty'

// Wrapper client du fil : possède l'état `posts` partagé entre le composer et la
// liste. Insertion optimiste à la publication (Bloc E), infinite scroll +
// skeletons. Corrige BUG-09 (post/suppression sans rechargement).
export function FeedClient({
  initialPosts,
  initialCursor,
  region,
  tab,
  currentUser,
  viewerIsModerator = false,
  emptyVariant,
  recentCatches = [],
}: {
  initialPosts: FeedPostEnriched[]
  initialCursor: string | null
  region: string
  tab: FeedTab
  currentUser: ComposerUser
  viewerIsModerator?: boolean
  emptyVariant: EmptyVariant
  recentCatches?: RecentCatch[]
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const currentUserId = currentUser.id

  // Refetch de la 1re page + merge en tête (dé-dup par id). Sert au Realtime ET
  // à la confirmation d'une insertion optimiste.
  const mergeFresh = useCallback(() => {
    getFeedPage({ tab, region }).then((res) => {
      if (!res.ok) return
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const fresh = res.data.posts.filter((p) => p.id && !seen.has(p.id))
        return fresh.length ? [...fresh, ...prev] : prev
      })
    })
  }, [tab, region])

  // Realtime seulement sur l'onglet département (filtre par region).
  useFeedRealtime(tab === 'dept' ? region : '', mergeFresh)

  const handleDeleted = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Optimiste : la carte apparaît immédiatement, puis on confirme (mergeFresh
  // remplace la temp par la vraie, avec ses URLs signées) ou on l'annule.
  const handleOptimisticCreate = useCallback((post: FeedPostEnriched) => {
    setPosts((prev) => [post, ...prev])
  }, [])

  const handleReconcile = useCallback(
    (tempId: string, success: boolean) => {
      setPosts((prev) => {
        // Libère les blob: de la carte optimiste avant de la retirer (anti-fuite mémoire).
        const temp = prev.find((p) => p.id === tempId)
        for (const u of temp?.photoUrls ?? []) {
          if (u.startsWith('blob:')) URL.revokeObjectURL(u)
        }
        return prev.filter((p) => p.id !== tempId)
      })
      if (success) mergeFresh()
    },
    [mergeFresh],
  )

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const res = await getFeedPage({ tab, region, cursor })
    setLoading(false)
    loadingRef.current = false
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id))
      const fresh = res.data.posts.filter((p) => p.id && !seen.has(p.id))
      return [...prev, ...fresh]
    })
    setCursor(res.data.nextCursor)
  }, [cursor, tab, region])

  // Infinite scroll : on charge la page suivante quand la sentinelle approche du
  // viewport. Le bouton « Voir plus » reste un fallback accessible.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '600px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  return (
    <div className="flex flex-col gap-4">
      <PostComposer
        region={region}
        currentUser={currentUser}
        recentCatches={recentCatches}
        onOptimisticCreate={handleOptimisticCreate}
        onReconcile={handleReconcile}
      />

      {posts.length === 0 ? (
        <EmptyFeed variant={emptyVariant} region={region} />
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              currentUser={currentUser}
              viewerIsModerator={viewerIsModerator}
              catchPhotoUrl={p.catchPhotoUrl}
              photoUrls={p.photoUrls}
              onDeleted={handleDeleted}
            />
          ))}

          {loading && (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          )}

          {cursor && (
            <>
              <div ref={sentinelRef} aria-hidden className="h-px w-full" />
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="inline-flex min-h-11 items-center gap-2 self-center rounded-full border border-ink-200 px-5 text-[14px] font-semibold text-ink-600 hover:bg-white disabled:opacity-50"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Voir plus
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
