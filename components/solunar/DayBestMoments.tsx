'use client'

import { CalendarX, Moon, Sun } from 'lucide-react'
import type { DailyForecast, FishingWindow } from '@/lib/solunar/types'
import { BestMomentCard } from './BestMomentCard'
import { ScoreBreakdown } from '@/components/scoring/ScoreBreakdown'
import { QUALITY_LABELS as QUALITY_LABEL, QUALITY_BADGE_CLS } from '@/lib/solunar/quality-style'

function formatDayHeader(dateStr: string): string {
  // dateStr = "2026-05-19" → "Mardi 19 mai"
  // On parse en UTC midi pour éviter les décalages de timezone
  const d = new Date(`${dateStr}T12:00:00Z`)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(d)
}

function isWindowCurrent(w: FishingWindow): boolean {
  const now = Date.now()
  return now >= new Date(w.startTimeISO).getTime() && now <= new Date(w.endTimeISO).getTime()
}

function extractMoonTimes(daily: DailyForecast): { rise?: string; set?: string } {
  // On cherche les events moonrise / moonset dans les centerEvents des windows
  const rise = daily.windows.find(w => w.centerEvent.type === 'moonrise')?.centerEvent.localTime
  const set  = daily.windows.find(w => w.centerEvent.type === 'moonset')?.centerEvent.localTime
  return { rise, set }
}

// ─── Composant ───────────────────────────────────────────────────────────────

type DayBestMomentsProps = {
  daily: DailyForecast
  showMoonInfo?: boolean
}

export function DayBestMoments({ daily, showMoonInfo = true }: DayBestMomentsProps) {
  const dayLabel = formatDayHeader(daily.date)
  const moonTimes = showMoonInfo ? extractMoonTimes(daily) : {}
  const illuminationPct = Math.round(daily.moonIllumination * 100)
  const bestWindow =
    daily.windows.length > 0
      ? daily.windows.reduce((a, b) => (b.score > a.score ? b : a))
      : null

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold capitalize text-navy-900">
          {dayLabel}
        </h3>
        <span
          className={[
            'rounded-full px-3 py-0.5 text-[12px] font-semibold',
            QUALITY_BADGE_CLS[daily.dayQuality],
          ].join(' ')}
        >
          {QUALITY_LABEL[daily.dayQuality]}
        </span>
      </div>

      {/* Sub-header lunaire */}
      {showMoonInfo && (
        <p className="text-[12px] text-ink-500 -mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1">
            <Moon size={12} className="text-ink-400" aria-hidden="true" />
            {daily.moonPhaseLabel}
          </span>
          <span className="text-ink-500" aria-hidden="true">·</span>
          <span><span className="font-mono">{illuminationPct}%</span> illuminée</span>
          {moonTimes.rise && (
            <>
              <span className="text-ink-500" aria-hidden="true">·</span>
              <span>Lever <span className="font-mono">{moonTimes.rise}</span></span>
            </>
          )}
          {moonTimes.set && (
            <>
              <span className="text-ink-500" aria-hidden="true">·</span>
              <span>Coucher <span className="font-mono">{moonTimes.set}</span></span>
            </>
          )}
          <span className="text-ink-500" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Sun size={12} className="text-gold-500" aria-hidden="true" />
            <span className="font-mono">{daily.sunrise} – {daily.sunset}</span>
          </span>
        </p>
      )}

      {/* Liste des fenêtres */}
      {daily.windows.length > 0 ? (
        <>
          <ul className="flex flex-col gap-2 md:gap-3">
            {daily.windows.map((w, i) => (
              <li key={i}>
                <BestMomentCard
                  window={w}
                  isCurrent={isWindowCurrent(w)}
                />
              </li>
            ))}
          </ul>
          {bestWindow && (
            <ScoreBreakdown
              window={bestWindow}
              title="Décomposition du meilleur créneau"
              className="mt-1"
            />
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <CalendarX size={28} className="text-ink-300" />
          <p className="text-[14px] font-medium text-ink-700">
            Pas de créneau optimal aujourd&apos;hui
          </p>
          <p className="text-[12px] text-ink-500">
            Reviens demain, les conditions s&apos;améliorent.
          </p>
        </div>
      )}
    </section>
  )
}
