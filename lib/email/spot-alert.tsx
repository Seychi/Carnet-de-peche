import 'server-only'
import * as React from 'react'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getEmailRecipient } from './recipient'
import { sendEmail } from './send'
import { buildAlertMessage } from '@/lib/alerts/message'
import type { SpotAlertPayload } from '@/lib/alerts/types'
import SpotAlertEmail from './spot-alert-template'

/**
 * Envoi de l'email « alerte par port » (sprint 72, contrat inter-workstreams).
 * true = envoyé. Ne throw JAMAIS vers le cron (fail-soft par utilisateur).
 *
 * Catégorie RGPD (choix documenté) : l'alerte est un service opté-in explicite
 * (alert_settings.alerts_enabled, default false), mais elle n'est PAS
 * transactionnelle au sens strict (pas liée à un paiement/compte). On la range
 * donc côté « marketing » S26 : getEmailRecipient({ marketing: true }) applique
 * l'opt-out email GLOBAL (profiles.marketing_email_optin = false → null, pas
 * d'envoi) et fournit le unsubToken pour la désinscription en un clic. Le
 * désabonnement global PRIME donc sur l'opt-in alerte, en plus du canal.
 *
 * Défense en profondeur : le cron gate déjà l'envoi via shouldSendAlert
 * (channels.email), mais la fonction re-vérifie alert_settings elle-même :
 * appelée seule, elle reste incapable d'emailer un utilisateur canal OFF ou
 * jamais opté-in (ligne absente = fail-closed).
 */
export async function sendSpotAlertEmail(payload: SpotAlertPayload): Promise<boolean> {
  try {
    // 1) Master switch + canal email (service-role : le cron tourne hors session).
    const supabase = createServiceRoleClient()
    const { data: settings, error } = await supabase
      .from('alert_settings')
      .select('alerts_enabled, channel_email')
      .eq('user_id', payload.userId)
      .maybeSingle()
    if (error || !settings?.alerts_enabled || !settings.channel_email) return false

    // 2) Opt-out email global S26 (null = désinscrit ou introuvable → pas d'envoi).
    const recipient = await getEmailRecipient(payload.userId, { marketing: true })
    if (!recipient) return false

    // 3) Rendu + envoi. Même source de copy que push/in-app (lib/alerts/message).
    //    JAMAIS de coordonnée : le payload ne porte que nom + slug du spot.
    const { emailSubject } = buildAlertMessage(payload)
    const { sent } = await sendEmail({
      to: recipient.email,
      subject: emailSubject,
      react: (
        <SpotAlertEmail
          firstName={recipient.firstName}
          spotName={payload.spotName}
          spotSlug={payload.spotSlug}
          windowLabel={payload.windowLabel}
          kind={payload.kind}
          justification={payload.justification}
          unsubToken={recipient.unsubToken}
        />
      ),
    })
    return sent
  } catch (err) {
    // sendEmail ne throw pas par design ; ce catch couvre le reste (DB, rendu).
    console.error('[email] alerte spot : envoi échoué', { userId: payload.userId, err })
    return false
  }
}
