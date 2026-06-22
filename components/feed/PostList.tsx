'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getFeedPage, type FeedPostEnriched } from '@/app/actions/feed'
import { useFeedRealtime } from '@/lib/feed/useFeedRealtime'
import type { FeedTab } from '@/lib/feed/types'
import { PostCard } from './PostCard'
import { EmptyFeed } from './EmptyFeed'
import type { ComposerUser } from './PostComposer'

type EmptyVariant = 'dept' | 'follows-none' | 'follows-empty'

export function PostList({
  initialPosts,
  initialCursor,
  region,
  tab,
  currentUserId,
  currentUser = null,
  viewerIsModerator = false,
  emptyVariant,
}: {
  initialPosts: FeedPostEnriched[]
  initialCursor: string | null
  region: string
  tab: FeedTab
  currentUserId: string | null
  currentUser?: ComposerUser | null
  viewerIsModerator?: boolean
  emptyVariant: EmptyVariant
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)

  // Realtime seulement sur l'onglet département (filtre par region).
  const handleInsert = useCallback(() => {
    getFeedPage({ tab, region }).then((res) => {
      if (!res.ok) return
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const fresh = res.data.posts.filter((p) => p.id && !seen.has(p.id))
        return fresh.length ? [...fresh, ...prev] : prev
      })
    })
  }, [tab, region])
  useFeedRealtime(tab === 'dept' ? region : '', handleInsert)

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

  if (posts.length === 0) return <EmptyFeed variant={emptyVariant} region={region} />

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          currentUserId={currentUserId}
          currentUser={currentUser}
          viewerIsModerator={viewerIsModerator}
          catchPhotoUrl={p.catchPhotoUrl}
        />
      ))}
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="self-center inline-flex items-center gap-2 min-h-11 px-5 rounded-full border border-ink-200 text-[14px] font-semibold text-ink-600 hover:bg-white disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Voir plus
        </button>
      )}
    </div>
  )
}
