'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type TideChart from './TideChart'

/**
 * Frontière client pour lazy-loader TideChart (sprint 11 Bloc F) : recharts
 * (~100 kB gz) sort du bundle initial de /spots/[slug] — page budgetée
 * Lighthouse CI. ssr:false : le graphe n'apporte rien au HTML initial, le
 * skeleton réserve la place exacte (header 36px + chart 240px) → pas de CLS.
 */
const TideChartInner = dynamic(() => import('./TideChart'), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 rounded bg-ink-100" />
        <div className="h-7 w-28 rounded-lg bg-ink-100" />
      </div>
      <div className="h-[240px] rounded-[10px] bg-ink-50" />
    </div>
  ),
})

export default function TideChartLazy(props: ComponentProps<typeof TideChart>) {
  return <TideChartInner {...props} />
}
