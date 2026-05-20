// Smoke test solunar : affiche les fenêtres de pêche pour la Pointe du Raz aujourd'hui
import { computeDailyForecast } from '../lib/solunar/index'
import type { SpotConditions } from '../lib/conditions/spot-forecast'

const LAT = 48.04
const LNG = -4.73

const mockConditions: SpotConditions = {
  fetched_at: new Date().toISOString(),
  date: new Date().toISOString().slice(0, 10),
  tide: { points: [], extrema: [], current_height_m: null },
  weather: {
    code: 1,
    air_temp_c: 16,
    min_temp_c: 12,
    max_temp_c: 20,
    wind_speed_kmh: 14,
    wind_direction_deg: 250,
    precipitation_mm: 0,
    precipitation_probability: 5,
    pressure_hpa: 1018,
    cloud_cover_pct: 30,
    humidity_pct: 65,
    sunrise: null,
    sunset: null,
  },
  waves: { height_m: 0.8, direction_deg: 280, period_s: 7, water_temp_c: 13 },
  swell: { height_m: 0.5, period_s: 10 },
}

async function main() {
  const today = new Date()

  console.log(`\n📍 Pointe du Raz (${LAT}°N, ${LNG}°E)`)
  console.log(`📅 ${today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
  console.log('─'.repeat(60))

  const result = await computeDailyForecast(today, LAT, LNG, mockConditions)

  console.log(`🌙 Phase lunaire : ${result.moonPhaseLabel} (${Math.round(result.moonIllumination * 100)}% illuminée)`)
  console.log(`🌅 Lever : ${result.sunrise}   🌇 Coucher : ${result.sunset}`)
  console.log(`\nScore journée : ${result.dayScore}/100 — ${result.dayQuality.replace('_', ' ')}`)
  console.log(`\n${result.windows.length} fenêtre(s) de pêche :\n`)

  for (const w of result.windows) {
    const stars = w.score >= 90 ? '⭐⭐⭐' : w.score >= 75 ? '⭐⭐' : w.score >= 60 ? '⭐' : ''
    console.log(`  ${w.startLocal} – ${w.endLocal}  [${w.score}]  ${w.quality.replace('_', ' ')} ${stars}`)
    console.log(`    └─ ${w.factors.reasons.join(' · ')}`)
  }

  console.log()
}

main()
