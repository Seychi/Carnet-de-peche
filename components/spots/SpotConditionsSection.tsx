import { ExternalLink, Waves, Sunrise, Sunset } from 'lucide-react'
import TideChart from '@/components/conditions/TideChartLazy'
import WeatherGrid from '@/components/conditions/WeatherGrid'
import WavesCard from '@/components/conditions/WavesCard'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

type Props = {
  spotName: string
  lat: number
  lng: number
  conditions: SpotConditions
}

function formatDate(isoDate: string): string {
  try {
    const [year, month, day] = isoDate.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return isoDate
  }
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function currentHourParis(): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const h = parts.find(p => p.type === 'hour')?.value ?? '0'
  return parseInt(h, 10) % 24
}

export default function SpotConditionsSection({ spotName, lat, lng, conditions }: Props) {
  const windyUrl = `https://www.windy.com/?${lat.toFixed(4)},${lng.toFixed(4)},10`
  const dateLabel = formatDate(conditions.date)
  const updatedAt = formatTime(conditions.fetched_at)
  const currentHour = currentHourParis()
  const hasTide = conditions.tide.points.length > 0

  return (
    <section className="bg-white rounded-[18px] border border-sand-200 p-5 md:p-7">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-navy-900 text-xl leading-tight">
            Conditions à {spotName}
          </h2>
          <p className="text-sm text-ink-500 mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <a
          href={windyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 text-xs text-ink-500 hover:text-teal-700 border border-ink-200 hover:border-teal-300 px-3 py-1.5 rounded-full transition-colors"
        >
          <ExternalLink size={12} />
          Windy
        </a>
      </div>

      {/* Marées */}
      {hasTide ? (
        <div className="mb-6">
          <TideChart
            points={conditions.tide.points}
            extrema={conditions.tide.extrema}
            currentHourIdx={currentHour}
          />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-ink-50 rounded-[10px]">
          <Waves size={18} className="text-ink-400" aria-hidden="true" />
          <p className="text-sm text-ink-500">
            Données de marée non disponibles pour ce spot
          </p>
        </div>
      )}

      {/* Météo + Vagues */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 mb-6">
        <WeatherGrid weather={conditions.weather} />
        <WavesCard waves={conditions.waves} swell={conditions.swell} />
      </div>

      {/* Astronomie */}
      {(conditions.weather.sunrise || conditions.weather.sunset) && (
        <div className="flex items-center gap-6 px-4 py-3 bg-amber-50 rounded-[10px] mb-4">
          {conditions.weather.sunrise && (
            <div className="flex items-center gap-2">
              <Sunrise size={18} className="text-gold-500" aria-hidden="true" />
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">Lever</p>
                <p className="font-mono text-sm font-semibold text-amber-900">
                  {conditions.weather.sunrise.match(/T(\d{2}:\d{2})/)?.[1] ?? '—'}
                </p>
              </div>
            </div>
          )}
          {conditions.weather.sunset && (
            <div className="flex items-center gap-2">
              <Sunset size={18} className="text-gold-500" aria-hidden="true" />
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">Coucher</p>
                <p className="font-mono text-sm font-semibold text-amber-900">
                  {conditions.weather.sunset.match(/T(\d{2}:\d{2})/)?.[1] ?? '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="text-[11px] text-ink-500 text-right">
        Mis à jour à {updatedAt} · Source Open-Meteo
      </p>
    </section>
  )
}
