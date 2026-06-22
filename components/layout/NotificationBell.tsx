'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotificationRealtime } from '@/lib/notifications/useNotificationRealtime'

/**
 * Cloche de notifications (sprint 17 Bloc B).
 * Compteur SSR (initialCount) + mise à jour live via Realtime (hook).
 * Lien vers /notifications. Client Component autonome : reçoit `userId` du
 * Server Component parent (AppHeader), pas de useUser() côté client.
 */
export function NotificationBell({
  userId,
  initialCount,
}: {
  userId: string
  initialCount: number
}) {
  const unread = useNotificationRealtime(userId, initialCount)
  const hasUnread = unread > 0

  return (
    <Link
      href="/notifications"
      aria-label={
        hasUnread
          ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`
          : 'Notifications'
      }
      className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-ink-100"
    >
      <Bell size={20} strokeWidth={1.9} aria-hidden="true" />
      {hasUnread && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold leading-none text-white"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
