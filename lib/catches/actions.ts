'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createCatchSchema, updateCatchSchema, bulkCatchSchema, isInFranceMetro } from './schema'
import type { CreateCatchInput, UpdateCatchInput, BulkCatchInput } from './schema'
import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'
import { fetchConditionsAt, type ConditionsSnapshot } from '@/lib/conditions/openmeteo'
import { notifyFollowersOfPublicCatch } from './notify-followers'
import { buildCatchCelebration, type CatchCelebration } from '@/lib/gamification/celebration'
import { recomputeSoloChallenges, type CompletedChallenge } from '@/lib/gamification/challenges-solo'
import { getUserXpOrNull } from '@/lib/gamification/progress'
import { emitDopamineNotifications } from '@/lib/notifications/dopamine'
import { emitRankChangeNotifications } from '@/lib/notifications/rank'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convertit lat/lng en EWKT lisible par PostgREST/PostGIS */
function toEwkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

/** Conditions stockées quand la prise est hors zone de couverture (exclue du scoring) */
type OutOfCoverageConditions = { out_of_coverage: true }

/**
 * Tente de récupérer les conditions sans jamais lever d'exception.
 * Hors France métropolitaine : pas d'appel Open-Meteo, la prise est flaggée
 * out_of_coverage (exclue du scoring, conditions non calculées).
 */
async function safeConditions(
  lat: number | undefined,
  lng: number | undefined,
  datetime: Date
): Promise<ConditionsSnapshot | OutOfCoverageConditions | null> {
  if (lat === undefined || lng === undefined) return null
  if (!isInFranceMetro(lat, lng)) {
    return { out_of_coverage: true } as const
  }
  try {
    return await fetchConditionsAt(lat, lng, datetime)
  } catch (err) {
    console.error('[catches/actions] fetchConditionsAt échoué (non bloquant) :', err)
    return null
  }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Vérifie qu'un gear_id appartient bien à l'utilisateur courant (boîte à matériel
 * owner-only). Sans ce garde, un user pourrait rattacher sa prise au matériel
 * d'autrui : `gear_label` (dénormalisé dans `catches_for_viewer`) exposerait alors
 * la marque/modèle privés d'un tiers sur une prise publique. On scope la lecture
 * sur user_id (modèle app/actions/gear.ts) ; absent = refus.
 */
async function assertGearOwnership(
  supabase: SupabaseServerClient,
  gearId: string,
  userId: string
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase
    .from('gear_items')
    .select('id')
    .eq('id', gearId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[catches/actions] assertGearOwnership error :', error)
    return { error: 'Impossible de vérifier ton matériel. Réessaie.' }
  }
  if (!data) return { error: 'Ce matériel ne fait pas partie de ta boîte.' }
  return { ok: true }
}

/**
 * Vérifie qu'un spot_id est ACCESSIBLE à l'utilisateur courant (même trou que
 * gear_id, décision John D2). La RLS `spots_select_visible` ne renvoie une ligne
 * que pour un spot (approuvé ET visible selon tier) OU créé par lui OU s'il est
 * modérateur : un simple SELECT scopé sur l'id reflète donc exactement la
 * visibilité réelle. On ne lit QUE l'id (aucune colonne geom dé-verrouillée).
 * Absent = spot non accessible → refus.
 */
async function assertSpotAccessible(
  supabase: SupabaseServerClient,
  spotId: string
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase
    .from('spots')
    .select('id')
    .eq('id', spotId)
    .maybeSingle()
  if (error) {
    console.error('[catches/actions] assertSpotAccessible error :', error)
    return { error: 'Impossible de vérifier ce spot. Réessaie.' }
  }
  if (!data) return { error: 'Ce spot n’est pas accessible.' }
  return { ok: true }
}

// ─── Rate-limit prises (sprint 69) ────────────────────────────────────────────
// Anti-spam de créations (l'anti-farm XP, lui, vit au niveau du ledger xp_events,
// migration 105). Pattern countLast24h du fil (app/actions/feed.ts, migration 022).
// Les deux flux ont leur compteur PROPRE pour éviter les faux positifs croisés :
// un import d'historique (50 prises bulk) ne doit pas bloquer le log du jour.
// Discriminant : une prise unitaire a TOUJOURS une technique (zod enum requis),
// une prise importée en bulk JAMAIS (technique volontairement omise, sprint 22).
const MAX_CATCHES_PER_24H = 20
const MAX_CATCHES_BURST_PER_HOUR = 5
const MAX_BULK_CATCHES_PER_24H = 100
const CATCH_LIMIT_24H_MSG =
  'Doucement moussaillon : 20 prises en 24h, c’est le max. Reviens demain 🎣'
const CATCH_LIMIT_HOUR_MSG =
  'Doucement moussaillon : 5 prises dans l’heure, c’est le max. Souffle un peu et réessaie 🎣'
const BULK_LIMIT_MSG =
  'Doucement moussaillon : 100 prises importées en 24h, c’est le max. Reviens demain 🎣'

/** Compte les prises créées par l'utilisateur depuis `sinceIso`, par flux. */
async function countCatchesCreatedSince(
  supabase: SupabaseServerClient,
  userId: string,
  sinceIso: string,
  flux: 'unitaire' | 'bulk'
): Promise<number> {
  let q = supabase
    .from('catches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
  q = flux === 'bulk' ? q.is('technique', null) : q.not('technique', 'is', null)
  const { count } = await q
  return count ?? 0
}

// Message unique du garde « photo obligatoire pour vérifiée » (sprint 69) :
// partagé create/update, affiché aussi côté client (CatchForm).
const MEASURED_PHOTO_MSG =
  'Ajoute la photo pour valider la mesure (c’est elle qui rend le record vérifiable).'

// ─── createCatch ──────────────────────────────────────────────────────────────

export async function createCatch(
  input: CreateCatchInput
): Promise<{ id: string; celebration?: CatchCelebration } | { error: string }> {
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

  // Photo obligatoire pour « vérifiée » (sprint 69) : une prise mesurée sans photo
  // n'est plus acceptée cochée (décoche la case pour loguer sans photo). Le même
  // garde existe côté client (CatchForm) et en DB (contrainte miroir, migration 105).
  if (data.is_measured === true && !data.photo_path) {
    return { error: MEASURED_PHOTO_MSG }
  }

  // Rate-limit créations (sprint 69) : 20/24h + burst 5/h sur le flux unitaire.
  const now = Date.now()
  const [count24h, countHour] = await Promise.all([
    countCatchesCreatedSince(supabase, user.id, new Date(now - 24 * 3600 * 1000).toISOString(), 'unitaire'),
    countCatchesCreatedSince(supabase, user.id, new Date(now - 3600 * 1000).toISOString(), 'unitaire'),
  ])
  if (count24h >= MAX_CATCHES_PER_24H) return { error: CATCH_LIMIT_24H_MSG }
  if (countHour >= MAX_CATCHES_BURST_PER_HOUR) return { error: CATCH_LIMIT_HOUR_MSG }

  // Garde ownership/accessibilité AVANT l'insert : un gear_id ou spot_id non
  // autorisé exposerait le matériel/spot d'autrui via les colonnes dénormalisées.
  if (data.gear_id !== undefined) {
    const check = await assertGearOwnership(supabase, data.gear_id, user.id)
    if ('error' in check) return { error: check.error }
  }
  if (data.spot_id !== undefined) {
    const check = await assertSpotAccessible(supabase, data.spot_id)
    if ('error' in check) return { error: check.error }
  }

  const caughtAt = new Date(data.caught_at)
  // XP AVANT le log (le trigger 098 crédite pendant l'insert) : sert à détecter un passage
  // de niveau plus bas. Lu en parallèle du fetch conditions (best-effort, 0 si erreur).
  const [conditions, xpBefore] = await Promise.all([
    safeConditions(data.latitude, data.longitude, caughtAt),
    getUserXpOrNull(user.id, supabase).catch(() => null),
  ])
  // Snapshot exploitable pour les colonnes dénormalisées (null si hors couverture)
  const snapshot = conditions && !('out_of_coverage' in conditions) ? conditions : null

  const geom =
    data.latitude !== undefined && data.longitude !== undefined
      ? toEwkt(data.latitude, data.longitude)
      : undefined

  // Prise « mesurée » (WS-D sprint 39, durci sprint 69) : `photo_verified_at`
  // n'est posé QUE si la case est cochée ET longueur + objet de référence + PHOTO
  // présents (la photo est ce qui rend la mesure vérifiable ; garde early ci-dessus,
  // re-check ici en défense en profondeur + contrainte DB miroir en 105).
  const isMeasured =
    data.is_measured === true &&
    data.measured_length_cm !== undefined &&
    !!data.reference_object &&
    !!data.photo_path

  const { data: row, error } = await supabase
    .from('catches')
    .insert({
      user_id: user.id,
      species: data.species,
      caught_at: data.caught_at,
      size_cm: data.size_cm ?? null,
      measured_length_cm: data.measured_length_cm ?? null,
      reference_object: data.reference_object ?? null,
      photo_verified_at: isMeasured ? new Date().toISOString() : null,
      weight_g: data.weight_kg !== undefined ? Math.round(data.weight_kg * 1000) : null,
      technique: data.technique,
      lure_brand: data.lure_brand ?? null,
      lure_model: data.lure_model ?? null,
      bait_type: data.bait_type ?? null,
      gear_id: data.gear_id ?? null,
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
      wind_speed_kmh: snapshot?.wind_speed_kmh ?? null,
      wind_direction_deg: snapshot?.wind_direction_deg ?? null,
      tide_state: snapshot?.tide_state ?? null,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[catches/actions] createCatch insert error :', error)
    // Backstop rate-limit DB (migration 105b) : message doux si le trigger a mordu
    // (cas d'un contournement du compteur applicatif ci-dessus, ex. course).
    if (typeof error.message === 'string' && error.message.includes('rate_limit_catches')) {
      return { error: CATCH_LIMIT_24H_MSG }
    }
    return { error: 'Impossible de créer la prise. Réessaie.' }
  }

  // Notif event-driven « prise d'un pêcheur suivi » (sprint 49, tâche 4) : seulement
  // si la prise est PUBLIQUE. Best-effort STRICT — le helper ne throw jamais, mais on
  // l'isole pour garantir que rien ne casse la création réussie (action déjà OK ici).
  if (data.privacy === 'public') {
    try {
      await notifyFollowersOfPublicCatch({ authorId: user.id, catchId: row.id })
    } catch (e) {
      console.error('[catches/actions] notifyFollowers (createCatch, non bloquant) :', e)
    }
  }

  // Défis solo (Sprint 63) : recalcule la progression (SQL + « lever du soleil » en TS)
  // et récupère les défis fraîchement complétés par CE log pour les fêter. Best-effort
  // STRICT (la fonction ne throw jamais) — le log a déjà réussi ici.
  let completedChallenges: CompletedChallenge[] = []
  try {
    const res = await recomputeSoloChallenges({
      supabase,
      userId: user.id,
      sinceIso: row.created_at ?? null,
    })
    completedChallenges = res.newlyCompleted
  } catch (e) {
    console.error('[catches/actions] recomputeSoloChallenges (non bloquant) :', e)
  }

  // Détection « un record vient de tomber » (Sprint 61) : on relit le ledger XP écrit
  // par le trigger 098 + les badges nouvellement débloqués + les défis complétés
  // (ci-dessus), pour que le client fête le moment. Best-effort STRICT (ne throw jamais).
  const measuredLength = isMeasured ? (data.measured_length_cm ?? null) : null
  let celebration: CatchCelebration | undefined
  try {
    const detected = await buildCatchCelebration(supabase, {
      userId: user.id,
      catchId: row.id,
      species: data.species,
      measuredLength,
      catchCreatedAt: row.created_at ?? null,
      completedChallenges,
    })
    celebration = detected ?? undefined
  } catch (e) {
    console.error('[catches/actions] buildCatchCelebration (non bloquant) :', e)
  }

  // Notifs dopamine proactives (Sprint 63, Bloc 3) : level up (XP après le trigger + les
  // crédits de défis), nouveau record, badge(s), défi(s) relevé(s). In-app toujours ;
  // push gaté par la pref 'progress'. Best-effort STRICT (le log a déjà réussi).
  // XP après le trigger (+ crédits défis) — lue une fois, partagée par les deux émetteurs.
  // null si la lecture échoue → pas de faux palier ni de faux dépassement (invariant honnêteté).
  const xpAfter = await getUserXpOrNull(user.id, supabase).catch(() => null)
  try {
    await emitDopamineNotifications({
      userId: user.id,
      xpBefore,
      xpAfter,
      celebration: celebration ?? null,
      completedChallenges,
    })
  } catch (e) {
    console.error('[catches/actions] emitDopamineNotifications (non bloquant) :', e)
  }
  // Notifs de rang « X t'a dépassé » (sprint 67, Bloc 1). Best-effort STRICT : le log a réussi.
  try {
    await emitRankChangeNotifications({ actorId: user.id, xpBefore, xpAfter })
  } catch (e) {
    console.error('[catches/actions] emitRankChangeNotifications (non bloquant) :', e)
  }

  revalidatePath('/carnet')
  return celebration ? { id: row.id, celebration } : { id: row.id }
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
    .select('id, photo_path, measured_length_cm, reference_object, photo_verified_at, privacy')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[catches/actions] updateCatch fetch error :', fetchError)
    return { error: 'Prise introuvable.' }
  }
  if (!existing) return { error: 'Prise introuvable ou accès refusé.' }

  // Garde ownership/accessibilité AVANT l'update (mêmes vecteurs qu'à la création).
  // `null` = détachement explicite, autorisé sans vérification.
  if (data.gear_id !== undefined && data.gear_id !== null) {
    const check = await assertGearOwnership(supabase, data.gear_id, user.id)
    if ('error' in check) return { error: check.error }
  }
  if (data.spot_id !== undefined && data.spot_id !== null) {
    const check = await assertSpotAccessible(supabase, data.spot_id)
    if ('error' in check) return { error: check.error }
  }

  const geomChanged = data.latitude !== undefined || data.longitude !== undefined
  const geom =
    data.latitude !== undefined && data.longitude !== undefined
      ? toEwkt(data.latitude, data.longitude)
      : undefined

  let conditions: ConditionsSnapshot | OutOfCoverageConditions | null | undefined = undefined
  if (geomChanged && data.latitude !== undefined && data.longitude !== undefined) {
    const caughtAt = data.caught_at ? new Date(data.caught_at) : new Date()
    conditions = await safeConditions(data.latitude, data.longitude, caughtAt)
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
  if (data.gear_id !== undefined) payload.gear_id = data.gear_id

  // Prise « mesurée » (WS-D, sprint 39). On ne recalcule `photo_verified_at` QUE si
  // l'un des champs de mesure est soumis (sinon on ne touche pas à une valeur déjà
  // posée — cohérent avec le legacy `declared`/`declared_at`). Quand on recalcule, on
  // raisonne sur les valeurs EFFECTIVES (soumises sinon existantes).
  if (data.measured_length_cm !== undefined) payload.measured_length_cm = data.measured_length_cm
  if (data.reference_object !== undefined) payload.reference_object = data.reference_object
  const measurementTouched =
    data.is_measured !== undefined ||
    data.measured_length_cm !== undefined ||
    data.reference_object !== undefined
  if (measurementTouched) {
    const effLength =
      data.measured_length_cm !== undefined ? data.measured_length_cm : existing.measured_length_cm
    const effReference =
      data.reference_object !== undefined ? data.reference_object : existing.reference_object
    // Photo EFFECTIVE (soumise sinon existante) : obligatoire pour « vérifiée »
    // (sprint 69). Une prise mesurée sans photo est refusée explicitement plutôt
    // que dé-vérifiée en silence (pas de perte de statut muette).
    const effPhoto = data.photo_path !== undefined ? data.photo_path : existing.photo_path
    // `is_measured` non soumis = on conserve l'état antérieur (déjà mesurée si déjà daté).
    const wantsMeasured =
      data.is_measured !== undefined ? data.is_measured : existing.photo_verified_at !== null
    if (wantsMeasured && !effPhoto) {
      return { error: MEASURED_PHOTO_MSG }
    }
    const shouldBeVerified = wantsMeasured && effLength != null && !!effReference && !!effPhoto
    // Anti-re-datage (sprint 69, finding correctness #1) : le formulaire ré-soumet
    // les champs de mesure à CHAQUE édition (même un simple changement de note),
    // donc `measurementTouched` est quasi toujours vrai. Sans ce garde,
    // `photo_verified_at` glisserait à chaque save et un tricheur pourrait re-dater
    // une vieille prise. On ne touche au timestamp QUE sur une vraie transition.
    if (shouldBeVerified && existing.photo_verified_at) {
      // déjà vérifiée et le reste : on préserve la date d'origine (ne rien mettre au payload).
    } else {
      payload.photo_verified_at = shouldBeVerified ? new Date().toISOString() : null
    }
  }
  if (data.released !== undefined) payload.released = data.released
  if (data.water_temperature_c !== undefined) payload.water_temperature_c = data.water_temperature_c
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.location_method !== undefined) payload.location_method = data.location_method
  if (geom !== undefined) payload.geom = geom
  if (data.spot_id !== undefined) payload.spot_id = data.spot_id
  if (data.privacy !== undefined) payload.privacy = data.privacy
  if (data.precise_for_friends !== undefined) payload.precise_for_friends = data.precise_for_friends
  if (data.reveal_precise_to_public !== undefined) payload.reveal_precise_to_public = data.reveal_precise_to_public
  if (conditions !== undefined) {
    payload.conditions = conditions
    // Snapshot exploitable pour les colonnes dénormalisées (null si hors couverture)
    const c = conditions && !('out_of_coverage' in conditions) ? conditions : null
    payload.wind_speed_kmh = c?.wind_speed_kmh ?? null
    payload.wind_direction_deg = c?.wind_direction_deg ?? null
    payload.tide_state = c?.tide_state ?? null
  }
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

  // Notif event-driven « prise d'un pêcheur suivi » (sprint 49, tâche 4) : UNIQUEMENT
  // sur la TRANSITION vers public (l'ancienne valeur n'était pas 'public', la nouvelle
  // l'est). On ne notifie pas à chaque édition d'une prise déjà publique → pas de spam.
  // Best-effort STRICT, isolé (l'update a déjà réussi).
  const becamePublic = data.privacy === 'public' && existing.privacy !== 'public'
  if (becamePublic) {
    try {
      await notifyFollowersOfPublicCatch({ authorId: user.id, catchId: id })
    } catch (e) {
      console.error('[catches/actions] notifyFollowers (updateCatch, non bloquant) :', e)
    }
  }

  revalidatePath('/carnet')
  revalidatePath('/carnet/[id]', 'page')
  return { ok: true }
}

// ─── markCatchDeclared (RecFishing, sprint 24) ────────────────────────────────

/**
 * Marque une prise comme « déclarée sur RecFishing » (auto-déclaratif : on ne
 * soumet RIEN à la place du pêcheur). Pose declared=true + declared_at, ce qui
 * éteint le bandeau de rappel et empêche le cron de re-notifier.
 */
export async function markCatchDeclared(id: string): Promise<{ ok: true } | { error: string }> {
  if (!id) return { error: 'ID manquant.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('catches')
    .update({ declared: true, declared_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[catches/actions] markCatchDeclared error :', error)
    return { error: 'Impossible d’enregistrer la déclaration. Réessaie.' }
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

// Aligné SOUS la limite framework (experimental.serverActions.bodySizeLimit = 2 Mo,
// cf next.config.ts). Ainsi ce garde se déclenche AVANT le mur Next : un fichier
// 1,8–2 Mo renvoie ce message FR propre (toast) au lieu d'un 500 « Body exceeded ».
const MAX_SIZE_BYTES = 1.8 * 1024 * 1024 // 1.8 MB

export async function uploadCatchPhoto(
  formData: FormData
): Promise<{ path: string } | { error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Fichier manquant.' }

  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'La photo dépasse 1,8 Mo. Redimensionne-la avant l\'envoi.' }
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

// ─── bulkCreateCatches (import de prises passées, WS-C) ────────────────────────

export async function bulkCreateCatches(
  rows: BulkCatchInput
): Promise<{ inserted: number } | { error: string }> {
  const parsed = bulkCatchSchema.safeParse(rows)
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

  // Rate-limit import (sprint 69) : 100 prises importées / 24h, comptées sur le
  // flux bulk uniquement (technique IS NULL) pour ne pas pénaliser le log unitaire.
  const bulk24h = await countCatchesCreatedSince(
    supabase,
    user.id,
    new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    'bulk'
  )
  if (bulk24h + data.length > MAX_BULK_CATCHES_PER_24H) {
    return { error: BULK_LIMIT_MSG }
  }

  // Enrichissement météo best-effort par prise (jamais bloquant), en parallèle.
  // Localisation approximative = point de mer du département → marée/vent du jour
  // (la marée est dérivée au passage, sprint 22). Le département est garanti côtier
  // par le schéma → coords toujours définies.
  const payloads = await Promise.all(
    data.map(async (row) => {
      const coords = DEPARTMENT_SEA_COORDS[row.department]!
      const caughtAt = new Date(row.caught_at)
      const conditions = await safeConditions(coords.lat, coords.lng, caughtAt)
      const snapshot = conditions && !('out_of_coverage' in conditions) ? conditions : null
      return {
        user_id: user.id,
        species: row.species,
        caught_at: row.caught_at,
        size_cm: row.size_cm ?? null,
        technique: null,
        released: false,
        location_method: 'manual' as const,
        geom: toEwkt(coords.lat, coords.lng) as unknown,
        privacy: 'private' as const,
        precise_for_friends: true,
        reveal_precise_to_public: false,
        conditions: conditions as unknown,
        wind_speed_kmh: snapshot?.wind_speed_kmh ?? null,
        wind_direction_deg: snapshot?.wind_direction_deg ?? null,
        tide_state: snapshot?.tide_state ?? null,
        location_label: `${coords.place} (≈ dépt ${row.department})`,
      }
    })
  )

  const { data: insertedRows, error } = await supabase
    .from('catches')
    .insert(payloads)
    .select('id')

  if (error) {
    console.error('[catches/actions] bulkCreateCatches insert error :', error)
    if (typeof error.message === 'string' && error.message.includes('rate_limit_catches')) {
      return { error: BULK_LIMIT_MSG }
    }
    return { error: "Impossible d'importer les prises. Réessaie." }
  }

  revalidatePath('/carnet')
  return { inserted: insertedRows?.length ?? 0 }
}
