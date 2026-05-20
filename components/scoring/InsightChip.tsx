import { Wind, Waves, Clock, Leaf } from 'lucide-react'
import type { PersonalInsight } from '@/lib/scoring/types'

const FACTOR_ICONS = {
  wind:   Wind,
  tide:   Waves,
  hour:   Clock,
  season: Leaf,
} as const

// ─── InsightChip ──────────────────────────────────────────────────────────────
// Variante une ligne pour les tooltips/popovers des fenêtres solunar

export function InsightChip({ insight }: { insight: PersonalInsight }) {
  const Icon = FACTOR_ICONS[insight.factor]
  const pct  = Math.round(insight.catchRate * 100)

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-600">
      <Icon size={12} className="text-ink-400 shrink-0" aria-hidden />
      <span className="font-medium text-ink-700">{insight.label}</span>
      <span className="text-ink-400">—</span>
      <span>{pct}% de tes {insight.isPositive ? 'bonnes' : ''} prises</span>
    </span>
  )
}
