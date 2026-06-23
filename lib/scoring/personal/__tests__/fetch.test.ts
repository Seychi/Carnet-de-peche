import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'
import { getPersonalTendencies } from '../fetch'

const ME = 'aaaaaaaa-0000-4000-8000-000000000001'

function mockClient(user: { id: string } | null, rows: unknown[]) {
  const eq = vi.fn().mockReturnThis()
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq,
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockReturnValue(builder),
  }
  return { client, eq }
}

beforeEach(() => vi.clearAllMocks())

describe('getPersonalTendencies — anti-usurpation', () => {
  it("filtre TOUJOURS sur l'uid serveur (auth.getUser), pas un uid client", async () => {
    const rows = [
      { species: 'bar', spot_id: 's1', caught_at: '2026-06-15T07:00:00Z', wind_speed_kmh: 8, tide_state: 'rising', conditions: null },
      { species: 'bar', spot_id: 's1', caught_at: '2026-06-15T07:00:00Z', wind_speed_kmh: 8, tide_state: 'rising', conditions: null },
      { species: 'bar', spot_id: 's1', caught_at: '2026-06-15T07:00:00Z', wind_speed_kmh: 8, tide_state: 'rising', conditions: null },
    ]
    const { client, eq } = mockClient({ id: ME }, rows)
    vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await getPersonalTendencies({ species: 'bar' })

    // L'uid utilisé est CELUI de la session, jamais un paramètre.
    expect(eq).toHaveBeenCalledWith('user_id', ME)
    expect(res.sampleCount).toBe(3)
    expect(res.species).toBe('bar')
  })

  it('renvoie un résultat vide pour un anonyme', async () => {
    const { client } = mockClient(null, [])
    vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await getPersonalTendencies()
    expect(res.sampleCount).toBe(0)
    expect(res.hasEnough).toBe(false)
    expect(res.tendencies).toHaveLength(0)
  })
})
