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

    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return
      const supabase = createClient()
      const channel = supabase
        .channel('catch-heat')
        .on('broadcast', { event: 'new-catch' }, (msg) => {
          const dept = (msg.payload as { department?: string } | undefined)?.department ?? ''
          onPingRef.current(dept)
        })
        .subscribe()

      cleanup = () => { supabase.removeChannel(channel) }
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])
}
