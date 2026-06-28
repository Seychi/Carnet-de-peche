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

// Raison de retrait d'un leurre (perte, casse, usure). Posée au moment où le
// pêcheur déclare avoir perdu/cassé son leurre (sprint 46 WS B). Le CHECK DB de
// la migration 078 garantit déjà la valeur ; on la valide aussi côté action.
const retiredReasonEnum = z.enum(['perdu', 'casse', 'use'], {
  error: () => 'Choisis une raison (perdu, cassé ou usé).',
})
export type RetiredReason = z.infer<typeof retiredReasonEnum>

export type GearItem = {
  id: string
  kind: GearKind
  brand: string | null
  model: string | null
  color: string | null
  size_mm: number | null
  notes: string | null
  /** Chemin de la photo dans le bucket PRIVÉ 'catches' (jamais une URL publique). */
  photo_path: string | null
  /** Daté quand le leurre a été perdu/cassé/usé (au cimetière). null = actif. */
  retired_at: string | null
  /** Raison du retrait (perdu/casse/use) ou null si actif. */
  retired_reason: RetiredReason | null
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
    // Chemin storage (bucket PRIVÉ 'catches', sous-dossier gear/), jamais une URL.
    photo_path: z.string().trim().max(300).optional(),
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
  photo_path: z.string().trim().max(300).nullable().optional(),
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
      photo_path: emptyToNull(d.photo_path),
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
    .select('id, kind, brand, model, color, size_mm, notes, photo_path, retired_at, retired_reason')
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

// ─── listMyRetiredGear (le cimetière des leurres) ─────────────────────────────

/**
 * Liste les leurres RETIRÉS de l'utilisateur courant (perdus/cassés/usés). Un
 * retrait archive l'item (décision John D2), donc `listMyGear` (qui filtre
 * archived=false) ne les renvoie plus. Le cimetière les ramène en lecture seule :
 * archived=true ET retired_at non null. Owner-only (RLS gear_items_select_own).
 */
export async function listMyRetiredGear(): Promise<ActionResult<GearItem[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const { data, error } = await supabase
    .from('gear_items')
    .select('id, kind, brand, model, color, size_mm, notes, photo_path, retired_at, retired_reason')
    .eq('user_id', user.id)
    .eq('archived', true)
    .not('retired_at', 'is', null)
    .order('retired_at', { ascending: false })

  if (error) {
    console.error('[gear/listMyRetiredGear]', error.message)
    return fail('Impossible de charger le cimetière des leurres.')
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
  if (parsed.data.photo_path !== undefined)
    payload.photo_path = emptyToNull(parsed.data.photo_path ?? undefined)

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

// ─── markGearRetired (perdu / cassé / usé → au cimetière) ─────────────────────

/**
 * Marque un leurre comme perdu/cassé/usé : pose retired_at = now + retired_reason
 * ET l'archive (décision John D2) pour le sortir de la boîte et du sélecteur. Les
 * prises déjà loguées avec gardent leur libellé (catches.gear_id intact). Le
 * cimetière (listMyRetiredGear) le ramène en lecture seule. Owner-only.
 */
export async function markGearRetired(
  id: string,
  reason: RetiredReason
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(id).success) return fail(ID_MSG)

  const parsedReason = retiredReasonEnum.safeParse(reason)
  if (!parsedReason.success) return fail(firstZodError(parsedReason.error))

  const { error } = await supabase
    .from('gear_items')
    .update({
      retired_at: new Date().toISOString(),
      retired_reason: parsedReason.data,
      archived: true,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[gear/markGearRetired]', error.message)
    return fail('Impossible d’enregistrer ce retrait. Réessaie.')
  }

  revalidatePath('/carnet/boite')
  return ok(undefined)
}

// ─── uploadGearPhoto (bucket PRIVÉ 'catches', sous-dossier gear/) ──────────────

// Aligné SOUS la limite framework des Server Actions (bodySizeLimit = 2 Mo, cf
// next.config.ts), comme uploadCatchPhoto : un fichier 1,8–2 Mo renvoie ce message
// FR propre au lieu d'un 500 « Body exceeded ».
const MAX_GEAR_PHOTO_BYTES = 1.8 * 1024 * 1024 // 1.8 MB

/**
 * Upload de la photo d'un leurre. Modèle EXACT d'uploadCatchPhoto (lib/catches/
 * actions.ts) : on reçoit un WebP DÉJÀ redimensionné côté client (resizeImageToWebp,
 * EXIF strippé au ré-encodage), on le pousse dans le bucket PRIVÉ 'catches'
 * (public=false) au chemin `${user.id}/gear/${uuid}.webp`. La policy storage 006
 * autorise l'écriture car (storage.foldername(name))[1] = auth.uid() (le sous-dossier
 * gear/ est foldername[2], sans incidence). DÉCISION JOHN D1 : on réutilise le bucket
 * catches, pas de nouveau bucket. La photo n'est JAMAIS servie en URL publique : la
 * vignette passe par une signed URL côté serveur (lib/catches/queries.ts).
 */
export async function uploadGearPhoto(
  formData: FormData
): Promise<ActionResult<{ path: string }>> {
  const file = formData.get('file')
  if (!(file instanceof File)) return fail('Fichier manquant.')

  if (file.size > MAX_GEAR_PHOTO_BYTES) {
    return fail('La photo dépasse 1,8 Mo. Redimensionne-la avant l’envoi.')
  }
  if (file.type !== 'image/webp') {
    return fail('Format invalide. Seul le format WebP est accepté.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  // Bucket PRIVÉ 'catches' ; sous-dossier gear/ pour ne pas mêler aux photos de prises.
  const storagePath = `${user.id}/gear/${crypto.randomUUID()}.webp`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error } = await supabase.storage
    .from('catches')
    .upload(storagePath, buffer, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (error) {
    console.error('[gear/uploadGearPhoto]', error.message)
    return fail('Upload échoué. Réessaie.')
  }

  return ok({ path: storagePath })
}

// ─── signMyGearPhoto (vignette via signed URL owner-only) ─────────────────────

/**
 * Signe l'URL d'une photo de leurre pour l'afficher en vignette. La photo vit dans
 * le bucket PRIVÉ 'catches' : JAMAIS d'URL publique. On exige que le chemin commence
 * par `${user.id}/gear/` (le pêcheur ne signe que SES propres photos) ; la policy
 * storage 006 (foldername[1] = auth.uid()) est le backstop. Utilisé côté client par
 * le sélecteur de matériel (la page boîte signe directement côté serveur).
 */
export async function signMyGearPhoto(
  path: string,
  expiresInSec = 3600
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  // Garde-fou : on ne signe que les photos de SES leurres (préfixe owner + gear/).
  if (typeof path !== 'string' || !path.startsWith(`${user.id}/gear/`)) {
    return fail(ID_MSG)
  }

  const { data, error } = await supabase.storage
    .from('catches')
    .createSignedUrl(path, expiresInSec)

  if (error || !data) {
    console.error('[gear/signMyGearPhoto]', error?.message)
    return fail('Aperçu indisponible pour le moment.')
  }

  return ok({ url: data.signedUrl })
}
