import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { confirmSpot } from '../spots'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }
const OTHER = 'eeeeeeee-0000-4000-8000-000000000002'
const SPOT = 'cccccccc-0000-4000-8000-000000000001'

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase(opts))
}

beforeEach(() => vi.clearAllMocks())

// Sprint 51 WS-D : un créateur ne peut pas confirmer SON propre spot (anti-inflation
// du compteur « K pêcheurs confirment »). Garde serveur + backstop RLS (migration 093).
// Le repo n'a pas d'infra de test RLS : la policy se vérifie en SQL live (cf RECAP).
describe('confirmSpot — anti auto-confirmation (sprint 51 WS-D)', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    const r = await confirmSpot(SPOT)
    expect(r.ok).toBe(false)
  })

  it('refuse un identifiant invalide', async () => {
    mock({ user: USER })
    const r = await confirmSpot('pas-un-uuid')
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Identifiant') })
  })

  it('refuse au créateur de confirmer son propre spot', async () => {
    mock({
      user: USER,
      tables: { spots: { data: { created_by: USER.id }, error: null } },
    })
    const r = await confirmSpot(SPOT)
    expect(r).toEqual({ ok: false, error: 'Tu ne peux pas confirmer ton propre spot.' })
  })

  it('autorise un autre pêcheur à confirmer', async () => {
    mock({
      user: USER,
      tables: {
        spots: { data: { created_by: OTHER }, error: null },
        spot_confirmations: { data: null, error: null },
      },
    })
    const r = await confirmSpot(SPOT)
    expect(r).toEqual({ ok: true, data: undefined })
  })

  it('autorise la confirmation d’un import OSM (created_by null)', async () => {
    mock({
      user: USER,
      tables: {
        spots: { data: { created_by: null }, error: null },
        spot_confirmations: { data: null, error: null },
      },
    })
    const r = await confirmSpot(SPOT)
    expect(r).toEqual({ ok: true, data: undefined })
  })
})
