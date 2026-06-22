import { describe, it, expect } from 'vitest'
import { proposeSpotSchema } from '@/lib/spots/propose-schema'

const VALID = {
  name: 'Jetée du port de Lampaul',
  department: '29',
  structure: 'digue' as const,
  latitude: 48.3,
  longitude: -4.5,
  is_public_spot: true as const,
}

describe('proposeSpotSchema (validation proposition de spot — C2)', () => {
  it('accepte une proposition valide minimale (espèces/techniques optionnelles)', () => {
    const r = proposeSpotSchema.safeParse(VALID)
    expect(r.success).toBe(true)
  })

  it('accepte espèces + techniques renseignées', () => {
    const r = proposeSpotSchema.safeParse({
      ...VALID,
      species: ['bar', 'lieu_jaune'],
      techniques: ['leurres', 'surfcasting'],
    })
    expect(r.success).toBe(true)
  })

  it('refuse un nom trop court', () => {
    expect(proposeSpotSchema.safeParse({ ...VALID, name: 'ab' }).success).toBe(false)
  })

  it('refuse un département non côtier', () => {
    expect(proposeSpotSchema.safeParse({ ...VALID, department: '75' }).success).toBe(false)
  })

  it('refuse une structure hors CHECK', () => {
    expect(proposeSpotSchema.safeParse({ ...VALID, structure: 'ponton' }).success).toBe(false)
  })

  it('refuse un point hors France métropolitaine (anti-coords aberrantes)', () => {
    // Latitude 60 = Norvège → superRefine isInFranceMetro
    expect(proposeSpotSchema.safeParse({ ...VALID, latitude: 60, longitude: 5 }).success).toBe(false)
  })

  it('refuse si la case « lieu public » n’est pas cochée (anti spot-burning)', () => {
    const r = proposeSpotSchema.safeParse({ ...VALID, is_public_spot: false })
    expect(r.success).toBe(false)
  })

  it('refuse plus de 6 espèces', () => {
    const r = proposeSpotSchema.safeParse({
      ...VALID,
      species: ['bar', 'dorade_royale', 'lieu_jaune', 'maquereau', 'sar', 'orphie', 'bar'],
    })
    expect(r.success).toBe(false)
  })
})
