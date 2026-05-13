import ngeohash from 'ngeohash'
import { createClient } from '@/lib/supabase/server'

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
  // Marées reportées au sprint 7 (WorldTides) — toujours null en sprint 3
  tide_state: 'rising' | 'falling' | 'high' | 'low' | null
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
    `&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature` +
    `&timezone=Europe%2FParis&start_date=${date}&end_date=${date}`

  try {
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
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.hourly as ForecastHourly
  } catch {
    return null
  }
}

// ─── Cache Supabase ───────────────────────────────────────────────────────────

async function readCache(key: string): Promise<ConditionsSnapshot | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conditions_cache')
    .select('payload')
    .eq('cache_key', key)
    .gt('fetched_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .maybeSingle()

  if (error || !data) return null
  return data.payload as ConditionsSnapshot
}

async function writeCache(key: string, snapshot: ConditionsSnapshot): Promise<void> {
  const supabase = await createClient()
  await supabase.from('conditions_cache').upsert(
    { cache_key: key, payload: snapshot, fetched_at: new Date().toISOString() },
    { onConflict: 'cache_key' }
  )
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

  if (marine) {
    const idx = closestHourIndex(marine.time, datetime)
    waveHeight = marine.wave_height[idx] ?? null
    waveDirection = marine.wave_direction[idx] ?? null
    wavePeriod = marine.wave_period[idx] ?? null
    waterTemp = marine.sea_surface_temperature[idx] ?? null
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
    tide_state: null,
    tide_coefficient: null,
    next_high_tide_at: null,
    next_low_tide_at: null,
  }

  await writeCache(key, snapshot)
  return snapshot
}
