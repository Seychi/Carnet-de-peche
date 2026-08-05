import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@react-email/components'
import type { FishingWindow } from '@/lib/solunar/types'

// `server-only` jette hors d'un Server Component. En test (env node), on le neutralise.
vi.mock('server-only', () => ({}))

const {
  insertMock,
  maybeSingleMock,
  getRecipientMock,
  sendEmailMock,
  captureMock,
  nextWindowMock,
  upcomingMock,
} = vi.hoisted(() => ({
  insertMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  getRecipientMock: vi.fn(),
  sendEmailMock: vi.fn(),
  captureMock: vi.fn(),
  nextWindowMock: vi.fn(),
  upcomingMock: vi.fn(),
}))

// `insert` = journalisation ; la chaîne `select().eq().eq().eq().maybeSingle()`
// = lecture de dédup (le journal 108 fait foi avant tout envoi).
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      insert: insertMock,
      select: () => ({
        eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }) }),
      }),
    }),
  }),
}))
vi.mock('@/lib/email/recipient', () => ({ getEmailRecipient: getRecipientMock }))
vi.mock('@/lib/email/send', () => ({ sendEmail: sendEmailMock }))
vi.mock('@/lib/analytics/server', () => ({ captureServerEvent: captureMock }))
vi.mock('@/lib/conditions/dept-window', () => ({
  getDeptNextWindow: nextWindowMock,
  getDeptUpcomingWindows: upcomingMock,
}))

import {
  sendWelcomeEmail,
  sendFirstWindowEmail,
  sendImportNudgeEmail,
  sendWeeklyWindowEmail,
  pickWeekendWindow,
  toWindowParts,
} from '@/lib/lifecycle/send'

const NOW = new Date('2026-08-05T07:00:00Z') // mercredi 09:00 Paris

// Fixture minimale : seuls les champs lus par toWindowParts comptent. Le cast
// évite de recopier tout ScoringFactors, qui n'a aucun rôle ici.
function windowAt(startISO: string, startLocal: string, score = 70): FishingWindow {
  return {
    startTimeISO: startISO,
    endTimeISO: startISO,
    startLocal,
    endLocal: startLocal,
    score,
    quality: 'bonne',
    factors: { reasons: ['Lever de lune', 'Marée descendante'] },
  } as unknown as FishingWindow
}

async function renderedHtml(): Promise<string> {
  return render(sendEmailMock.mock.calls[0][0].react as React.ReactElement)
}

beforeEach(() => {
  vi.clearAllMocks()
  getRecipientMock.mockResolvedValue({
    email: 'julien@test.fr',
    firstName: 'Julien',
    unsubToken: 'tok-1',
  })
  sendEmailMock.mockResolvedValue({ sent: true })
  insertMock.mockResolvedValue({ error: null })
  maybeSingleMock.mockResolvedValue({ data: null, error: null }) // rien encore envoyé
  captureMock.mockResolvedValue(undefined)
  nextWindowMock.mockResolvedValue(windowAt('2026-08-06T04:10:00Z', '06:10'))
  upcomingMock.mockResolvedValue([])
})

// ─── Pipeline commun ──────────────────────────────────────────────────────────

describe('sendWelcomeEmail', () => {
  it('happy path : envoi, journal (welcome/once), event de mesure', async () => {
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(true)

    expect(getRecipientMock).toHaveBeenCalledWith('u1', { marketing: true })
    expect(sendEmailMock.mock.calls[0][0].to).toBe('julien@test.fr')
    expect(sendEmailMock.mock.calls[0][0].subject).toBe('Bienvenue dans Carnet de Pêche 🎣')
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'u1',
      kind: 'welcome',
      sent_key: 'once',
    })
    expect(captureMock).toHaveBeenCalledWith('u1', 'lifecycle_email_sent', { kind: 'welcome' })
  })

  it('OPT-OUT GLOBAL : destinataire null → aucun envoi, aucun journal', async () => {
    getRecipientMock.mockResolvedValue(null)
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('PAS DE DÉDUP FANTÔME : un envoi qui échoue n’est pas journalisé', async () => {
    sendEmailMock.mockResolvedValue({ sent: false })
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(false)
    expect(insertMock).not.toHaveBeenCalled()
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('sans département : part quand même, sans bloc créneau', async () => {
    expect(await sendWelcomeEmail('u1', null, NOW)).toBe(true)
    expect(nextWindowMock).not.toHaveBeenCalled()
    const html = await renderedHtml()
    expect(html).not.toContain('Secteur')
  })

  it('créneau indisponible : part quand même (le welcome n’a pas besoin du créneau)', async () => {
    nextWindowMock.mockResolvedValue(null)
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(true)
  })

  it('ne throw JAMAIS : une exception d’envoi renvoie false', async () => {
    sendEmailMock.mockRejectedValue(new Error('ECONNRESET'))
    await expect(sendWelcomeEmail('u1', '29', NOW)).resolves.toBe(false)
  })

  it('un journal en échec ne fait pas mentir le retour (l’email EST parti)', async () => {
    insertMock.mockResolvedValue({ error: { message: 'duplicate key' } })
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(true)
  })

  it('DÉDUP DURABLE : déjà journalisé → aucun 2e envoi, même si l’action est rejouée', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { user_id: 'u1' },
      error: null,
    })
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('journal illisible : on envoie quand même (fail-ouvert, jamais de silence)', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'db down' } })
    expect(await sendWelcomeEmail('u1', '29', NOW)).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})

describe('sendFirstWindowEmail', () => {
  it('sujet daté du créneau + nom du spot favori dans le corps', async () => {
    const ok = await sendFirstWindowEmail(
      'u1',
      '29',
      { name: 'Jetée de Roscoff', slug: 'jetee-de-roscoff' },
      NOW,
    )
    expect(ok).toBe(true)
    expect(sendEmailMock.mock.calls[0][0].subject).toBe('Ton prochain créneau : Demain 06:10')

    const html = await renderedHtml()
    expect(html).toContain('Jetée de Roscoff')
    expect(html).toContain('/spots/jetee-de-roscoff')
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'u1',
      kind: 'j1_window',
      sent_key: 'once',
    })
  })

  it('sans favori : pas de section spot, l’email part quand même', async () => {
    expect(await sendFirstWindowEmail('u1', '29', null, NOW)).toBe(true)
    const html = await renderedHtml()
    expect(html).not.toContain('Ton spot favori')
  })

  it('SANS CRÉNEAU : on n’envoie pas (l’email n’aurait plus d’objet)', async () => {
    nextWindowMock.mockResolvedValue(null)
    expect(await sendFirstWindowEmail('u1', '29', null, NOW)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })
})

describe('sendImportNudgeEmail', () => {
  it('un seul CTA (import), aucun appel au moteur de créneau', async () => {
    expect(await sendImportNudgeEmail('u1')).toBe(true)
    expect(nextWindowMock).not.toHaveBeenCalled()
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'u1',
      kind: 'j3_import',
      sent_key: 'once',
    })
    const html = await renderedHtml()
    expect(html).toContain('/carnet/import')
    expect(html).toContain('Importer mes prises')
  })
})

describe('sendWeeklyWindowEmail', () => {
  it('journalise avec la clé de SEMAINE, pas « once »', async () => {
    upcomingMock.mockResolvedValue([windowAt('2026-08-08T05:20:00Z', '07:20', 80)])
    expect(await sendWeeklyWindowEmail('u1', '29', '2026-W32', NOW)).toBe(true)
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'u1',
      kind: 'weekly_window',
      sent_key: '2026-W32',
    })
  })

  it('aucun créneau de week-end : on n’envoie pas plutôt que de mentir sur le titre', async () => {
    upcomingMock.mockResolvedValue([windowAt('2026-08-05T05:00:00Z', '07:00', 90)]) // mercredi
    expect(await sendWeeklyWindowEmail('u1', '29', '2026-W32', NOW)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

describe('pickWeekendWindow', () => {
  it('retient le meilleur score parmi les créneaux du week-end', () => {
    const picked = pickWeekendWindow([
      windowAt('2026-08-07T05:00:00Z', '07:00', 95), // vendredi : ignoré
      windowAt('2026-08-08T05:00:00Z', '07:00', 60), // samedi
      windowAt('2026-08-09T05:00:00Z', '07:00', 80), // dimanche
    ])
    expect(picked?.score).toBe(80)
  })

  it('renvoie null si aucun créneau ne tombe le week-end', () => {
    expect(pickWeekendWindow([windowAt('2026-08-05T05:00:00Z', '07:00')])).toBeNull()
  })

  it('liste vide : null', () => {
    expect(pickWeekendWindow([])).toBeNull()
  })
})

describe('toWindowParts', () => {
  it('libelle le secteur par le nom du département et borne les raisons', () => {
    const parts = toWindowParts(windowAt('2026-08-06T04:10:00Z', '06:10'), '29', NOW)
    expect(parts?.windowWhen).toBe('Demain 06:10')
    expect(parts?.placeLabel).toBe('Secteur Finistère')
    expect(parts?.reasons.length).toBeLessThanOrEqual(3)
  })

  it('null si pas de créneau', () => {
    expect(toWindowParts(null, '29', NOW)).toBeNull()
  })
})

// ─── Invariants de copy sur les 4 templates ───────────────────────────────────

describe('invariants de copy (CLAUDE.md §6 + honnêteté du brief)', () => {
  const cases: [string, () => Promise<unknown>][] = [
    ['welcome', () => sendWelcomeEmail('u1', '29', NOW)],
    ['j1_window', () => sendFirstWindowEmail('u1', '29', null, NOW)],
    ['j3_import', () => sendImportNudgeEmail('u1')],
    [
      'weekly_window',
      () => {
        upcomingMock.mockResolvedValue([windowAt('2026-08-08T05:20:00Z', '07:20', 80)])
        return sendWeeklyWindowEmail('u1', '29', '2026-W32', NOW)
      },
    ],
  ]

  for (const [kind, run] of cases) {
    it(`${kind} : UTM, désinscription un clic, zéro tiret cadratin, zéro % inventé`, async () => {
      await run()
      const html = await renderedHtml()

      // Sans UTM, le retour est invisible dans PostHog : c'est LA métrique du sprint.
      expect(html).toContain('utm_source=lifecycle')
      expect(html).toContain('utm_medium=email')
      expect(html).toContain(`utm_campaign=${kind}`)

      // RGPD : désinscription un clic présente sur tout email marketing.
      expect(html).toContain('/unsubscribe?token=tok-1')

      // Tic IA n°1 du projet : interdit en copy visible.
      expect(html).not.toContain('—')

      // Aucun pourcentage dans le texte visible (le CSS en contient légitimement).
      const visibleText = html.replace(/<[^>]+>/g, ' ')
      expect(visibleText).not.toMatch(/\d+\s*%(?!\s*gratuit)/)

      // Aucune coordonnée : pas de nombre à 4+ décimales.
      expect(html).not.toMatch(/-?\d+\.\d{4,}/)
    })
  }

  it('sans token de désinscription : lien de réglages seul, jamais de lien cassé', async () => {
    getRecipientMock.mockResolvedValue({ email: 'j@test.fr', firstName: 'Julien' })
    await sendWelcomeEmail('u1', '29', NOW)
    const html = await renderedHtml()
    expect(html).not.toContain('/unsubscribe?token=undefined')
    expect(html).toContain('/notifications')
  })
})
