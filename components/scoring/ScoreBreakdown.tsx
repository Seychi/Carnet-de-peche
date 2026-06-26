import { Moon, Waves, Wind } from 'lucide-react'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import type { FishingWindow } from '@/lib/solunar/types'

// ─── Décomposition du score 0-100 en ses 3 facteurs (générique, honnête) ──────
// Aucune donnée inventée : on lit `window.factors` (déjà calculé par
// lib/solunar/scoring.ts) ET ses POIDS EFFECTIFS (factors.weights). Correctif
// sprint 24 : en faible marnage (Méditerranée), la marée est non discriminante →
// son poids est réparti sur astro + vent, et on l'affiche « plate · peu
// déterminante » au lieu d'un trompeur « 0/35 ».

const FACTORS = [
  { key: 'solunar', label: 'Astro', icon: Moon },
  { key: 'tide', label: 'Marée', icon: Waves },
  { key: 'wind', label: 'Vent', icon: Wind },
] as const

function tierColor(v01: number): string {
  if (v01 >= 0.75) return 'var(--score-high)'
  if (v01 >= 0.5) return 'var(--score-mid)'
  return 'var(--score-low)'
}

function formatMarnage(m: number | null): string {
  if (m == null) return ''
  return `${m.toFixed(2).replace('.', ',')} m`
}

export function ScoreBreakdown({
  window: w,
  title = 'De quoi est fait ce score',
  className,
}: {
  window: FishingWindow
  title?: string
  className?: string
}) {
  const { weights, tideNonDiscriminating, marnageM } = w.factors

  return (
    <div className={`rounded-[14px] border border-ink-100 bg-white p-4 ${className ?? ''}`}>
      <div className="flex items-center gap-4">
        <ScoreRing value={w.score} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-500">
            {title}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {FACTORS.map((f) => {
              const Icon = f.icon
              // Marée plate (faible marnage) : libellé honnête, pas de « 0/35 ».
              if (f.key === 'tide' && tideNonDiscriminating) {
                return (
                  <li key={f.key} className="flex items-center gap-2.5">
                    <Icon size={14} className="shrink-0 text-ink-400" aria-hidden />
                    <span className="w-12 shrink-0 text-[12px] text-ink-600">{f.label}</span>
                    <span className="flex-1 text-[11px] leading-snug text-ink-500">
                      Plate (marnage {formatMarnage(marnageM)}) · peu déterminante
                    </span>
                  </li>
                )
              }
              const v01 = w.factors[f.key]
              const weight = weights[f.key]
              const weightPts = Math.round(weight * 100)
              const contrib = Math.round(v01 * weight * 100)
              return (
                <li key={f.key} className="flex items-center gap-2.5">
                  <Icon size={14} className="shrink-0 text-ink-400" aria-hidden />
                  <span className="w-12 shrink-0 text-[12px] text-ink-600">{f.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.round(v01 * 100)}%`, backgroundColor: tierColor(v01) }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums text-navy-900">
                    {contrib}
                    <span className="text-ink-400">/{weightPts}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <p className="mt-3 border-t border-ink-100 pt-2.5 text-[11px] leading-snug text-ink-500">
        {tideNonDiscriminating
          ? 'Score générique : marée plate ici (marnage faible), son poids est réparti sur l’astro et le vent. Identique pour tous ; tes tendances perso vivent dans ton carnet.'
          : 'Score générique (astro 40 % · marée 35 % · vent 25 %), identique pour tous. Tes tendances personnelles (où et quand tombent tes prises) vivent dans ton carnet.'}
      </p>
    </div>
  )
}
