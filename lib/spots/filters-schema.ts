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
    .enum(['pointe_rocheuse', 'plage', 'digue', 'estuaire', 'cale', 'falaise'])
    .optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
})

export type SpotFilters = z.infer<typeof spotFiltersSchema>
