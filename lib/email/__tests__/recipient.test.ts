import { describe, it, expect, vi, beforeEach } from 'vitest'

// `server-only` jette hors d'un Server Component. En test (env node), on le neutralise.
vi.mock('server-only', () => ({}))

// Mock du client service-role : on contrôle auth.admin.getUserById + la lecture profiles.
const { getUserByIdMock, maybeSingleMock } = vi.hoisted(() => ({
  getUserByIdMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    auth: { admin: { getUserById: getUserByIdMock } },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: maybeSingleMock }),
      }),
    }),
  }),
}))

import { getEmailRecipient } from '@/lib/email/recipient'

beforeEach(() => {
  vi.clearAllMocks()
  getUserByIdMock.mockResolvedValue({
    data: { user: { email: 'julien@test.fr' } },
    error: null,
  })
})

describe('getEmailRecipient — distinction transactionnel / marketing', () => {
  it('transactionnel : renvoie le destinataire même si marketing_email_optin=false', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { display_name: 'Julien', marketing_email_optin: false, email_unsub_token: 'tok' },
    })
    const r = await getEmailRecipient('user-1') // pas d'opts → transactionnel
    expect(r).not.toBeNull()
    expect(r?.email).toBe('julien@test.fr')
    expect(r?.firstName).toBe('Julien')
    // Transactionnel : pas de token exposé.
    expect(r?.unsubToken).toBeUndefined()
  })

  it('marketing : renvoie null si désinscrit (opt-out)', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { display_name: 'Julien', marketing_email_optin: false, email_unsub_token: 'tok' },
    })
    const r = await getEmailRecipient('user-1', { marketing: true })
    expect(r).toBeNull()
  })

  it('marketing : renvoie le destinataire + le token si opt-in', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { display_name: 'Julien', marketing_email_optin: true, email_unsub_token: 'tok-123' },
    })
    const r = await getEmailRecipient('user-1', { marketing: true })
    expect(r).not.toBeNull()
    expect(r?.unsubToken).toBe('tok-123')
  })

  it('renvoie null si l\'utilisateur est introuvable', async () => {
    getUserByIdMock.mockResolvedValue({ data: { user: null }, error: { message: 'not found' } })
    const r = await getEmailRecipient('user-x')
    expect(r).toBeNull()
  })
})
