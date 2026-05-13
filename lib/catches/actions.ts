'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createCatchSchema, updateCatchSchema } from './schema'
import type { CreateCatchInput, UpdateCatchInput } from './schema'
import { fetchConditionsAt } from '@/lib/conditions/openmeteo'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit lat/lng en EWKT lisible par PostgREST/PostGIS */
function toEwkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

/** Tente de récupérer les conditions sans jamais lever d'exception */
async function safeConditions(
  lat: number | undefined,
  lng: number | undefined,
  datetime: Date
) {
  if (lat === undefined || lng === undefined) return null
  try {
    return await fetchConditionsAt(lat, lng, datetime)
  } catch (err) {
    console.error('[catches/actions] fetchConditionsAt échoué (non bloquant) :', err)
    return null
  }
}

// ─── createCatch ──────────────────────────────────────────────────────────────

export async function createCatch(
  input: CreateCatchInput
): Promise<{ id: string } | { error: string }> {
  const parsed = createCatchSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => issue.message).join(', ')
    return { error: msg }
  }
  const data = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const caughtAt = new Date(data.caught_at)
  const conditions = await safeConditions(data.latitude, data.longitude, caughtAt)

  const geom =
    data.latitude !== undefined && data.longitude !== undefined
      ? toEwkt(data.latitude, data.longitude)
      : undefined

  const { data: row, error } = await supabase
    .from('catches')
    .insert({
      user_id: user.id,
      species: data.species,
      caught_at: data.caught_at,
      size_cm: data.size_cm ?? null,
      weight_g: data.weight_kg !== undefined ? Math.round(data.weight_kg * 1000) : null,
      technique: data.technique,
      lure_brand: data.lure_brand ?? null,
      lure_model: data.lure_model ?? null,
      bait_type: data.bait_type ?? null,
      released: data.released,
      water_temperature_c: data.water_temperature_c ?? null,
      notes: data.notes ?? null,
      location_method: data.location_method,
      geom: geom as unknown,
      spot_id: data.spot_id ?? null,
      privacy: data.privacy,
      precise_for_friends: data.precise_for_friends,
      reveal_precise_to_public: data.reveal_precise_to_public,
      conditions: conditions as unknown,
      photo_path: data.photo_path ?? null,
      location_label: data.location_label ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[catches/actions] createCatch insert error :', error)
    return { error: 'Impossible de créer la prise. Réessaie.' }
  }

  revalidatePath('/carnet')
  return { id: row.id }
}

// ─── updateCatch ──────────────────────────────────────────────────────────────

export async function updateCatch(
  input: UpdateCatchInput
): Promise<{ ok: true } | { error: string }> {
  const parsed = updateCatchSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => issue.message).join(', ')
    return { error: msg }
  }
  const { id, ...data } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: existing, error: fetchError } = await supabase
    .from('catches')
    .select('id, photo_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[catches/actions] updateCatch fetch error :', fetchError)
    return { error: 'Prise introuvable.' }
  }
  if (!existing) return { error: 'Prise introuvable ou accès refusé.' }

  const geomChanged = data.latitude !== undefined || data.longitude !== undefined
  const geom =
    data.latitude !== undefined && data.longitude !== undefined
      ? toEwkt(data.latitude, data.longitude)
      : undefined

  let conditions: unknown = undefined
  if (geomChanged && data.latitude !== undefined && data.longitude !== undefined) {
    const caughtAt = data.caught_at ? new Date(data.caught_at) : new Date()
    conditions = await safeConditions(data.latitude, data.longitude, caughtAt) as unknown
  }

  const payload: Record<string, unknown> = {}
  if (data.species !== undefined) payload.species = data.species
  if (data.caught_at !== undefined) payload.caught_at = data.caught_at
  if (data.size_cm !== undefined) payload.size_cm = data.size_cm
  if (data.weight_kg !== undefined) payload.weight_g = Math.round(data.weight_kg * 1000)
  if (data.technique !== undefined) payload.technique = data.technique
  if (data.lure_brand !== undefined) payload.lure_brand = data.lure_brand
  if (data.lure_model !== undefined) payload.lure_model = data.lure_model
  if (data.bait_type !== undefined) payload.bait_type = data.bait_type
  if (data.released !== undefined) payload.released = data.released
  if (data.water_temperature_c !== undefined) payload.water_temperature_c = data.water_temperature_c
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.location_method !== undefined) payload.location_method = data.location_method
  if (geom !== undefined) payload.geom = geom
  if (data.spot_id !== undefined) payload.spot_id = data.spot_id
  if (data.privacy !== undefined) payload.privacy = data.privacy
  if (data.precise_for_friends !== undefined) payload.precise_for_friends = data.precise_for_friends
  if (data.reveal_precise_to_public !== undefined) payload.reveal_precise_to_public = data.reveal_precise_to_public
  if (conditions !== undefined) payload.conditions = conditions
  if (data.photo_path !== undefined) payload.photo_path = data.photo_path

  const { error } = await supabase
    .from('catches')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[catches/actions] updateCatch update error :', error)
    return { error: 'Impossible de mettre à jour la prise. Réessaie.' }
  }

  // Supprime l'ancienne photo si une nouvelle a été uploadée
  if (
    data.photo_path !== undefined &&
    existing.photo_path &&
    existing.photo_path !== data.photo_path
  ) {
    const { error: storageError } = await supabase.storage
      .from('catches')
      .remove([existing.photo_path])
    if (storageError) {
      console.error('[catches/actions] updateCatch storage remove error :', storageError)
    }
  }

  revalidatePath('/carnet')
  revalidatePath('/carnet/[id]', 'page')
  return { ok: true }
}

// ─── deleteCatch ──────────────────────────────────────────────────────────────

export async function deleteCatch(id: string): Promise<{ ok: true } | { error: string }> {
  if (!id) return { error: 'ID manquant.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Récupère photo_path avant suppression
  const { data: existing, error: fetchError } = await supabase
    .from('catches')
    .select('photo_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[catches/actions] deleteCatch fetch error :', fetchError)
    return { error: 'Prise introuvable.' }
  }
  if (!existing) return { error: 'Prise introuvable ou accès refusé.' }

  const { error } = await supabase
    .from('catches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[catches/actions] deleteCatch delete error :', error)
    return { error: 'Impossible de supprimer la prise. Réessaie.' }
  }

  if (existing.photo_path) {
    const { error: storageError } = await supabase.storage
      .from('catches')
      .remove([existing.photo_path])

    if (storageError) {
      // Non bloquant : la prise est déjà supprimée
      console.error('[catches/actions] deleteCatch storage remove error :', storageError)
    }
  }

  revalidatePath('/carnet')
  return { ok: true }
}

// ─── uploadCatchPhoto ─────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

export async function uploadCatchPhoto(
  formData: FormData
): Promise<{ path: string } | { error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Fichier manquant.' }

  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'La photo dépasse 1,5 Mo. Redimensionne-la avant l\'envoi.' }
  }
  if (file.type !== 'image/webp') {
    return { error: 'Format invalide. Seul le format WebP est accepté.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const filename = `${crypto.randomUUID()}.webp`
  const storagePath = `${user.id}/${filename}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error } = await supabase.storage
    .from('catches')
    .upload(storagePath, buffer, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (error) {
    console.error('[catches/actions] uploadCatchPhoto upload error :', error)
    return { error: 'Upload échoué. Réessaie.' }
  }

  return { path: storagePath }
}
