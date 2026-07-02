import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@react-email/components'
import type { SpotAlertPayload } from '@/lib/alerts/types'
import SpotAlertEmail from '@/lib/email/spot-alert-template'

// `server-only` jette hors d'un Server Component. En test (env node), on le neutralise.
vi.mock('server-only', () => ({}))

const { maybeSingleMock, getRecipientMock, sendEmailMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  getRecipientMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: maybeSingleMock }),
      }),
    }),
  }),
}))

vi.mock('@/lib/email/recipient', () => ({ getEmailRecipient: getRecipientMock }))
vi.mock('@/lib/email/send', () => ({ sendEmail: sendEmailMock }))

import { sendSpotAlertEmail } from '@/lib/email/spot-alert'

const persoPayload: SpotAlertPayload = {
  userId: 'user-1',
  spotId: 'spot-1',
  spotName: 'Pointe du Raz',
  spotSlug: 'pointe-du-raz',
  windowDate: '2026-07-03',
  windowLabel: 'demain 06:10',
  score: 82,
  kind: 'perso',
  justification:
    'Marée descendante, vent NO 12 km/h : 6 de tes 7 prises renseignées tombent en marée descendante.',
}

const generiquePayload: SpotAlertPayload = {
  ...persoPayload,
  windowLabel: 'demain 18:40',
  score: 74,
  kind: 'generique',
  justification: 'Alerte générique grande marée (marnage 9,4 m). Logue tes prises pour la personnaliser.',
}

// ─── Template (rendu HTML) ─────────────────────────────────────────────────────

describe('SpotAlertEmail — rendu du template', () => {
  it('perso : justification, heure mono, badge carnet, liens UTM/réglages/désinscription', async () => {
    const html = await render(
      <SpotAlertEmail
        firstName="Julien"
        spotName={persoPayload.spotName}
        spotSlug={persoPayload.spotSlug}
        windowLabel={persoPayload.windowLabel}
        kind="perso"
        justification={persoPayload.justification}
        unsubToken="tok-9"
      />
    )
    expect(html).toContain('6 de tes 7 prises renseignées')
    expect(html).toContain('Demain 06:10')
    expect(html).toContain('Pointe du Raz')
    expect(html).toContain('ton carnet') // badge « D'après ton carnet »
    // CTA fiche spot avec UTM du contrat de mesure (spot_alert / email).
    expect(html).toContain('/spots/pointe-du-raz')
    expect(html).toContain('utm_source=spot_alert')
    expect(html).toContain('utm_medium=email')
    // Réglages + désinscription en un clic (pattern S26).
    expect(html).toContain('/notifications')
    expect(html).toContain('/unsubscribe?token=tok-9')
    expect(html).toContain('Voir la fiche spot')
  })

  it('generique : label explicite, jamais « tes conditions », pas de pourcentage', async () => {
    const html = await render(
      <SpotAlertEmail
        firstName="Julien"
        spotName={generiquePayload.spotName}
        spotSlug={generiquePayload.spotSlug}
        windowLabel={generiquePayload.windowLabel}
        kind="generique"
        justification={generiquePayload.justification}
        unsubToken="tok-9"
      />
    )
    expect(html).toContain('Alerte générique')
    expect(html).toContain('grande marée')
    expect(html).toContain('marnage 9,4')
    expect(html).not.toContain('tes conditions')
    // Pas de pourcentage inventé dans le TEXTE visible (le CSS contient des « 100% »).
    const visibleText = html.replace(/<[^>]+>/g, ' ')
    expect(visibleText).not.toMatch(/\d+\s*%/)
  })

  it('invariants copy : zéro tiret cadratin, aucune coordonnée (pas de décimales GPS)', async () => {
    for (const p of [persoPayload, generiquePayload]) {
      const html = await render(
        <SpotAlertEmail
          spotName={p.spotName}
          spotSlug={p.spotSlug}
          windowLabel={p.windowLabel}
          kind={p.kind}
          justification={p.justification}
        />
      )
      expect(html).not.toContain('—') // — interdit en copy (CLAUDE.md §6)
      // Aucune paire lat/lng : pas de nombre à 4+ décimales dans le texte rendu.
      expect(html).not.toMatch(/-?\d+\.\d{4,}/)
    }
  })
})

// ─── sendSpotAlertEmail (contrat inter-workstreams) ────────────────────────────

describe('sendSpotAlertEmail — gating et résilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    maybeSingleMock.mockResolvedValue({
      data: { alerts_enabled: true, channel_email: true },
      error: null,
    })
    getRecipientMock.mockResolvedValue({
      email: 'julien@test.fr',
      firstName: 'Julien',
      unsubToken: 'tok-1',
    })
    sendEmailMock.mockResolvedValue({ sent: true })
  })

  it('happy path perso : true, objet « Demain 06:10 à Pointe du Raz : tes conditions »', async () => {
    const ok = await sendSpotAlertEmail(persoPayload)
    expect(ok).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0].to).toBe('julien@test.fr')
    expect(sendEmailMock.mock.calls[0][0].subject).toBe(
      'Demain 06:10 à Pointe du Raz : tes conditions'
    )
    // Opt-out global S26 vérifié via la catégorie marketing.
    expect(getRecipientMock).toHaveBeenCalledWith('user-1', { marketing: true })
  })

  it('generique : objet « grande marée », jamais « tes conditions »', async () => {
    const ok = await sendSpotAlertEmail(generiquePayload)
    expect(ok).toBe(true)
    expect(sendEmailMock.mock.calls[0][0].subject).toBe(
      'Demain 18:40 à Pointe du Raz : grande marée'
    )
  })

  it('canal email OFF : false, aucun envoi, destinataire jamais résolu', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { alerts_enabled: true, channel_email: false },
      error: null,
    })
    const ok = await sendSpotAlertEmail(persoPayload)
    expect(ok).toBe(false)
    expect(getRecipientMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('master switch OFF : false, aucun envoi', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { alerts_enabled: false, channel_email: true },
      error: null,
    })
    expect(await sendSpotAlertEmail(persoPayload)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('aucune ligne alert_settings (jamais opté-in) : fail-closed, false', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    expect(await sendSpotAlertEmail(persoPayload)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('opt-out email GLOBAL S26 (getEmailRecipient → null) : false, aucun envoi', async () => {
    getRecipientMock.mockResolvedValue(null)
    expect(await sendSpotAlertEmail(persoPayload)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('échec Resend (sent:false) : false, sans throw', async () => {
    sendEmailMock.mockResolvedValue({ sent: false })
    expect(await sendSpotAlertEmail(persoPayload)).toBe(false)
  })

  it('exception réseau dans sendEmail : false, ne throw JAMAIS vers le cron', async () => {
    sendEmailMock.mockRejectedValue(new Error('ECONNRESET'))
    await expect(sendSpotAlertEmail(persoPayload)).resolves.toBe(false)
  })

  it('exception à la lecture des réglages : false, ne throw jamais', async () => {
    maybeSingleMock.mockRejectedValue(new Error('db down'))
    await expect(sendSpotAlertEmail(persoPayload)).resolves.toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('erreur PostgREST à la lecture des réglages : fail-closed, false', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect(await sendSpotAlertEmail(persoPayload)).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
