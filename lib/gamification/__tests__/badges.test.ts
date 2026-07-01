import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'
import {
  recomputeMyBadges,
  BADGE_FAMILIES,
  TIER_BY_SLUG,
  TOTAL_BADGES,
  badgeTierLabel,
  computeBadgeMetrics,
  familyState,
  type UserBadgeRow,
} from '../badges'
import { SPECIES } from '@/lib/seo/programmatic'

beforeEach(() => vi.clearAllMocks())

function row(slug: string, tier: number, earned_at = '2026-06-01T00:00:00Z'): UserBadgeRow {
  return {
    id: slug,
    user_id: 'u',
    badge_slug: slug,
    earned_at,
    meta: null,
    tier,
    target: null,
    progress: null,
  } as UserBadgeRow
}

describe('BADGE_FAMILIES (référentiel à paliers)', () => {
  it('7 familles, slugs de palier uniques, total cohérent (14)', () => {
    expect(BADGE_FAMILIES).toHaveLength(7)
    const slugs = BADGE_FAMILIES.flatMap((f) => f.tiers.map((t) => t.slug))
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(TOTAL_BADGES).toBe(slugs.length)
    expect(TOTAL_BADGES).toBe(14)
  })

  it('paliers triés par seuil croissant dans chaque famille', () => {
    for (const f of BADGE_FAMILIES) {
      const targets = f.tiers.map((t) => t.target)
      expect([...targets].sort((a, b) => a - b)).toEqual(targets)
    }
  })

  it('Pokédex complet = 26 espèces (bug 20 corrigé)', () => {
    expect(TIER_BY_SLUG['species_26'].tier.target).toBe(26)
    expect(badgeTierLabel('species_26')).toBe('26 espèces')
    // Un slug inconnu retombe sur lui-même (jamais un libellé inventé).
    expect(badgeTierLabel('inconnu')).toBe('inconnu')
  })

  it('le seuil Pokédex complet suit le catalogue SPECIES (garde anti-dérive)', () => {
    // Si le référentiel passe un jour à 27+ espèces, ce test force à revoir le seuil
    // species_26 (et la migration correspondante) au lieu d'un « complet » silencieusement faux.
    expect(TIER_BY_SLUG['species_26'].tier.target).toBe(Object.keys(SPECIES).length)
  })
})

describe('computeBadgeMetrics', () => {
  it('compte total / espèces / relâchées / saisons / mesurées / semaines actives', () => {
    const m = computeBadgeMetrics([
      { species: 'bar', released: true, caught_at: '2026-01-15T09:00:00Z', photo_verified_at: 'x' },
      { species: 'bar', released: false, caught_at: '2026-01-16T09:00:00Z' }, // même semaine ISO que le 15
      { species: 'bar', released: false, caught_at: '2026-04-10T09:00:00Z' },
      { species: 'dorade_royale', released: true, caught_at: '2026-07-20T09:00:00Z' },
      { species: 'sar', released: false, caught_at: '2026-10-05T09:00:00Z' },
    ])
    expect(m.total).toBe(5)
    expect(m.species).toBe(3) // bar, dorade_royale, sar
    expect(m.released).toBe(2) // 15 janv + 20 juil
    expect(m.seasons).toBe(4) // janv (DJF), avr (MAM), juil (JJA), oct (SON)
    expect(m.measured).toBe(1) // 15 janv
    expect(m.activeWeeks).toBe(4) // 15/16 janv = 1 semaine, + avr + juil + oct
  })

  it('tableau vide → tout à zéro', () => {
    expect(computeBadgeMetrics([])).toEqual({
      total: 0,
      species: 0,
      released: 0,
      activeWeeks: 0,
      seasons: 0,
      measured: 0,
    })
  })
})

describe('familyState', () => {
  const volume = BADGE_FAMILIES.find((f) => f.key === 'volume')!
  const zero = { total: 0, species: 0, released: 0, activeWeeks: 0, seasons: 0, measured: 0 }

  it('palier intermédiaire : médaille atteinte + progression vers le suivant', () => {
    const earned = new Map<string, UserBadgeRow>([
      ['volume_10', row('volume_10', 1)],
      ['volume_50', row('volume_50', 2)],
    ])
    const s = familyState(volume, earned, { ...zero, total: 73 })
    expect(s.highestTier).toBe(2)
    expect(s.next?.slug).toBe('volume_200')
    expect(s.complete).toBe(false)
    // (73 - 50) / (200 - 50) = 23 / 150
    expect(s.progress).toBeCloseTo(23 / 150, 5)
  })

  it('famille complète : progress = 1, next = null', () => {
    const earned = new Map<string, UserBadgeRow>([
      ['volume_10', row('volume_10', 1)],
      ['volume_50', row('volume_50', 2)],
      ['volume_200', row('volume_200', 3)],
    ])
    const s = familyState(volume, earned, { ...zero, total: 240 })
    expect(s.complete).toBe(true)
    expect(s.next).toBeNull()
    expect(s.progress).toBe(1)
  })

  it('rien gagné : highestTier 0, progression vers le 1er palier', () => {
    const s = familyState(volume, new Map(), { ...zero, total: 5 })
    expect(s.highestTier).toBe(0)
    expect(s.next?.slug).toBe('volume_10')
    expect(s.progress).toBeCloseTo(5 / 10, 5)
  })
})

describe('recomputeMyBadges', () => {
  it('appelle le RPC recompute_my_badges et renvoie les badges', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: '1', user_id: 'u', badge_slug: 'first_catch', earned_at: '2026-06-01T00:00:00Z', meta: null, tier: 1, target: 1, progress: 1 },
      ],
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ rpc } as never)

    const res = await recomputeMyBadges()
    expect(rpc).toHaveBeenCalledWith('recompute_my_badges')
    expect(res).toHaveLength(1)
    expect(res[0].badge_slug).toBe('first_catch')
  })

  it('renvoie [] (best-effort) si la RPC échoue', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue({ rpc } as never)
    expect(await recomputeMyBadges()).toEqual([])
  })

  it('idempotence : deux appels renvoient le même earned_at (DO NOTHING côté RPC)', async () => {
    const r = {
      id: '1',
      user_id: 'u',
      badge_slug: 'first_catch',
      earned_at: '2026-06-01T00:00:00Z',
      meta: null,
      tier: 1,
      target: 1,
      progress: 1,
    }
    const rpc = vi.fn().mockResolvedValue({ data: [r], error: null })
    vi.mocked(createClient).mockResolvedValue({ rpc } as never)

    const first = await recomputeMyBadges()
    const second = await recomputeMyBadges()
    expect(first[0].earned_at).toBe(second[0].earned_at)
  })
})
