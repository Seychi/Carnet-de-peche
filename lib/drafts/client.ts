// lib/drafts/client.ts — lecture/écriture des brouillons côté NAVIGATEUR
// (sprint 77, Bloc 7). Aucune requête réseau, aucun insert : le brouillon d'un
// visiteur anonyme ne quitte jamais son navigateur tant qu'il n'a pas de compte.
//
// ⚠️ Cookie FONCTIONNEL et NON TRAÇANT (cf lib/drafts/schema.ts pour le détail
// de ce qu'il contient et de ce qu'il ne contient pas) : il est écrit sans
// consentement analytics. Pas de `HttpOnly` : il est posé ici, côté client.
// `SameSite=Lax` + `Secure` en HTTPS. Il est relu côté serveur au rejeu.

import {
  MAX_COOKIE_VALUE_LENGTH,
  PENDING_CATCH_COOKIE,
  PENDING_DRAFT_MAX_AGE_S,
  PENDING_FAVORITES_COOKIE,
  parsePendingCatch,
  parsePendingFavorites,
  serializePendingCatch,
  serializePendingFavorites,
  togglePendingFavorite as toggleInList,
  type PendingCatch,
  type PendingFavorite,
} from './schema'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  )
  return match ? match[1] : null
}

function writeCookie(name: string, value: string): boolean {
  if (typeof document === 'undefined') return false
  // Un cookie trop gros est silencieusement rejeté par le navigateur et peut
  // faire dépasser la limite d'en-tête de TOUT le domaine : on refuse d'écrire.
  if (value.length > MAX_COOKIE_VALUE_LENGTH) return false
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; path=/; max-age=${PENDING_DRAFT_MAX_AGE_S}; SameSite=Lax${secure}`
  return true
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

// ─── Favoris en attente ──────────────────────────────────────────────────────

export function readPendingFavorites(): PendingFavorite[] {
  return parsePendingFavorites(readCookie(PENDING_FAVORITES_COOKIE))
}

export function isPendingFavorite(spotId: string): boolean {
  return readPendingFavorites().some((f) => f.id === spotId)
}

/**
 * Pose ou retire un spot du brouillon. Renvoie l'état final de CE spot et le
 * nombre total de spots gardés, pour décider quand ouvrir le mur.
 * `capped` = plafond de 5 atteint, rien n'a été ajouté.
 */
export function togglePendingFavorite(entry: PendingFavorite): {
  favorite: boolean
  count: number
  capped: boolean
} {
  const next = toggleInList(readPendingFavorites(), entry)
  if (next.capped) {
    return { favorite: false, count: next.list.length, capped: true }
  }
  if (next.list.length === 0) {
    deleteCookie(PENDING_FAVORITES_COOKIE)
    return { favorite: false, count: 0, capped: false }
  }
  const written = writeCookie(PENDING_FAVORITES_COOKIE, serializePendingFavorites(next.list))
  if (!written) return { favorite: false, count: readPendingFavorites().length, capped: true }
  return { favorite: next.favorite, count: next.list.length, capped: false }
}

// ─── Prise en attente ────────────────────────────────────────────────────────

export function readPendingCatch(): PendingCatch | null {
  return parsePendingCatch(readCookie(PENDING_CATCH_COOKIE))
}

/** Écrit le brouillon de prise. `false` = refusé (cookie indisponible/trop gros). */
export function writePendingCatch(draft: PendingCatch): boolean {
  return writeCookie(PENDING_CATCH_COOKIE, serializePendingCatch(draft))
}

/** Purge les deux brouillons (après rejeu, ou sur abandon explicite). */
export function clearPendingDrafts(): void {
  deleteCookie(PENDING_FAVORITES_COOKIE)
  deleteCookie(PENDING_CATCH_COOKIE)
}
