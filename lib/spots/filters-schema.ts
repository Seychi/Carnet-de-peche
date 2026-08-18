import '@/lib/zod-config'
import { z } from 'zod'
import { catchTechniqueEnum } from '@/lib/catches/schema'
import { ALL_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'

// 🔴 FIX bug sprint 23 (§Diagnostic.3) : les filtres carte valident contre le
// référentiel COMPLET (26 espèces, colonne `spots.species` = text[] libre), et NON
// l'ex-`catchSpeciesEnum` à 6. Avant, les 6 espèces additionnelles affichées par
// `MapFilters` (vieille, mulet, sole, congre, maigre, chinchard) étaient rejetées
// silencieusement au parse SSR → filtrables visuellement mais sans effet sur la carte.
export const spotSpeciesEnum = z.enum(ALL_SPECIES_DB_KEYS as [string, ...string[]])

export const spotFiltersSchema = z.object({
  species: z.array(spotSpeciesEnum).optional(),
  techniques: z.array(catchTechniqueEnum).optional(),
  department: z
    .string()
    .regex(/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB])$/)
    .optional(),
  structure: z
    .enum(['digue', 'plage', 'pointe_rocheuse', 'estuaire', 'cale', 'passe', 'cassure'])
    .optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  // Provenance (sprint Carte-v2 / C2) — filtre d'affichage par source du spot.
  source: z.array(z.enum(['curated', 'community', 'imported'])).optional(),
})

export type SpotFilters = z.infer<typeof spotFiltersSchema>
