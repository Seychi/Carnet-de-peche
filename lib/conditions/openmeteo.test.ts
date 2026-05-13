import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchConditionsAt, cacheKey } from './openmeteo'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LAT = 47.8
const LNG = -4.3
const DATETIME = new Date('2026-05-13T14:00:00Z')

// Les timestamps ont le suffixe Z pour être parsés comme UTC de façon
// cohérente sur toutes les machines (Vercel en prod tourne en UTC).
const MARINE_RESPONSE = {
  hourly: {
    time: ['2026-05-13T14:00:00Z', '2026-05-13T15:00:00Z'],
    wave_height: [1.2, 1.4],
    wave_direction: [270, 275],
    wave_period: [8.5, 9.0],
    sea_surface_temperature: [14.3, 14.4],
  },
}

const FORECAST_RESPONSE = {
  hourly: {
    time: ['2026-05-13T14:00:00Z', '2026-05-13T15:00:00Z'],
    temperature_2m: [16.5, 17.0],
    windspeed_10m: [22.0, 24.0],
    winddirection_10m: [280, 285],
    pressure_msl: [1013.2, 1013.0],
    cloud_cover: [40, 45],
    precipitation: [0.0, 0.1],
  },
}

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// vi.mock est hoisté en haut du fichier par Vitest, donc les variables doivent
// l'être aussi via vi.hoisted pour être accessibles dans la factory.

const { mockMaybeSingle, mockUpsert, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockUpsert = vi.fn().mockResolvedValue({ error: null })
  const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockEq = vi.fn().mockReturnValue({ gt: mockGt })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, upsert: mockUpsert })
  return { mockMaybeSingle, mockUpsert, mockFrom }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('fetchConditionsAt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reconstruit la chaîne fluent à chaque test
    const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockEq = vi.fn().mockReturnValue({ gt: mockGt })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert })
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('fusionne correctement les réponses Marine et Forecast', async () => {
    // Pas de cache
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const body = url.includes('marine-api') ? MARINE_RESPONSE : FORECAST_RESPONSE
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(body),
        })
      })
    )

    const result = await fetchConditionsAt(LAT, LNG, DATETIME)

    expect(result.source).toBe('open-meteo')
    // Forecast
    expect(result.air_temperature_c).toBe(16.5)
    expect(result.wind_speed_kmh).toBe(22.0)
    expect(result.wind_direction_deg).toBe(280)
    expect(result.pressure_hpa).toBe(1013.2)
    expect(result.cloud_cover_pct).toBe(40)
    expect(result.precipitation_mm).toBe(0.0)
    // Marine
    expect(result.water_temperature_c).toBe(14.3)
    expect(result.wave_height_m).toBe(1.2)
    expect(result.wave_period_s).toBe(8.5)
    expect(result.wave_direction_deg).toBe(270)
  })

  it('retourne null pour les 4 champs tide_*', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const body = url.includes('marine-api') ? MARINE_RESPONSE : FORECAST_RESPONSE
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
      })
    )

    const result = await fetchConditionsAt(LAT, LNG, DATETIME)

    expect(result.tide_state).toBeNull()
    expect(result.tide_coefficient).toBeNull()
    expect(result.next_high_tide_at).toBeNull()
    expect(result.next_low_tide_at).toBeNull()
  })

  it('retourne le cache sans re-fetch si entrée valide', async () => {
    const cached = {
      fetched_at: new Date().toISOString(),
      source: 'open-meteo',
      air_temperature_c: 99,
      water_temperature_c: null,
      wind_speed_kmh: null,
      wind_direction_deg: null,
      pressure_hpa: null,
      cloud_cover_pct: null,
      precipitation_mm: null,
      wave_height_m: null,
      wave_period_s: null,
      wave_direction_deg: null,
      tide_state: null,
      tide_coefficient: null,
      next_high_tide_at: null,
      next_low_tide_at: null,
    }

    mockMaybeSingle.mockResolvedValue({ data: { payload: cached }, error: null })

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchConditionsAt(LAT, LNG, DATETIME)

    expect(result.air_temperature_c).toBe(99)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retourne des champs Marine null si l\'API marine échoue', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: false })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(FORECAST_RESPONSE),
        })
      })
    )

    const result = await fetchConditionsAt(LAT, LNG, DATETIME)

    expect(result.wave_height_m).toBeNull()
    expect(result.water_temperature_c).toBeNull()
    expect(result.air_temperature_c).toBe(16.5)
  })
})

describe('cacheKey', () => {
  it('génère une clé stable pour les mêmes coordonnées et heure', () => {
    const d1 = new Date('2026-05-13T14:00:00Z')
    const d2 = new Date('2026-05-13T14:45:00Z') // même heure UTC
    expect(cacheKey(LAT, LNG, d1)).toBe(cacheKey(LAT, LNG, d2))
  })

  it('génère des clés différentes pour des heures différentes', () => {
    const d1 = new Date('2026-05-13T14:00:00Z')
    const d2 = new Date('2026-05-13T15:00:00Z')
    expect(cacheKey(LAT, LNG, d1)).not.toBe(cacheKey(LAT, LNG, d2))
  })
})
