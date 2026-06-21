import { Moon, Waves, Wind } from 'lucide-react'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { SOLUNAR_CONFIG } from '@/lib/solunar/config'
import type { FishingWindow } from '@/lib/solunar/types'

// ─── Décomposition du score 0-100 en ses 3 facteurs (générique, honnête) ──────
// Aucune donnée inventée : on lit directement `window.factors` (déjà calculé par
// lib/solunar/scoring.ts) et les poids 40/35/25 du barème. La contribution d'un
// facteur = valeur normalisée (0-1) × poids × 100 → la somme ≈ le score affiché.

const FACTORS = [
  { key: 'solunar', label: 'Astro', icon: Moon, weight: SOLUNAR_CONFIG.WEIGHTS.solunar },
  { key: 'tide', label: 'Marée', icon: Waves, weight: SOLUNAR_CONFIG.WEIGHTS.tide },
  { key: 'wind', label: 'Vent', icon: Wind, weight: SOLUNAR_CONFIG.WEIGHTS.wind },
] as const

function tierColor(v01: number): string {
  if (v01 >= 0.75) return 'var(--score-high)'
  if (v01 >= 0.5) return 'var(--score-mid)'
  return 'var(--score-low)'
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
              const v01 = w.factors[f.key]
              const weightPts = Math.round(f.weight * 100)
              const contrib = Math.round(v01 * f.weight * 100)
              const Icon = f.icon
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
        Score générique (astro 40 % · marée 35 % · vent 25 %) — identique pour tous. Tes tendances
        personnelles (où et quand tombent tes prises) vivent dans ton carnet.
      </p>
    </div>
  )
}
