import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'

// ─── Badges (collection personnelle) ────────────────────────────────────────────
// Badges SQL-dérivables non-trichables (count espèces / prises / relâchées / semaines),
// persistés avec earned_at par recompute_my_badges() (056). PRIVÉS : aucun usage public,
// aucun leaderboard. Les badges « vérifié » au sens G1 (mesure photo) N'EXISTENT PAS →
// les critères ci-dessous reposent sur des données DÉCLARATIVES (taille/relâché) et ne
// prétendent jamais à une vérification automatique.

export type UserBadgeRow = Database['public']['Tables']['user_badges']['Row']

export type BadgeSlug =
  | 'first_catch'
  | 'ten_catches'
  | 'five_species'
  | 'pokedex_complete'
  | 'release_friendly'
  | 'regular_4w'

export type BadgeDef = {
  slug: BadgeSlug
  label: string
  description: string
  icon: 'sparkle' | 'list' | 'layers' | 'trophy' | 'leaf' | 'calendar'
}

/**
 * Définitions des badges, dans l'ordre d'affichage (du plus accessible au plus rare).
 * Les libellés restent factuels (descriptifs), jamais « tu es le meilleur ».
 */
export const BADGES: BadgeDef[] = [
  {
    slug: 'first_catch',
    label: 'Première prise',
    description: 'Tu as logué ta première prise.',
    icon: 'sparkle',
  },
  {
    slug: 'ten_catches',
    label: '10 prises',
    description: 'Ton carnet compte au moins 10 prises.',
    icon: 'list',
  },
  {
    slug: 'five_species',
    label: '5 espèces',
    description: 'Tu as logué au moins 5 espèces différentes.',
    icon: 'layers',
  },
  {
    slug: 'pokedex_complete',
    label: 'Pokédex complet',
    description: 'Les 20 espèces du bord sont à ton carnet. Chapeau.',
    icon: 'trophy',
  },
  {
    slug: 'release_friendly',
    label: 'No-kill',
    description: 'Tu as relâché au moins 10 prises (déclaratif).',
    icon: 'leaf',
  },
  {
    slug: 'regular_4w',
    label: 'Régulier',
    description: 'Tu as pêché sur au moins 4 semaines différentes.',
    icon: 'calendar',
  },
]

export const BADGE_BY_SLUG: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.slug, b]),
)

/**
 * Recalcule et persiste les badges du pêcheur courant (idempotent côté RPC), puis
 * renvoie ses badges gagnés. À appeler au chargement du hub stats (server-side).
 * Best-effort : renvoie [] si la RPC n'existe pas encore / erreur.
 */
export async function recomputeMyBadges(): Promise<UserBadgeRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recompute_my_badges')
  if (error || !data) return []
  return data as UserBadgeRow[]
}

/** Badges déjà gagnés (lecture seule, sans recompute). RLS : own only. */
export async function getMyBadges(): Promise<UserBadgeRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .order('earned_at', { ascending: true })
  if (error || !data) return []
  return data
}
