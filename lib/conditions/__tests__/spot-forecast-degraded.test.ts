import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isCachedPayloadUsable, fetchOpenMeteo, type SpotConditions } from '../spot-forecast'

// `spot-forecast` charge les clients Supabase au niveau module, dont
// `service-role` qui est marque `server-only` et refuse de s'importer ici. Ces
// tests ne portent que sur la logique de cache et d'appel HTTP : on les neutralise.
vi.mock('@/lib/supabase/anon', () => ({ createAnonClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
// Sentry n'est pas initialise en test : on le neutralise pour verifier l'appel.
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }))

// ─────────────────────────────────────────────────────────────────────────────
// Regression de l'incident du 17/08/2026.
//
// Ce jour-la, `marine-api.open-meteo.com` a cesse de repondre a 21h. Le code
// faisait `if (!res.ok) return null` sans le moindre log, PUIS mettait le
// resultat vide en cache exactement comme une reussite. Consequence : « maree
// indisponible » sur tout le site pendant 15 h, aucune alerte, et une panne
// trouvee a l'oeil sur une capture d'ecran.
//
// Les deux regles qui l'empechent de se reproduire sont testees ici.
// ─────────────────────────────────────────────────────────────────────────────

const NOW = new Date('2026-08-18T12:00:00Z').getTime()
const MIN = 60 * 1000

function payload(degraded: boolean): SpotConditions {
  return { fetched_at: '', date: '2026-08-18', degraded, tide: { points: [], extrema: [], current_height_m: null } } as unknown as SpotConditions
}

function agedIso(minutes: number): string {
  return new Date(NOW - minutes * MIN).toISOString()
}

describe('isCachedPayloadUsable — un echec ne doit pas etre gele une heure', () => {
  it('garde un payload complet pendant une heure', () => {
    expect(isCachedPayloadUsable(payload(false), agedIso(59), NOW)).toBe(true)
  })

  it('jette un payload complet au-dela d une heure', () => {
    expect(isCachedPayloadUsable(payload(false), agedIso(61), NOW)).toBe(false)
  })

  it('garde un payload degrade moins de 5 minutes (amortisseur anti-martelage)', () => {
    expect(isCachedPayloadUsable(payload(true), agedIso(4), NOW)).toBe(true)
  })

  it('★ jette un payload degrade des 6 minutes, la ou l ancien code le gardait 1 h', () => {
    expect(isCachedPayloadUsable(payload(true), agedIso(6), NOW)).toBe(false)
    // La regression exacte du 17/08 : a 30 min, l ancien code servait encore le vide.
    expect(isCachedPayloadUsable(payload(true), agedIso(30), NOW)).toBe(false)
  })

  it('traite un payload d avant le sprint (sans `degraded`) comme complet', () => {
    const legacy = { date: '2026-08-18' } as unknown as SpotConditions
    expect(isCachedPayloadUsable(legacy, agedIso(30), NOW)).toBe(true)
  })

  it('refuse un payload absent ou une date illisible', () => {
    expect(isCachedPayloadUsable(null, agedIso(1), NOW)).toBe(false)
    expect(isCachedPayloadUsable(payload(false), 'pas-une-date', NOW)).toBe(false)
  })

  it('ne rejette pas une entree dont l horodatage est legerement dans le futur', () => {
    expect(isCachedPayloadUsable(payload(false), new Date(NOW + 2 * MIN).toISOString(), NOW)).toBe(true)
  })
})

describe('fetchOpenMeteo — un echec doit faire du bruit, jamais du silence', () => {
  const originalFetch = global.fetch
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  function mockResponses(...responses: Array<{ ok: boolean; status: number; body?: unknown }>) {
    const fn = vi.fn()
    for (const r of responses) {
      fn.mockResolvedValueOnce({
        ok: r.ok,
        status: r.status,
        json: async () => r.body ?? {},
        text: async () => JSON.stringify(r.body ?? { reason: 'boom' }),
      })
    }
    global.fetch = fn as unknown as typeof fetch
    return fn
  }

  it('renvoie le JSON quand l API repond', async () => {
    mockResponses({ ok: true, status: 200, body: { hourly: { sea_level_height_msl: [1.2] } } })
    const json = await fetchOpenMeteo<{ hourly: { sea_level_height_msl: number[] } }>('https://x', 'marine')
    expect(json?.hourly.sea_level_height_msl).toEqual([1.2])
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('★ reessaie une fois sur 429 — le cas exact du 17/08', async () => {
    const fn = mockResponses(
      { ok: false, status: 429 },
      { ok: true, status: 200, body: { hourly: { ok: true } } },
    )
    const json = await fetchOpenMeteo<{ hourly: { ok: boolean } }>('https://x', 'marine')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(json?.hourly.ok).toBe(true)
  })

  it('★ signale l echec avec le CODE DE STATUT quand les deux essais echouent', async () => {
    mockResponses({ ok: false, status: 429 }, { ok: false, status: 429 })
    const json = await fetchOpenMeteo('https://x', 'marine')
    expect(json).toBeNull()
    expect(errorSpy).toHaveBeenCalledTimes(1)
    // Sans le statut, impossible de distinguer un quota d une panne.
    expect(String(errorSpy.mock.calls[0][0])).toContain('429')
    expect(String(errorSpy.mock.calls[0][0])).toContain('marine')
  })

  it('ne rejoue pas un 400 : la requete est fautive, la relancer ne sert a rien', async () => {
    const fn = mockResponses({ ok: false, status: 400 })
    const json = await fetchOpenMeteo('https://x', 'forecast')
    expect(json).toBeNull()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('signale aussi une exception reseau, au lieu de l avaler', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch
    const json = await fetchOpenMeteo('https://x', 'marine')
    expect(json).toBeNull()
    expect(String(errorSpy.mock.calls[0][0])).toContain('ECONNRESET')
  })
})
