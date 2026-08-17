import { ExternalLink, Waves, Sunrise, Sunset } from 'lucide-react'
import TideChart from '@/components/conditions/TideChartLazy'
import TideStrengthBand, { buildMarnageDays } from '@/components/conditions/TideStrengthBand'
import WeatherGrid from '@/components/conditions/WeatherGrid'
import WavesCard from '@/components/conditions/WavesCard'
import { formatWeatherTime } from '@/lib/conditions/format'
import { getTideCalibration } from '@/lib/conditions/tide-calibration'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

type Props = {
  spotName: string
  /** Coordonnée PUBLIQUE (floutée, arrondie) : elle finit dans le HTML via `windyUrl`. */
  lat: number
  lng: number
  conditions: SpotConditions
  /** Prévisions 7 jours — alimente la bande « force des marées » (marnage réel). */
  forecastWeek?: SpotConditions[]
  /**
   * Sprint 84, Bloc 3 : la fiche spot est statique et son HTML est celui d'un
   * visiteur sans compte, qui n'a pas droit à la bande 7 jours. Un connecté la
   * reçoit après hydratation : la page passe ici un composant CLIENT qui la monte
   * quand `/api/spots/[slug]/viewer` a répondu. `forecastWeek` reste supporté pour
   * les appelants qui rendent la bande côté serveur.
   */
  weekBandSlot?: React.ReactNode
  /** Département du spot : sert à caler les heures de PM/BM sur le port de référence. */
  department: string
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

export default async function SpotConditionsSection({ spotName, lat, lng, conditions, forecastWeek, weekBandSlot, department }: Props) {
  const windyUrl = `https://www.windy.com/?${lat.toFixed(4)},${lng.toFixed(4)},10`
  const dateLabel = formatDate(conditions.date)
  const updatedAt = formatTime(conditions.fetched_at)
  const currentHour = currentHourParis()
  const hasTide = conditions.tide.points.length > 0
  const marnageDays = forecastWeek && forecastWeek.length > 0 ? buildMarnageDays(forecastWeek) : []

  // Offset de calibration marée du port de référence du spot (sprint 38) : on cale
  // les heures de PM/BM affichées sur le SHOM. 0 si façade non auditée (ex. Méditerranée).
  const tideCal = await getTideCalibration(department)
  const tideOffsetMinutes = tideCal?.offsetMinutes ?? 0

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
        <div className="mb-6 flex flex-col gap-5">
          <TideChart
            points={conditions.tide.points}
            extrema={conditions.tide.extrema}
            currentHourIdx={currentHour}
            offsetMinutes={tideOffsetMinutes}
          />
          {marnageDays.length > 0 ? <TideStrengthBand days={marnageDays} /> : weekBandSlot}
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
        <div className="flex items-center gap-6 px-4 py-3 bg-gold-500/10 rounded-[10px] mb-4">
          {conditions.weather.sunrise && (
            <div className="flex items-center gap-2">
              <Sunrise size={18} className="text-gold-500" aria-hidden="true" />
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-700">Lever</p>
                <p className="font-mono text-sm font-semibold text-navy-900">
                  {formatWeatherTime(conditions.weather.sunrise) ?? '—'}
                </p>
              </div>
            </div>
          )}
          {conditions.weather.sunset && (
            <div className="flex items-center gap-2">
              <Sunset size={18} className="text-gold-500" aria-hidden="true" />
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-700">Coucher</p>
                <p className="font-mono text-sm font-semibold text-navy-900">
                  {formatWeatherTime(conditions.weather.sunset) ?? '—'}
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
