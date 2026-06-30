'use client'

import { useEffect, useRef } from 'react'

/**
 * S'abonne au broadcast Realtime « catch-heat » émis par le trigger
 * broadcast_public_catch (migration 042) à chaque prise PUBLIQUE. Le payload ne
 * contient QUE { department } — aucune coordonnée (cf. 042 : on n'écoute jamais la
 * table catches pour ne pas répliquer geom). Sert de simple ping → le parent
 * re-fetch la heatmap k-anonyme.
 *
 * supabase-js importé dynamiquement (hors first load), comme useFeedRealtime.
 */
export function useCatchHeatRealtime(onPing: (department: string) => void) {
  const onPingRef = useRef(onPing)
  useEffect(() => { onPingRef.current = onPing })

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | undefined

    void Promise.all([
      import('@/lib/supabase/client'),
      import('@/lib/supabase/resilient-channel'),
    ]).then(([{ createClient }, { subscribeResilient }]) => {
      if (cancelled) return
      const supabase = createClient()
      cleanup = subscribeResilient(supabase, (c) =>
        c.channel('catch-heat').on('broadcast', { event: 'new-catch' }, (msg) => {
          const dept = (msg.payload as { department?: string } | undefined)?.department ?? ''
          onPingRef.current(dept)
        }),
      )
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])
}
