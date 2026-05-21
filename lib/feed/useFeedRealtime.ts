'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * S'abonne aux nouveaux posts approuvés d'un département (INSERT sur feed_posts).
 * Appelle `onInsert(postId)` à chaque nouveau post.
 *
 * Le callback est stocké dans une ref : on ne re-souscrit que si `region`
 * change, pas à chaque render (sinon churn de souscription si le parent passe
 * une fonction inline).
 */
export function useFeedRealtime(region: string, onInsert: (postId: string) => void) {
  const onInsertRef = useRef(onInsert)
  useEffect(() => {
    onInsertRef.current = onInsert
  })

  useEffect(() => {
    if (!region) return
    const supabase = createClient()
    const channel = supabase
      .channel(`feed:${region}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_posts',
          filter: `region=eq.${region}`,
        },
        (payload) => {
          const id = (payload.new as { id?: string }).id
          if (id) onInsertRef.current(id)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [region])
}
