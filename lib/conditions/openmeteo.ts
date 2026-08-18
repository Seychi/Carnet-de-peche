import ngeohash from 'ngeohash'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { tideTrendAt, dailyMarnage } from './tide'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConditionsSnapshot = {
  fetched_at: string
  source: 'open-meteo'
  air_temperature_c: number | null
  water_temperature_c: number | null
  wind_speed_kmh: number | null
  wind_direction_deg: number | null
  pressure_hpa: number | null
  cloud_cover_pct: number | null
  precipitation_mm: number | null
  wave_height_m: number | null
  wave_period_s: number | null
  wave_direction_deg: number | null
  // Marée dérivée des hauteurs horaires Open-Meteo (sea_level_height_msl) au log
  // (sprint 22). tide_coefficient reste null : on n'invente AUCUN coef SHOM —
  // l'info honnête est le MARNAGE mesuré (tide_range_m, amplitude PM-BM en mètres).
  tide_state: 'rising' | 'falling' | 'slack' | null
  tide_range_m: number | null
  tide_coefficient: number | null
  next_high_tide_at: string | null
  next_low_tide_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Clé de cache : geohash précision 5 (≈ 4,9 km × 4,9 km) + heure UTC arrondie */
export function cacheKey(lat: number, lng: number, datetime: Date): string {
  const hash = ngeohash.encode(lat, lng, 5)
  const hourUtc = datetime.toISOString().slice(0, 13) // "2026-05-13T14"
  return `${hash}_${hourUtc}`
}

/** Trouve l'index de l'heure la plus proche dans un tableau ISO de timestamps */
function closestHourIndex(times: string[], target: Date): number {
  const targetMs = target.getTime()
  let best = 0
  let bestDiff = Infinity
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - targetMs)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

// ─── API calls ────────────────────────────────────────────────────────────────

type MarineHourly = {
  time: string[]
  wave_height: (number | null)[]
  wave_direction: (number | null)[]
  wave_period: (number | null)[]
  sea_surface_temperature: (number | null)[]
  sea_level_height_msl: (number | null)[]
}

type ForecastHourly = {
  time: string[]
  temperature_2m: (number | null)[]
  windspeed_10m: (number | null)[]
  winddirection_10m: (number | null)[]
  pressure_msl: (number | null)[]
  cloud_cover: (number | null)[]
  precipitation: (number | null)[]
}

async function fetchMarine(
  lat: number,
  lng: number,
  date: string
): Promise<MarineHourly | null> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl` +
    `&timezone=Europe%2FParis&start_date=${date}&end_date=${date}`

  try {
    // `revalidate: 0` est LEGITIME ici, contrairement a lib/conditions/spot-forecast.ts :
    // ce module n'est appele que depuis lib/catches/actions.ts (server action, donc
    // toujours dynamique), jamais depuis une page ISR. Ne pas « corriger » par
    // symetrie avec le fix de l'issue JAVASCRIPT-NEXTJS-1P — verifie le 18/08/2026.
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.hourly as MarineHourly
  } catch {
    return null
  }
}

async function fetchForecast(
  lat: number,
  lng: number,
  date: string
): Promise<ForecastHourly | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,windspeed_10m,winddirection_10m,pressure_msl,cloud_cover,precipitation` +
    `&timezone=Europe%2FParis&start_date=${date}&end_date=${date}`

  try {
    // `revalidate: 0` est LEGITIME ici, contrairement a lib/conditions/spot-forecast.ts :
    // ce module n'est appele que depuis lib/catches/actions.ts (server action, donc
    // toujours dynamique), jamais depuis une page ISR. Ne pas « corriger » par
    // symetrie avec le fix de l'issue JAVASCRIPT-NEXTJS-1P — verifie le 18/08/2026.
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.hourly as ForecastHourly
  } catch {
    return null
  }
}

// ─── Cache Supabase ───────────────────────────────────────────────────────────

// Lecture via le client de session : la policy RLS SELECT de weather_cache est
// ouverte (anon + authenticated) → un visiteur anonyme bénéficie aussi du cache hit.
async function readCache(key: string): Promise<ConditionsSnapshot | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weather_cache')
    .select('payload')
    .eq('cache_key', key)
    .gt('fetched_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .maybeSingle()

  if (error || !data) return null
  return data.payload as ConditionsSnapshot
}

// Écriture via le client SERVICE-ROLE (bypass RLS) : weather_cache n'a aucune policy
// INSERT/UPDATE → seul le service-role écrit (pas d'empoisonnement de cache client).
// onConflict:'cache_key' = la PK (non partielle) → l'upsert matche enfin une contrainte.
// Best-effort : un échec d'écriture (clé service manquante, réseau) ne doit JAMAIS
// casser le fetch conditions → on avale l'erreur (le cache est opportuniste).
async function writeCache(key: string, snapshot: ConditionsSnapshot): Promise<void> {
  try {
    const admin = createServiceRoleClient()
    await admin.from('weather_cache').upsert(
      { cache_key: key, payload: snapshot, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' }
    )
  } catch (err) {
    console.warn('[conditions] writeCache weather_cache échec (non bloquant) :', err)
  }
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export async function fetchConditionsAt(
  lat: number,
  lng: number,
  datetime: Date
): Promise<ConditionsSnapshot> {
  const key = cacheKey(lat, lng, datetime)

  const cached = await readCache(key)
  if (cached) return cached

  const date = toDateStr(datetime)
  const [marine, forecast] = await Promise.all([
    fetchMarine(lat, lng, date),
    fetchForecast(lat, lng, date),
  ])

  let waveHeight: number | null = null
  let waveDirection: number | null = null
  let wavePeriod: number | null = null
  let waterTemp: number | null = null

  let tideState: 'rising' | 'falling' | 'slack' | null = null
  let tideRangeM: number | null = null

  if (marine) {
    const idx = closestHourIndex(marine.time, datetime)
    waveHeight = marine.wave_height[idx] ?? null
    waveDirection = marine.wave_direction[idx] ?? null
    wavePeriod = marine.wave_period[idx] ?? null
    waterTemp = marine.sea_surface_temperature[idx] ?? null

    // Marée dérivée des hauteurs horaires (sprint 22) : points indexés par heure
    // LOCALE (API appelée en timezone=Europe/Paris) → tendance à l'heure locale de
    // la prise + marnage du jour. Aucun coefficient inventé.
    const heights = marine.sea_level_height_msl
    if (heights) {
      const tidePoints = marine.time
        .map((t, i) => ({ hour: parseInt(t.slice(11, 13), 10), height_m: heights[i] }))
        .filter((p): p is { hour: number; height_m: number } => Number.isFinite(p.height_m))
      if (tidePoints.length >= 2) {
        const localHour =
          parseInt(
            new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Europe/Paris',
              hour: '2-digit',
              hour12: false,
            }).format(datetime),
            10,
          ) % 24
        tideState = tideTrendAt(tidePoints, localHour)
        tideRangeM = dailyMarnage(tidePoints)
      }
    }
  }

  let airTemp: number | null = null
  let windSpeed: number | null = null
  let windDir: number | null = null
  let pressure: number | null = null
  let cloudCover: number | null = null
  let precipitation: number | null = null

  if (forecast) {
    const idx = closestHourIndex(forecast.time, datetime)
    airTemp = forecast.temperature_2m[idx] ?? null
    windSpeed = forecast.windspeed_10m[idx] ?? null
    windDir = forecast.winddirection_10m[idx] ?? null
    pressure = forecast.pressure_msl[idx] ?? null
    cloudCover = forecast.cloud_cover[idx] ?? null
    precipitation = forecast.precipitation[idx] ?? null
  }

  const snapshot: ConditionsSnapshot = {
    fetched_at: new Date().toISOString(),
    source: 'open-meteo',
    air_temperature_c: airTemp,
    water_temperature_c: waterTemp,
    wind_speed_kmh: windSpeed,
    wind_direction_deg: windDir,
    pressure_hpa: pressure,
    cloud_cover_pct: cloudCover,
    precipitation_mm: precipitation,
    wave_height_m: waveHeight,
    wave_period_s: wavePeriod,
    wave_direction_deg: waveDirection,
    tide_state: tideState,
    tide_range_m: tideRangeM,
    tide_coefficient: null,
    next_high_tide_at: null,
    next_low_tide_at: null,
  }

  await writeCache(key, snapshot)
  return snapshot
}
