'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { regionForDepartment } from '@/lib/geo/departments'
import { createNotification } from '@/lib/notifications/create'
import { proposeSpotSchema, type ProposeSpotInput } from '@/lib/spots/propose-schema'
import '@/lib/zod-config'
import { z } from 'zod'

// Résultat uniformisé (même forme que app/actions/feed.ts).
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour proposer un spot.'

// Anti-spam : aligné sur le trigger DB spots_proposal_rate_limit (migration 041).
const MAX_PROPOSALS_PER_24H = 5
const RATE_MSG =
  'Doucement moussaillon : 5 propositions de spots en 24h, c’est le max. Reviens demain 🎣'

// Anti-doublon géo (ST_DWithin < 150 m) — backstop DB = trigger spots_dedup.
const DUP_MSG = (name: string) =>
  `Un spot existe déjà à proximité : « ${name} ». Inutile de le re-proposer 🎣`
const SAVE_MSG = 'Impossible d’enregistrer ta proposition pour le moment. Réessaie.'

function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.'
}

// Slug URL-safe + suffixe court pour garantir l'unicité (spots_slug_key).
function slugifySpot(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'spot'}-${randomUUID().slice(0, 6)}`
}

// ---------------------------------------------------------------------------
// Vérification live de doublon (appelée par le formulaire quand le point bouge).
// Renvoie le nom du spot existant le plus proche (< 150 m) ou null. Ne renvoie
// AUCUNE coordonnée (la RPC find_spot_duplicate est SECURITY DEFINER et ne sort
// que id/name/slug) → zéro fuite GPS.
// ---------------------------------------------------------------------------
export async function checkSpotDuplicate(
  lat: number,
  lng: number,
): Promise<ActionResult<{ name: string } | null>> {
  if (typeof lat !== 'number' || typeof lng !== 'number') return ok(null)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const { data, error } = await supabase.rpc('find_spot_duplicate', {
    p_lng: lng,
    p_lat: lat,
    p_radius_m: 150,
  })
  if (error) {
    console.error('[checkSpotDuplicate]', error.message)
    return ok(null) // non bloquant : le backstop trigger protège à l'insert
  }
  const dup = data?.[0]
  return ok(dup ? { name: dup.name } : null)
}

// ---------------------------------------------------------------------------
// Proposition d'un spot communautaire. Insère en source='community' /
// moderation_status='pending' / verified=false / visibility='public' (forcé en
// plus par la RLS spots_insert_community, migration 041). Un pending n'est
// JAMAIS public tant qu'un modérateur ne l'a pas approuvé.
// ---------------------------------------------------------------------------
export async function proposeSpot(
  input: ProposeSpotInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const parsed = proposeSpotSchema.safeParse(input)
  if (!parsed.success) return fail(firstZodError(parsed.error))
  const d = parsed.data

  // Rate-limit applicatif (message propre) — le trigger DB est le backstop.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('spots')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .eq('source', 'community')
    .gte('created_at', since)
  if ((count ?? 0) >= MAX_PROPOSALS_PER_24H) return fail(RATE_MSG)

  // Anti-doublon applicatif (message propre) — le trigger DB est le backstop.
  const { data: dup } = await supabase.rpc('find_spot_duplicate', {
    p_lng: d.longitude,
    p_lat: d.latitude,
    p_radius_m: 150,
  })
  if (dup && dup.length > 0) return fail(DUP_MSG(dup[0].name))

  const region = regionForDepartment(d.department) || d.department

  const { data: inserted, error } = await supabase
    .from('spots')
    .insert({
      name: d.name,
      slug: slugifySpot(d.name),
      department: d.department,
      region,
      // EWKT geography (même convention que les prises du carnet).
      geom: `SRID=4326;POINT(${d.longitude} ${d.latitude})`,
      source: 'community',
      moderation_status: 'pending',
      verified: false,
      visibility: 'public',
      structure: d.structure,
      species: d.species ?? [],
      techniques: d.techniques ?? [],
      description: d.description?.trim() ? d.description.trim() : null,
      access_notes: d.access_notes?.trim() ? d.access_notes.trim() : null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    // Mappe les exceptions des triggers DB (backstops) vers des messages FR.
    if (error.message.includes('spot_duplicate')) {
      return fail('Un spot existe déjà à moins de 150 m. Inutile de le re-proposer 🎣')
    }
    if (error.message.includes('rate_limit_spots')) return fail(RATE_MSG)
    console.error('[proposeSpot]', error.message)
    return fail(SAVE_MSG)
  }

  revalidatePath('/spots/proposer')
  revalidatePath('/spots/mes-propositions')
  return ok({ id: inserted.id })
}

// ===========================================================================
// Modération des spots (Bloc C) — réservé aux modérateurs (is_moderator).
// L'UPDATE/DELETE passe par le client authenticated → la RLS
// spots_update_moderator / spots_delete_moderator (is_moderator()) reste le
// backstop même si ce gate applicatif était contourné. Le proposant est
// notifié (in-app) du verdict.
// ===========================================================================
const MOD_MSG = 'Action réservée aux modérateurs.'
const ID_MSG = 'Identifiant invalide.'

async function viewerIsModerator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_moderator === true
}

type ModSpot = {
  id: string
  name: string
  created_by: string | null
  moderation_status: string
}

async function loadSpotForModeration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spotId: string,
): Promise<ModSpot | null> {
  const { data } = await supabase
    .from('spots')
    .select('id, name, created_by, moderation_status')
    .eq('id', spotId)
    .maybeSingle()
  return (data as ModSpot | null) ?? null
}

export async function moderateApproveSpot(spotId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(spotId).success) return fail(ID_MSG)
  if (!(await viewerIsModerator(supabase, user.id))) return fail(MOD_MSG)

  const spot = await loadSpotForModeration(supabase, spotId)
  if (!spot) return fail('Spot introuvable.')

  const { error } = await supabase
    .from('spots')
    .update({ moderation_status: 'approved' })
    .eq('id', spotId)
  if (error) {
    console.error('[moderateApproveSpot]', error.message)
    return fail('Impossible d’approuver ce spot.')
  }

  if (spot.created_by) {
    await createNotification({
      userId: spot.created_by,
      type: 'spot_approved',
      actorId: user.id,
      targetType: 'spot',
      targetId: spotId,
      previewText: spot.name,
    })
  }
  revalidatePath('/moderation')
  revalidatePath('/carte') // approuvé → apparaît sur la carte
  return ok(undefined)
}

export async function moderateRejectSpot(spotId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(spotId).success) return fail(ID_MSG)
  if (!(await viewerIsModerator(supabase, user.id))) return fail(MOD_MSG)

  const spot = await loadSpotForModeration(supabase, spotId)
  if (!spot) return fail('Spot introuvable.')

  const { error } = await supabase
    .from('spots')
    .update({ moderation_status: 'rejected' })
    .eq('id', spotId)
  if (error) {
    console.error('[moderateRejectSpot]', error.message)
    return fail('Impossible de rejeter ce spot.')
  }

  if (spot.created_by) {
    await createNotification({
      userId: spot.created_by,
      type: 'spot_rejected',
      actorId: user.id,
      targetType: 'spot',
      targetId: spotId,
      previewText: spot.name,
    })
  }
  revalidatePath('/moderation')
  return ok(undefined)
}

// Doublon : on supprime la proposition (un spot équivalent existe déjà) et on
// prévient le proposant. (La fusion fine des données vers le spot canonique est
// hors périmètre v1 — cf docs/carte-v2/RECAP-C2.md.)
export async function moderateMergeSpot(spotId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(spotId).success) return fail(ID_MSG)
  if (!(await viewerIsModerator(supabase, user.id))) return fail(MOD_MSG)

  const spot = await loadSpotForModeration(supabase, spotId)
  if (!spot) return fail('Spot introuvable.')

  const proposer = spot.created_by
  const name = spot.name

  const { error } = await supabase.from('spots').delete().eq('id', spotId)
  if (error) {
    console.error('[moderateMergeSpot]', error.message)
    return fail('Impossible de fusionner ce spot.')
  }

  if (proposer) {
    await createNotification({
      userId: proposer,
      type: 'spot_rejected',
      actorId: user.id,
      targetType: 'spot',
      targetId: null,
      previewText: `${name} : déjà présent sur la carte`,
    })
  }
  revalidatePath('/moderation')
  return ok(undefined)
}

