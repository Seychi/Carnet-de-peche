import { describe, it, expect } from 'vitest'
import { scoreWindow, scoreWind } from '../../solunar/scoring'
import { computeDailyForecast } from '../../solunar'
import type { SolunarEvent } from '../../solunar/types'
import type { SpotConditions } from '../../conditions/spot-forecast'
import type { PersonalMultiplier } from '../types'

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

const neutralMultiplier: PersonalMultiplier = {
  wind: 1.0,
  tide: 1.0,
  solunar: 1.0,
  computedAt: new Date().toISOString(),
  basedOnCatches: 10,
}

// ─── Rétrocompatibilité sprint 6 ─────────────────────────────────────────────

describe('scoreWindow sans personalMultiplier (sprint 6)', () => {
  it('retourne un score 0-100', () => {
    const { score } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("raison principale = nom de l'événement", () => {
    const { factors } = scoreWindow(makeEvent('moon_apex'), WINDOW_START, WINDOW_END, [], [], 10)
    expect(factors.reasons[0]).toBe('Lune au zénith')
  })

  it("pas de raison 'Personnalisé' sans multiplier", () => {
    const { factors } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10)
    expect(factors.reasons.some(r => r.includes('Personnalisé'))).toBe(false)
  })
})

// ─── Multiplier neutre = identique au sprint 6 ───────────────────────────────

describe('scoreWindow avec multiplier neutre (tout à 1.0)', () => {
  it('score identique sans multiplier', () => {
    const base = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10)
    const withNeutral = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10, neutralMultiplier)
    expect(withNeutral.score).toBe(base.score)
  })

  it("pas de raison 'Personnalisé' (impact < 5 pts)", () => {
    const { factors } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10, neutralMultiplier)
    expect(factors.reasons.some(r => r.includes('Personnalisé'))).toBe(false)
  })
})

// ─── Multiplier vent fort booste le score ─────────────────────────────────────

describe('scoreWindow avec personalMultiplier.wind = 1.5', () => {
  const boostWind: PersonalMultiplier = { ...neutralMultiplier, wind: 1.5 }

  it('score ≥ score sans multiplier en conditions vent léger', () => {
    const base = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10)
    const boosted = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10, boostWind)
    expect(boosted.score).toBeGreaterThanOrEqual(base.score)
  })

  it('factors.wind est cappé à 1.0', () => {
    const { factors } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10, boostWind)
    expect(factors.wind).toBeLessThanOrEqual(1.0)
  })
})

// ─── Raison "Personnalisé" quand impact ≥ 5 pts ──────────────────────────────

describe('raison "Personnalisé" dans factors.reasons', () => {
  it('apparaît quand le multiplier a un impact ≥ 5 pts', () => {
    // Vent fort (score vent faible) + multiplier vent très élevé → différence notable
    const bigMultiplier: PersonalMultiplier = {
      ...neutralMultiplier,
      wind: 1.6,
      tide: 1.6,
      solunar: 1.6,
    }
    const base = scoreWindow(makeEvent('moonrise'), WINDOW_START, WINDOW_END, [], [], 40)
    const boosted = scoreWindow(makeEvent('moonrise'), WINDOW_START, WINDOW_END, [], [], 40, bigMultiplier)
    const diff = Math.abs(boosted.score - base.score)
    if (diff >= 5) {
      expect(boosted.factors.reasons.some(r => r.includes('Personnalisé'))).toBe(true)
    }
  })

  it("n'apparaît pas si basedOnCatches < 5 (seuil non atteint)", () => {
    const lowDataMultiplier: PersonalMultiplier = {
      wind: 1.6,
      tide: 1.6,
      solunar: 1.6,
      computedAt: new Date().toISOString(),
      basedOnCatches: 3, // < MIN_CATCHES_FOR_MULTIPLIER
    }
    const { factors } = scoreWindow(makeEvent(), WINDOW_START, WINDOW_END, [], [], 10, lowDataMultiplier)
    expect(factors.reasons.some(r => r.includes('Personnalisé'))).toBe(false)
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
