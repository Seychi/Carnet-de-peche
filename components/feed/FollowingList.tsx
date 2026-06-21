'use client'

import { useState } from 'react'
import type { UserSummary } from '@/app/actions/follow'
import { UserCard } from './UserCard'

// Liste client de la section « Tu suis » : retire la carte au désabonnement
// sans rechargement (BUG-04). La source initiale vient du serveur (RSC).
export function FollowingList({ initialUsers }: { initialUsers: UserSummary[] }) {
  const [users, setUsers] = useState(initialUsers)

  if (users.length === 0) {
    return <p className="text-[14px] text-ink-400">Tu ne suis personne pour l’instant.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {users.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          following
          onToggle={(following) => {
            if (!following) setUsers((prev) => prev.filter((x) => x.id !== u.id))
          }}
        />
      ))}
    </div>
  )
}
