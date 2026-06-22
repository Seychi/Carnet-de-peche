import { Info } from 'lucide-react'
import type { FishingWindow, QualityLevel } from '@/lib/solunar/types'
import { QUALITY_LABELS, QUALITY_BADGE_CLS, QUALITY_TEXT_CLS } from '@/lib/solunar/quality-style'

// ─── Config qualité ───────────────────────────────────────────────────────────

// Couleurs CIVIDIS colorblind-safe — source unique : lib/solunar/quality-style.
const QUALITY_CONFIG: Record<
  QualityLevel,
  { label: string; badgeCls: string; textCls: string; pulse: boolean }
> = {
  faible:        { label: QUALITY_LABELS.faible,         badgeCls: QUALITY_BADGE_CLS.faible,         textCls: QUALITY_TEXT_CLS.faible,         pulse: false },
  moyenne:       { label: QUALITY_LABELS.moyenne,        badgeCls: QUALITY_BADGE_CLS.moyenne,        textCls: QUALITY_TEXT_CLS.moyenne,        pulse: false },
  bonne:         { label: QUALITY_LABELS.bonne,          badgeCls: QUALITY_BADGE_CLS.bonne,          textCls: QUALITY_TEXT_CLS.bonne,          pulse: false },
  tres_bonne:    { label: QUALITY_LABELS.tres_bonne,     badgeCls: QUALITY_BADGE_CLS.tres_bonne,     textCls: QUALITY_TEXT_CLS.tres_bonne,     pulse: false },
  exceptionnelle:{ label: QUALITY_LABELS.exceptionnelle, badgeCls: QUALITY_BADGE_CLS.exceptionnelle, textCls: QUALITY_TEXT_CLS.exceptionnelle, pulse: true  },
}

// ─── BestMomentCard ───────────────────────────────────────────────────────────

type BestMomentCardProps = {
  window: FishingWindow
  isCurrent?: boolean
}

export function BestMomentCard({ window: w, isCurrent = false }: BestMomentCardProps) {
  const cfg = QUALITY_CONFIG[w.quality]
  const displayReasons = w.factors.reasons

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
        <span className="absolute -top-2.5 left-4 rounded-full bg-teal-500 px-2.5 py-0.5 text-[11px] font-bold text-navy-950 shadow-sm">
          Maintenant
        </span>
      )}

      {/* Ligne haute : horaire + badge score */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold text-navy-900 font-mono tabular-nums">
          {w.startLocal} – {w.endLocal}
        </p>

        {/* Badge score rond 40×40 */}
        <div className="relative shrink-0">
          {cfg.pulse && (
            <span className="absolute inset-0 rounded-full bg-[#FEE838]/60 motion-safe:animate-pulse" />
          )}
          <div
            className={[
              'relative flex h-10 w-10 items-center justify-center rounded-full font-mono text-[13px] font-bold',
              cfg.badgeCls,
            ].join(' ')}
          >
            {w.score}
          </div>
        </div>
      </div>

      {/* Label qualitatif */}
      <div className="mt-0.5">
        <p className={`text-[13px] font-bold ${cfg.textCls}`}>
          {cfg.label}
        </p>
      </div>

      {/* Raisons astronomiques */}
      {displayReasons.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-500">
          <Info size={13} className="shrink-0 text-ink-400" aria-hidden />
          {displayReasons.join(' · ')}
        </p>
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
      <span className="font-mono tabular-nums font-medium text-navy-900">
        {w.startLocal} – {w.endLocal}
      </span>
      <span className="text-ink-500" aria-hidden="true">·</span>
      <span className={`font-semibold ${cfg.textCls}`}>{cfg.label}</span>
      <span className="text-ink-500" aria-hidden="true">·</span>
      <span
        className={[
          'flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold',
          cfg.badgeCls,
        ].join(' ')}
      >
        {w.score}
      </span>
    </div>
  )
}
