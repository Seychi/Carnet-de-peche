import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchSpotConditions, fetchSpotForecastWeek } from '@/lib/conditions/spot-forecast'
import { computeWeeklyForecast } from '@/lib/solunar'
import { getNextBestWindow } from '@/lib/solunar/next-window'
import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { InstrumentsBar, type InstrumentsData } from '@/components/ui-v2/instruments-bar'

// Rose des vents 8 points, convention pêcheur (« vent de NO »).
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const

function compass(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8]
}

function fmtHour(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fmtTimeISO(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
}

function parisHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Paris',
    }).format(new Date()),
    10,
  ) % 24
}

// Prochain créneau solunar du point de référence du département.
// Même pipeline que getSpotNextWindow (app/actions/solunar.ts), caché 1h.
async function nextWindowSlot(dept: string, lat: number, lng: number): Promise<string | null> {
  const hourKey = Math.floor(Date.now() / 3_600_000).toString()
  try {
    const window = await unstable_cache(
      async () => {
        const week = await fetchSpotForecastWeek(lat, lng)
        if (!week.length) return null
        const weekly = await computeWeeklyForecast(new Date(), lat, lng, week)
        return getNextBestWindow(weekly)
      },
      ['dept-next-window', dept, hourKey],
      { revalidate: 3600 },
    )()
    if (!window) return null
    return `${fmtTimeISO(window.startTimeISO)} → ${fmtTimeISO(window.endTimeISO)}`
  } catch {
    return null
  }
}

/**
 * Bandeau instruments branché sur le département principal du profil —
 * « l'app sait toujours où en est la mer ». Réutilise les fetchs existants
 * (Open-Meteo via fetchSpotConditions + solunar), aucune nouvelle API.
 * Tolérant : sans profil, sans dépt côtier ou sans données → rien.
 */
export async function AppInstruments() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()

  const dept = profile?.home_department?.trim()
  if (!dept) return null
  const coords = DEPARTMENT_SEA_COORDS[dept]
  if (!coords) return null

  let data: InstrumentsData
  try {
    const [conditions, slot] = await Promise.all([
      fetchSpotConditions(coords.lat, coords.lng),
      nextWindowSlot(dept, coords.lat, coords.lng),
    ])

    const hour = parisHour()
    const upcoming = conditions.tide.extrema.filter((e) => e.hour > hour)
    const nextHigh = upcoming.find((e) => e.type === 'high')
    const nextLow = upcoming.find((e) => e.type === 'low')
    // Marée montante si le prochain extremum est une PM.
    const direction =
      upcoming.length > 0 ? (upcoming[0].type === 'high' ? 'up' : 'down') : null

    const w = conditions.weather
    const wind =
      w.wind_speed_kmh != null
        ? `${w.wind_direction_deg != null ? `${compass(w.wind_direction_deg)} ` : ''}${Math.round(w.wind_speed_kmh)}`
        : null

    const swell =
      conditions.swell.height_m != null
        ? `${conditions.swell.height_m.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m${
            conditions.swell.period_s != null ? ` · ${Math.round(conditions.swell.period_s)} s` : ''
          }`
        : null

    data = {
      deptCode: dept,
      deptLabel: DEPARTMENT_LABELS[dept] ?? null,
      pm: nextHigh ? fmtHour(nextHigh.hour) : null,
      bm: nextLow ? fmtHour(nextLow.hour) : null,
      tideDirection: direction,
      wind,
      swell,
      slot,
    }
  } catch {
    // Open-Meteo indisponible → bandeau minimal (jamais de crash du layout).
    data = { deptCode: dept, deptLabel: DEPARTMENT_LABELS[dept] ?? null }
  }

  return <InstrumentsBar data={data} />
}
