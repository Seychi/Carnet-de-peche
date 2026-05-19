import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type UserTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'

// cache() de React déduplique les appels dans la même passe de rendu RSC.
// On ne passe PAS supabase en paramètre : cache() utilise les args comme clé de cache,
// et un objet supabase n'a pas de référence stable entre deux appels. On crée le client
// à l'intérieur pour garantir un seul fetch réseau par requête HTTP entrante.
export const getUserTier = cache(async (): Promise<UserTier> => {
  const supabase = await createClient()

  // a. Utilisateur non connecté
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return 'anonymous'

  // b. Check abonnement actif via RPC (évite un join manuel)
  const { data: hasActiveSub, error: rpcError } = await supabase.rpc(
    'has_active_subscription',
    { uid: user.id }
  )
  if (rpcError || !hasActiveSub) return 'discovery'

  // c. Fetch le plan pour distinguer local / itinérant
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sub?.plan === 'itinerant') return 'itinerant'
  if (sub?.plan === 'local') return 'local'

  // d. Fallback safe — ne jamais retourner un tier plus permissif que mérité
  return 'discovery'
})
