import '@/lib/zod-config'
import { z } from 'zod'
import { isCoastalDepartment } from '@/lib/geo/departments'
import { catchTechniqueEnum, catchSpeciesEnum } from '@/lib/catches/schema'
import { notFuture } from '@/lib/validation/date-guards'

// ─── Sortie (outing) — y compris bredouille (0 prise) ─────────────────────────
// Une sortie ne porte JAMAIS de coordonnée précise : département + label seulement
// (cohérent avec le floutage GPS 3 couches). started_at obligatoire ; le reste optionnel.

export const createOutingSchema = z
  .object({
    started_at: z.string().datetime().refine(notFuture, { error: 'Une sortie ne peut pas être dans le futur.' }),
    ended_at: z.string().datetime().optional(),
    department: z
      .string()
      .refine((d) => isCoastalDepartment(d), { error: 'Choisis un département côtier' }),
    spot_id: z.string().uuid().optional(),
    technique: catchTechniqueEnum.optional(),
    species_targeted: z.array(catchSpeciesEnum).max(6).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ended_at && data.ended_at < data.started_at) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fin de sortie ne peut pas être avant le début.',
        path: ['ended_at'],
      })
    }
  })

export type CreateOutingInput = z.infer<typeof createOutingSchema>
