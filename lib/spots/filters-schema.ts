import { z } from 'zod'
import { catchSpeciesEnum, catchTechniqueEnum } from '@/lib/catches/schema'

export const spotFiltersSchema = z.object({
  species: z.array(catchSpeciesEnum).optional(),
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
