import { describe, it, expect } from 'vitest'
import { toCatchSamples, type DbCatchRow } from '../buckets'
import { computePersonalTendencies } from '../tendencies'
import {
  matchPersonalWindow,
  windowHourBucket,
  windowTimeRange,
  MIN_WINDOW_SCORE,
} from '../window-match'
import type { PersonalTendencies } from '../types'

// ─── Fixtures ──────────────────────────────────────────────────────────────────
// 4 bars le matin (09:00 Paris, été) en marée descendante → tendance horaire « le
// matin » nette + tendance marée « en marée descendante ».
function morningBar(extra: Partial<DbCatchRow> = {}): DbCatchRow {
  return {
    species: 'bar',
    spot_id: 'spot-A',
    caught_at: '2026-06-15T07:00:00Z', // 09:00 Europe/Paris (CEST) → matin
    wind_speed_kmh: 8,
    tide_state: 'falling',
    conditions: null,
    ...extra,
  }
}

const morningTendencies = (): PersonalTendencies =>
  computePersonalTendencies(toCatchSamples([morningBar(), morningBar(), morningBar(), morningBar()]))

// Un créneau du jour : on ne renseigne que ce que le matcher lit (bornes + score).
function win(startISO: string, endISO: string, score: number) {
  return { startTimeISO: startISO, endTimeISO: endISO, score }
}

describe('windowHourBucket / windowTimeRange — dérivation Paris', () => {
  it('classe un créneau 09:00 Paris en « le matin »', () => {
    // 07:00Z = 09:00 Paris (CEST) → bucket "morning"
    expect(windowHourBucket('2026-06-15T07:00:00Z')).toBe('morning')
  })
  it('formate une plage horaire lisible', () => {
    expect(windowTimeRange('2026-06-15T07:00:00Z', '2026-06-15T09:00:00Z')).toBe('vers 9h-11h')
  })
})

describe('matchPersonalWindow — décision de notif', () => {
  it('NOTIFIE quand le créneau du jour coïncide avec le créneau dominant + bon score', () => {
    // Créneau du matin (09:00 Paris), score 75 ≥ seuil.
    const m = matchPersonalWindow(morningTendencies(), win('2026-06-15T07:00:00Z', '2026-06-15T09:00:00Z', 75))
    expect(m.shouldNotify).toBe(true)
    expect(m.previewText).toBeTruthy()
    // Descriptif : cite le créneau dominant et reste sous 140 car.
    expect(m.previewText!.length).toBeLessThanOrEqual(140)
    expect(m.previewText).toContain('le matin')
    expect(m.previewText).toContain('créneau favorable')
  })

  it('enrichit la copie avec la marée dominante (descriptif, jamais une condition)', () => {
    const m = matchPersonalWindow(morningTendencies(), win('2026-06-15T07:00:00Z', '2026-06-15T09:00:00Z', 75))
    expect(m.previewText).toContain('en marée descendante')
  })

  it('NE NOTIFIE PAS si le créneau du jour ne tombe pas dans le créneau dominant', () => {
    // Créneau du soir (21:00 Paris) ≠ tendance "le matin".
    const m = matchPersonalWindow(morningTendencies(), win('2026-06-15T19:00:00Z', '2026-06-15T21:00:00Z', 80))
    expect(m.shouldNotify).toBe(false)
    expect(m.previewText).toBeNull()
  })

  it('NE NOTIFIE PAS si le créneau est médiocre (score < seuil)', () => {
    const m = matchPersonalWindow(
      morningTendencies(),
      win('2026-06-15T07:00:00Z', '2026-06-15T09:00:00Z', MIN_WINDOW_SCORE - 1),
    )
    expect(m.shouldNotify).toBe(false)
  })

  it('NE NOTIFIE PAS si le user n’a pas assez de prises (hasEnough = false)', () => {
    const tooFew = computePersonalTendencies(toCatchSamples([morningBar()])) // 1 prise
    expect(tooFew.hasEnough).toBe(false)
    const m = matchPersonalWindow(tooFew, win('2026-06-15T07:00:00Z', '2026-06-15T09:00:00Z', 90))
    expect(m.shouldNotify).toBe(false)
  })
})

describe('matchPersonalWindow — copie NON prédictive (contrainte 7.5)', () => {
  it('ne contient aucune formulation prédictive interdite', () => {
    const m = matchPersonalWindow(morningTendencies(), win('2026-06-15T07:00:00Z', '2026-06-15T09:00:00Z', 85))
    const text = m.previewText ?? ''
    expect(/tu prendras|pêches mieux|prédit|garanti/i.test(text)).toBe(false)
  })
})
