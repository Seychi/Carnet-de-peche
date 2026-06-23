import { describe, it, expect } from 'vitest'
import { scoreWindow, scoreWind } from '../../solunar/scoring'
import { computeDailyForecast } from '../../solunar'
import type { SolunarEvent } from '../../solunar/types'
import type { SpotConditions } from '../../conditions/spot-forecast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(type: SolunarEvent['type'] = 'moon_apex'): SolunarEvent {
  return {
    type,
    timeISO: '2026-05-20T08:00:00.000Z',
    localTime: '10:00',
    moonPhase: 0.0,
    moonIllumination: 0.5,
  }
}

const WINDOW_START = '2026-05-20T07:00:00Z'
const WINDOW_END = '2026-05-20T09:00:00Z'

// ─── Scoring générique (le multiplicateur perso a été retiré au sprint 22) ────

describe('scoreWindow (scoring générique solunar + marée + vent)', () => {
  it('retourne un score 0-100', () => {
    const { score } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("raison principale = nom de l'événement", () => {
    const { factors } = scoreWindow(makeEvent('moon_apex'), WINDOW_START, WINDOW_END, [], [], 10)
    expect(factors.reasons[0]).toBe('Lune au zénith')
  })

  it("jamais de raison 'Personnalisé' (plus de multiplicateur perso)", () => {
    const { factors } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10)
    expect(factors.reasons.some((r) => r.includes('Personnalisé'))).toBe(false)
  })

  it('les composantes factors restent dans [0, 1]', () => {
    const { factors } = scoreWindow(makeEvent('moonrise'), WINDOW_START, WINDOW_END, [], [], 40)
    expect(factors.solunar).toBeLessThanOrEqual(1)
    expect(factors.tide).toBeLessThanOrEqual(1)
    expect(factors.wind).toBeLessThanOrEqual(1)
  })
})

// ─── WS-B sprint 19 — vent échantillonné PAR FENÊTRE (fin du « 25/25 figé ») ───
// Régression structurelle : avant, toutes les fenêtres d'un jour réutilisaient le
// même scalaire (vent de midi) → composante vent identique partout. Maintenant
// `buildWindow` lit le vent à l'heure CENTRALE de chaque fenêtre.

function makeConditions(
  windByHour: (number | null)[] | undefined,
  scalar: number | null,
): SpotConditions {
  return {
    fetched_at: new Date().toISOString(),
    date: '2026-05-20',
    tide: { points: [], extrema: [], current_height_m: null },
    weather: {
      code: null, air_temp_c: null, min_temp_c: null, max_temp_c: null,
      wind_speed_kmh: scalar,
      wind_speed_by_hour: windByHour,
      wind_direction_deg: null, precipitation_mm: null, precipitation_probability: null,
      pressure_hpa: null, cloud_cover_pct: null, humidity_pct: null, sunrise: null, sunset: null,
    },
    waves: { height_m: null, direction_deg: null, period_s: null, water_temp_c: null },
    swell: { height_m: null, period_s: null },
  }
}

describe('WS-B — vent par fenêtre (computeDailyForecast)', () => {
  const DATE = new Date('2026-05-20T00:00:00.000Z')
  const LAT = 48.04
  const LNG = -4.73 // Pointe du Raz

  it('vent horaire variable → contributions vent DIFFÉRENTES entre fenêtres du même jour', async () => {
    // Chaque heure un vent distinct (h km/h) → des fenêtres à heures ≠ → des vents ≠.
    const byHour = Array.from({ length: 24 }, (_, h) => h)
    const daily = await computeDailyForecast(DATE, LAT, LNG, makeConditions(byHour, 8))
    const distinctWinds = new Set(daily.windows.map((w) => w.factors.wind))
    expect(daily.windows.length).toBeGreaterThan(1)
    expect(distinctWinds.size).toBeGreaterThan(1) // le vent VARIE (avant : toujours 1)
  })

  it('fallback : sans tableau horaire (cache antérieur) → repli sur le scalaire (vent constant)', async () => {
    const daily = await computeDailyForecast(DATE, LAT, LNG, makeConditions(undefined, 8))
    const distinctWinds = new Set(daily.windows.map((w) => w.factors.wind))
    expect(daily.windows.length).toBeGreaterThan(0)
    expect(distinctWinds.size).toBe(1) // scalaire unique → comportement de repli propre
    expect([...distinctWinds][0]).toBeCloseTo(scoreWind(8), 5)
  })
})
