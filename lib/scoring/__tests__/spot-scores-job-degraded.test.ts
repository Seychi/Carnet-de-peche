import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Sprint 89, Bloc C — le job de scoring ne fabrique plus de score quand la donnée
 * manque, et il ne se déclare plus « ok » quand elle manque.
 *
 * Le défaut : quand Open-Meteo répond 429 (« Too many concurrent requests »),
 * `fetchOpenMeteo` renvoie null sans lever, la semaine retombe sur des conditions
 * `degraded`, et le job upsertait sereinement `current_score: 0` /
 * `current_quality: 'faible'` pour 26 h — puis comptait le spot en `succeeded`.
 *
 * Mesuré le 19/08 sur une seule invocation du cron : ~82 réponses 429. Soit autant
 * de spots affichant sur la carte un score nul pendant une journée, et un compteur
 * de succès structurellement aveugle à son mode de panne le plus fréquent.
 */

const fetchSpotForecastWeek = vi.fn()
const computeWeeklyForecast = vi.fn()

vi.mock('@/lib/conditions/spot-forecast', () => ({
  fetchSpotForecastWeek: (...args: unknown[]) => fetchSpotForecastWeek(...args),
}))
vi.mock('@/lib/solunar/index', () => ({
  computeWeeklyForecast: (...args: unknown[]) => computeWeeklyForecast(...args),
}))
vi.mock('@/lib/solunar/next-window', () => ({
  findCurrentWindow: () => ({ score: 72, quality: 'bonne' }),
  getNextBestWindow: () => ({ startTimeISO: '2026-08-20T06:00:00Z', quality: 'bonne' }),
}))

import { computeAndStoreSpotScores } from '../spot-scores-job'

/** Semaine de 7 jours, `degraded` au choix — c'est le seul champ que le job regarde. */
function week(degraded: boolean) {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `2026-08-${String(19 + i).padStart(2, '0')}`,
    degraded,
  }))
}

type UpsertRow = { spot_id: string; current_score: number; current_quality: string }

/**
 * Client Supabase minimal. Le job lit les spots par la RPC `get_spots_for_scoring`
 * (et non par `.from()`), puis upserte dans `spot_scores`.
 */
function fakeAdmin(spotIds: string[], upserts: UpsertRow[]) {
  return {
    rpc: async () => ({
      data: spotIds.map((id, i) => ({ id, lat: 48 + i / 100, lng: -4 - i / 100 })),
      error: null,
    }),
    from: () => ({
      upsert: async (row: UpsertRow) => {
        upserts.push(row)
        return { error: null }
      },
    }),
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  computeWeeklyForecast.mockResolvedValue([{ dayScore: 70 }])
})

describe('computeAndStoreSpotScores — un 429 Open-Meteo n’écrase plus le score de la veille', () => {
  it('★ n’upserte RIEN pour un spot dont la semaine est dégradée', async () => {
    fetchSpotForecastWeek.mockResolvedValue(week(true))
    const upserts: UpsertRow[] = []

    const res = await computeAndStoreSpotScores(fakeAdmin(['a', 'b'], upserts))

    expect(upserts, 'un score fabriqué a été écrit alors que la donnée manquait').toEqual([])
    expect(res.degraded).toBe(2)
    expect(res.succeeded, 'un spot sans données ne doit PAS compter comme réussi').toBe(0)
    expect(res.failed, 'ce n’est pas un échec technique non plus, c’est une donnée absente').toBe(0)
    expect(res.total).toBe(2)
  })

  it('upserte normalement quand la donnée est complète', async () => {
    fetchSpotForecastWeek.mockResolvedValue(week(false))
    const upserts: UpsertRow[] = []

    const res = await computeAndStoreSpotScores(fakeAdmin(['a', 'b'], upserts))

    expect(upserts).toHaveLength(2)
    expect(upserts[0].current_score).toBe(72)
    expect(upserts[0].current_quality).toBe('bonne')
    expect(res.succeeded).toBe(2)
    expect(res.degraded).toBe(0)
  })

  it('★ un seul jour dégradé suffit à s’abstenir', async () => {
    // La semaine alimente `next_window_*` : une journée manquante suffit à fausser
    // le prochain créneau annoncé, donc on ne publie pas.
    const mixed = week(false)
    mixed[3].degraded = true
    fetchSpotForecastWeek.mockResolvedValue(mixed)
    const upserts: UpsertRow[] = []

    const res = await computeAndStoreSpotScores(fakeAdmin(['a'], upserts))

    expect(upserts).toEqual([])
    expect(res.degraded).toBe(1)
  })

  it('sépare une vraie panne (exception) d’une donnée absente', async () => {
    fetchSpotForecastWeek.mockRejectedValue(new Error('réseau coupé'))
    const upserts: UpsertRow[] = []
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await computeAndStoreSpotScores(fakeAdmin(['a'], upserts))

    expect(res.failed).toBe(1)
    expect(res.degraded).toBe(0)
    expect(res.succeeded).toBe(0)
  })
})
