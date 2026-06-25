import { describe, it, expect } from 'vitest'
import {
  SPECIES,
  ALL_SPECIES_DB_KEYS,
  CARNET_SPECIES_DB_KEYS,
  CARNET_SPECIES_OPTIONS,
  CORE_SPECIES_DB_KEYS,
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

// Sélecteur carnet 6 → 26 (sprint 31, F3) : la liste codée en dur à 6 est supprimée,
// tout dérive de CARNET_SPECIES_OPTIONS. Verrou anti-réintroduction de liste parallèle.
describe('sélecteur carnet (sprint 31, F3) — dérivé du référentiel', () => {
  it('CARNET_SPECIES_OPTIONS = 26 options {value,label} alignées sur CARNET_SPECIES_DB_KEYS', () => {
    expect(CARNET_SPECIES_OPTIONS).toHaveLength(26)
    expect(CARNET_SPECIES_OPTIONS.map((o) => o.value)).toEqual(CARNET_SPECIES_DB_KEYS)
    for (const o of CARNET_SPECIES_OPTIONS) {
      expect(o.value, 'value vide').toBeTruthy()
      expect(o.label, `label vide pour ${o.value}`).toBeTruthy()
    }
  })

  it('toutes les options du carnet sont acceptées par catchSpeciesEnum (loguables)', () => {
    for (const o of CARNET_SPECIES_OPTIONS) {
      expect(catchSpeciesEnum.safeParse(o.value).success, `${o.value} rejetée`).toBe(true)
    }
  })

  it('seiche / mulet / congre sont bien loguables (le bug F3)', () => {
    const values = CARNET_SPECIES_OPTIONS.map((o) => o.value)
    for (const k of ['seiche', 'mulet', 'congre']) expect(values, `${k} manquante`).toContain(k)
  })

  it('CORE = 6 espèces cœur ⊂ carnet ; split quick (6) + autre (20) = 26', () => {
    expect(CORE_SPECIES_DB_KEYS).toHaveLength(6)
    const carnet = new Set(CARNET_SPECIES_DB_KEYS)
    for (const k of CORE_SPECIES_DB_KEYS) expect(carnet.has(k), `${k} hors carnet`).toBe(true)
    const quick = CARNET_SPECIES_OPTIONS.filter((o) => CORE_SPECIES_DB_KEYS.includes(o.value))
    const other = CARNET_SPECIES_OPTIONS.filter((o) => !CORE_SPECIES_DB_KEYS.includes(o.value))
    expect(quick).toHaveLength(6)
    expect(other).toHaveLength(20)
  })
})
