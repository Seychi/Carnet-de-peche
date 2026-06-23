import { describe, it, expect } from 'vitest'
import { substrateToFr } from '@/lib/conditions/bathymetry'

// Mapping classes substrat EUSeaMap (EMODnet Seabed Habitats) → libellé FR.
// On vérifie : classes connues traduites, tolérance casse/espaces, et passthrough
// honnête (jamais d'invention) pour une classe inconnue.
describe('substrateToFr — classes EUSeaMap → FR', () => {
  it('traduit les classes Folk connues', () => {
    expect(substrateToFr('Sand')).toBe('Sable')
    expect(substrateToFr('Rock or other hard substrata')).toBe('Roche')
    expect(substrateToFr('Mud to muddy sand')).toBe('Vase / vase sableuse')
    expect(substrateToFr('Coarse substrate')).toBe('Sédiment grossier')
    expect(substrateToFr('Mixed sediment')).toBe('Sédiment mixte')
    expect(substrateToFr('Muddy sand')).toBe('Sable vaseux')
  })

  it('tolère casse et espaces superflus', () => {
    expect(substrateToFr('  SAND  ')).toBe('Sable')
    expect(substrateToFr('rock or  other   hard substrata')).toBe('Roche')
  })

  it('renvoie le libellé brut (trim) pour une classe inconnue — pas d’invention', () => {
    expect(substrateToFr('Some Unknown Class')).toBe('Some Unknown Class')
    expect(substrateToFr('  Bedrock outcrop ')).toBe('Bedrock outcrop')
  })

  it('mappe les biotopes / herbiers, crochets EMODnet retirés', () => {
    expect(substrateToFr('[Posidonia oceanica] meadows')).toBe('Herbier de posidonie')
    expect(substrateToFr('Posidonia oceanica')).toBe('Herbier de posidonie')
    expect(substrateToFr('Seagrass meadows')).toBe('Herbier')
    expect(substrateToFr('Maerl beds')).toBe('Maërl')
  })

  it('retire les crochets même pour une classe inconnue (fallback honnête)', () => {
    expect(substrateToFr('[Some Biotope] meadows')).toBe('Some Biotope meadows')
  })
})
