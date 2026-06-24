'use server'

import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Désinscription marketing par token (lien email, SANS login). Flippe
 * profiles.marketing_email_optin = false via service-role (le visiteur n'est pas
 * forcément authentifié). RGPD : 1 clic, fonctionnel. Idempotent.
 * Retourne true si un profil a bien été désinscrit (token valide), false sinon.
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token || !UUID_RE.test(token)) return false
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .update({ marketing_email_optin: false })
      .eq('email_unsub_token', token)
      .select('id')
      .maybeSingle()
    if (error) throw error
    return data !== null
  } catch (err) {
    console.error('[unsubscribe] échec désinscription par token', err)
    Sentry.captureException(err, { tags: { feature: 'unsubscribe' } })
    return false
  }
}

/**
 * Réactivation des emails de relance — réservée à l'utilisateur CONNECTÉ
 * (depuis la page de confirmation). Met à jour son propre profil (RLS own).
 */
export async function resubscribeSelf(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ marketing_email_optin: true })
    .eq('id', user.id)
  if (error) {
    console.error('[unsubscribe] échec réactivation', error)
    return { ok: false }
  }
  return { ok: true }
}
