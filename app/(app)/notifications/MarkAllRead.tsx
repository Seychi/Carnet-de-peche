'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { markAllRead } from '@/app/actions/notifications'

/**
 * Marque toutes les notifications comme lues à l'arrivée sur /notifications,
 * puis rafraîchit le serveur (fait tomber le badge de la cloche). Idempotent :
 * un second appel ne touche aucune ligne (filtre read_at IS NULL).
 * `hasUnread` évite le refresh inutile s'il n'y a rien à marquer.
 */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !hasUnread) return
    done.current = true
    void markAllRead().then((res) => {
      if (res.ok && res.data.updated > 0) router.refresh()
    })
  }, [hasUnread, router])

  return null
}
