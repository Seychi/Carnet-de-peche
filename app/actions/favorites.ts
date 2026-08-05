'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import '@/lib/zod-config'
import { z } from 'zod'

// ─── Spots favoris (sprint 72, Bloc 3) ────────────────────────────────────────
// Favoris = TOUS les tiers (c'est du carnet, décision verrouillée du brief).
// Sécurité : tout est scopé à auth.uid() (RLS own-only, migration 106). Aucune
// coordonnée n'est jamais lue ni renvoyée ici : uniquement (user_id, spot_id).
// Backstops DB : cap 10 favoris (trigger favorite_spots_limit_trg, message
// 'max_favorite_spots'), spot visible exigé par le WITH CHECK de la policy insert.

// Résultat uniformisé (même forme que app/actions/spots.ts / feed.ts).
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour gérer tes spots favoris.'
const ID_MSG = 'Identifiant invalide.'
const MAX_MSG = 'Tu as déjà 10 favoris, retire-en un d’abord.'
const UNAVAILABLE_MSG = 'Ce spot n’est pas disponible pour le moment.'
const SAVE_MSG = 'Impossible de mettre à jour tes favoris. Réessaie.'

// Surface d'origine de l'ajout (funnel d'activation sprint 74). Validée en zod :
// c'est un input client, on ne fait pas confiance au frontend (règle §11.4).
const favoriteSourceSchema = z.enum(['onboarding', 'spot_page', 'map'])
export type FavoriteSource = z.infer<typeof favoriteSourceSchema>

/**
 * Ajoute ou retire un spot des favoris du viewer (toggle idempotent).
 * Renvoie l'état final : { favorite: true } = désormais favori.
 * `source` (optionnel) alimente l'event `favorite_spot_added` du funnel
 * d'activation : émis uniquement sur un AJOUT net (pas au retrait, pas sur le
 * doublon 23505 d'un double-clic, sinon on double-compterait).
 */
export async function toggleFavoriteSpot(
  spotId: string,
  source: FavoriteSource = 'spot_page',
): Promise<ActionResult<{ favorite: boolean }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(spotId).success) return fail(ID_MSG)
  if (!favoriteSourceSchema.safeParse(source).success) source = 'spot_page'

  // État courant — lecture own explicite (.eq user_id EN PLUS de la RLS).
  const { data: existing, error: readErr } = await supabase
    .from('favorite_spots')
    .select('spot_id')
    .eq('user_id', user.id)
    .eq('spot_id', spotId)
    .maybeSingle()
  if (readErr) {
    console.error('[toggleFavoriteSpot] lecture', readErr.message)
    return fail(SAVE_MSG)
  }

  if (existing) {
    const { error } = await supabase
      .from('favorite_spots')
      .delete()
      .eq('user_id', user.id)
      .eq('spot_id', spotId)
    if (error) {
      console.error('[toggleFavoriteSpot] delete', error.message)
      return fail(SAVE_MSG)
    }
    revalidatePath('/profil')
    revalidatePath('/notifications')
    return ok({ favorite: false })
  }

  const { error } = await supabase
    .from('favorite_spots')
    .insert({ user_id: user.id, spot_id: spotId })
  if (error) {
    // Cap 10 favoris : exception du trigger DB (P0001 'max_favorite_spots').
    if (error.message.includes('max_favorite_spots')) return fail(MAX_MSG)
    // Doublon (course double-clic, 23505) : l'état voulu est déjà là → succès.
    if (error.code === '23505') {
      revalidatePath('/profil')
      revalidatePath('/notifications')
      return ok({ favorite: true })
    }
    // RLS (42501) : spot invisible pour ce viewer (non approuvé / privé).
    if (error.code === '42501' || error.message.includes('row-level security')) {
      return fail(UNAVAILABLE_MSG)
    }
    console.error('[toggleFavoriteSpot] insert', error.message)
    return fail(SAVE_MSG)
  }

  // Funnel d'activation (sprint 74, Bloc 4) : ajout NET réussi. Best-effort,
  // captureServerEvent ne throw jamais. Zéro PII : userId + surface seulement
  // (jamais le spot, un identifiant de spot favorisé est une info de pêcheur).
  const { captureServerEvent } = await import('@/lib/analytics/server')
  await captureServerEvent(user.id, 'favorite_spot_added', { source })

  revalidatePath('/profil')
  revalidatePath('/notifications')
  return ok({ favorite: true })
}

/**
 * Le spot est-il dans les favoris du viewer ? (lazy-load côté client, ex. popup
 * carte). Anonyme / erreur → false, jamais de throw (affichage best-effort).
 */
export async function isFavoriteSpot(
  spotId: string,
): Promise<ActionResult<{ favorite: boolean }>> {
  if (!z.string().uuid().safeParse(spotId).success) return ok({ favorite: false })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return ok({ favorite: false })

  const { data, error } = await supabase
    .from('favorite_spots')
    .select('spot_id')
    .eq('user_id', user.id)
    .eq('spot_id', spotId)
    .maybeSingle()
  if (error) {
    console.error('[isFavoriteSpot]', error.message)
    return ok({ favorite: false })
  }
  return ok({ favorite: data != null })
}
