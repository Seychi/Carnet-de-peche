import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { toggleFollow, getFollowSuggestions, listFollowing, listFollowers } from '../follow'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }
const TARGET = 'eeeeeeee-0000-4000-8000-000000000001'
const OTHER = 'ffffffff-0000-4000-8000-000000000002'

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase(opts))
}

beforeEach(() => vi.clearAllMocks())

describe('toggleFollow', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await toggleFollow(TARGET)).ok).toBe(false)
  })

  it('refuse de se suivre soi-même', async () => {
    mock({ user: USER })
    expect((await toggleFollow(USER.id)).ok).toBe(false)
  })

  it('refuse un id invalide', async () => {
    mock({ user: USER })
    expect((await toggleFollow('pas-un-uuid')).ok).toBe(false)
  })

  it('suit un pêcheur pas encore suivi', async () => {
    mock({ user: USER, tables: { follows: [{ data: null }, { error: null }] } })
    expect(await toggleFollow(TARGET)).toEqual({ ok: true, data: { following: true } })
  })

  it('se désabonne d’un pêcheur déjà suivi', async () => {
    mock({ user: USER, tables: { follows: [{ data: { follower_id: USER.id } }, { error: null }] } })
    expect(await toggleFollow(TARGET)).toEqual({ ok: true, data: { following: false } })
  })
})

describe('getFollowSuggestions', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await getFollowSuggestions()).ok).toBe(false)
  })

  it('renvoie une liste vide si pas de département', async () => {
    mock({ user: USER, tables: { profiles: { data: { home_department: null } } } })
    expect(await getFollowSuggestions()).toEqual({ ok: true, data: [] })
  })

  it('exclut les pêcheurs déjà suivis et se limite à 5', async () => {
    const candidates = Array.from({ length: 7 }, (_, i) => ({
      id: `id-${i}`,
      username: `user${i}`,
      display_name: `User ${i}`,
      avatar_url: null,
      home_department: '29',
    }))
    mock({
      user: USER,
      tables: {
        // 1) mon profil  2) mes follows  3) les candidats
        profiles: [{ data: { home_department: '29' } }, { data: candidates, error: null }],
        follows: { data: [{ following_id: 'id-0' }] },
      },
    })
    const r = await getFollowSuggestions()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data).toHaveLength(5)
      expect(r.data.map((u) => u.id)).not.toContain('id-0')
    }
  })
})

describe('listFollowing / listFollowers', () => {
  it('listFollowing refuse un anonyme', async () => {
    mock({ user: null })
    expect((await listFollowing(USER.id)).ok).toBe(false)
  })

  it('listFollowing renvoie les profils suivis', async () => {
    mock({
      user: USER,
      tables: {
        follows: { data: [{ following_id: TARGET }] },
        profiles: { data: [{ id: TARGET, username: 'cesar', display_name: 'César', avatar_url: null, home_department: '56' }] },
      },
    })
    const r = await listFollowing(USER.id)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data[0]?.username).toBe('cesar')
  })

  it('listFollowers renvoie les abonnés', async () => {
    mock({
      user: USER,
      tables: {
        follows: { data: [{ follower_id: OTHER }] },
        profiles: { data: [{ id: OTHER, username: 'bob', display_name: 'Bob', avatar_url: null, home_department: '29' }] },
      },
    })
    const r = await listFollowers(USER.id)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data[0]?.username).toBe('bob')
  })

  it('listFollowing renvoie [] si aucun suivi', async () => {
    mock({ user: USER, tables: { follows: { data: [] } } })
    expect(await listFollowing(USER.id)).toEqual({ ok: true, data: [] })
  })
})
