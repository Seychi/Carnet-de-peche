import { dailyMarnage } from '@/lib/conditions/tide'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

// ─── Bande « force des marées » (marnage) sur 7 jours ─────────────────────────
// Honnêteté : on n'invente AUCUN coefficient SHOM. Le « marnage » est l'amplitude
// RÉELLE mesurée entre la plus basse et la plus haute hauteur du jour (Open-Meteo,
// sea_level_height_msl). L'intensité couleur est relative à la semaine affichée
// (le jour le plus fort sert de référence) — on montre la dynamique vives-eaux /
// mortes-eaux sans prétendre à un coefficient officiel.

type DayMarnage = { date: string; marnage: number | null }

function shortDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' })
    .format(d)
    .replace('.', '')
}

type Tier = 'high' | 'mid' | 'low'

function tierOf(ratio: number): Tier {
  if (ratio >= 0.85) return 'high'
  if (ratio >= 0.6) return 'mid'
  return 'low'
}

const TIER_COLOR: Record<Tier, string> = {
  high: 'var(--score-high)',
  mid: 'var(--score-mid)',
  low: 'var(--score-low)',
}

const TIER_LABEL: Record<Tier, string> = {
  high: 'Fort',
  mid: 'Moyen',
  low: 'Faible',
}

export function buildMarnageDays(week: SpotConditions[]): DayMarnage[] {
  return week.map((fc) => ({ date: fc.date, marnage: dailyMarnage(fc.tide.points) }))
}

export default function TideStrengthBand({ days }: { days: DayMarnage[] }) {
  const valid = days.filter((d) => d.marnage != null)
  // Pas assez de données pour une tendance lisible.
  if (valid.length < 3) return null

  const maxMarnage = Math.max(...valid.map((d) => d.marnage!))
  if (maxMarnage <= 0) return null

  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())

  return (
    <div className="rounded-[12px] border border-ink-100 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy-900">Force des marées · 7 jours</h3>
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
          Marnage
        </span>
      </div>

      <div className="flex items-end gap-1.5">
        {days.map((d) => {
          const isToday = d.date === todayKey
          if (d.marnage == null) {
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="h-16 w-full rounded-[6px] bg-ink-50" />
                <span className="font-mono text-[10px] text-ink-300">—</span>
                <span className="text-[10px] capitalize text-ink-400">{shortDay(d.date)}</span>
              </div>
            )
          }
          const ratio = d.marnage / maxMarnage
          const tier = tierOf(ratio)
          const heightPct = Math.max(0.18, ratio) * 100
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-[6px] transition-all"
                  style={{ height: `${heightPct}%`, backgroundColor: TIER_COLOR[tier] }}
                  title={`${TIER_LABEL[tier]} — ${d.marnage.toFixed(2)} m`}
                />
              </div>
              <span className="font-mono text-[11px] font-semibold text-navy-900 tabular-nums">
                {d.marnage.toFixed(1)}
              </span>
              <span
                className={`text-[10px] capitalize ${
                  isToday ? 'font-bold text-teal-700' : 'text-ink-400'
                }`}
              >
                {shortDay(d.date)}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink-500">
        Marnage = amplitude mesurée entre basse et pleine mer (m). Plus il est fort (vives-eaux),
        plus le courant porte ; faible (mortes-eaux), l&apos;eau bouge moins.
      </p>
    </div>
  )
}
