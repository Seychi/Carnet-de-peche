import '@/lib/zod-config'
import { z } from 'zod'
import { isCoastalDepartment } from '@/lib/geo/departments'

// ─── Co-pêchage — proposer une sortie à plusieurs ─────────────────────────────
// 🔴 AUCUNE coordonnée : localisation = département + libellé LIBRE (D-D3). Le
// schéma n'accepte volontairement ni lat/lng ni spot_id geom.

// Garde-fou D-D3 : on ne laisse PAS écrire une coordonnée précise, même en texte
// libre. Rejette un motif décimal type latitude/longitude (1-2 entiers . 3+ décimales,
// ex. « 47.123 », « -1,4567 »). Une heure « 7.30 » (2 décimales) ne matche pas.
// Exporté (sprint 44) pour être RÉUTILISÉ tel quel par le partage (app/actions/share.ts)
// et la saisie de prise (lib/catches/schema.ts) : un seul motif anti-coordonnée dans
// tout le repo, jamais redéfini en double.
export const LOOKS_LIKE_COORD = /-?\d{1,2}[.,]\d{3,}/
const noCoord = (s: string | undefined) => !s || !LOOKS_LIKE_COORD.test(s)

export const proposeOutingSchema = z.object({
  department: z
    .string()
    .refine((d) => isCoastalDepartment(d), { error: 'Choisis un département côtier' }),
  area_label: z
    .string()
    .max(120)
    .optional()
    .refine(noCoord, { error: 'Pas de coordonnées GPS, donne un repère (« digue nord », « plage de X »).' }),
  planned_at: z.string().datetime(),
  capacity: z.number().int().min(1).max(20).optional(),
  // Espèces ciblées (matching). Clés DB (snake_case) issues du référentiel SPECIES.
  // Optionnel : une sortie peut ne viser aucune espèce précise.
  species: z.array(z.string().max(40)).max(20).optional(),
  notes: z
    .string()
    .max(1000)
    .optional()
    .refine(noCoord, { error: 'Évite les coordonnées GPS précises dans les notes (cale le RDV en privé).' }),
})

export type ProposeOutingInput = z.infer<typeof proposeOutingSchema>

// ─── Chat de sortie ───────────────────────────────────────────────────────────
// Garde-fou anti spot-burning : on REFUSE une coordonnée tapée dans le chat aussi
// (le RDV précis se cale en privé). Même regex LOOKS_LIKE_COORD que les propositions.
export const outingMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: 'Écris un message.' })
    .max(1000, { error: 'Message trop long (1000 caractères max).' })
    .refine(noCoord, { error: 'Pas de coordonnées GPS dans le chat : cale le point de RDV en privé.' }),
})

export type OutingMessageInput = z.infer<typeof outingMessageSchema>
