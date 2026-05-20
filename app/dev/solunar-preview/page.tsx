import { notFound } from 'next/navigation'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'
import { SolunarPreviewClient } from './SolunarPreviewClient'

// force-dynamic : empêche le pre-rendering au build (notFound() serait déclenché en prod)
export const dynamic = 'force-dynamic'

// ─── Mock conditions ──────────────────────────────────────────────────────────

const MOCK_CONDITIONS: SpotConditions = {
  fetched_at: new Date().toISOString(),
  date: new Date().toISOString().slice(0, 10),
  tide: { points: [], extrema: [], current_height_m: null },
  weather: {
    code: 1,
    air_temp_c: 17,
    min_temp_c: 13,
    max_temp_c: 21,
    wind_speed_kmh: 12,
    wind_direction_deg: 250,
    precipitation_mm: 0,
    precipitation_probability: 10,
    pressure_hpa: 1017,
    cloud_cover_pct: 25,
    humidity_pct: 65,
    sunrise: null,
    sunset: null,
  },
  waves: { height_m: 0.6, direction_deg: 270, period_s: 7, water_temp_c: 14 },
  swell: { height_m: 0.4, period_s: 9 },
}

// WMO codes variés pour simuler des jours météo différents
const WMO_BY_DAY = [1, 2, 3, 61, 80, 1, 0]

export default async function SolunarPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const today = new Date()
  const LAT = 48.04
  const LNG = -4.73

  // 7 conditions identiques (mock) — en prod ça viendrait de fetchSpotForecastWeek
  const conditions = Array.from({ length: 7 }, () => MOCK_CONDITIONS)
  const weekly = await computeWeeklyForecast(today, LAT, LNG, conditions)

  const weatherCodes: Record<string, number> = {}
  weekly.forEach((d, i) => {
    weatherCodes[d.date] = WMO_BY_DAY[i] ?? 1
  })

  return (
    <div className="min-h-screen bg-sand-50 font-sans">
      {/* Banner dev */}
      <div className="bg-amber-400 px-4 py-2 text-center text-[13px] font-bold text-amber-900">
        🛠 Page de preview — dev uniquement — non visible en prod
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-10">
        <header>
          <h1 className="text-2xl font-bold text-navy-900 font-display">
            Solunar Preview
          </h1>
          <p className="text-[13px] text-ink-500 mt-1">
            Pointe du Raz (48.04°N, -4.73°E) · Mock conditions · {weekly.length} jours
          </p>
        </header>

        {/* Composant interactif client */}
        <SolunarPreviewClient weekly={weekly} weatherCodes={weatherCodes} />

        {/* Debug : données brutes */}
        <details className="rounded-[14px] border border-slate-200 bg-white p-4 text-[11px]">
          <summary className="cursor-pointer font-semibold text-ink-500 select-none">
            Données brutes (debug)
          </summary>
          <pre className="mt-3 overflow-auto text-ink-400">
            {JSON.stringify(weekly[0], null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
