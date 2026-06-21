'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { listFollowers, listFollowing, type UserSummary } from '@/app/actions/follow'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserCard } from './UserCard'

type ListKind = 'followers' | 'following'

// Compteurs sociaux cliquables du profil public (sprint 12, Bloc E). Les listes
// sont chargées À LA DEMANDE (à l'ouverture de la modale), jamais au render initial
// du profil. `following` de chaque entrée = état du VIEWER vis-à-vis de l'entrée,
// maintenu en optimiste pour rester cohérent avec les FollowButton.
export function ProfileFollowStats({
  profileId,
  viewerId,
  followersCount,
  followingCount,
  initialViewerFollowingIds,
}: {
  profileId: string
  viewerId: string | null
  followersCount: number
  followingCount: number
  initialViewerFollowingIds: string[]
}) {
  const [openKind, setOpenKind] = useState<ListKind | null>(null)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewerFollowing, setViewerFollowing] = useState<Set<string>>(
    () => new Set(initialViewerFollowingIds),
  )

  async function openList(kind: ListKind) {
    setOpenKind(kind)
    setLoading(true)
    setError(null)
    setUsers([])
    const res = kind === 'followers' ? await listFollowers(profileId) : await listFollowing(profileId)
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setUsers(res.data)
  }

  function handleToggle(id: string, following: boolean) {
    setViewerFollowing((prev) => {
      const next = new Set(prev)
      if (following) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-4 font-mono text-[13px]">
        <button
          type="button"
          onClick={() => openList('followers')}
          className="transition-opacity hover:opacity-80"
        >
          <span className="font-semibold text-teal-300">{followersCount}</span>
          <span className="text-white/55">{` abonné${followersCount > 1 ? 's' : ''}`}</span>
        </button>
        <button
          type="button"
          onClick={() => openList('following')}
          className="transition-opacity hover:opacity-80"
        >
          <span className="font-semibold text-teal-300">{followingCount}</span>
          <span className="text-white/55">{` abonnement${followingCount > 1 ? 's' : ''}`}</span>
        </button>
      </div>

      <Dialog open={openKind !== null} onOpenChange={(o) => { if (!o) setOpenKind(null) }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{openKind === 'followers' ? 'Abonnés' : 'Abonnements'}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-6 text-ink-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
            {error && (
              <p className="py-4 text-[14px] text-red-600" role="alert">{error}</p>
            )}
            {!loading && !error && users.length === 0 && (
              <p className="py-4 text-[14px] text-ink-400">
                {openKind === 'followers' ? 'Aucun abonné pour l’instant.' : 'Aucun abonnement pour l’instant.'}
              </p>
            )}
            {!loading && !error &&
              users.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  following={u.id === viewerId ? undefined : viewerFollowing.has(u.id)}
                  onToggle={(f) => handleToggle(u.id, f)}
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
