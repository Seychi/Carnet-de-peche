'use client'

import { useRef, useState, useCallback, useEffect, type ElementType, type KeyboardEvent } from 'react'
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Zap } from 'lucide-react'
import type { DailyForecast, QualityLevel } from '@/lib/solunar/types'
import { wmoIconName, type WeatherIconName } from '@/lib/conditions/weather-codes'

// ─── Config qualité ───────────────────────────────────────────────────────────

const QUALITY_CONFIG: Record<QualityLevel, { label: string; badgeCls: string; textCls: string }> = {
  faible:         { label: 'Faible',         badgeCls: 'bg-gray-400 text-white',    textCls: 'text-gray-500'    },
  moyenne:        { label: 'Moyenne',        badgeCls: 'bg-amber-500 text-white',   textCls: 'text-amber-600'   },
  bonne:          { label: 'Bonne',          badgeCls: 'bg-lime-500 text-white',    textCls: 'text-lime-600'    },
  tres_bonne:     { label: 'Très Bonne',     badgeCls: 'bg-teal-500 text-white',    textCls: 'text-teal-600'    },
  exceptionnelle: { label: 'Exceptionnelle', badgeCls: 'bg-emerald-600 text-white', textCls: 'text-emerald-700' },
}

const WEATHER_ICON_MAP: Record<WeatherIconName, ElementType> = {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Zap,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateParts(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('fr-FR', { ...opts, timeZone: 'Europe/Paris' }).format(d)
  return {
    weekday: fmt({ weekday: 'short' }),       // "mer."
    day:     fmt({ day: 'numeric' }),          // "20"
    month:   fmt({ month: 'short' }),          // "mai"
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type WeeklyCalendarProps = {
  weekly: DailyForecast[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
  // WMO code par date (ex: { "2026-05-20": 1 }) → icône Lucide auto
  weatherCodes?: Record<string, number>
  // Marées haute/basse par date — optionnel, non dispo en v1
  tidesByDate?: Record<string, { high?: string; low?: string }>
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function WeeklyCalendar({
  weekly,
  selectedDate,
  onSelectDate,
  weatherCodes,
  tidesByDate,
}: WeeklyCalendarProps) {
  const [internalDate, setInternalDate] = useState(weekly[0]?.date ?? '')
  const activeDate = selectedDate ?? internalDate
  const scrollRef = useRef<HTMLUListElement>(null)

  const handleSelect = useCallback(
    (date: string, index: number) => {
      setInternalDate(date)
      onSelectDate?.(date)
      // Scroll la card dans le viewport (comportement snap mobile)
      const li = scrollRef.current?.children[index] as HTMLElement | undefined
      li?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
    },
    [onSelectDate]
  )

  // Navigation clavier : flèches gauche/droite
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const idx = weekly.findIndex(d => d.date === activeDate)
      if (e.key === 'ArrowRight' && idx < weekly.length - 1) {
        e.preventDefault()
        handleSelect(weekly[idx + 1].date, idx + 1)
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault()
        handleSelect(weekly[idx - 1].date, idx - 1)
      }
    },
    [weekly, activeDate, handleSelect]
  )

  // Sync si le parent met à jour selectedDate depuis l'extérieur
  useEffect(() => {
    if (selectedDate) setInternalDate(selectedDate) // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedDate])

  const activeIndex = weekly.findIndex(d => d.date === activeDate)

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Calendrier 7 jours"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
    >
      {/* Carousel / grid */}
      <ul
        ref={scrollRef}
        className={[
          'flex gap-2',
          // Mobile : scroll horizontal avec snap
          'overflow-x-auto scroll-smooth snap-x snap-mandatory',
          'scrollbar-hide pb-1',
          // Desktop : 7 colonnes égales sans scroll
          'md:grid md:grid-cols-7 md:overflow-x-visible',
        ].join(' ')}
      >
        {weekly.map((daily, i) => {
          const { weekday, day, month } = formatDateParts(daily.date)
          const cfg = QUALITY_CONFIG[daily.dayQuality]
          const wmoCode = weatherCodes?.[daily.date]
          const iconName = wmoCode != null ? wmoIconName(wmoCode) : null
          const WeatherIcon = iconName ? WEATHER_ICON_MAP[iconName] : null
          const tides = tidesByDate?.[daily.date]
          const isSelected = daily.date === activeDate

          return (
            <li
              key={daily.date}
              className="shrink-0 snap-start w-[110px] md:w-auto"
            >
              <button
                type="button"
                onClick={() => handleSelect(daily.date, i)}
                role="option"
                aria-selected={isSelected}
                aria-label={`${weekday} ${day} ${month}, score ${daily.dayScore}, ${cfg.label}`}
                className={[
                  'w-full flex flex-col items-center gap-1 rounded-[14px] border px-2 py-3',
                  'text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                  isSelected
                    ? 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-500/30'
                    : 'border-slate-100 bg-white hover:border-teal-200',
                ].join(' ')}
              >
                {/* Jour + date */}
                <span className="text-[11px] font-medium capitalize text-ink-500">
                  {weekday}
                </span>
                <span className="text-[22px] font-bold leading-none text-navy-900 tabular-nums">
                  {day}
                </span>
                <span className="text-[11px] text-ink-400 capitalize">
                  {month}
                </span>

                {/* Icône météo */}
                {WeatherIcon ? (
                  <WeatherIcon
                    size={18}
                    className="text-ink-400 mt-0.5"
                    aria-hidden
                  />
                ) : (
                  <span className="h-[18px] mt-0.5" /> /* spacer si pas d'icône */
                )}

                {/* Badge score */}
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold mt-0.5',
                    cfg.badgeCls,
                  ].join(' ')}
                >
                  {daily.dayScore}
                </div>

                {/* Label qualitatif */}
                <span className={`text-[10px] font-semibold leading-tight ${cfg.textCls}`}>
                  {cfg.label}
                </span>

                {/* Marées (si dispo) */}
                {tides && (tides.high || tides.low) && (
                  <div className="mt-0.5 flex flex-col items-center gap-0.5 text-[10px] text-ink-400">
                    {tides.high && <span>↑ {tides.high}</span>}
                    {tides.low  && <span>↓ {tides.low}</span>}
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Dots indicators — mobile uniquement */}
      {weekly.length > 1 && (
        <div className="flex justify-center gap-1.5 md:hidden" aria-hidden>
          {weekly.map((d, i) => (
            <button
              key={d.date}
              type="button"
              tabIndex={-1}
              onClick={() => handleSelect(d.date, i)}
              className={[
                'rounded-full transition-all duration-200',
                i === activeIndex
                  ? 'w-4 h-1.5 bg-teal-500'
                  : 'w-1.5 h-1.5 bg-slate-200',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
