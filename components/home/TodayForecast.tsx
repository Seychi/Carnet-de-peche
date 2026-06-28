import Link from 'next/link'
import { CalendarDays, Sun, Thermometer, Waves } from 'lucide-react'
import { fetchSpotConditions } from '@/lib/conditions/spot-forecast'
import { formatWeatherTime } from '@/lib/conditions/format'
import { getDeptUpcomingWindows } from '@/lib/conditions/dept-window'
import { tideTrendAt } from '@/lib/conditions/tide'
import { getPersonalTendencies } from '@/lib/scoring/personal'
import { getBestGearToday } from '@/lib/scoring/personal/best-gear-today'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { ScoreBreakdown } from '@/components/scoring/ScoreBreakdown'
import { TagData } from '@/components/ui-v2/tag-data'
import { TodayPersonalOverlay } from './TodayPersonalOverlay'
import { CockpitSection } from './home-ui'
import type { QualityLevel } from '@/lib/solunar/types'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

// Heure courante (0-23) en Europe/Paris : sert à dériver la tendance de marée du
// moment depuis les points horaires (mêmes index locaux que SpotConditions.tide).
function currentParisHour(): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false,
  }).format(new Date())
  return parseInt(h, 10) % 24
}

const QUALITY_LABELS: Record<QualityLevel, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très bonne',
  exceptionnelle: 'Exceptionnelle',
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d)
}

// « Aujourd'hui » / « Demain » / « Jeudi 26 » selon la date du créneau.
function fmtWindowDay(iso: string): string {
  const todayK = dayKey(new Date())
  const tomorrowK = dayKey(new Date(Date.now() + 86_400_000))
  const k = dayKey(new Date(iso))
  if (k === todayK) return 'Aujourd’hui'
  if (k === tomorrowK) return 'Demain'
  const s = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtTemp(c: number | null): string | null {
  return c == null ? null : `${Math.round(c)}°C`
}

// Bandeau de conditions COMPLÉMENTAIRE du bandeau instruments (qui porte déjà
// PM/BM, vent, houle) : ici température eau/air + lever/coucher — pas de doublon.
function ConditionsStrip({ conditions }: { conditions: SpotConditions }) {
  const water = fmtTemp(conditions.waves.water_temp_c)
  const air =
    conditions.weather.min_temp_c != null && conditions.weather.max_temp_c != null
      ? `${Math.round(conditions.weather.min_temp_c)}–${Math.round(conditions.weather.max_temp_c)}°C`
      : fmtTemp(conditions.weather.air_temp_c)
  const sunrise = formatWeatherTime(conditions.weather.sunrise)
  const sunset = formatWeatherTime(conditions.weather.sunset)

  const items: { icon: React.ReactNode; label: string; value: string }[] = []
  if (water) items.push({ icon: <Waves size={13} className="text-teal-600" />, label: 'Eau', value: water })
  if (air) items.push({ icon: <Thermometer size={13} className="text-coral-500" />, label: 'Air', value: air })
  if (sunrise && sunset)
    items.push({ icon: <Sun size={13} className="text-gold-500" />, label: 'Soleil', value: `${sunrise}–${sunset}` })

  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[13px] text-ink-600">
          {it.icon}
          <span className="text-ink-400">{it.label}</span>
          <span className="font-mono font-semibold text-navy-900">{it.value}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Sections « Maintenant » + « Cette semaine » du cockpit. Un SEUL pipeline solunar
 * (getDeptUpcomingWindows) + un fetch conditions (cache weather_cache partagé avec le
 * bandeau instruments → aucun appel Open-Meteo en plus). Score AFFICHÉ = solunar
 * GÉNÉRIQUE (identique pour tous) ; le perso est posé en overlay DESCRIPTIF honnête
 * par-dessus (jamais un chiffre 0-100 perso inventé).
 */
export async function TodayForecast({
  dept,
  lat,
  lng,
}: {
  dept: string
  lat: number
  lng: number
}) {
  const [conditions, windows, tendencies] = await Promise.all([
    fetchSpotConditions(lat, lng).catch(() => null),
    getDeptUpcomingWindows(dept, 4).catch(() => []),
    getPersonalTendencies().catch(() => null),
  ])

  const headline = windows[0] ?? null
  const week = windows.slice(1, 4)

  // WS B — leurre dominant POUR les conditions du jour (marée + vent), DESCRIPTIF.
  // On réutilise les conditions DÉJÀ chargées (aucun 2e fetch) : la marée du moment
  // se dérive des points horaires, le vent de wind_speed_kmh. null si conditions
  // incomplètes ou pas assez de prises dans ces conditions → l'overlay n'affiche rien.
  const todayTide = conditions
    ? tideTrendAt(conditions.tide.points, currentParisHour())
    : null
  const bestGear = todayTide
    ? await getBestGearToday({
        tideState: todayTide,
        windSpeedKmh: conditions?.weather.wind_speed_kmh ?? null,
      }).catch(() => null)
    : null

  return (
    <>
      {/* ── Maintenant ──────────────────────────────────────────────────────── */}
      <CockpitSection title="Maintenant" icon={<Waves size={13} aria-hidden="true" />}>
        {conditions ? <ConditionsStrip conditions={conditions} /> : null}

        {headline ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-4 rounded-[14px] border border-sand-200 bg-sand-50/60 p-4 shadow-[inset_3px_0_0_var(--teal-500)]">
              <ScoreRing value={headline.score} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-navy-900">
                  {fmtWindowDay(headline.startTimeISO)}, ton prochain créneau.
                </p>
                <TagData className="mt-0.5 block">
                  {headline.startLocal} → {headline.endLocal} · {QUALITY_LABELS[headline.quality]}
                </TagData>
              </div>
              <Link
                href="/carte"
                className="hidden shrink-0 items-center rounded-lg bg-navy-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-800 sm:inline-flex"
              >
                Voir où
              </Link>
            </div>

            <ScoreBreakdown window={headline} title="De quoi est fait ce créneau" />

            {/* Overlay perso DESCRIPTIF (gratuit) — compact et DISTINCT de la carte
                « Tes tendances » du carnet (pas de doublon inter-pages). États
                vide/dégradé/plein honnêtes ; jamais un score perso 0-100 inventé. Le
                détail complet (+ upsell alerte proactive) vit sur /carnet. */}
            {tendencies ? <TodayPersonalOverlay data={tendencies} bestGear={bestGear} /> : null}
          </div>
        ) : (
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">
            Créneaux indisponibles pour le moment (données météo momentanément
            injoignables). Réessaie plus tard.
          </p>
        )}
      </CockpitSection>

      {/* ── Cette semaine ───────────────────────────────────────────────────── */}
      {week.length > 0 ? (
        <CockpitSection
          title="Cette semaine"
          icon={<CalendarDays size={13} aria-hidden="true" />}
          action={{ href: '/carte', label: 'Voir la carte' }}
        >
          <ul className="flex flex-col divide-y divide-sand-100">
            {week.map((w) => (
              <li key={w.startTimeISO} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <ScoreRing value={w.score} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-navy-900">{fmtWindowDay(w.startTimeISO)}</p>
                  <TagData className="block">
                    {w.startLocal} → {w.endLocal} · {QUALITY_LABELS[w.quality]}
                  </TagData>
                </div>
              </li>
            ))}
          </ul>
        </CockpitSection>
      ) : null}
    </>
  )
}
