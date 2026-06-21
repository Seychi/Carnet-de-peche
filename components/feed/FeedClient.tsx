'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getFeedPage, type FeedPostEnriched } from '@/app/actions/feed'
import { useFeedRealtime } from '@/lib/feed/useFeedRealtime'
import type { FeedTab } from '@/lib/feed/types'
import { PostCard } from './PostCard'
import { EmptyFeed } from './EmptyFeed'
import { PostComposer, type RecentCatch } from './PostComposer'

type EmptyVariant = 'dept' | 'follows-none' | 'follows-empty'

// Wrapper client du fil : possède l'état `posts` partagé entre le composer et la
// liste. Corrige BUG-09 — avant, PostComposer faisait router.refresh() mais
// PostList initialisait son state depuis ses props UNE fois → le nouveau post
// n'apparaissait jamais sans rechargement, et la suppression laissait la carte.
export function FeedClient({
  initialPosts,
  initialCursor,
  region,
  tab,
  currentUserId,
  viewerIsModerator = false,
  emptyVariant,
  recentCatches = [],
}: {
  initialPosts: FeedPostEnriched[]
  initialCursor: string | null
  region: string
  tab: FeedTab
  currentUserId: string | null
  viewerIsModerator?: boolean
  emptyVariant: EmptyVariant
  recentCatches?: RecentCatch[]
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)

  // Refetch de la 1re page + merge en tête (dé-dup par id). Sert au Realtime ET
  // à l'insertion optimiste après création d'un post (même mécanisme éprouvé).
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

  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    const res = await getFeedPage({ tab, region, cursor })
    setLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setPosts((prev) => [...prev, ...res.data.posts])
    setCursor(res.data.nextCursor)
  }

  return (
    <div className="flex flex-col gap-4">
      <PostComposer region={region} recentCatches={recentCatches} onCreated={mergeFresh} />

      {posts.length === 0 ? (
        <EmptyFeed variant={emptyVariant} region={region} />
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              viewerIsModerator={viewerIsModerator}
              catchPhotoUrl={p.catchPhotoUrl}
              onDeleted={handleDeleted}
            />
          ))}
          {cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="self-center inline-flex items-center gap-2 min-h-11 px-5 rounded-full border border-slate-200 text-[14px] font-semibold text-ink-600 hover:bg-white disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Voir plus
            </button>
          )}
        </div>
      )}
    </div>
  )
}
