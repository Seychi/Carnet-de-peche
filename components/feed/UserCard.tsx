import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import type { UserSummary } from '@/app/actions/follow'
import { FollowButton } from './FollowButton'

export function UserCard({
  user,
  following,
  onToggle,
}: {
  user: UserSummary
  following?: boolean
  onToggle?: (following: boolean) => void
}) {
  const name = user.display_name || `@${user.username ?? 'pêcheur'}`
  const dept = user.home_department
    ? (DEPARTMENT_LABELS[user.home_department] ?? user.home_department)
    : null

  const identity = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <Avatar className="size-10 shrink-0">
        {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[14px] text-navy-900">{name}</p>
        {dept && <p className="text-[12px] text-ink-400">{dept}</p>}
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-3">
      {user.username ? (
        <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
          {identity}
        </Link>
      ) : (
        identity
      )}
      {following !== undefined && (
        <FollowButton targetUserId={user.id} initialFollowing={following} size="sm" onToggle={onToggle} />
      )}
    </div>
  )
}
