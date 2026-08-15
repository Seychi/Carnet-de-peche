import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isEmailSuppressed } from '@/lib/email/suppression'

export type EmailRecipient = {
  email: string
  firstName: string
  /** Token de désinscription marketing — présent uniquement quand opts.marketing est true. */
  unsubToken?: string
}

/**
 * Résout le destinataire d'un email depuis un user_id (webhooks Stripe / cron :
 * l'event ne porte que metadata.user_id, pas l'email).
 * Service-role requis : auth.admin + lecture profiles hors session.
 * Retourne null si introuvable — l'appelant skippe l'envoi, jamais de throw.
 *
 * RGPD — distinction transactionnel vs marketing :
 *  - TRANSACTIONNEL (défaut, opts.marketing absent/false) : base légale =
 *    exécution du contrat. Pas de vérification de consentement.
 *  - MARKETING (opts.marketing = true) : on RESPECTE l'opt-out. Si
 *    profiles.marketing_email_optin === false, on retourne null (pas d'envoi).
 *    On retourne aussi le unsubToken pour construire le lien de désinscription.
 */
export async function getEmailRecipient(
  userId: string,
  opts?: { marketing?: boolean }
): Promise<EmailRecipient | null> {
  try {
    const supabase = createServiceRoleClient()

    const { data: userData, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !userData?.user?.email) {
      console.warn('[email] destinataire introuvable', { userId, error: error?.message })
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, marketing_email_optin, email_unsub_token')
      .eq('id', userId)
      .maybeSingle()

    // Marketing : on n'envoie pas si l'utilisateur s'est désinscrit.
    if (opts?.marketing && profile?.marketing_email_optin === false) {
      return null
    }

    // Liste de suppression (sprint 78, migration 112) : une adresse qui a rebondi
    // durement ou qui nous a signalés comme indésirables ne reçoit plus rien.
    //
    // ⚠️ Cette garde s'applique à TOUS les envois, transactionnels compris, et pas
    // seulement au marketing. C'est volontaire : l'enjeu n'est pas le consentement
    // (le rebond n'est pas un choix de l'utilisateur) mais la réputation du
    // domaine expéditeur. Continuer à écrire à une boîte morte dégrade la
    // délivrabilité de TOUS les autres emails, y compris l'alerte de marnage.
    //
    // Placée ici parce que c'est le point de passage unique de la résolution de
    // destinataire : webhooks Stripe, crons et actions y passent tous.
    if (await isEmailSuppressed(userData.user.email)) {
      console.warn('[email] destinataire sur liste de suppression, envoi annulé', { userId })
      return null
    }

    return {
      email: userData.user.email,
      firstName: profile?.display_name || profile?.username || 'pêcheur',
      ...(opts?.marketing ? { unsubToken: profile?.email_unsub_token } : {}),
    }
  } catch (err) {
    console.error('[email] résolution destinataire échouée', { userId, err })
    return null
  }
}
