// lib/drafts/replay.ts — le rejeu des brouillons à l'inscription (sprint 77, Bloc 7).
//
// C'est le moment critique du bloc : « un brouillon perdu à cette étape est pire
// que pas de brouillon du tout ». On rejoue donc JUSTE APRÈS la création de la
// session (avant l'onboarding), et on ramène le visiteur sur la fiche du spot
// d'où il venait.
//
// ⚠️ INVARIANT : rien n'est jamais créé sans session. `getUser()` est la seule
// porte d'entrée ; sans utilisateur, on sort sans écrire une ligne. Les cookies
// eux-mêmes ne sont lus que s'ils existent : un visiteur qui n'a rien mis de
// côté ne déclenche AUCUNE requête.

import 'server-only'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createCatch } from '@/lib/catches/actions'
import { captureServerEvent } from '@/lib/analytics/server'
import {
  PENDING_CATCH_COOKIE,
  PENDING_FAVORITES_COOKIE,
  parsePendingCatch,
  parsePendingFavorites,
  returnPathForSlug,
  type PendingFavorite,
} from './schema'

export type ReplayResult = {
  /** Favoris réellement créés en base. */
  favorites: number
  /** La prise en brouillon a bien été loguée. */
  catchCreated: boolean
  /** Fiche de spot où ramener le visiteur, ou `null` (destination normale). */
  returnPath: string | null
}

const NOTHING: ReplayResult = { favorites: 0, catchCreated: false, returnPath: null }

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Rejoue les brouillons du visiteur qui vient de s'authentifier.
 * Ne lève JAMAIS : un échec de rejeu ne doit pas casser une inscription réussie.
 * À appeler depuis une Server Action ou un Route Handler (il écrit des cookies).
 */
export async function replayPendingDrafts(): Promise<ReplayResult> {
  let store: Awaited<ReturnType<typeof cookies>>
  try {
    store = await cookies()
  } catch {
    return NOTHING
  }

  const rawFavorites = store.get(PENDING_FAVORITES_COOKIE)?.value ?? null
  const rawCatch = store.get(PENDING_CATCH_COOKIE)?.value ?? null
  // Chemin nominal (la grande majorité des inscriptions) : zéro brouillon, donc
  // zéro requête et zéro écriture de cookie.
  if (!rawFavorites && !rawCatch) return NOTHING

  const favorites = parsePendingFavorites(rawFavorites)
  const draft = parsePendingCatch(rawCatch)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Pas de session → on ne crée rien et on ne purge rien : le brouillon reste
  // valable pour la prochaine tentative.
  if (!user) return NOTHING

  let created = 0
  for (const favorite of favorites) {
    if (await insertFavorite(supabase, user.id, favorite)) created += 1
  }

  let catchCreated = false
  if (draft) {
    const spot = await fetchSpotForDraft(supabase, draft.spot_id)
    if (spot) {
      const res = await createCatch({
        species: draft.species,
        technique: draft.technique,
        caught_at: draft.caught_at,
        size_cm: draft.size_cm,
        weight_kg: draft.weight_kg,
        released: draft.released,
        privacy: draft.privacy,
        location_method: 'spot',
        spot_id: draft.spot_id,
        // Coordonnées relues côté serveur (jamais transportées par le cookie) :
        // ce sont celles que la RPC sert à CE viewer, floutage compris.
        latitude: spot.lat,
        longitude: spot.lng,
        precise_for_friends: true,
        reveal_precise_to_public: false,
      })
      if ('error' in res) {
        console.error('[drafts/replay] createCatch a échoué :', res.error)
      } else {
        catchCreated = true
      }
    } else {
      console.error('[drafts/replay] spot du brouillon introuvable', draft.spot_id)
    }
  }

  // Purge APRÈS tentative : un brouillon rejoué ne doit jamais repartir en
  // boucle, et un échec est tracé en log plutôt que rejoué indéfiniment.
  clearDraftCookies(store)

  // Destination : le spot de la prise, à défaut celui du premier favori posé.
  const slug =
    draft?.spot_slug ??
    (draft ? await fetchSpotSlug(supabase, draft.spot_id) : null) ??
    favorites[0]?.slug ??
    (favorites[0] ? await fetchSpotSlug(supabase, favorites[0].id) : null)

  const returnPath = created > 0 || catchCreated ? returnPathForSlug(slug) : null

  if (created > 0 || catchCreated) {
    await captureServerEvent(user.id, 'pending_replayed', {
      favorites: created,
      catch_created: catchCreated,
    })
  }

  return { favorites: created, catchCreated, returnPath }
}

function clearDraftCookies(store: Awaited<ReturnType<typeof cookies>>): void {
  try {
    store.delete(PENDING_FAVORITES_COOKIE)
    store.delete(PENDING_CATCH_COOKIE)
  } catch (err) {
    // Contexte en lecture seule (Server Component) : on ne casse rien.
    console.error('[drafts/replay] purge des cookies impossible :', err)
  }
}

/**
 * Insert idempotent d'un favori. On n'utilise PAS `toggleFavoriteSpot` : ce
 * serait un toggle, donc un retrait si le spot était déjà favori (cas du
 * visiteur qui se CONNECTE au lieu de s'inscrire).
 */
async function insertFavorite(
  supabase: SupabaseServerClient,
  userId: string,
  favorite: PendingFavorite,
): Promise<boolean> {
  const { error } = await supabase
    .from('favorite_spots')
    .insert({ user_id: userId, spot_id: favorite.id })
  if (!error) return true
  // 23505 = déjà favori : l'état voulu est là, on compte le rejeu comme réussi.
  if (error.code === '23505') return true
  console.error('[drafts/replay] favori non rejoué :', error.message)
  return false
}

async function fetchSpotForDraft(
  supabase: SupabaseServerClient,
  spotId: string,
): Promise<{ lat: number; lng: number } | null> {
  const { data, error } = await supabase.rpc('get_spot_by_id', { p_id: spotId })
  if (error || !data || data.length === 0) return null
  const row = data[0] as { lat: number | null; lng: number | null }
  if (row.lat == null || row.lng == null) return null
  return { lat: Number(row.lat), lng: Number(row.lng) }
}

async function fetchSpotSlug(
  supabase: SupabaseServerClient,
  spotId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('spots')
    .select('slug')
    .eq('id', spotId)
    .maybeSingle()
  if (error || !data?.slug) return null
  return data.slug
}
