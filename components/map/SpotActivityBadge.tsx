'use client'

import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'

/**
 * Signal social du popup spot (Carte v2 / C1, Bloc D) : « N prises de M pêcheurs
 * ces 7 derniers jours ». Lit via get_spot_activity (RPC 018) qui passe par
 * catches_for_viewer → AUCUNE coordonnée précise renvoyée. Honnête : rien si 0 prise.
 */
export default function SpotActivityBadge({ spotId }: { spotId: string }) {
  const [data, setData] = useState<{ catches: number; fishers: number } | null>(null)

  useEffect(() => {
    let alive = true
    void import('@/lib/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient()
      const { data: rows } = await supabase.rpc('get_spot_activity', { p_spot_id: spotId, p_days: 7 })
      const row = Array.isArray(rows) ? rows[0] : rows
      const catches = (row?.catches_count as number | undefined) ?? 0
      if (alive && row && catches > 0) {
        setData({ catches, fishers: (row.fishers_count as number | undefined) ?? 0 })
      }
    })
    return () => { alive = false }
  }, [spotId])

  if (!data) return null

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-coral-500/10 px-2 py-0.5 text-xs font-medium text-coral-600">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-coral-500" />
      </span>
      <Flame size={12} aria-hidden />
      {data.catches} prise{data.catches > 1 ? 's' : ''} · {data.fishers} pêcheur{data.fishers > 1 ? 's' : ''} (7 j)
    </span>
  )
}
