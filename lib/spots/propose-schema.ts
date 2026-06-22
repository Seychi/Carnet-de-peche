import '@/lib/zod-config'
import { z } from 'zod'
import { catchSpeciesEnum, catchTechniqueEnum, isInFranceMetro } from '@/lib/catches/schema'
import { isCoastalDepartment } from '@/lib/geo/departments'

// Type de structure — aligné sur la CHECK constraint `spots_structure_check`
// (digue/plage/pointe_rocheuse/estuaire/cale/passe/cassure). Source unique pour
// la proposition de spot ; les filtres carte gardent leur enum inline.
export const spotStructureEnum = z.enum(
  ['digue', 'plage', 'pointe_rocheuse', 'estuaire', 'cale', 'passe', 'cassure'],
  { error: () => 'Choisis le type de structure' },
)

// Validation serveur ET client d'une proposition de spot communautaire.
// Un spot proposé part TOUJOURS en source='community' / moderation_status='pending'
// / verified=false (forcé par la RLS, migration 041) — le schéma ne porte que les
// champs saisis par le pêcheur.
export const proposeSpotSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Donne un nom d’au moins 3 caractères')
      .max(80, '80 caractères maximum'),
    department: z
      .string()
      .refine(isCoastalDepartment, 'Choisis un département côtier'),
    structure: spotStructureEnum,
    species: z.array(catchSpeciesEnum).max(6).optional(),
    techniques: z.array(catchTechniqueEnum).max(4).optional(),
    latitude: z.number({ error: 'Place le point du spot sur la carte' }),
    longitude: z.number({ error: 'Place le point du spot sur la carte' }),
    access_notes: z.string().trim().max(500, '500 caractères maximum').optional(),
    description: z.string().trim().max(1000, '1000 caractères maximum').optional(),
    // Anti spot-burning : on n'accepte QUE des lieux publics et connus.
    // (boolean + refine plutôt que literal(true) : la case démarre décochée
    //  sans casser le typage RHF input/output.)
    is_public_spot: z
      .boolean()
      .refine((v) => v === true, { message: 'Confirme qu’il s’agit d’un lieu public et connu' }),
  })
  .superRefine((data, ctx) => {
    if (!isInFranceMetro(data.latitude, data.longitude)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Place le point sur une zone côtière de France métropolitaine.',
        path: ['latitude'],
      })
    }
  })

export type ProposeSpotInput = z.infer<typeof proposeSpotSchema>
