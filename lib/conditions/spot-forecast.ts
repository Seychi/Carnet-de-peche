import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TidePoint = {
  hour: number
  height_m: number
}

export type TideExtremum = {
  type: 'high' | 'low'
  hour: number
  height_m: number
}

export type SpotConditions = {
  fetched_at: string
  date: string
  tide: {
    points: TidePoint[]
    extrema: TideExtremum[]
    current_height_m: number | null
  }
  weather: {
    code: number | null
    air_temp_c: number | null
    min_temp_c: number | null
    max_temp_c: number | null
    wind_speed_kmh: number | null
    wind_direction_deg: number | null
    precipitation_mm: number | null
    precipitation_probability: number | null
    pressure_hpa: number | null
    cloud_cover_pct: number | null
    humidity_pct: number | null
    sunrise: string | null
    sunset: string | null
  }
  waves: {
    height_m: number | null
    direction_deg: number | null
    period_s: number | null
    water_temp_c: number | null
  }
  swell: {
    height_m: number | null
    period_s: number | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParisInfo(date?: Date): { dateStr: string; currentHourIdx: number } {
  const d = date ?? new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const year  = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day   = parts.find(p => p.type === 'day')!.value
  const hour  = parts.find(p => p.type === 'hour')!.value
  return {
    dateStr: `${year}-${month}-${day}`,
    currentHourIdx: parseInt(hour, 10) % 24,
  }
}

function cacheKey(lat: number, lng: number, dateStr: string): string {
  return `forecast_${lat.toFixed(1)}_${lng.toFixed(1)}_${dateStr}`
}

function computeExtrema(points: TidePoint[]): TideExtremum[] {
  const extrema: TideExtremum[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].height_m
    const curr = points[i].height_m
    const next = points[i + 1].height_m
    if (curr > prev && curr > next) {
      extrema.push({ type: 'high', hour: points[i].hour, height_m: curr })
    } else if (curr < prev && curr < next) {
      extrema.push({ type: 'low', hour: points[i].hour, height_m: curr })
    }
  }
  return extrema
}

// ─── Cache Supabase ───────────────────────────────────────────────────────────

async function readCache(key: string): Promise<SpotConditions | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conditions_cache')
    .select('payload')
    .eq('cache_key', key)
    .gt('fetched_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .maybeSingle()
  if (error || !data) return null
  return data.payload as SpotConditions
}

async function writeCache(key: string, payload: SpotConditions): Promise<void> {
  const supabase = await createClient()
  await supabase.from('conditions_cache').upsert(
    { cache_key: key, payload, fetched_at: new Date().toISOString() },
    { onConflict: 'cache_key' }
  )
}

// ─── API calls ────────────────────────────────────────────────────────────────

type MarineResponse = {
  hourly: {
    time: string[]
    // sea_level_height_msl absent de l'API Open-Meteo Marine (données de marée non disponibles)
    wave_height: (number | null)[]
    wave_direction: (number | null)[]
    wave_period: (number | null)[]
    swell_wave_height: (number | null)[]
    swell_wave_period: (number | null)[]
    sea_surface_temperature: (number | null)[]
  }
}

type ForecastHourlyResponse = {
  hourly: {
    time: string[]
    temperature_2m: (number | null)[]
    weather_code: (number | null)[]
    wind_speed_10m: (number | null)[]
    wind_direction_10m: (number | null)[]
    precipitation: (number | null)[]
    precipitation_probability: (number | null)[]
    pressure_msl: (number | null)[]
    cloud_cover: (number | null)[]
    relative_humidity_2m: (number | null)[]
  }
  daily: {
    time: string[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    precipitation_sum: (number | null)[]
    sunrise: string[]
    sunset: string[]
  }
}

async function fetchMarineData(lat: number, lng: number, dateStr: string): Promise<MarineResponse['hourly'] | null> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature` +
    `&timezone=Europe%2FParis&start_date=${dateStr}&end_date=${dateStr}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const json: MarineResponse = await res.json()
    return json.hourly
  } catch {
    return null
  }
}

async function fetchForecastData(lat: number, lng: number, dateStr: string): Promise<{ hourly: ForecastHourlyResponse['hourly']; daily: ForecastHourlyResponse['daily'] } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,precipitation_probability,pressure_msl,cloud_cover,relative_humidity_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
    `&timezone=Europe%2FParis&start_date=${dateStr}&end_date=${dateStr}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const json: ForecastHourlyResponse = await res.json()
    return { hourly: json.hourly, daily: json.daily }
  } catch {
    return null
  }
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export async function fetchSpotConditions(
  lat: number,
  lng: number,
  date?: Date
): Promise<SpotConditions> {
  const { dateStr, currentHourIdx } = getParisInfo(date)
  const key = cacheKey(lat, lng, dateStr)

  const cached = await readCache(key)
  if (cached) return cached

  const [marine, forecast] = await Promise.all([
    fetchMarineData(lat, lng, dateStr),
    fetchForecastData(lat, lng, dateStr),
  ])

  // ── Marées ──────────────────────────────────────────────────────────────────
  // Open-Meteo Marine n'expose pas de données de marée astronomique.
  // La section TideChart affichera "Données non disponibles".
  // Sera remplacé en Sprint 6 par WorldTides ou calcul solunar.
  const tidePoints: TidePoint[] = []
  const tideExtrema: TideExtremum[] = []
  const currentTide: number | null = null

  // ── Vagues / houle ──────────────────────────────────────────────────────────
  const waveIdx = currentHourIdx
  const waves = {
    height_m:     marine?.wave_height?.[waveIdx] ?? null,
    direction_deg: marine?.wave_direction?.[waveIdx] ?? null,
    period_s:     marine?.wave_period?.[waveIdx] ?? null,
    water_temp_c: marine?.sea_surface_temperature?.[waveIdx] ?? null,
  }
  const swell = {
    height_m: marine?.swell_wave_height?.[waveIdx] ?? null,
    period_s: marine?.swell_wave_period?.[waveIdx] ?? null,
  }

  // ── Météo horaire ────────────────────────────────────────────────────────────
  const fIdx = currentHourIdx
  const weather = {
    code:                    forecast?.hourly.weather_code?.[fIdx] ?? null,
    air_temp_c:              forecast?.hourly.temperature_2m?.[fIdx] ?? null,
    min_temp_c:              forecast?.daily.temperature_2m_min?.[0] ?? null,
    max_temp_c:              forecast?.daily.temperature_2m_max?.[0] ?? null,
    wind_speed_kmh:          forecast?.hourly.wind_speed_10m?.[fIdx] ?? null,
    wind_direction_deg:      forecast?.hourly.wind_direction_10m?.[fIdx] ?? null,
    precipitation_mm:        forecast?.hourly.precipitation?.[fIdx] ?? null,
    precipitation_probability: forecast?.hourly.precipitation_probability?.[fIdx] ?? null,
    pressure_hpa:            forecast?.hourly.pressure_msl?.[fIdx] ?? null,
    cloud_cover_pct:         forecast?.hourly.cloud_cover?.[fIdx] ?? null,
    humidity_pct:            forecast?.hourly.relative_humidity_2m?.[fIdx] ?? null,
    sunrise:                 forecast?.daily.sunrise?.[0] ?? null,
    sunset:                  forecast?.daily.sunset?.[0] ?? null,
  }

  const result: SpotConditions = {
    fetched_at: new Date().toISOString(),
    date: dateStr,
    tide: { points: tidePoints, extrema: tideExtrema, current_height_m: currentTide },
    weather,
    waves,
    swell,
  }

  await writeCache(key, result)
  return result
}
