/**
 * Smoke test du scoring du VENT par fenêtre (sprint 19 / WS-A).
 * Usage : pnpm tsx scripts/wind-scoring-smoke.ts
 *
 * Démontre, sans Supabase ni réseau (astronomie SunCalc only), la cause du
 * « 25/25 figé » et sa correction :
 *   • AVANT (scalaire unique propagé à toutes les fenêtres) → toutes les fenêtres
 *     d'un jour ont le MÊME vent → la même contrib /25.
 *   • APRÈS (tableau horaire échantillonné à l'heure de chaque fenêtre) → le vent
 *     varie d'une fenêtre à l'autre → la contrib /25 discrimine.
 *
 * On simule un profil horaire réaliste : calme le matin, ventu l'après-midi.
 */

import { computeDailyForecast } from '../lib/solunar'
import { scoreWind } from '../lib/solunar/scoring'
import { getParisHour } from '../lib/solunar/format'
import type { SpotConditions } from '../lib/conditions/spot-forecast'

// Profil horaire synthétique du vent (km/h), indexé par heure locale 0-23 :
// nuit/matin calme (5–9), montée en journée, après-midi ventu (20–28), retombée le soir.
const WIND_BY_HOUR: number[] = [
  6, 6, 5, 5, 6, 7, 8, 9, 10, 12, 14, 17, // 00→11
  20, 23, 26, 28, 27, 24, 20, 16, 12, 9, 7, 6, // 12→23
]

const LAT = 48.04
const LNG = -4.73 // Pointe du Raz (Finistère)
const DATE = new Date('2026-05-20T00:00:00.000Z')

function makeConditions(byHour: (number | null)[] | undefined, scalar: number | null): SpotConditions {
  return {
    fetched_at: new Date().toISOString(),
    date: '2026-05-20',
    tide: { points: [], extrema: [], current_height_m: null },
    weather: {
      code: null, air_temp_c: null, min_temp_c: null, max_temp_c: null,
      wind_speed_kmh: scalar,
      wind_speed_by_hour: byHour,
      wind_direction_deg: null, precipitation_mm: null, precipitation_probability: null,
      pressure_hpa: null, cloud_cover_pct: null, humidity_pct: null, sunrise: null, sunset: null,
    },
    waves: { height_m: null, direction_deg: null, period_s: null, water_temp_c: null },
    swell: { height_m: null, period_s: null },
  }
}

function contrib(windFactor: number): number {
  return Math.round(windFactor * 0.25 * 100) // /25 affiché dans ScoreBreakdown
}

async function run() {
  console.log('\n=== SCORING DU VENT PAR FENÊTRE — SMOKE TEST (sprint 19) ===\n')
  console.log(`Spot : Pointe du Raz (${LAT}, ${LNG}) — ${DATE.toISOString().slice(0, 10)}`)
  console.log('Profil horaire du vent (km/h) : matin calme → après-midi ventu\n')

  // ── APRÈS (correction WS-B) : vent échantillonné par fenêtre ────────────────
  const after = await computeDailyForecast(DATE, LAT, LNG, makeConditions(WIND_BY_HOUR, 17))
  console.log('─── APRÈS (vent par fenêtre) ────────────────────────────────────')
  const afterContribs: number[] = []
  for (const w of after.windows) {
    const h = getParisHour(new Date(w.centerEvent.timeISO))
    const wind = WIND_BY_HOUR[h]
    const c = contrib(w.factors.wind)
    afterContribs.push(c)
    console.log(
      `  ${w.startLocal}–${w.endLocal} (centre ${String(h).padStart(2, '0')}h) ` +
      `· vent ${String(wind).padStart(2)} km/h · factors.wind ${w.factors.wind.toFixed(3)} · contrib ${c}/25`,
    )
  }
  const afterDistinct = new Set(afterContribs)
  console.log(`  → ${afterContribs.length} fenêtres, ${afterDistinct.size} contrib(s) vent DISTINCTE(s) : {${[...afterDistinct].sort((a, b) => a - b).join(', ')}}`)

  // ── AVANT (bug) : scalaire unique (vent de midi) propagé à toutes les fenêtres ─
  const noonWind = WIND_BY_HOUR[12] // 20 km/h — l'ancien code prenait le vent de midi
  const before = await computeDailyForecast(DATE, LAT, LNG, makeConditions(undefined, noonWind))
  console.log('\n─── AVANT (scalaire unique = vent de midi, repli/fallback) ──────')
  const beforeContribs: number[] = []
  for (const w of before.windows) {
    const h = getParisHour(new Date(w.centerEvent.timeISO))
    const c = contrib(w.factors.wind)
    beforeContribs.push(c)
    console.log(
      `  ${w.startLocal}–${w.endLocal} (centre ${String(h).padStart(2, '0')}h) ` +
      `· vent ${noonWind} km/h (figé) · factors.wind ${w.factors.wind.toFixed(3)} · contrib ${c}/25`,
    )
  }
  console.log(`  → ${beforeContribs.length} fenêtres, ${new Set(beforeContribs).size} contrib(s) vent distincte(s) (toutes identiques = le bug)`)

  // ── Démonstration de la saturation de l'ANCIENNE courbe vs la nouvelle ───────
  console.log('\n─── Courbe : ancienne (plateau plat 5–15 → 25/25) vs nouvelle ───')
  for (const v of [5, 8, 10, 13, 15, 18, 22]) {
    console.log(`  ${String(v).padStart(2)} km/h → factor ${scoreWind(v).toFixed(3)} → contrib ${contrib(scoreWind(v))}/25`)
  }

  console.log('\n─── Vérifications ───────────────────────────────────────────────')
  const ok1 = afterDistinct.size > 1
  const ok2 = new Set(beforeContribs).size === 1
  const ok3 = contrib(scoreWind(18)) < 25 && contrib(scoreWind(13)) < 25
  console.log(`  ${ok1 ? '✅' : '❌'} APRÈS : le vent varie entre fenêtres (${afterDistinct.size} valeurs)`)
  console.log(`  ${ok2 ? '✅' : '❌'} AVANT : le vent est figé (1 valeur)`)
  console.log(`  ${ok3 ? '✅' : '❌'} Anti-saturation : 13 et 18 km/h ne donnent plus 25/25`)

  console.log('\n=== FIN SMOKE TEST ===\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
