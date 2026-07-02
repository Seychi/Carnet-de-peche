import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { getLeaderboard } from '../leaderboard'
import type { LeaderboardParams } from '@/lib/gamification/leaderboard'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }

// Installe le client mocké ET le renvoie (pour inspecter les args de rpc).
function mockClient(opts: Parameters<typeof makeSupabase>[0]) {
  const client = makeSupabase(opts)
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client)
  return client
}

// Extrait l'objet d'arguments du 1er appel rpc (le mock est typé 1-param, on caste).
function firstRpcArgs(client: ReturnType<typeof makeSupabase>): Record<string, unknown> {
  const call = client.rpc.mock.calls[0] as unknown as [string, Record<string, unknown>]
  return call[1]
}

const DEFAULT: LeaderboardParams = { scope: 'national', metric: 'xp', period: 'season' }

beforeEach(() => vi.clearAllMocks())

describe('getLeaderboard', () => {
  it('refuse un anonyme (connectés uniquement)', async () => {
    mockClient({ user: null })
    const res = await getLeaderboard(DEFAULT)
    expect(res.ok).toBe(false)
  })

  it('mappe les lignes RPC snake_case → camelCase', async () => {
    mockClient({
      user: USER,
      rpc: {
        get_leaderboard: {
          data: [
            { rank: 1, user_id: 'u1', username: 'kevin', avatar_url: 'http://a/1.webp', metric_value: 1500 },
            { rank: 2, user_id: 'u2', username: 'lea', avatar_url: null, metric_value: 900 },
          ],
        },
      },
    })
    const res = await getLeaderboard(DEFAULT)
    expect(res).toEqual({
      ok: true,
      rows: [
        { rank: 1, userId: 'u1', username: 'kevin', avatarUrl: 'http://a/1.webp', metricValue: 1500, isSelf: false, eligibleCount: 0 },
        { rank: 2, userId: 'u2', username: 'lea', avatarUrl: null, metricValue: 900, isSelf: false, eligibleCount: 0 },
      ],
    })
  })

  it('remonte une erreur RPC proprement', async () => {
    mockClient({ user: USER, rpc: { get_leaderboard: { error: { message: 'boom' } } } })
    const res = await getLeaderboard(DEFAULT)
    expect(res.ok).toBe(false)
  })

  it('liste blanche : scope/metric/period inconnus → national/xp/season', async () => {
    const client = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard({ scope: 'hack', metric: 'evil', period: 'forever' } as unknown as LeaderboardParams)
    const args = firstRpcArgs(client)
    expect(args.p_scope).toBe('national')
    expect(args.p_metric).toBe('xp')
    expect(args.p_period).toBe('season')
  })

  it('borne dept (≤3) et species (≤40) → sinon null (anti-abus)', async () => {
    const client = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard({
      ...DEFAULT,
      scope: 'department',
      dept: 'TROP_LONG',
      species: 'x'.repeat(50),
    })
    const args = firstRpcArgs(client)
    expect(args.p_dept).toBeNull()
    expect(args.p_species).toBeNull()
  })

  it('passe des dept/species valides tels quels', async () => {
    const client = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard({ ...DEFAULT, scope: 'department', dept: '29', species: 'bar' })
    const args = firstRpcArgs(client)
    expect(args.p_dept).toBe('29')
    expect(args.p_species).toBe('bar')
  })

  it('seasonOffset absent → 0 (saison courante)', async () => {
    const client = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard(DEFAULT)
    expect(firstRpcArgs(client).p_season_offset).toBe(0)
  })

  it('borne le seasonOffset : positif interdit → 0, très négatif → -40', async () => {
    const c1 = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard({ ...DEFAULT, seasonOffset: 5 })
    expect(firstRpcArgs(c1).p_season_offset).toBe(0)

    vi.clearAllMocks()
    const c2 = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard({ ...DEFAULT, seasonOffset: -100 })
    expect(firstRpcArgs(c2).p_season_offset).toBe(-40)
  })

  it('passe un seasonOffset valide (saison précédente) tel quel', async () => {
    const client = mockClient({ user: USER, rpc: { get_leaderboard: { data: [] } } })
    await getLeaderboard({ ...DEFAULT, seasonOffset: -1 })
    expect(firstRpcArgs(client).p_season_offset).toBe(-1)
  })

  // ── Sprint 69 : is_self + eligible_count dans le mapping ──

  it('mappe is_self et eligible_count (ligne self sous le seuil)', async () => {
    mockClient({
      user: USER,
      rpc: {
        get_leaderboard: {
          data: [
            {
              rank: 1,
              user_id: USER.id,
              username: 'moi',
              avatar_url: null,
              metric_value: '305',
              is_self: true,
              eligible_count: 1,
            },
          ],
        },
      },
    })
    const res = await getLeaderboard(DEFAULT)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.rows[0]).toEqual({
        rank: 1,
        userId: USER.id,
        username: 'moi',
        avatarUrl: null,
        metricValue: 305,
        isSelf: true,
        eligibleCount: 1,
      })
    }
  })

  it('défaulte isSelf=false / eligibleCount=0 si la RPC ne les renvoie pas (robustesse)', async () => {
    mockClient({
      user: USER,
      rpc: {
        get_leaderboard: {
          data: [
            { rank: 1, user_id: 'x', username: 'a', avatar_url: null, metric_value: 10 },
          ],
        },
      },
    })
    const res = await getLeaderboard(DEFAULT)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.rows[0].isSelf).toBe(false)
      expect(res.rows[0].eligibleCount).toBe(0)
    }
  })
})
