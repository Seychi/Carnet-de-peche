'use client'

import { useEffect, useRef } from 'react'

/**
 * S'abonne aux nouveaux messages d'une sortie (INSERT sur outing_messages),
 * filtrés par `proposalId`. Appelle `onInsert(row)` à chaque nouveau message.
 *
 * ⚠️ Le `filter` Realtime n'est PAS la sécurité : c'est la RLS de outing_messages
 * (migration 068, hôte + acceptés uniquement) qui garde. Un non-membre abonné au
 * channel ne reçoit rien car la souscription propage son JWT `authenticated` et le
 * serveur n'émet que les lignes qu'il peut SELECT.
 *
 * Pattern calqué sur lib/feed/useFeedRealtime.ts : callback en ref (re-souscription
 * seulement si `proposalId` change), import dynamique de supabase-js dans l'effet,
 * flag `cancelled` (le démontage peut précéder la résolution de l'import), cleanup
 * via `removeChannel` (retire le channel du registre client, pas juste unsubscribe).
 */
export type OutingMessageRow = {
  id: string
  proposal_id: string
  user_id: string
  body: string
  created_at: string
}

export function useOutingChatRealtime(
  proposalId: string,
  onInsert: (row: OutingMessageRow) => void,
) {
  const onInsertRef = useRef(onInsert)
  useEffect(() => {
    onInsertRef.current = onInsert
  })

  useEffect(() => {
    if (!proposalId) return
    let cancelled = false
    let cleanup: (() => void) | undefined

    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return
      const supabase = createClient()
      const channel = supabase
        .channel(`outing:${proposalId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'outing_messages',
            filter: `proposal_id=eq.${proposalId}`,
          },
          (payload) => {
            const row = payload.new as OutingMessageRow
            if (row?.id) onInsertRef.current(row)
          },
        )
        .subscribe()

      cleanup = () => {
        supabase.removeChannel(channel)
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [proposalId])
}
