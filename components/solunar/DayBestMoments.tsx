'use client'

import { CalendarX, Moon, Sun } from 'lucide-react'
import type { DailyForecast, FishingWindow, QualityLevel } from '@/lib/solunar/types'
import { BestMomentCard } from './BestMomentCard'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUALITY_LABEL: Record<QualityLevel, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très Bonne',
  exceptionnelle: 'Exceptionnelle',
}

const QUALITY_BADGE_CLS: Record<QualityLevel, string> = {
  faible:         'bg-gray-100 text-gray-600', // gray-500 sur gray-100 = 4.39:1 < 4.5
  moyenne:        'bg-amber-100 text-amber-700',
  bonne:          'bg-lime-100 text-lime-700',
  tres_bonne:     'bg-teal-100 text-teal-700',
  exceptionnelle: 'bg-emerald-100 text-emerald-700',
}

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
          <span>{illuminationPct}% illuminée</span>
          {moonTimes.rise && (
            <>
              <span className="text-ink-500" aria-hidden="true">·</span>
              <span>Lever {moonTimes.rise}</span>
            </>
          )}
          {moonTimes.set && (
            <>
              <span className="text-ink-500" aria-hidden="true">·</span>
              <span>Coucher {moonTimes.set}</span>
            </>
          )}
          <span className="text-ink-500" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Sun size={12} className="text-gold-500" aria-hidden="true" />
            {daily.sunrise} – {daily.sunset}
          </span>
        </p>
      )}

      {/* Liste des fenêtres */}
      {daily.windows.length > 0 ? (
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
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <CalendarX size={28} className="text-ink-300" />
          <p className="text-[14px] font-medium text-ink-700">
            Pas de créneau optimal aujourd&apos;hui
          </p>
          <p className="text-[12px] text-ink-500">
            Reviens demain — les conditions s&apos;améliorent.
          </p>
        </div>
      )}
    </section>
  )
}
