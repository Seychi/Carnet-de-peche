import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { toggleFavoriteSpot, isFavoriteSpot } from '../favorites'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }
const SPOT = 'cccccccc-0000-4000-8000-000000000001'

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  const sb = makeSupabase(opts)
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(sb)
  return sb
}

beforeEach(() => vi.clearAllMocks())

// Sprint 72 Bloc 3 : favoris tous tiers, cap 10 (trigger DB), RLS own-only en backstop.
describe('toggleFavoriteSpot', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    const r = await toggleFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Connecte-toi') })
  })

  it('refuse un identifiant invalide', async () => {
    mock({ user: USER })
    const r = await toggleFavoriteSpot('pas-un-uuid')
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Identifiant') })
  })

  it('ajoute quand le spot n’est pas encore favori', async () => {
    mock({
      user: USER,
      tables: {
        favorite_spots: [
          { data: null, error: null }, // select : pas encore favori
          { data: null, error: null }, // insert OK
        ],
      },
    })
    const r = await toggleFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: true, data: { favorite: true } })
  })

  it('retire quand le spot est déjà favori', async () => {
    mock({
      user: USER,
      tables: {
        favorite_spots: [
          { data: { spot_id: SPOT }, error: null }, // select : déjà favori
          { data: null, error: null }, // delete OK
        ],
      },
    })
    const r = await toggleFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: true, data: { favorite: false } })
  })

  it('remonte le cap 10 du trigger DB en message FR honnête', async () => {
    mock({
      user: USER,
      tables: {
        favorite_spots: [
          { data: null, error: null },
          { data: null, error: { message: 'max_favorite_spots', code: 'P0001' } },
        ],
      },
    })
    const r = await toggleFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: false, error: expect.stringContaining('10 favoris') })
  })

  it('mappe un refus RLS (spot invisible) sans détail technique', async () => {
    mock({
      user: USER,
      tables: {
        favorite_spots: [
          { data: null, error: null },
          {
            data: null,
            error: {
              message: 'new row violates row-level security policy for table "favorite_spots"',
              code: '42501',
            },
          },
        ],
      },
    })
    const r = await toggleFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: false, error: expect.stringContaining('pas disponible') })
  })

  it('traite le doublon (course double-clic, 23505) comme un succès idempotent', async () => {
    mock({
      user: USER,
      tables: {
        favorite_spots: [
          { data: null, error: null },
          { data: null, error: { message: 'duplicate key value', code: '23505' } },
        ],
      },
    })
    const r = await toggleFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: true, data: { favorite: true } })
  })
})

describe('isFavoriteSpot', () => {
  it('anonyme → false sans erreur (best-effort, jamais de throw)', async () => {
    mock({ user: null })
    const r = await isFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: true, data: { favorite: false } })
  })

  it('uuid invalide → false (pas de requête)', async () => {
    const sb = mock({ user: USER })
    const r = await isFavoriteSpot('nope')
    expect(r).toEqual({ ok: true, data: { favorite: false } })
    expect(sb.from).not.toHaveBeenCalled()
  })

  it('favori existant → true', async () => {
    mock({
      user: USER,
      tables: { favorite_spots: { data: { spot_id: SPOT }, error: null } },
    })
    const r = await isFavoriteSpot(SPOT)
    expect(r).toEqual({ ok: true, data: { favorite: true } })
  })
})
