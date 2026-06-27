import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'
import { recomputeMyBadges, getMyBadges, BADGES, BADGE_BY_SLUG } from '../badges'

beforeEach(() => vi.clearAllMocks())

describe('BADGES (référentiel)', () => {
  it('contient les 7 badges SQL-dérivables, slugs uniques', () => {
    const slugs = BADGES.map((b) => b.slug)
    expect(slugs).toHaveLength(7)
    expect(new Set(slugs).size).toBe(7)
    expect(BADGE_BY_SLUG['pokedex_complete'].label).toBe('Pokédex complet')
    expect(BADGE_BY_SLUG['prise_mesuree'].label).toBe('Prise mesurée')
  })
})

describe('recomputeMyBadges', () => {
  it('appelle le RPC recompute_my_badges et renvoie les badges', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: '1', user_id: 'u', badge_slug: 'first_catch', earned_at: '2026-06-01T00:00:00Z', meta: null },
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
    const row = {
      id: '1',
      user_id: 'u',
      badge_slug: 'first_catch',
      earned_at: '2026-06-01T00:00:00Z',
      meta: null,
    }
    const rpc = vi.fn().mockResolvedValue({ data: [row], error: null })
    vi.mocked(createClient).mockResolvedValue({ rpc } as never)

    const first = await recomputeMyBadges()
    const second = await recomputeMyBadges()
    expect(first[0].earned_at).toBe(second[0].earned_at)
  })
})

describe('getMyBadges', () => {
  it('lit user_badges trié par earned_at (RLS own-only côté DB)', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: '1', user_id: 'u', badge_slug: 'ten_catches', earned_at: '2026-06-02T00:00:00Z', meta: null }],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ order })
    const from = vi.fn().mockReturnValue({ select })
    vi.mocked(createClient).mockResolvedValue({ from } as never)

    const res = await getMyBadges()
    expect(from).toHaveBeenCalledWith('user_badges')
    expect(order).toHaveBeenCalledWith('earned_at', { ascending: true })
    expect(res[0].badge_slug).toBe('ten_catches')
  })
})
