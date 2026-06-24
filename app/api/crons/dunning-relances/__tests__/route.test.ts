import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────
// Client admin : query builder chaînable. On distingue le SELECT J-1 du SELECT
// J+2 par les colonnes demandées (stripe_price_id vs status). Les UPDATE renvoient
// { error: null } et sont enregistrés (updateSpy) pour vérifier l'idempotence.
const { fromMock, updateSpy, setJ1Rows, setWinbackRows } = vi.hoisted(() => {
  let j1Rows: unknown[] = []
  let winbackRows: unknown[] = []
  const updateSpy = vi.fn()

  function makeBuilder() {
    let mode: 'select' | 'update' = 'select'
    let selectCols = ''
    let payload: unknown = null
    const builder: Record<string, unknown> = {}

    builder.select = vi.fn((cols: string) => {
      selectCols = cols
      return builder
    })
    builder.update = vi.fn((p: unknown) => {
      mode = 'update'
      payload = p
      return builder
    })
    for (const m of ['is', 'not', 'gte', 'lte']) {
      builder[m] = vi.fn(() => builder)
    }
    builder.eq = vi.fn(() => {
      // Étape terminale d'un UPDATE.
      if (mode === 'update') {
        updateSpy(payload)
        return Promise.resolve({ error: null })
      }
      return builder
    })
    // Thenable : un SELECT chaîné est awaité → renvoie la bonne file selon les colonnes.
    builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
      const rows = selectCols.includes('stripe_price_id') ? j1Rows : winbackRows
      return resolve({ data: rows, error: null })
    }
    return builder
  }

  const fromMock = vi.fn(() => makeBuilder())

  return {
    fromMock,
    updateSpy,
    setJ1Rows: (r: unknown[]) => {
      j1Rows = r
    },
    setWinbackRows: (r: unknown[]) => {
      winbackRows = r
    },
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: fromMock }),
}))

const { sendEmailMock, getRecipientMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  getRecipientMock: vi.fn(),
}))
vi.mock('@/lib/email/send', () => ({ sendEmail: sendEmailMock }))
vi.mock('@/lib/email/recipient', () => ({ getEmailRecipient: getRecipientMock }))

// Templates : rendu non testé ici (couvert par emails/__tests__).
vi.mock('@/emails/trial-ending-j1', () => ({ default: () => null }))
vi.mock('@/emails/post-trial-winback', () => ({ default: () => null }))

// Pricing : éviter de dépendre des env vars Stripe.
vi.mock('@/lib/stripe/pricing', () => ({
  priceIdToPlan: () => 'local',
  priceIdToInterval: () => 'monthly',
  PLAN_PRICING: { local: { monthly: { amount: '4,90 €' } } },
}))

import { GET } from '@/app/api/crons/dunning-relances/route'

function makeRequest(secret = 'test-secret') {
  return {
    headers: { get: (k: string) => (k === 'authorization' ? `Bearer ${secret}` : null) },
  } as unknown as Parameters<typeof GET>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  setJ1Rows([])
  setWinbackRows([])
  sendEmailMock.mockResolvedValue({ sent: true })
  getRecipientMock.mockResolvedValue({ email: 'julien@test.fr', firstName: 'Julien' })
})

describe('cron dunning-relances — sécurité', () => {
  it('rejette une requête sans le bon Bearer (fail-closed 401)', async () => {
    const req = {
      headers: { get: () => 'Bearer mauvais' },
    } as unknown as Parameters<typeof GET>[0]
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('cron dunning-relances — J-1 transactionnel', () => {
  it('envoie le J-1 et pose le marqueur trial_reminder_j1_at (anti-doublon)', async () => {
    setJ1Rows([
      {
        user_id: 'u1',
        stripe_price_id: 'price_x',
        trial_end: new Date(Date.now() + 3.6e6).toISOString(),
      },
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.sentJ1).toBe(1)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ trial_reminder_j1_at: expect.any(String) }),
    )
  })

  it('ne renvoie pas le J-1 quand aucune sub trialing en fenêtre', async () => {
    setJ1Rows([]) // la requête filtre déjà sur trial_reminder_j1_at IS NULL
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.sentJ1).toBe(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

describe('cron dunning-relances — J+2 win-back marketing', () => {
  it('envoie le win-back à un essai NON converti opt-in', async () => {
    setWinbackRows([{ user_id: 'u2', status: 'canceled' }])
    getRecipientMock.mockResolvedValue({
      email: 'julien@test.fr',
      firstName: 'Julien',
      unsubToken: 'tok',
    })
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.sentWinback).toBe(1)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(getRecipientMock).toHaveBeenCalledWith('u2', { marketing: true })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ post_trial_winback_at: expect.any(String) }),
    )
  })

  it('n\'envoie PAS le win-back si converti (status active) mais pose le marqueur', async () => {
    setWinbackRows([{ user_id: 'u3', status: 'active' }])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.sentWinback).toBe(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ post_trial_winback_at: expect.any(String) }),
    )
  })

  it('respecte l\'opt-out : getEmailRecipient renvoie null → pas d\'envoi, marqueur posé', async () => {
    setWinbackRows([{ user_id: 'u4', status: 'canceled' }])
    getRecipientMock.mockResolvedValue(null) // désinscrit
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.sentWinback).toBe(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ post_trial_winback_at: expect.any(String) }),
    )
  })
})
