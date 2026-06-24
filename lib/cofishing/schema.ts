import '@/lib/zod-config'
import { z } from 'zod'
import { isCoastalDepartment } from '@/lib/geo/departments'

// ─── Co-pêchage — proposer une sortie à plusieurs ─────────────────────────────
// 🔴 AUCUNE coordonnée : localisation = département + libellé LIBRE (D-D3). Le
// schéma n'accepte volontairement ni lat/lng ni spot_id geom.

// Garde-fou D-D3 : on ne laisse PAS écrire une coordonnée précise, même en texte
// libre. Rejette un motif décimal type latitude/longitude (1-2 entiers . 3+ décimales,
// ex. « 47.123 », « -1,4567 »). Une heure « 7.30 » (2 décimales) ne matche pas.
const LOOKS_LIKE_COORD = /-?\d{1,2}[.,]\d{3,}/
const noCoord = (s: string | undefined) => !s || !LOOKS_LIKE_COORD.test(s)

export const proposeOutingSchema = z.object({
  department: z
    .string()
    .refine((d) => isCoastalDepartment(d), { error: 'Choisis un département côtier' }),
  area_label: z
    .string()
    .max(120)
    .optional()
    .refine(noCoord, { error: 'Pas de coordonnées GPS — donne un repère (« digue nord », « plage de X »).' }),
  planned_at: z.string().datetime(),
  capacity: z.number().int().min(1).max(20).optional(),
  notes: z
    .string()
    .max(1000)
    .optional()
    .refine(noCoord, { error: 'Évite les coordonnées GPS précises dans les notes (cale le RDV en privé).' }),
})

export type ProposeOutingInput = z.infer<typeof proposeOutingSchema>
