'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { toggleFollow } from '@/app/actions/follow'

export function FollowButton({
  targetUserId,
  initialFollowing,
  size = 'md',
  onToggle,
}: {
  targetUserId: string
  initialFollowing: boolean
  size?: 'sm' | 'md'
  // Appelé après un toggle réussi (ex. /follows retire la carte au désabonnement).
  onToggle?: (following: boolean) => void
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return
    const prev = following
    setPending(true)
    setFollowing(!prev) // optimistic
    const res = await toggleFollow(targetUserId)
    setPending(false)
    if (!res.ok) {
      setFollowing(prev)
      toast.error(res.error)
      return
    }
    setFollowing(res.data.following)
    onToggle?.(res.data.following)
  }

  const base =
    size === 'sm'
      ? 'min-h-9 px-3 text-[12px]'
      : 'min-h-11 px-5 text-[14px]'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-60 ${base} ${
        following
          ? 'border border-slate-200 text-ink-600 hover:bg-slate-50'
          : 'bg-teal-500 text-navy-950 hover:bg-teal-400'
      }`}
    >
      {following ? 'Suivi(e)' : 'Suivre'}
    </button>
  )
}
