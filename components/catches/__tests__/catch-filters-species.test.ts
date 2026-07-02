import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { CARNET_SPECIES_OPTIONS, CORE_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'
import { catchFiltersSchema } from '@/lib/catches/schema'

/**
 * Filet anti-régression du filtre espèces du carnet (sprint 70, Bloc D —
 * audit 07-02 §4.7 : le filtre était bloqué à 6 espèces codées en dur alors
 * que le formulaire en gère 26).
 *
 * Pattern scan-de-source (cf. nav-reachability.test.ts) : le harness Vitest
 * tourne en environnement node, sans jsdom ni Testing Library. On vérifie :
 *   1. que la barre de filtres consomme le référentiel SPECIES (source unique,
 *      la même que le formulaire de prise) et n'a plus de liste en dur ;
 *   2. que chaque espèce du référentiel passe la validation zod côté page
 *      (chip → ?species=<dbKey> → catchFiltersSchema) — sinon un chip serait
 *      affiché mais silencieusement ignoré au parse.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const filtersBarSource = readFileSync(
  path.resolve(here, '..', 'CatchFiltersBar.tsx'),
  'utf8',
)

describe('filtre espèces du carnet (CatchFiltersBar)', () => {
  it('consomme le référentiel CARNET_SPECIES_OPTIONS (même source que le formulaire)', () => {
    expect(filtersBarSource).toContain('CARNET_SPECIES_OPTIONS')
    expect(filtersBarSource).toContain("from '@/lib/seo/programmatic'")
  })

  it("n'a plus de liste d'espèces codée en dur", () => {
    // Les anciens littéraux de la liste à 6 ne doivent plus exister dans la barre
    // (ni aucun objet { value: 'dorade_royale', … } re-déclaré localement).
    expect(filtersBarSource).not.toMatch(/value:\s*'dorade_royale'/)
    expect(filtersBarSource).not.toMatch(/value:\s*'lieu_jaune'/)
    expect(filtersBarSource).not.toMatch(/value:\s*'orphie'/)
  })

  it('le référentiel expose bien les 26 espèces loguables', () => {
    expect(CARNET_SPECIES_OPTIONS).toHaveLength(26)
  })

  it('les 6 espèces cœur restent des quick-picks (vue repliée)', () => {
    expect(CORE_SPECIES_DB_KEYS).toHaveLength(6)
    const all = new Set(CARNET_SPECIES_OPTIONS.map((o) => o.value))
    for (const core of CORE_SPECIES_DB_KEYS) {
      expect(all.has(core)).toBe(true)
    }
  })

  it('chaque espèce du référentiel passe catchFiltersSchema (chip → URL → zod)', () => {
    for (const opt of CARNET_SPECIES_OPTIONS) {
      const parsed = catchFiltersSchema.safeParse({ species: [opt.value] })
      expect(parsed.success, `espèce refusée par le schéma : ${opt.value}`).toBe(true)
    }
  })
})
