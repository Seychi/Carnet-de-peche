import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'

// ─── Badges publics d'un profil (Sprint 62) ─────────────────────────────────────
// user_badges reste RLS own-only en lecture DIRECTE. L'exposition publique passe par
// la RPC definer get_public_badges (099), qui ne renvoie que des MÉTADONNÉES de badge
// (slug / palier / seuil / date) : aucune prise, aucun spot, aucune coordonnée.

export type PublicBadge = {
  slug: string
  tier: number
  target: number | null
  earnedAt: string
}

/**
 * Badges (métadonnées) d'un pêcheur pour l'affichage public de son profil. Triés du
 * palier le plus haut au plus bas côté SQL. Best-effort : [] en cas d'erreur.
 */
export async function getPublicBadges(
  userId: string,
  client?: SupabaseClient<Database>,
): Promise<PublicBadge[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.rpc('get_public_badges', { p_user_id: userId })
  if (error || !data) return []
  return (
    data as Array<{
      badge_slug: string
      tier: number | null
      target: number | null
      earned_at: string
    }>
  ).map((r) => ({
    slug: r.badge_slug,
    tier: Number(r.tier) || 1,
    target: r.target,
    earnedAt: r.earned_at,
  }))
}
