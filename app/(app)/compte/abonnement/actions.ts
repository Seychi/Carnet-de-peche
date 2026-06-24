'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Met à jour la préférence d'emails de relance/conseils (marketing) de
 * l'utilisateur courant. RLS own (UPDATE de son propre profil). Opt-out 1 clic.
 */
export async function setMarketingOptin(optin: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ marketing_email_optin: optin })
    .eq('id', user.id)
  if (error) {
    console.error('[abonnement] échec maj préférence email', error)
    return { ok: false }
  }
  revalidatePath('/compte/abonnement')
  return { ok: true }
}
