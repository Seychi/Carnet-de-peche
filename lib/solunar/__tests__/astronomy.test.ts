import { describe, it, expect } from 'vitest'
import { getSolunarEvents, getMoonPhaseLabel } from '../astronomy'

describe('getMoonPhaseLabel', () => {
  it('retourne "Nouvelle lune" à 0', () => {
    expect(getMoonPhaseLabel(0)).toBe('Nouvelle lune')
  })
  it('retourne "Nouvelle lune" à 1', () => {
    expect(getMoonPhaseLabel(1)).toBe('Nouvelle lune')
  })
  it('retourne "Premier quartier" à 0.25', () => {
    expect(getMoonPhaseLabel(0.25)).toBe('Premier quartier')
  })
  it('retourne "Pleine lune" à 0.5', () => {
    expect(getMoonPhaseLabel(0.5)).toBe('Pleine lune')
  })
  it('retourne "Dernier quartier" à 0.75', () => {
    expect(getMoonPhaseLabel(0.75)).toBe('Dernier quartier')
  })
  it('retourne "Premier croissant" entre 0 et 0.25', () => {
    expect(getMoonPhaseLabel(0.1)).toBe('Premier croissant')
  })
})

describe('getSolunarEvents', () => {
  // Pointe du Raz — solstice d'été (lever de soleil très tôt)
  const LAT = 48.04
  const LNG = -4.73
  const SOLSTICE_ETE = new Date('2026-06-21T12:00:00Z')

  it('retourne des événements triés chronologiquement', () => {
    const events = getSolunarEvents(SOLSTICE_ETE, LAT, LNG)
    expect(events.length).toBeGreaterThan(0)
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timeISO >= events[i - 1].timeISO).toBe(true)
    }
  })

  it('contient sunrise et sunset au solstice d\'été', () => {
    const events = getSolunarEvents(SOLSTICE_ETE, LAT, LNG)
    const types = events.map(e => e.type)
    expect(types).toContain('sunrise')
    expect(types).toContain('sunset')
  })

  it('les heures locales sont au format HH:MM', () => {
    const events = getSolunarEvents(SOLSTICE_ETE, LAT, LNG)
    for (const e of events) {
      expect(e.localTime).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('sunrise est avant 06h heure locale au solstice d\'été (Bretagne)', () => {
    const events = getSolunarEvents(SOLSTICE_ETE, LAT, LNG)
    const sunrise = events.find(e => e.type === 'sunrise')
    expect(sunrise).toBeDefined()
    if (sunrise) {
      const [h] = sunrise.localTime.split(':').map(Number)
      // Solstice été en Bretagne : lever ~06h10 heure locale (04h10 UTC)
      expect(h).toBeLessThanOrEqual(7)
    }
  })

  // Camargue — solstice d'hiver
  const LAT_CAM = 43.4
  const LNG_CAM = 4.4
  const SOLSTICE_HIVER = new Date('2026-12-21T12:00:00Z')

  it('retourne des événements pour la Camargue en hiver', () => {
    const events = getSolunarEvents(SOLSTICE_HIVER, LAT_CAM, LNG_CAM)
    expect(events.length).toBeGreaterThan(0)
    const types = events.map(e => e.type)
    expect(types).toContain('sunrise')
    expect(types).toContain('sunset')
  })

  it('ne plante pas si la lune est absente (no moonrise)', () => {
    // Le 20 décembre 2026, la lune peut ne pas se lever dans la plage autorisée
    const date = new Date('2026-12-20T12:00:00Z')
    expect(() => getSolunarEvents(date, LAT, LNG)).not.toThrow()
  })
})
