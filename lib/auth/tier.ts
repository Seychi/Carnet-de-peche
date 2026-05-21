import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type UserTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'

// cache() de React déduplique les appels dans la même passe de rendu RSC.
// On ne passe PAS supabase en paramètre : cache() utilise les args comme clé de cache,
// et un objet supabase n'a pas de référence stable entre deux appels. On crée le client
// à l'intérieur pour garantir un seul fetch réseau par requête HTTP entrante.
//
// Depuis le sprint 9, la source de vérité du tier est la RPC SQL `current_tier`
// (cf migration 021), alimentée en upstream par le seul webhook Stripe. Un unique
// round-trip DB remplace l'ancien combo has_active_subscription + fetch du plan.
export const getUserTier = cache(async (): Promise<UserTier> => {
  const supabase = await createClient()

  // a. Utilisateur non connecté
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return 'anonymous'

  // b. Tier via RPC current_tier (trial / active / cancel_at_period_end gérés en SQL)
  const { data, error } = await supabase.rpc('current_tier', { uid: user.id })
  if (error) {
    console.error('[tier] erreur RPC current_tier', error)
    return 'discovery' // fallback safe — jamais plus permissif que mérité
  }

  return (data as UserTier) ?? 'discovery'
})
