import { describe, it, expect } from 'vitest'
import { computeDailyForecast } from '../index'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

function makeMockConditions(overrides?: Partial<SpotConditions>): SpotConditions {
  return {
    fetched_at: '2026-05-20T00:00:00Z',
    date: '2026-05-20',
    tide: { points: [], extrema: [], current_height_m: null },
    weather: {
      code: 1,
      air_temp_c: 18,
      min_temp_c: 14,
      max_temp_c: 22,
      wind_speed_kmh: 12,
      wind_direction_deg: 270,
      precipitation_mm: 0,
      precipitation_probability: 10,
      pressure_hpa: 1015,
      cloud_cover_pct: 20,
      humidity_pct: 70,
      sunrise: '2026-05-20T04:15:00',
      sunset: '2026-05-20T20:45:00',
    },
    waves: { height_m: 0.5, direction_deg: 270, period_s: 6, water_temp_c: 14 },
    swell: { height_m: 0.3, period_s: 8 },
    ...overrides,
  }
}

const LAT = 48.04
const LNG = -4.73
const DATE = new Date('2026-05-20T12:00:00Z')

describe('computeDailyForecast', () => {
  it('retourne un DailyForecast valide', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())

    expect(result.date).toBe('2026-05-20')
    expect(result.windows).toBeInstanceOf(Array)
    expect(result.dayScore).toBeGreaterThanOrEqual(0)
    expect(result.dayScore).toBeLessThanOrEqual(100)
    expect(result.moonPhaseLabel).toBeTruthy()
    expect(result.moonIllumination).toBeGreaterThanOrEqual(0)
    expect(result.moonIllumination).toBeLessThanOrEqual(1)
  })

  it('retourne entre 1 et MAX_WINDOWS_PER_DAY fenêtres', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())
    expect(result.windows.length).toBeGreaterThan(0)
    expect(result.windows.length).toBeLessThanOrEqual(6)
  })

  it('les fenêtres sont triées chronologiquement', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())
    for (let i = 1; i < result.windows.length; i++) {
      expect(result.windows[i].startTimeISO >= result.windows[i - 1].startTimeISO).toBe(true)
    }
  })

  it('toutes les fenêtres ont un score 0-100', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())
    for (const w of result.windows) {
      expect(w.score).toBeGreaterThanOrEqual(0)
      expect(w.score).toBeLessThanOrEqual(100)
    }
  })

  it('dayScore = max des scores de fenêtres', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())
    if (result.windows.length > 0) {
      const maxScore = Math.max(...result.windows.map(w => w.score))
      expect(result.dayScore).toBe(maxScore)
    }
  })

  it('sunrise et sunset sont au format HH:MM ou --:--', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())
    expect(result.sunrise).toMatch(/^\d{2}:\d{2}$|^--:--$/)
    expect(result.sunset).toMatch(/^\d{2}:\d{2}$|^--:--$/)
  })

  it('pas de fenêtres dupliquées (overlap > 50%)', async () => {
    const result = await computeDailyForecast(DATE, LAT, LNG, makeMockConditions())
    for (let i = 0; i < result.windows.length; i++) {
      for (let j = i + 1; j < result.windows.length; j++) {
        const a = result.windows[i]
        const b = result.windows[j]
        const aStart = new Date(a.startTimeISO).getTime()
        const aEnd = new Date(a.endTimeISO).getTime()
        const bStart = new Date(b.startTimeISO).getTime()
        const bEnd = new Date(b.endTimeISO).getTime()
        const overlap = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
        const minDur = Math.min(aEnd - aStart, bEnd - bStart)
        expect(overlap / minDur).toBeLessThanOrEqual(0.5)
      }
    }
  })

  it('ne plante pas avec vent null', async () => {
    const cond = makeMockConditions()
    cond.weather.wind_speed_kmh = null
    await expect(computeDailyForecast(DATE, LAT, LNG, cond)).resolves.toBeDefined()
  })
})
