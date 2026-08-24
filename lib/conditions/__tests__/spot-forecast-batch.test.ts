import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSpotForecastWeekBatch } from '../spot-forecast'

vi.mock('@/lib/supabase/anon', () => ({ createAnonClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }))

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 89 — le cron demandait la météo spot par spot.
//
// 212 spots x 2 API = 424 requêtes HTTP par run, lancées 20 à la fois. Open-Meteo
// limite les requêtes SIMULTANÉES par IP, et l'IP de sortie d'une fonction Vercel
// est mutualisée : on ne gagne pas ce combat en baissant notre propre parallélisme.
//
// Mesure du run du 24/08 à 05:00 UTC, jitter de réessai DÉJÀ déployé :
//   « 212 spots (57 ok, 155 sans données, 0 échec) in 8730ms »
// soit 73 % des spots sans donnée, et 57 scores valides sur 217 en base.
//
// Les deux API acceptent plusieurs coordonnées par requête (`latitude=a,b,c`) et
// répondent par un tableau dans l'ORDRE D'ENTRÉE. 424 requêtes deviennent 10.
// ─────────────────────────────────────────────────────────────────────────────

const HOURS = 24 * 7

function marineFor(lat: number, lng: number) {
  return {
    latitude: lat, longitude: lng,
    hourly: {
      time: Array.from({ length: HOURS }, (_, i) => `2026-08-24T${String(i % 24).padStart(2, '0')}:00`),
      sea_level_height_msl: Array.from({ length: HOURS }, () => 1.5),
      wave_height: Array.from({ length: HOURS }, () => 0.4),
      wave_direction: Array.from({ length: HOURS }, () => 270),
      wave_period: Array.from({ length: HOURS }, () => 5),
      swell_wave_height: Array.from({ length: HOURS }, () => 0.3),
      swell_wave_period: Array.from({ length: HOURS }, () => 6),
      sea_surface_temperature: Array.from({ length: HOURS }, () => 18),
    },
  }
}

function forecastFor(lat: number, lng: number) {
  const days = Array.from({ length: 7 }, (_, d) => `2026-08-${String(24 + d).padStart(2, '0')}`)
  return {
    latitude: lat, longitude: lng,
    hourly: {
      time: days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`)),
      temperature_2m: Array.from({ length: HOURS }, () => 20),
      weather_code: Array.from({ length: HOURS }, () => 1),
      wind_speed_10m: Array.from({ length: HOURS }, () => 12),
      wind_direction_10m: Array.from({ length: HOURS }, () => 180),
      precipitation: Array.from({ length: HOURS }, () => 0),
      precipitation_probability: Array.from({ length: HOURS }, () => 5),
      pressure_msl: Array.from({ length: HOURS }, () => 1015),
      cloud_cover: Array.from({ length: HOURS }, () => 30),
      relative_humidity_2m: Array.from({ length: HOURS }, () => 70),
    },
    daily: {
      time: days,
      temperature_2m_max: days.map(() => 24),
      temperature_2m_min: days.map(() => 15),
      precipitation_sum: days.map(() => 0),
      sunrise: days.map((d) => `${d}T07:00`),
      sunset: days.map((d) => `${d}T21:00`),
    },
  }
}

/** Rejoue le contrat réel : N>1 coordonnées => tableau, N==1 => objet nu. */
function respond(url: string) {
  const u = new URL(url)
  const lats = u.searchParams.get('latitude')!.split(',').map(Number)
  const lngs = u.searchParams.get('longitude')!.split(',').map(Number)
  const marine = url.includes('marine-api')
  const body = lats.map((la, i) => (marine ? marineFor(la, lngs[i]) : forecastFor(la, lngs[i])))
  return lats.length === 1 ? body[0] : body
}

let calls: string[] = []

beforeEach(() => {
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url)
    return { ok: true, status: 200, json: async () => respond(url) } as unknown as Response
  }))
})
afterEach(() => vi.unstubAllGlobals())

const pts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ lat: 43 + i * 0.01, lng: -1 - i * 0.01 }))

describe('fetchSpotForecastWeekBatch — grouper les coordonnées, pas les marteler', () => {
  it('★ fait 2 requêtes par lot de 50, pas 2 par spot', async () => {
    await fetchSpotForecastWeekBatch(pts(120))
    // 120 spots => 3 lots (50/50/20) x 2 API = 6 requêtes. L'ancien code en faisait 240.
    expect(calls).toHaveLength(6)
  })

  it('rend une semaine de 7 jours pour chaque point, dans l ordre d entrée', async () => {
    const out = await fetchSpotForecastWeekBatch(pts(60))
    expect(out).toHaveLength(60)
    for (const week of out) {
      expect(week).toHaveLength(7)
      expect(week[0].degraded).toBe(false)
    }
  })

  it('★ encaisse le lot d UNE coordonnée, où l API répond un objet et non un tableau', async () => {
    // 51 points => dernier lot de 1. Sans normalisation, ce lot part en vrille
    // silencieuse le jour où le catalogue franchit un multiple de 50 + 1.
    const out = await fetchSpotForecastWeekBatch(pts(51))
    expect(out).toHaveLength(51)
    expect(out[50]).toHaveLength(7)
    expect(out[50][0].degraded).toBe(false)
  })

  it('marque `degraded` les points d un lot dont l API a échoué, sans contaminer les autres', async () => {
    // 120 points a lat = 43 + i/100 : lot 1 = 43.00→43.49, lot 2 = 43.50→43.99,
    // lot 3 = 44.00→44.19. On fait tomber les PRÉVISIONS du seul lot 2.
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url)
      const isLot2 = new URL(url).searchParams.get('latitude')!.startsWith('43.5')
      if (!url.includes('marine-api') && isLot2) {
        return { ok: false, status: 429, text: async () => '{"reason":"Too many concurrent requests"}' } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => respond(url) } as unknown as Response
    }))
    const out = await fetchSpotForecastWeekBatch(pts(120))
    expect(out).toHaveLength(120)
    // ★ Le lot fauché est dégradé, et lui seul : un 429 sur un lot ne doit pas
    // faire perdre son score à un spot dont la donnée est arrivée normalement.
    expect(out[0][0].degraded).toBe(false)   // lot 1
    expect(out[49][0].degraded).toBe(false)  // lot 1, dernier
    expect(out[50][0].degraded).toBe(true)   // lot 2, premier
    expect(out[99][0].degraded).toBe(true)   // lot 2, dernier
    expect(out[100][0].degraded).toBe(false) // lot 3
    expect(out[119][0].degraded).toBe(false) // lot 3, dernier
  })

  it('rend un tableau vide sans appeler personne quand il n y a aucun point', async () => {
    expect(await fetchSpotForecastWeekBatch([])).toEqual([])
    expect(calls).toHaveLength(0)
  })
})
