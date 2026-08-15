import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'node:crypto'

// `server-only` n'est pas résoluble hors bundler Next : même contournement que
// les autres tests de modules serveur du projet.
vi.mock('server-only', () => ({}))

const { verifyResendSignature, decideSuppression } = await import('@/lib/email/resend-webhook')
type ResendEvent = Parameters<typeof decideSuppression>[0]

// Secret de test au format Resend/Svix : `whsec_` + base64.
const SECRET = 'whsec_' + Buffer.from('un-secret-de-test-pour-vitest').toString('base64')
const NOW_MS = 1_760_000_000_000
const TS = String(Math.floor(NOW_MS / 1000))
const ID = 'msg_2abc'

function sign(body: string, secret = SECRET, id = ID, ts = TS): string {
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64')
  return 'v1,' + createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')
}

describe('verifyResendSignature — la porte d’entrée du webhook', () => {
  const body = JSON.stringify({ type: 'email.bounced' })

  it('accepte une signature légitime', () => {
    const res = verifyResendSignature(
      body,
      { id: ID, timestamp: TS, signature: sign(body) },
      SECRET,
      NOW_MS,
    )
    expect(res.ok).toBe(true)
  })

  it('refuse un corps modifié après signature (rejeu altéré)', () => {
    const signature = sign(body)
    const res = verifyResendSignature(
      body + ' ',
      { id: ID, timestamp: TS, signature },
      SECRET,
      NOW_MS,
    )
    expect(res.ok).toBe(false)
  })

  it('refuse une signature produite avec un autre secret', () => {
    const autre = 'whsec_' + Buffer.from('mauvais-secret').toString('base64')
    const res = verifyResendSignature(
      body,
      { id: ID, timestamp: TS, signature: sign(body, autre) },
      SECRET,
      NOW_MS,
    )
    expect(res.ok).toBe(false)
  })

  it('refuse un horodatage hors fenêtre, dans le passé comme dans le futur', () => {
    const vieux = String(Math.floor(NOW_MS / 1000) - 600)
    const futur = String(Math.floor(NOW_MS / 1000) + 600)
    for (const ts of [vieux, futur]) {
      const res = verifyResendSignature(
        body,
        { id: ID, timestamp: ts, signature: sign(body, SECRET, ID, ts) },
        SECRET,
        NOW_MS,
      )
      expect(res.ok).toBe(false)
    }
  })

  it('accepte quand UNE des signatures de l’en-tête correspond (rotation de secret)', () => {
    const header = `v1,bm90LWEtc2lnbmF0dXJl ${sign(body)}`
    const res = verifyResendSignature(
      body,
      { id: ID, timestamp: TS, signature: header },
      SECRET,
      NOW_MS,
    )
    expect(res.ok).toBe(true)
  })

  it('refuse quand un en-tête manque, sans jamais lever d’exception', () => {
    for (const headers of [
      { id: null, timestamp: TS, signature: sign(body) },
      { id: ID, timestamp: null, signature: sign(body) },
      { id: ID, timestamp: TS, signature: null },
    ]) {
      expect(() => verifyResendSignature(body, headers, SECRET, NOW_MS)).not.toThrow()
      expect(verifyResendSignature(body, headers, SECRET, NOW_MS).ok).toBe(false)
    }
  })

  it('refuse une signature de longueur différente sans planter (timingSafeEqual)', () => {
    // timingSafeEqual lève si les longueurs diffèrent : la garde doit filtrer avant.
    const res = verifyResendSignature(
      body,
      { id: ID, timestamp: TS, signature: 'v1,YWJj' },
      SECRET,
      NOW_MS,
    )
    expect(res.ok).toBe(false)
  })
})

describe('decideSuppression — on ne coupe que ce qui est définitif', () => {
  const bounced = (type: string): ResendEvent => ({
    type: 'email.bounced',
    data: { to: ['mort@exemple.fr'], bounce: { type, subType: 'General' } },
  })

  it('coupe sur un rebond permanent', () => {
    const d = decideSuppression(bounced('Permanent'))
    expect(d).toMatchObject({ suppress: true, email: 'mort@exemple.fr', reason: 'hard_bounce' })
  })

  it('NE coupe PAS sur un rebond passager (boîte pleine, indisponibilité)', () => {
    // Couper quelqu'un parce que sa boîte était pleine un mardi serait une perte
    // sèche : c'est le faux positif que ce test verrouille.
    expect(decideSuppression(bounced('Transient')).suppress).toBe(false)
    expect(decideSuppression(bounced('Undetermined')).suppress).toBe(false)
    expect(decideSuppression(bounced('')).suppress).toBe(false)
  })

  it('coupe sur une plainte pour indésirable', () => {
    const d = decideSuppression({
      type: 'email.complained',
      data: { to: 'plaignant@exemple.fr' },
    })
    expect(d).toMatchObject({ suppress: true, reason: 'complaint' })
  })

  it('ignore les événements hors périmètre (livraison, ouverture, clic)', () => {
    for (const type of ['email.sent', 'email.delivered', 'email.opened', 'email.clicked']) {
      expect(decideSuppression({ type, data: { to: ['x@exemple.fr'] } }).suppress).toBe(false)
    }
  })

  it('ignore un événement sans destinataire exploitable', () => {
    expect(decideSuppression({ type: 'email.bounced', data: {} }).suppress).toBe(false)
    expect(decideSuppression({ type: 'email.bounced', data: { to: [] } }).suppress).toBe(false)
    expect(decideSuppression({}).suppress).toBe(false)
  })
})
