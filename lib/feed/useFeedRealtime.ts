'use client'

import { useEffect, useRef } from 'react'

/**
 * S'abonne aux nouveaux posts approuvés d'un département (INSERT sur feed_posts).
 * Appelle `onInsert(postId)` à chaque nouveau post.
 *
 * Le callback est stocké dans une ref : on ne re-souscrit que si `region`
 * change, pas à chaque render (sinon churn de souscription si le parent passe
 * une fonction inline).
 *
 * supabase-js (~62 kB gz) est importé dynamiquement DANS l'effet (sprint 11
 * Bloc F) : il sort du first load de /fil/[department] — la souscription
 * Realtime n'est de toute façon utile qu'après hydratation.
 */
export function useFeedRealtime(region: string, onInsert: (postId: string) => void) {
  const onInsertRef = useRef(onInsert)
  useEffect(() => {
    onInsertRef.current = onInsert
  })

  useEffect(() => {
    if (!region) return
    // L'import peut résoudre APRÈS le démontage : flag `cancelled` pour ne pas
    // souscrire dans le vide, et `cleanup` posé seulement une fois souscrit.
    let cancelled = false
    let cleanup: (() => void) | undefined

    void Promise.all([
      import('@/lib/supabase/client'),
      import('@/lib/supabase/resilient-channel'),
    ]).then(([{ createClient }, { subscribeResilient }]) => {
      if (cancelled) return
      const supabase = createClient()
      // Reconnexion sur coupure durable (sinon le fil se fige en silence).
      cleanup = subscribeResilient(supabase, (c) =>
        c.channel(`feed:${region}`).on(
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
        ),
      )
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [region])
}
