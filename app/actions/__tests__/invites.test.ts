import { describe, expect, it, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { mintInviteCodes, revokeCompGrant, disableInviteCode } from '../invites'

const GRANT_ID = '11111111-2222-4333-8444-555555555555'

function fd(entries: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.set(k, v)
  return f
}

function mockClient(opts: Parameters<typeof makeSupabase>[0]) {
  const supabase = makeSupabase(opts)
  vi.mocked(createClient).mockResolvedValue(supabase as never)
  return supabase
}

const MINT_FORM = { count: '10', label: 'vague test', maxUses: '1', tier: 'local', months: '6' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mintInviteCodes', () => {
  it('refuse un anonyme', async () => {
    mockClient({ user: null })
    const res = await mintInviteCodes(fd(MINT_FORM))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('Connecte-toi')
  })

  it('refuse un non-modérateur', async () => {
    mockClient({
      user: { id: 'u1' },
      tables: { profiles: { data: { is_moderator: false } } },
    })
    const res = await mintInviteCodes(fd(MINT_FORM))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('modérateur')
  })

  it('mint via la RPC avec les bons paramètres (défaut 6 mois)', async () => {
    const supabase = mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
      rpc: { create_invite_codes: { data: ['FDR-AAAA-BBBB', 'FDR-CCCC-DDDD'] } },
    })
    const res = await mintInviteCodes(fd(MINT_FORM))
    expect(res).toEqual({ ok: true, codes: ['FDR-AAAA-BBBB', 'FDR-CCCC-DDDD'] })
    expect(supabase.rpc).toHaveBeenCalledWith('create_invite_codes', {
      p_count: 10,
      p_label: 'vague test',
      p_max_uses: 1,
      p_grants_tier: 'local',
      p_grant_months: 6,
    })
  })

  it('durée vide → p_grant_months null (sans expiration, PAS le défaut SQL de 6)', async () => {
    const supabase = mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
      rpc: { create_invite_codes: { data: ['FDR-AAAA-BBBB'] } },
    })
    const res = await mintInviteCodes(fd({ ...MINT_FORM, months: '' }))
    expect(res.ok).toBe(true)
    const args = (vi.mocked(supabase.rpc).mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(args.p_grant_months).toBeNull()
  })

  it('rejette un count hors bornes', async () => {
    mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
    })
    const res = await mintInviteCodes(fd({ ...MINT_FORM, count: '500' }))
    expect(res.ok).toBe(false)
  })

  it('remonte un échec RPC sans exploser', async () => {
    mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
      rpc: { create_invite_codes: { data: null, error: { message: 'boom' } } },
    })
    const res = await mintInviteCodes(fd(MINT_FORM))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('La génération a échoué.')
  })
})

describe('revokeCompGrant', () => {
  it('refuse un anonyme', async () => {
    mockClient({ user: null })
    const res = await revokeCompGrant(GRANT_ID)
    expect(res.ok).toBe(false)
  })

  it('refuse un non-modérateur', async () => {
    mockClient({
      user: { id: 'u1' },
      tables: { profiles: { data: { is_moderator: false } } },
    })
    const res = await revokeCompGrant(GRANT_ID)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('modérateur')
  })

  it('rejette un id non-uuid', async () => {
    mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
    })
    const res = await revokeCompGrant('pas-un-uuid')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('Identifiant invalide.')
  })

  it('révoque via la RPC (idempotent : false SQL = succès quand même)', async () => {
    const supabase = mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
      rpc: { revoke_comp_grant: { data: false } },
    })
    const res = await revokeCompGrant(GRANT_ID)
    expect(res).toEqual({ ok: true })
    expect(supabase.rpc).toHaveBeenCalledWith('revoke_comp_grant', { p_grant_id: GRANT_ID })
  })
})

describe('disableInviteCode', () => {
  it('refuse un non-modérateur', async () => {
    mockClient({
      user: { id: 'u1' },
      tables: { profiles: { data: { is_moderator: false } } },
    })
    const res = await disableInviteCode('FDR-AAAA-BBBB')
    expect(res.ok).toBe(false)
  })

  it('désactive via la RPC', async () => {
    const supabase = mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
      rpc: { disable_invite_code: { data: true } },
    })
    const res = await disableInviteCode('FDR-AAAA-BBBB')
    expect(res).toEqual({ ok: true })
    expect(supabase.rpc).toHaveBeenCalledWith('disable_invite_code', { p_code: 'FDR-AAAA-BBBB' })
  })

  it('rejette un code trop court', async () => {
    mockClient({
      user: { id: 'mod' },
      tables: { profiles: { data: { is_moderator: true } } },
    })
    const res = await disableInviteCode('ab')
    expect(res.ok).toBe(false)
  })
})
