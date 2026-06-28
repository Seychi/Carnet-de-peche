import '@/lib/zod-config'
import { z } from 'zod'
import { isCoastalDepartment } from '@/lib/geo/departments'
import { CARNET_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'
import { LOOKS_LIKE_COORD } from '@/lib/cofishing/schema'

// Garde-fou anti spot-burning : `location_label` est du texte libre éditable. On
// refuse une coordonnée précise tapée à la main (même motif que le co-pêchage : 1-2
// entiers . 3+ décimales). Cohérent avec la sanitisation du partage (app/actions/share.ts).
const noCoordInLabel = (s: string | undefined) => !s || !LOOKS_LIKE_COORD.test(s)

// ─── Enums ────────────────────────────────────────────────────────────────────

// Espèces loguables au carnet — DÉRIVÉ du référentiel unique `SPECIES`
// (lib/seo/programmatic.ts) depuis le sprint 23 (D-B2 : 20 espèces). Rétro-compatible :
// `catches.species` est `text` en DB (aucune contrainte CHECK), donc l'extension
// n'impacte aucune donnée existante. La cohérence référentiel ↔ enum est testée
// (lib/catches/__tests__).
export const catchSpeciesEnum = z.enum(
  CARNET_SPECIES_DB_KEYS as [string, ...string[]],
  { error: () => 'Choisis une espèce pour continuer' },
)

export const catchTechniqueEnum = z.enum([
  'leurres',
  'surfcasting',
  'flottante',
  'vif',
], { error: () => 'Choisis une technique de pêche' })

export const catchPrivacyEnum = z.enum(['private', 'friends', 'public'])

export const catchLocationMethodEnum = z.enum(['gps', 'manual', 'spot'])

// ─── Create ───────────────────────────────────────────────────────────────────

// Champs SANS defaults — base de updateCatchSchema. En Zod v4, .partial() sur un
// champ .default() réinjecte quand même la valeur par défaut : un update partiel
// écraserait alors released/privacy/caught_at non soumis (bug audit 2026-06-11).
const catchFieldsNoDefaults = z.object({
  species: catchSpeciesEnum,
  caught_at: z.string().datetime(),
  size_cm: z.number().min(10).max(200).optional(),
  weight_kg: z.number().min(0.05).max(30).optional(),
  // Aide à la mesure honnête (WS-D, sprint 39). Longueur réellement mesurée +
  // objet de référence visible sur la photo. Reste dans le CHECK DB (0 < x < 300).
  // Borne basse alignée sur size_cm (10, fini le 1 cm absurde, décision John D4) ;
  // borne haute large (250) pour les grosses espèces (congre). `is_measured` est un
  // champ de FORMULAIRE (pas une colonne) : il déclenche la sémantique « prise
  // mesurée » côté action, qui dérive `photo_verified_at`.
  measured_length_cm: z.number().int()
    .min(10, { error: 'La longueur mesurée doit faire au moins 10 cm.' })
    .max(250, { error: 'La longueur mesurée doit faire au plus 250 cm.' })
    .optional(),
  reference_object: z.string().trim().max(120).optional(),
  is_measured: z.boolean().optional(),
  technique: catchTechniqueEnum,
  lure_brand: z.string().max(60).optional(),
  lure_model: z.string().max(100).optional(),
  bait_type: z.string().max(60).optional(),
  // Matériel structuré depuis « ma boîte » (gear_items). Coexiste avec la saisie
  // texte legacy (lure_brand/model/bait_type) gardée en fallback rétro-compat.
  gear_id: z.string().uuid({ error: 'Matériel invalide' }).optional(),
  released: z.boolean(),
  water_temperature_c: z.number().min(0).max(35).optional(),
  notes: z.string().max(1000).optional(),
  location_method: catchLocationMethodEnum,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  spot_id: z.string().uuid().optional(),
  privacy: catchPrivacyEnum,
  precise_for_friends: z.boolean(),
  reveal_precise_to_public: z.boolean(),
  photo_path: z.string().optional(),
  location_label: z.string().max(120).optional()
    .refine(noCoordInLabel, { error: 'Pas de coordonnées GPS dans le lieu : donne un repère (commune, « digue nord »).' }),
})

// Objet de base AVEC defaults, réutilisé par le form et createCatchSchema
const baseCatchObject = catchFieldsNoDefaults.extend({
  caught_at: z.string().datetime().default(() => new Date().toISOString()),
  released: z.boolean().default(false),
  location_method: catchLocationMethodEnum.default('gps'),
  privacy: catchPrivacyEnum.default('private'),
  precise_for_friends: z.boolean().default(true),
  reveal_precise_to_public: z.boolean().default(false),
})

// Schéma de base exporté pour le form en mode édition (pas de validation lat/lng requise)
export const catchBaseSchema = baseCatchObject

export const createCatchSchema = baseCatchObject.superRefine((data, ctx) => {
  if (data.location_method === 'gps' || data.location_method === 'manual') {
    if (data.latitude === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indique la latitude (ou choisis un autre mode de localisation).',
        path: ['latitude'],
      })
    }
    if (data.longitude === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indique la longitude (ou choisis un autre mode de localisation).',
        path: ['longitude'],
      })
    }
  }

  if (data.location_method === 'spot' && !data.spot_id) {
    ctx.addIssue({
      code: 'custom',
      message: 'Choisis un spot dans la liste.',
      path: ['spot_id'],
    })
  }
})

// ─── Couverture géographique ─────────────────────────────────────────────────

// Bbox France métropolitaine + bande côtière. Hors de cette zone, la prise reste
// enregistrable mais les conditions ne sont pas récupérées (Open-Meteo Marine
// calibré pour nos façades) et la prise est exclue du scoring (flag out_of_coverage).
export const FRANCE_METRO_BBOX = {
  latMin: 41.0,
  latMax: 51.5,
  lngMin: -5.8,
  lngMax: 9.9,
} as const

export function isInFranceMetro(lat: number, lng: number): boolean {
  return (
    lat >= FRANCE_METRO_BBOX.latMin &&
    lat <= FRANCE_METRO_BBOX.latMax &&
    lng >= FRANCE_METRO_BBOX.lngMin &&
    lng <= FRANCE_METRO_BBOX.lngMax
  )
}

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateCatchSchema = catchFieldsNoDefaults.partial().extend({ id: z.string().uuid() })

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

// ─── Import groupé de prises passées (WS-C, sprint 22) ───────────────────────
// Saisie rapide multi-prises pour amorcer un carnet rétroactivement. Localisation
// approximative = un département côtier (→ point de mer de référence pour
// l'enrichissement météo). `technique` volontairement OMISE (nullable en DB) : pour
// de l'historique on ne s'en souvient pas forcément. `caught_at` accepte n'importe
// quelle date passée (aucune borne max).
export const bulkCatchRowSchema = z.object({
  species: catchSpeciesEnum,
  caught_at: z.string().datetime(),
  size_cm: z.number().min(10).max(200).optional(),
  department: z.string().refine((d) => isCoastalDepartment(d), {
    error: 'Choisis un département côtier pour chaque prise',
  }),
})

export const bulkCatchSchema = z
  .array(bulkCatchRowSchema)
  .min(1, { error: 'Ajoute au moins une prise' })
  .max(50, { error: 'Maximum 50 prises par import' })

export type BulkCatchRowInput = z.infer<typeof bulkCatchRowSchema>
export type BulkCatchInput = z.infer<typeof bulkCatchSchema>
