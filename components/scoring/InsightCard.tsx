import { Wind, Waves, Clock, Leaf } from 'lucide-react'
import type { PersonalInsight } from '@/lib/scoring/types'

// ─── Icône par facteur ────────────────────────────────────────────────────────

const FACTOR_ICONS = {
  wind:   Wind,
  tide:   Waves,
  hour:   Clock,
  season: Leaf,
} as const

// ─── InsightCard ──────────────────────────────────────────────────────────────

export function InsightCard({ insight }: { insight: PersonalInsight }) {
  const Icon = FACTOR_ICONS[insight.factor]
  const positive = insight.isPositive

  const cardCls = positive
    ? 'bg-teal-50 border-teal-100'
    : 'bg-amber-50 border-amber-100'

  const labelCls = positive ? 'text-teal-800' : 'text-amber-800'
  const iconCls  = positive ? 'text-teal-500' : 'text-amber-500'

  const badge = positive
    ? <span className="text-[11px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">✅ Favorable</span>
    : <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">⚠️ À éviter</span>

  const confidenceNode = (() => {
    const n = insight.sampleCount
    if (insight.confidence === 'low') {
      return <span className="text-[11px] text-ink-400">Peu de données ({n} prise{n > 1 ? 's' : ''})</span>
    }
    if (insight.confidence === 'medium') {
      return <span className="text-[11px] text-ink-500">Basé sur {n} session{n > 1 ? 's' : ''}</span>
    }
    return <span className="text-[11px] text-teal-600 font-medium">Confirmé sur {n} prises</span>
  })()

  const ariaLabel = `Insight pêche : ${insight.label}, ${positive ? 'favorable' : 'défavorable'}, ${insight.description}`

  return (
    <article
      className={`flex items-start gap-3 rounded-[14px] border p-4 ${cardCls}`}
      aria-label={ariaLabel}
    >
      <Icon size={18} className={`${iconCls} shrink-0 mt-0.5`} aria-hidden />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-[14px] font-semibold leading-snug truncate ${labelCls}`}>
            {insight.label}
          </p>
          {badge}
        </div>
        <p className="text-[13px] text-ink-600 leading-snug">
          {insight.description}
        </p>
        <div className="mt-1.5">
          {confidenceNode}
        </div>
      </div>
    </article>
  )
}
