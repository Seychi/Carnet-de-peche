// lib/drafts/schema.ts — LE brouillon d'inscription différée (sprint 77, Bloc 7).
//
// Le principe du bloc : on ne demande plus le compte AVANT de donner, mais au
// moment de SAUVEGARDER ce que le visiteur vient de faire. Entre les deux, le
// geste vit dans un cookie, côté navigateur.
//
// ⚠️ INVARIANT DUR : un visiteur anonyme ne produit AUCUNE ligne en base. Ce
// module n'écrit rien : il sérialise/désérialise, point. Les inserts n'existent
// qu'au rejeu (lib/drafts/replay.ts), qui exige une session authentifiée.
//
// ⚠️ RGPD / consentement : ces cookies sont FONCTIONNELS et NON TRAÇANTS. Ils ne
// contiennent aucune donnée personnelle (ni nom, ni email, ni texte libre, ni
// coordonnée GPS) : uniquement des identifiants et des slugs de spots publics,
// plus les champs métier du brouillon de prise (espèce, technique, taille,
// poids, date, visibilité). Ils ne sont lus par aucun tiers, ne servent à aucun
// profilage et expirent en 7 jours. Ils sont donc écrits SANS consentement
// analytics (le consentement PostHog, lui, reste requis pour les events).
//
// Aucune coordonnée dans le brouillon, à dessein : le spot est stocké par son
// identifiant, et ses coordonnées (déjà floutées selon le tier) sont relues
// côté serveur au rejeu. Un cookie n'est pas un endroit pour une position.

import '@/lib/zod-config'
import { z } from 'zod'
import {
  catchPrivacyEnum,
  catchSpeciesEnum,
  catchTechniqueEnum,
} from '@/lib/catches/schema'
import { notFuture } from '@/lib/validation/date-guards'

// ─── Constantes de cookie ─────────────────────────────────────────────────────

/** Spots mis de côté par un visiteur sans compte. */
export const PENDING_FAVORITES_COOKIE = 'pending-favorites'
/** Prise saisie par un visiteur sans compte, pas encore enregistrée. */
export const PENDING_CATCH_COOKIE = 'pending-catch'

/** 7 jours (en secondes) : au-delà, le brouillon disparaît de lui-même. */
export const PENDING_DRAFT_MAX_AGE_S = 7 * 24 * 60 * 60

/** Plafond de spots gardés en brouillon (au-delà, on ignore les suivants). */
export const MAX_PENDING_FAVORITES = 5

/** Nombre de favoris posés à partir duquel on ouvre le mur d'inscription. */
export const PENDING_FAVORITES_WALL_AT = 2

// Garde-fou de taille : un cookie sur-dimensionné est refusé par le navigateur
// et casserait TOUTES les requêtes du domaine. On refuse d'écrire au-delà.
export const MAX_COOKIE_VALUE_LENGTH = 3000

// ─── Schémas ─────────────────────────────────────────────────────────────────

// Slug public de spot (identique au format servi par /spots/[slug]).
const spotSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120)

export const pendingFavoriteSchema = z.object({
  id: z.string().uuid(),
  /** Slug du spot : sert à ramener le visiteur sur la bonne fiche après rejeu. */
  slug: spotSlugSchema.optional(),
})

export const pendingFavoritesSchema = z.array(pendingFavoriteSchema)

/**
 * Brouillon de prise. Volontairement PLUS ÉTROIT que `createCatchSchema` :
 *  - pas de `notes` ni de `location_label` (texte libre = porte d'entrée des
 *    données personnelles dans un cookie) ;
 *  - pas de `latitude`/`longitude` (une position n'a rien à faire là) ;
 *  - pas de photo ni de « prise mesurée » (une photo ne tient pas dans un
 *    cookie, et une mesure sans photo serait refusée au rejeu : mieux vaut ne
 *    pas la proposer que perdre le brouillon à l'arrivée).
 * Le spot est donc OBLIGATOIRE : c'est lui qui porte le lieu.
 */
export const pendingCatchSchema = z.object({
  spot_id: z.string().uuid(),
  spot_slug: spotSlugSchema.optional(),
  species: catchSpeciesEnum,
  technique: catchTechniqueEnum,
  size_cm: z.number().min(10).max(200).optional(),
  weight_kg: z.number().min(0.05).max(30).optional(),
  caught_at: z
    .string()
    .datetime()
    .refine(notFuture, { error: 'La date de la prise ne peut pas être dans le futur.' }),
  released: z.boolean(),
  privacy: catchPrivacyEnum,
})

export type PendingFavorite = z.infer<typeof pendingFavoriteSchema>
export type PendingCatch = z.infer<typeof pendingCatchSchema>

// ─── Sérialisation ───────────────────────────────────────────────────────────
// Valeur de cookie = JSON encodé en URI. Toute valeur illisible ou invalide est
// traitée comme « pas de brouillon » : on ne jette jamais, on ne ressuscite
// jamais une donnée douteuse.

function decode(raw: string | null | undefined): unknown {
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
}

/** Liste des spots en brouillon, dédupliquée et plafonnée. Jamais d'exception. */
export function parsePendingFavorites(raw: string | null | undefined): PendingFavorite[] {
  const parsed = pendingFavoritesSchema.safeParse(decode(raw))
  if (!parsed.success) return []
  return dedupeFavorites(parsed.data)
}

export function serializePendingFavorites(list: PendingFavorite[]): string {
  return encodeURIComponent(JSON.stringify(dedupeFavorites(list)))
}

function dedupeFavorites(list: PendingFavorite[]): PendingFavorite[] {
  const seen = new Set<string>()
  const out: PendingFavorite[] = []
  for (const entry of list) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    out.push(entry)
    if (out.length >= MAX_PENDING_FAVORITES) break
  }
  return out
}

/**
 * Ajoute ou retire un spot du brouillon (toggle), en respectant le plafond.
 * Renvoie la liste résultante et l'état final de CE spot.
 * `capped` = l'ajout a été refusé faute de place (5 spots déjà de côté).
 */
export function togglePendingFavorite(
  list: PendingFavorite[],
  entry: PendingFavorite,
): { list: PendingFavorite[]; favorite: boolean; capped: boolean } {
  const current = dedupeFavorites(list)
  const exists = current.some((f) => f.id === entry.id)
  if (exists) {
    return { list: current.filter((f) => f.id !== entry.id), favorite: false, capped: false }
  }
  if (current.length >= MAX_PENDING_FAVORITES) {
    return { list: current, favorite: false, capped: true }
  }
  return { list: [...current, entry], favorite: true, capped: false }
}

/** Brouillon de prise, ou `null` si absent/illisible/invalide. */
export function parsePendingCatch(raw: string | null | undefined): PendingCatch | null {
  const parsed = pendingCatchSchema.safeParse(decode(raw))
  return parsed.success ? parsed.data : null
}

export function serializePendingCatch(draft: PendingCatch): string {
  return encodeURIComponent(JSON.stringify(draft))
}

/**
 * Chemin de retour après rejeu : la fiche du spot d'où venait le visiteur.
 * `null` si aucun slug n'est connu (le rejeu retombe alors sur la destination
 * normale d'inscription, jamais sur une URL inventée).
 */
export function returnPathForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null
  return spotSlugSchema.safeParse(slug).success ? `/spots/${slug}` : null
}
