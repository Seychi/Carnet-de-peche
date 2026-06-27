'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import '@/lib/zod-config'
import { z } from 'zod'

// Résultat uniformisé (même forme que app/actions/spots.ts / app/actions/feed.ts).
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour gérer ta boîte à matériel.'
const ID_MSG = 'Identifiant invalide.'
const SAVE_MSG = 'Impossible d’enregistrer ton matériel pour le moment. Réessaie.'

function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.'
}

// ─── Types boîte à matériel ─────────────────────────────────────────────────

// kind : leurre / montage / appat (v1, décision John : leurres d'abord).
// Non exporté : un fichier 'use server' ne peut exporter QUE des async functions.
// Les consommateurs n'ont besoin que des types (GearKind/GearItem) + des actions.
const gearKindEnum = z.enum(['leurre', 'montage', 'appat'], {
  error: () => 'Choisis un type de matériel',
})
export type GearKind = z.infer<typeof gearKindEnum>

export type GearItem = {
  id: string
  kind: GearKind
  brand: string | null
  model: string | null
  color: string | null
  size_mm: number | null
  notes: string | null
}

// Au moins un libellé exploitable (marque OU modèle) pour ne pas créer un item vide.
const gearFieldsSchema = z
  .object({
    kind: gearKindEnum,
    brand: z.string().trim().max(60).optional(),
    model: z.string().trim().max(100).optional(),
    color: z.string().trim().max(60).optional(),
    size_mm: z.number().int().min(1).max(1000).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const hasLabel = !!data.brand?.trim() || !!data.model?.trim()
    if (!hasLabel) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indique au moins une marque ou un modèle.',
        path: ['brand'],
      })
    }
  })

export type CreateGearInput = z.infer<typeof gearFieldsSchema>

// Patch d'édition : tous les champs métier optionnels (le kind n'est pas modifiable
// ici — un leurre reste un leurre ; changer de type = archiver + recréer).
const updateGearSchema = z.object({
  brand: z.string().trim().max(60).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(60).nullable().optional(),
  size_mm: z.number().int().min(1).max(1000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

export type UpdateGearPatch = z.infer<typeof updateGearSchema>

// Normalise '' → null pour ne pas stocker de chaînes vides.
function emptyToNull(v: string | undefined): string | null {
  const t = v?.trim()
  return t ? t : null
}

// ─── createGearItem ─────────────────────────────────────────────────────────

/**
 * Crée un item dans la boîte à matériel de l'utilisateur courant. RLS owner-only
 * (gear_items_*_own, migration 059) → l'item appartient à auth.uid(). Renvoie l'id
 * créé pour que le form de prise puisse l'attacher immédiatement (gear_id).
 */
export async function createGearItem(
  input: CreateGearInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const parsed = gearFieldsSchema.safeParse(input)
  if (!parsed.success) return fail(firstZodError(parsed.error))
  const d = parsed.data

  const { data: row, error } = await supabase
    .from('gear_items')
    .insert({
      user_id: user.id,
      kind: d.kind,
      brand: emptyToNull(d.brand),
      model: emptyToNull(d.model),
      color: emptyToNull(d.color),
      size_mm: d.size_mm ?? null,
      notes: emptyToNull(d.notes),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[gear/createGearItem]', error.message)
    return fail(SAVE_MSG)
  }

  revalidatePath('/carnet/boite')
  return ok({ id: row.id })
}

// ─── listMyGear ───────────────────────────────────────────────────────────────

/**
 * Liste les items NON archivés de l'utilisateur courant, optionnellement filtrés
 * par type(s). Lecture owner-only (RLS gear_items_select_own). Utilisable côté
 * serveur (pages) comme côté Server Action.
 */
export async function listMyGear(
  kinds?: GearKind[]
): Promise<ActionResult<GearItem[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  let query = supabase
    .from('gear_items')
    .select('id, kind, brand, model, color, size_mm, notes')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (kinds && kinds.length > 0) {
    const valid = kinds.filter((k) => gearKindEnum.safeParse(k).success)
    if (valid.length > 0) query = query.in('kind', valid)
  }

  const { data, error } = await query
  if (error) {
    console.error('[gear/listMyGear]', error.message)
    return fail('Impossible de charger ta boîte à matériel.')
  }

  return ok((data ?? []) as GearItem[])
}

// ─── archiveGearItem ────────────────────────────────────────────────────────

/**
 * Archive un item (archived=true) plutôt que de le supprimer : les prises déjà
 * rattachées (catches.gear_id) gardent leur référence et leur libellé. Owner-only
 * (l'UPDATE filtre user_id + backstop RLS gear_items_update_own).
 */
export async function archiveGearItem(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(id).success) return fail(ID_MSG)

  const { error } = await supabase
    .from('gear_items')
    .update({ archived: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[gear/archiveGearItem]', error.message)
    return fail('Impossible d’archiver ce matériel. Réessaie.')
  }

  revalidatePath('/carnet/boite')
  return ok(undefined)
}

// ─── updateGearItem ─────────────────────────────────────────────────────────

/**
 * Met à jour les champs métier d'un item (marque/modèle/couleur/taille/notes).
 * Owner-only. Le kind n'est pas modifiable (cf updateGearSchema). Un patch vide
 * est rejeté pour éviter un UPDATE no-op.
 */
export async function updateGearItem(
  id: string,
  patch: UpdateGearPatch
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(id).success) return fail(ID_MSG)

  const parsed = updateGearSchema.safeParse(patch)
  if (!parsed.success) return fail(firstZodError(parsed.error))

  const payload: Record<string, unknown> = {}
  if (parsed.data.brand !== undefined) payload.brand = emptyToNull(parsed.data.brand ?? undefined)
  if (parsed.data.model !== undefined) payload.model = emptyToNull(parsed.data.model ?? undefined)
  if (parsed.data.color !== undefined) payload.color = emptyToNull(parsed.data.color ?? undefined)
  if (parsed.data.size_mm !== undefined) payload.size_mm = parsed.data.size_mm ?? null
  if (parsed.data.notes !== undefined) payload.notes = emptyToNull(parsed.data.notes ?? undefined)

  if (Object.keys(payload).length === 0) return fail('Aucune modification à enregistrer.')

  const { error } = await supabase
    .from('gear_items')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[gear/updateGearItem]', error.message)
    return fail('Impossible de mettre à jour ce matériel. Réessaie.')
  }

  revalidatePath('/carnet/boite')
  return ok(undefined)
}
