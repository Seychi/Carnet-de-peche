import { describe, it, expect } from 'vitest'
import {
  shouldSendAlert,
  pickBestAlertCandidate,
  isQuietHoursParis,
  clampThreshold,
  genericSignalQualifies,
  DEFAULT_ALERT_THRESHOLD,
  GENERIC_COEF_MIN,
} from '../decision'
import type { AlertDecisionInput } from '../types'

// ─── Fixture de base : tout est vert (abonné Local opté-in, fenêtre demain, 17h) ─
// sendAt 15:00Z le 2 juillet = 17:00 Paris (cadence réelle du cron S72).
function base(overrides: Partial<AlertDecisionInput> = {}): AlertDecisionInput {
  return {
    tier: 'local',
    settings: { alertsEnabled: true, channelPush: true, channelEmail: true, threshold: 70 },
    trends: { hasEnough: true, sampleCount: 7, confidence: 'medium' },
    windowScore: 82,
    windowDate: '2026-07-03',
    sendAt: new Date('2026-07-02T15:00:00Z'),
    alreadySent: false,
    genericTideSignal: null,
    ...overrides,
  }
}

describe('shouldSendAlert — tier (Local/Itinérant uniquement)', () => {
  it('ENVOIE pour local et itinerant', () => {
    expect(shouldSendAlert(base({ tier: 'local' })).send).toBe(true)
    expect(shouldSendAlert(base({ tier: 'itinerant' })).send).toBe(true)
  })
  it('REFUSE Découverte et anonyme, même optés-in avec un score parfait', () => {
    for (const tier of ['discovery', 'anonymous', '']) {
      const d = shouldSendAlert(base({ tier, windowScore: 100 }))
      expect(d.send).toBe(false)
      expect(d.reason).toBe('tier_not_eligible')
    }
  })
})

describe('shouldSendAlert — opt-in explicite (défaut OFF)', () => {
  it('REFUSE si alerts_enabled est false', () => {
    const d = shouldSendAlert(
      base({ settings: { alertsEnabled: false, channelPush: true, channelEmail: true, threshold: 70 } }),
    )
    expect(d.send).toBe(false)
    expect(d.reason).toBe('opt_in_off')
  })
})

describe('shouldSendAlert — dédup (user, spot, window_date)', () => {
  it('2 runs sur la même fenêtre → 1 seule alerte', () => {
    // Run 1 : pas de ligne alerts_sent → on envoie.
    expect(shouldSendAlert(base({ alreadySent: false })).send).toBe(true)
    // Run 2 : la ligne existe → refus.
    const d = shouldSendAlert(base({ alreadySent: true }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('already_sent')
  })
})

describe('shouldSendAlert — fenêtre du LENDEMAIN uniquement (jour de Paris)', () => {
  it('REFUSE la fenêtre du jour même', () => {
    const d = shouldSendAlert(base({ windowDate: '2026-07-02' }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('window_not_tomorrow')
  })
  it('REFUSE la fenêtre d’après-demain', () => {
    const d = shouldSendAlert(base({ windowDate: '2026-07-04' }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('window_not_tomorrow')
  })
  it('ACCEPTE la fenêtre de demain', () => {
    expect(shouldSendAlert(base({ windowDate: '2026-07-03' })).send).toBe(true)
  })
})

describe('shouldSendAlert — quiet hours 21h-7h Europe/Paris (bords exacts)', () => {
  it('20:59 Paris → autorisé', () => {
    // 18:59Z = 20:59 Paris (été)
    expect(shouldSendAlert(base({ sendAt: new Date('2026-07-02T18:59:00Z') })).send).toBe(true)
  })
  it('21:00 Paris → refusé', () => {
    const d = shouldSendAlert(base({ sendAt: new Date('2026-07-02T19:00:00Z') }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('quiet_hours')
  })
  it('06:59 Paris → refusé', () => {
    const d = shouldSendAlert(base({ sendAt: new Date('2026-07-02T04:59:00Z') }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('quiet_hours')
  })
  it('07:00 Paris → autorisé', () => {
    expect(shouldSendAlert(base({ sendAt: new Date('2026-07-02T05:00:00Z') })).send).toBe(true)
  })
  it('respecte l’heure d’HIVER (21:30 Paris = 20:30Z → refusé)', () => {
    const d = shouldSendAlert(
      base({ sendAt: new Date('2026-01-15T20:30:00Z'), windowDate: '2026-01-16' }),
    )
    expect(d.send).toBe(false)
    expect(d.reason).toBe('quiet_hours')
  })
})

describe('shouldSendAlert — seuil (mode perso, bornes exactes)', () => {
  it('score == seuil → envoie ; score == seuil - 1 → refuse', () => {
    expect(shouldSendAlert(base({ windowScore: 70 })).send).toBe(true)
    const d = shouldSendAlert(base({ windowScore: 69 }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('below_threshold')
  })
  it('respecte un seuil personnalisé (90)', () => {
    const settings = { alertsEnabled: true, channelPush: true, channelEmail: true, threshold: 90 }
    expect(shouldSendAlert(base({ settings, windowScore: 89 })).send).toBe(false)
    expect(shouldSendAlert(base({ settings, windowScore: 90 })).send).toBe(true)
  })
  it('un seuil invalide retombe sur le défaut (70)', () => {
    const settings = { alertsEnabled: true, channelPush: true, channelEmail: true, threshold: NaN }
    expect(shouldSendAlert(base({ settings, windowScore: 70 })).send).toBe(true)
    expect(shouldSendAlert(base({ settings, windowScore: 69 })).send).toBe(false)
  })
})

describe('shouldSendAlert — cold start (mode générique honnête)', () => {
  const cold = { hasEnough: false, sampleCount: 1, confidence: 'low' as const }

  it('SANS signal grande marée → rien (jamais de fausse alerte)', () => {
    const d = shouldSendAlert(base({ trends: cold, genericTideSignal: null }))
    expect(d.send).toBe(false)
    expect(d.reason).toBe('cold_start_without_big_tide')
  })
  it('coef réel 89 → refuse ; coef réel 90 → alerte GÉNÉRIQUE', () => {
    const at89 = shouldSendAlert(
      base({ trends: cold, genericTideSignal: { type: 'coefficient', coefficient: 89 } }),
    )
    expect(at89.send).toBe(false)

    const at90 = shouldSendAlert(
      base({ trends: cold, genericTideSignal: { type: 'coefficient', coefficient: 90 } }),
    )
    expect(at90.send).toBe(true)
    expect(at90.send && at90.kind).toBe('generique')
  })
  it('marnage MESURÉ au-dessus du seuil de façade → générique ; en dessous ou égal → rien', () => {
    const over = shouldSendAlert(
      base({ trends: cold, genericTideSignal: { type: 'marnage', rangeM: 5.4, thresholdM: 5 } }),
    )
    expect(over.send).toBe(true)
    expect(over.send && over.kind).toBe('generique')

    // Strictement supérieur (aligné getBigTideForDay S49 : range <= seuil → null).
    expect(
      shouldSendAlert(
        base({ trends: cold, genericTideSignal: { type: 'marnage', rangeM: 5, thresholdM: 5 } }),
      ).send,
    ).toBe(false)
    expect(
      shouldSendAlert(
        base({ trends: cold, genericTideSignal: { type: 'marnage', rangeM: 4.9, thresholdM: 5 } }),
      ).send,
    ).toBe(false)
  })
  it('un compte RICHE sous son seuil ne retombe JAMAIS en générique', () => {
    const d = shouldSendAlert(
      base({
        windowScore: 60,
        genericTideSignal: { type: 'coefficient', coefficient: 95 },
      }),
    )
    expect(d.send).toBe(false)
    expect(d.reason).toBe('below_threshold')
  })
})

describe('shouldSendAlert — canaux', () => {
  it('push et email coupés → on envoie quand même (in-app, canal de base)', () => {
    const d = shouldSendAlert(
      base({ settings: { alertsEnabled: true, channelPush: false, channelEmail: false, threshold: 70 } }),
    )
    expect(d.send).toBe(true)
    if (d.send) {
      expect(d.channels).toEqual({ inApp: true, push: false, email: false })
    }
  })
  it('reflète les réglages de canaux dans la décision', () => {
    const d = shouldSendAlert(
      base({ settings: { alertsEnabled: true, channelPush: true, channelEmail: false, threshold: 70 } }),
    )
    expect(d.send && d.channels.push).toBe(true)
    expect(d.send && d.channels.email).toBe(false)
  })
  it('le kind perso est posé quand l’historique suffit', () => {
    const d = shouldSendAlert(base())
    expect(d.send && d.kind).toBe('perso')
  })
})

describe('pickBestAlertCandidate — budget 1 alerte / user / jour', () => {
  const mk = (kind: 'perso' | 'generique', score: number, tag: string) => ({ kind, score, tag })

  it('liste vide → null', () => {
    expect(pickBestAlertCandidate([])).toBeNull()
  })
  it('préfère perso à générique, même à score inférieur (le moat d’abord)', () => {
    const best = pickBestAlertCandidate([mk('generique', 95, 'g'), mk('perso', 72, 'p')])
    expect(best?.tag).toBe('p')
  })
  it('à kind égal, garde le meilleur score', () => {
    const best = pickBestAlertCandidate([mk('perso', 72, 'a'), mk('perso', 88, 'b'), mk('perso', 80, 'c')])
    expect(best?.tag).toBe('b')
  })
  it('à égalité parfaite, garde le premier (ordre stable)', () => {
    const best = pickBestAlertCandidate([mk('perso', 80, 'premier'), mk('perso', 80, 'second')])
    expect(best?.tag).toBe('premier')
  })
})

describe('helpers exportés', () => {
  it('isQuietHoursParis suit les bords 21:00 / 07:00', () => {
    expect(isQuietHoursParis(new Date('2026-07-02T18:59:00Z'))).toBe(false) // 20:59
    expect(isQuietHoursParis(new Date('2026-07-02T19:00:00Z'))).toBe(true) // 21:00
    expect(isQuietHoursParis(new Date('2026-07-02T04:59:00Z'))).toBe(true) // 06:59
    expect(isQuietHoursParis(new Date('2026-07-02T05:00:00Z'))).toBe(false) // 07:00
  })
  it('clampThreshold borne à [0, 100] et gère l’invalide', () => {
    expect(clampThreshold(70)).toBe(70)
    expect(clampThreshold(-5)).toBe(0)
    expect(clampThreshold(140)).toBe(100)
    expect(clampThreshold(Number.NaN)).toBe(DEFAULT_ALERT_THRESHOLD)
  })
  it('genericSignalQualifies encode coef >= 90 et marnage > seuil', () => {
    expect(GENERIC_COEF_MIN).toBe(90)
    expect(genericSignalQualifies(null)).toBe(false)
    expect(genericSignalQualifies({ type: 'coefficient', coefficient: 91 })).toBe(true)
    expect(genericSignalQualifies({ type: 'marnage', rangeM: 9.2, thresholdM: 9 })).toBe(true)
    expect(genericSignalQualifies({ type: 'marnage', rangeM: 9, thresholdM: 9 })).toBe(false)
  })
})
