import { createClient } from '@/lib/supabase/server'

export type OutingStats = {
  totalOutings: number
  blankOutings: number
  blankRate: number
  catchesPerOuting: number
}

const EMPTY: OutingStats = { totalOutings: 0, blankOutings: 0, blankRate: 0, catchesPerOuting: 0 }

/**
 * Stats sorties du pêcheur courant (total, bredouilles, % bredouille, prises/sortie).
 * RPC `get_my_outing_stats` (051) — hors types générés tant que non appliquée.
 * Best-effort : renvoie des zéros si la RPC n'existe pas encore / erreur.
 */
export async function getMyOutingStats(): Promise<OutingStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_outing_stats')
  if (error || !data) return EMPTY
  return data as OutingStats
}
