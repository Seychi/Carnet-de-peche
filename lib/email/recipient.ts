import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Résout le destinataire d'un email transactionnel depuis un user_id
 * (webhooks Stripe : l'event ne porte que metadata.user_id, pas l'email).
 * Service-role requis : auth.admin + lecture profiles hors session.
 * Retourne null si introuvable — l'appelant skippe l'envoi, jamais de throw.
 */
export async function getEmailRecipient(
  userId: string
): Promise<{ email: string; firstName: string } | null> {
  try {
    const supabase = createServiceRoleClient()

    const { data: userData, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !userData?.user?.email) {
      console.warn('[email] destinataire introuvable', { userId, error: error?.message })
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', userId)
      .maybeSingle()

    return {
      email: userData.user.email,
      firstName: profile?.display_name || profile?.username || 'pêcheur',
    }
  } catch (err) {
    console.error('[email] résolution destinataire échouée', { userId, err })
    return null
  }
}
