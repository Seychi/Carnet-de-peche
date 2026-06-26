import { describe, it, expect } from 'vitest'
import { BATHY_TIER, hasBathyAccess } from '../bathy-config'

// Décision John 2026-06-26 : la couche « Fond marin » est gatée LOCAL (aligné /tarifs),
// donc accessible aux abonnés Local ET Itinérant — pas aux gratuits.
describe('hasBathyAccess (gating couche fond marin)', () => {
  it('tier de référence = local', () => {
    expect(BATHY_TIER).toBe('local')
  })
  it('Local et Itinérant ont accès', () => {
    expect(hasBathyAccess('local')).toBe(true)
    expect(hasBathyAccess('itinerant')).toBe(true)
  })
  it('Découverte et anonyme n’ont PAS accès', () => {
    expect(hasBathyAccess('discovery')).toBe(false)
    expect(hasBathyAccess('anonymous')).toBe(false)
  })
})
