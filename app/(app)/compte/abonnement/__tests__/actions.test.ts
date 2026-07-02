import { describe, expect, it, vi, beforeEach } from 'vitest'
import { makeSupabase } from '@/app/actions/__tests__/_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { redeemFounderCode } from '../actions'

function fd(code: string) {
  const f = new FormData()
  f.set('code', code)
  return f
}

function mockClient(opts: Parameters<typeof makeSupabase>[0]) {
  const supabase = makeSupabase(opts)
  vi.mocked(createClient).mockResolvedValue(supabase as never)
  return supabase
}

const IDLE = { status: 'idle' } as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe('redeemFounderCode', () => {
  it('refuse un anonyme', async () => {
    mockClient({ user: null })
    const res = await redeemFounderCode(IDLE, fd('FDR-AAAA-BBBB'))
    expect(res.status).toBe('error')
  })

  it('rejette un code trop court sans appeler la RPC', async () => {
    const supabase = mockClient({ user: { id: 'u1' } })
    const res = await redeemFounderCode(IDLE, fd('ab'))
    expect(res.status).toBe('error')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('échange un code valide → granted avec tier et expiration', async () => {
    const supabase = mockClient({
      user: { id: 'u1' },
      rpc: {
        redeem_comp_code: {
          data: { ok: true, tier: 'local', expires_at: '2027-01-02T00:00:00Z' },
        },
      },
    })
    const res = await redeemFounderCode(IDLE, fd('fdr-aaaa-bbbb'))
    expect(res).toEqual({
      status: 'granted',
      tier: 'local',
      expiresAt: '2027-01-02T00:00:00Z',
    })
    expect(supabase.rpc).toHaveBeenCalledWith('redeem_comp_code', { p_code: 'fdr-aaaa-bbbb' })
  })

  it('mappe chaque erreur RPC en message doux', async () => {
    const cases: Array<[string, string]> = [
      ['invalid', 'Code non reconnu. Vérifie la saisie.'],
      ['expired', 'Ce code a expiré.'],
      ['exhausted', 'Ce code a déjà été utilisé le nombre maximal de fois.'],
      ['already_redeemed', 'Tu as déjà échangé ce code.'],
    ]
    for (const [code, message] of cases) {
      mockClient({
        user: { id: 'u1' },
        rpc: { redeem_comp_code: { data: { ok: false, error: code } } },
      })
      const res = await redeemFounderCode(IDLE, fd('FDR-AAAA-BBBB'))
      expect(res).toEqual({ status: 'error', error: message })
    }
  })

  it('remonte un message générique sur erreur transport', async () => {
    mockClient({
      user: { id: 'u1' },
      rpc: { redeem_comp_code: { data: null, error: { message: 'boom' } } },
    })
    const res = await redeemFounderCode(IDLE, fd('FDR-AAAA-BBBB'))
    expect(res.status).toBe('error')
    if (res.status === 'error') expect(res.error).toContain('erreur')
  })
})
