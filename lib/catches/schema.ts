import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const catchSpeciesEnum = z.enum([
  'bar',
  'dorade_royale',
  'lieu_jaune',
  'maquereau',
  'sar',
  'orphie',
])

export const catchTechniqueEnum = z.enum([
  'leurres',
  'surfcasting',
  'flottante',
  'vif',
])

export const catchPrivacyEnum = z.enum(['private', 'friends', 'public'])

export const catchLocationMethodEnum = z.enum(['gps', 'manual', 'spot'])

// ─── Create ───────────────────────────────────────────────────────────────────

// Objet de base réutilisé par updateCatchSchema (sans les refinements cross-champs)
const baseCatchObject = z.object({
  species: catchSpeciesEnum,
  caught_at: z.string().datetime().default(() => new Date().toISOString()),
  size_cm: z.number().min(10).max(200).optional(),
  weight_kg: z.number().min(0.05).max(30).optional(),
  technique: catchTechniqueEnum,
  lure_brand: z.string().max(60).optional(),
  lure_model: z.string().max(100).optional(),
  bait_type: z.string().max(60).optional(),
  released: z.boolean().default(false),
  water_temperature_c: z.number().min(0).max(35).optional(),
  notes: z.string().max(1000).optional(),
  location_method: catchLocationMethodEnum.default('gps'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  spot_id: z.string().uuid().optional(),
  privacy: catchPrivacyEnum.default('private'),
  precise_for_friends: z.boolean().default(true),
  reveal_precise_to_public: z.boolean().default(false),
  photo_path: z.string().optional(),
  location_label: z.string().max(120).optional(),
})

// Schéma de base exporté pour le form en mode édition (pas de validation lat/lng requise)
export const catchBaseSchema = baseCatchObject

export const createCatchSchema = baseCatchObject.superRefine((data, ctx) => {
  if (data.location_method === 'gps' || data.location_method === 'manual') {
    if (data.latitude === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'latitude est requis pour cette méthode de localisation',
        path: ['latitude'],
      })
    }
    if (data.longitude === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'longitude est requis pour cette méthode de localisation',
        path: ['longitude'],
      })
    }
  }

  if (data.location_method === 'spot' && !data.spot_id) {
    ctx.addIssue({
      code: 'custom',
      message: 'spot_id est requis quand location_method est "spot"',
      path: ['spot_id'],
    })
  }
})

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateCatchSchema = baseCatchObject.partial().extend({ id: z.string().uuid() })

// ─── Filters ──────────────────────────────────────────────────────────────────

export const catchFiltersSchema = z.object({
  species: z.array(catchSpeciesEnum).optional(),
  technique: z.array(catchTechniqueEnum).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  released: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateCatchInput = z.infer<typeof createCatchSchema>
export type UpdateCatchInput = z.infer<typeof updateCatchSchema>
export type CatchFilters = z.infer<typeof catchFiltersSchema>
