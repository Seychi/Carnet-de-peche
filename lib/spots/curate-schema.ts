import '@/lib/zod-config'
import { z } from 'zod'
import { catchSpeciesEnum, catchTechniqueEnum, isInFranceMetro } from '@/lib/catches/schema'
import { spotStructureEnum } from '@/lib/spots/propose-schema'
import { HAZARDS_LABELS } from '@/lib/labels'

// Dangers : enum dérivé du référentiel unique HAZARDS_LABELS (lib/labels).
export const hazardEnum = z.enum(
  Object.keys(HAZARDS_LABELS) as [string, ...string[]],
  { error: () => 'Danger inconnu' },
)

// Visibilité (gating freemium) : public (gratuit limité) / subscriber (payant) / private.
export const spotVisibilityEnum = z.enum(['public', 'subscriber', 'private'], {
  error: () => 'Choisis la visibilité du spot',
})

// Schéma de CURAGE d'un import OSM (sprint 43). Curer = ENRICHIR + VÉRIFIER : l'action
// curateSpot pose source='curated' + verified=true + approved dans le même UPDATE
// (contrainte spots_verified_only_curated). Différences vs propose-schema (communautaire) :
//   - espèces sur la LISTE COMPLÈTE du carnet (pas le max(6) de la proposition) ;
//   - difficulty (1-5), hazards (dangers), visibility (gating) en plus ;
//   - latitude/longitude OPTIONNELLES (correction de la coordonnée OSM, sinon on garde geom).
// Messages zod en français. Pas d'invention : le modérateur saisit + vérifie.
export const curateSpotSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Donne un nom d’au moins 3 caractères')
      .max(80, '80 caractères maximum')
      .optional(),
    structure: spotStructureEnum,
    species: z.array(catchSpeciesEnum).optional(),
    techniques: z.array(catchTechniqueEnum).max(4).optional(),
    difficulty: z
      .number()
      .int()
      .min(1, 'Difficulté entre 1 et 5')
      .max(5, 'Difficulté entre 1 et 5')
      .optional(),
    hazards: z.array(hazardEnum).optional(),
    visibility: spotVisibilityEnum.optional(),
    access_notes: z.string().trim().max(500, '500 caractères maximum').optional(),
    description: z.string().trim().max(1000, '1000 caractères maximum').optional(),
    // Correction de coordonnée (optionnelle). Si fournie, les deux vont ensemble.
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.latitude != null
    const hasLng = data.longitude != null
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: 'custom',
        message: 'Latitude et longitude vont ensemble.',
        path: [hasLat ? 'longitude' : 'latitude'],
      })
      return
    }
    if (hasLat && hasLng && !isInFranceMetro(data.latitude as number, data.longitude as number)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Place le point sur une zone côtière de France métropolitaine.',
        path: ['latitude'],
      })
    }
  })

export type CurateSpotInput = z.infer<typeof curateSpotSchema>
