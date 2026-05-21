import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Éligibilité géographique au tier payant (cf migration 021,
// is_eligible_for_paid_tier). false pour les départements DOM-TOM, non couverts
// par Stripe Tax en v1. Cette garde est appelée :
//   - côté UI : la page /tarifs passe `eligible` à <PricingCards> (encart si false)
//   - côté serveur : la route /api/stripe/checkout refuse un user non éligible
//     (bloc D), même via URL forgée.
//
// Un user anonyme est considéré "éligible" (true) : il pourra s'inscrire puis
// renseigner son département ; le vrai blocage se fait une fois connecté.
export const getIsEligibleForPaidTier = cache(async (): Promise<boolean> => {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return true

  const { data, error } = await supabase.rpc('is_eligible_for_paid_tier', { uid: user.id })
  if (error) {
    console.error('[eligibility] erreur RPC is_eligible_for_paid_tier', error)
    return false // fail-closed : on ne laisse pas payer si on ne peut pas vérifier
  }

  return data ?? false
})
