import { describe, it, expect } from 'vitest'
import {
  substrateCategory,
  assessSuitability,
  SPECIES_HABITAT,
} from '@/lib/conditions/species-habitat'
import type { SeabedInfo } from '@/lib/conditions/bathymetry'

function seabed(rawSubstrate: string | null, depthM: number | null): SeabedInfo {
  return {
    substrate: rawSubstrate
      ? { label: 'x', raw: rawSubstrate, source: 'EMODnet Seabed Habitats (EUSeaMap)' }
      : null,
    depth: typeof depthM === 'number'
      ? { depth_m: depthM, shallow_m: depthM, deep_m: depthM, source: 'EMODnet Bathymetry' }
      : null,
  }
}

describe('substrateCategory — classe EMODnet → catégorie large', () => {
  it('mappe les classes franches', () => {
    expect(substrateCategory('Rock or other hard substrata')).toBe('rock')
    expect(substrateCategory('Coarse substrate')).toBe('coarse')
    expect(substrateCategory('Mixed sediment')).toBe('mixed')
    expect(substrateCategory('Sand')).toBe('sand')
    expect(substrateCategory('Muddy sand')).toBe('sand')
    expect(substrateCategory('Mud')).toBe('mud')
  })

  it('renvoie unknown quand rien n’est exploitable (jamais d’invention)', () => {
    expect(substrateCategory(null)).toBe('unknown')
    expect(substrateCategory('')).toBe('unknown')
    expect(substrateCategory('No data at this level')).toBe('unknown')
  })

  it('reconnaît les herbiers (posidonie) et le maërl', () => {
    expect(substrateCategory('[Posidonia oceanica] meadows')).toBe('seagrass')
    expect(substrateCategory('Seagrass')).toBe('seagrass')
    expect(substrateCategory('Maerl beds')).toBe('coarse')
  })
})

describe('assessSuitability — adéquation fond ↔ espèce (honnête, indicatif)', () => {
  it('renvoie null si aucune espèce (couche « toutes espèces »)', () => {
    expect(assessSuitability(null, seabed('Sand', 6))).toBeNull()
    expect(assessSuitability(undefined, seabed('Sand', 6))).toBeNull()
  })

  it('bar sur roche à profondeur adaptée → favorable', () => {
    const a = assessSuitability('bar', seabed('Rock or other hard substrata', 8))!
    expect(a.verdict).toBe('favorable')
    expect(a.label).toBe('Fond favorable')
    expect(a.detail).toMatch(/roche/i)
    expect(a.detail).toMatch(/bar/i)
  })

  it('bar sur sable → peu favorable (sable hors habitat du bar)', () => {
    const a = assessSuitability('bar', seabed('Sand', 5))!
    expect(a.verdict).toBe('peu')
    expect(a.label).toBe('Fond peu favorable')
  })

  it('dorade royale sur sable → favorable', () => {
    const a = assessSuitability('dorade_royale', seabed('Sand', 6))!
    expect(a.verdict).toBe('favorable')
  })

  it('bar sur herbier de posidonie → favorable, détail mentionne l’herbier', () => {
    const a = assessSuitability('bar', seabed('[Posidonia oceanica] meadows', 10))!
    expect(a.verdict).toBe('favorable')
    expect(a.detail).toMatch(/herbier/i)
  })

  it('substrat favorable mais profondeur hors fourchette → tempéré en moyen', () => {
    // bar : roche favorable, mais 40 m hors [0,25] → moyen (pas favorable plein).
    const a = assessSuitability('bar', seabed('Rock or other hard substrata', 40))!
    expect(a.verdict).toBe('moyen')
  })

  it('espèce de pleine eau (maquereau) → pélagique, fond peu déterminant', () => {
    const a = assessSuitability('maquereau', seabed('Sand', 6))!
    expect(a.verdict).toBe('pelagique')
    expect(a.label).toBe('Espèce de pleine eau')
    expect(SPECIES_HABITAT.maquereau.pelagic).toBe(true)
  })

  it('aucun fond mesuré au point → inconnu (pas d’invention)', () => {
    const a = assessSuitability('bar', seabed(null, null))!
    expect(a.verdict).toBe('inconnu')
    expect(a.label).toBe('Fond inconnu ici')
  })

  it('espèce hors référentiel → inconnu (on ne se prononce pas)', () => {
    const a = assessSuitability('thon_rouge', seabed('Sand', 6))!
    expect(a.verdict).toBe('inconnu')
    expect(a.label).toBe('Adéquation inconnue')
  })
})
