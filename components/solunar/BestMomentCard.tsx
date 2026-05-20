import { Info } from 'lucide-react'
import type { FishingWindow, QualityLevel } from '@/lib/solunar/types'
import type { PersonalInsight } from '@/lib/scoring/types'
import { InsightChip } from '@/components/scoring/InsightChip'

// ─── Config qualité ───────────────────────────────────────────────────────────

const QUALITY_CONFIG: Record<
  QualityLevel,
  { label: string; badgeCls: string; textCls: string; pulse: boolean }
> = {
  faible:        { label: 'Faible',       badgeCls: 'bg-gray-400 text-white',           textCls: 'text-gray-500',   pulse: false },
  moyenne:       { label: 'Moyenne',      badgeCls: 'bg-amber-500 text-white',           textCls: 'text-amber-600',  pulse: false },
  bonne:         { label: 'Bonne',        badgeCls: 'bg-lime-500 text-white',            textCls: 'text-lime-600',   pulse: false },
  tres_bonne:    { label: 'Très Bonne',   badgeCls: 'bg-teal-500 text-white',            textCls: 'text-teal-600',   pulse: false },
  exceptionnelle:{ label: 'Exceptionnelle', badgeCls: 'bg-emerald-600 text-white',       textCls: 'text-emerald-700',pulse: true  },
}

// ─── BestMomentCard ───────────────────────────────────────────────────────────

type BestMomentCardProps = {
  window: FishingWindow
  isCurrent?: boolean
  relevantInsight?: PersonalInsight
}

export function BestMomentCard({ window: w, isCurrent = false, relevantInsight }: BestMomentCardProps) {
  const cfg = QUALITY_CONFIG[w.quality]
  const isPersonalized = w.factors.reasons.some(r => r.includes('Personnalisé'))
  const displayReasons = w.factors.reasons.filter(r => !r.includes('Personnalisé'))

  return (
    <article
      aria-label={`Fenêtre de pêche de ${w.startLocal} à ${w.endLocal}, qualité ${cfg.label}, score ${w.score} sur 100`}
      className={[
        'relative rounded-[14px] border bg-white px-4 py-3 shadow-sm transition-colors',
        isCurrent ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-slate-100',
      ].join(' ')}
    >
      {/* Badge "Maintenant" */}
      {isCurrent && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-teal-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          Maintenant
        </span>
      )}

      {/* Ligne haute : horaire + badge score */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold text-navy-900 tabular-nums">
          {w.startLocal} – {w.endLocal}
        </p>

        {/* Badge score rond 40×40 */}
        <div className="relative shrink-0">
          {cfg.pulse && (
            <span className="absolute inset-0 rounded-full bg-emerald-600/40 motion-safe:animate-pulse" />
          )}
          <div
            className={[
              'relative flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold',
              cfg.badgeCls,
            ].join(' ')}
          >
            {w.score}
          </div>
        </div>
      </div>

      {/* Label qualitatif + badge perso */}
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className={`text-[13px] font-bold ${cfg.textCls}`}>
          {cfg.label}
        </p>
        {isPersonalized && (
          <span
            className="text-[13px] leading-none"
            title="Score personnalisé d'après tes prises"
            aria-label="Score personnalisé d'après tes prises"
          >
            ⚡
          </span>
        )}
      </div>

      {/* Raisons astronomiques */}
      {displayReasons.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-500">
          <Info size={13} className="shrink-0 text-ink-400" aria-hidden />
          {displayReasons.join(' · ')}
        </p>
      )}

      {/* Insight personnel pertinent */}
      {relevantInsight && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <InsightChip insight={relevantInsight} />
        </div>
      )}
    </article>
  )
}

// ─── BestMomentRow ────────────────────────────────────────────────────────────

type BestMomentRowProps = {
  window: FishingWindow
}

export function BestMomentRow({ window: w }: BestMomentRowProps) {
  const cfg = QUALITY_CONFIG[w.quality]

  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-700">
      <span className="tabular-nums font-medium text-navy-900">
        {w.startLocal} – {w.endLocal}
      </span>
      <span className="text-ink-300">·</span>
      <span className={`font-semibold ${cfg.textCls}`}>{cfg.label}</span>
      <span className="text-ink-300">·</span>
      <span
        className={[
          'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
          cfg.badgeCls,
        ].join(' ')}
      >
        {w.score}
      </span>
    </div>
  )
}
