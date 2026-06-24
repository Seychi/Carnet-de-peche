import { describe, it, expect } from 'vitest'
import {
  SPECIES,
  ALL_SPECIES_DB_KEYS,
  CARNET_SPECIES_DB_KEYS,
  SPECIES_BY_DB_KEY,
} from '@/lib/seo/programmatic'
import { catchSpeciesEnum } from '@/lib/catches/schema'
import { spotSpeciesEnum } from '@/lib/spots/filters-schema'
import { SPECIES_LABELS } from '@/lib/labels'
import { SPECIES_HABITAT } from '@/lib/conditions/species-habitat'

// Verrou de cohérence du référentiel espèces unifié (sprint 23, WS-0). Empêche la
// réapparition du bug §Diagnostic.3 (filtres carte qui affichaient des espèces que le
// parse SSR rejetait) et la dérive des ex-listes parallèles.
describe('référentiel espèces unifié (sprint 23)', () => {
  it('compte 26 espèces (20 + 6 au sprint 29)', () => {
    expect(Object.keys(SPECIES)).toHaveLength(26)
  })

  it('catchSpeciesEnum dérive EXACTEMENT des espèces inCarnet (D-B2)', () => {
    expect([...catchSpeciesEnum.options].sort()).toEqual([...CARNET_SPECIES_DB_KEYS].sort())
  })

  it('les filtres carte acceptent TOUT le référentiel (fix bug §Diagnostic.3)', () => {
    // Les espèces qui étaient affichées par MapFilters mais rejetées au parse SSR.
    for (const k of ['vieille', 'mulet', 'sole', 'congre', 'maigre', 'chinchard', 'seiche', 'calmar']) {
      expect(spotSpeciesEnum.safeParse(k).success).toBe(true)
    }
    expect([...spotSpeciesEnum.options].sort()).toEqual([...ALL_SPECIES_DB_KEYS].sort())
  })

  it('SPECIES_LABELS couvre exactement le référentiel (dérivé, plus de liste parallèle)', () => {
    expect(Object.keys(SPECIES_LABELS).sort()).toEqual([...ALL_SPECIES_DB_KEYS].sort())
  })

  it('SPECIES_HABITAT couvre tout le référentiel (assessSuitability jamais « hors référentiel »)', () => {
    for (const k of ALL_SPECIES_DB_KEYS) expect(SPECIES_HABITAT[k]).toBeDefined()
  })

  it('dbKey ↔ slug bijectif sur 26 entrées', () => {
    expect(Object.keys(SPECIES_BY_DB_KEY)).toHaveLength(26)
  })
})
