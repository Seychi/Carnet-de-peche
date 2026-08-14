import 'server-only'
import * as React from 'react'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getEmailRecipient } from '@/lib/email/recipient'
import { sendEmail } from '@/lib/email/send'
import { buildBigTideMessage } from './message'
import type { BigTideAlertPayload } from './types'
import BigTideAlertEmail from '@/emails/big-tide-alert'

/**
 * Envoi de l'email « grande marée sur spot favori » (sprint 77, Bloc 10.2).
 * true = envoyé. Ne throw JAMAIS vers le cron (fail-soft par utilisateur).
 *
 * Module SÉPARÉ de lib/email/spot-alert.tsx (S72) et non une branche de plus
 * dedans : ce dernier gate sur `alerts_enabled` + `channel_email`, or l'alerte
 * grande marée a son PROPRE opt-in (`big_tide_alert_enabled`) et s'adresse aussi
 * aux comptes gratuits, qui n'activeront jamais `alerts_enabled`. Mutualiser
 * aurait obligé à assouplir le gate de l'alerte PAYANTE : hors de question.
 *
 * Catégorie RGPD : « marketing » comme toutes les alertes opt-in du projet.
 * getEmailRecipient({ marketing: true }) applique donc l'opt-out email GLOBAL
 * (profiles.marketing_email_optin = false → pas d'envoi) et fournit le token de
 * désinscription en un clic. Le désabonnement global PRIME sur l'opt-in alerte.
 *
 * Défense en profondeur : le moteur a déjà tranché (channels.email), mais la
 * fonction re-lit alert_settings elle-même. Appelée seule, elle reste incapable
 * d'emailer un compte canal OFF ou jamais opté-in (ligne absente = fail-closed).
 */
export async function sendBigTideAlertEmail(payload: BigTideAlertPayload): Promise<boolean> {
  try {
    // 1) Opt-in dédié + canal email (service-role : le cron tourne hors session).
    const supabase = createServiceRoleClient()
    const { data: settings, error } = await supabase
      .from('alert_settings')
      .select('big_tide_alert_enabled, channel_email')
      .eq('user_id', payload.userId)
      .maybeSingle()
    if (error || !settings?.big_tide_alert_enabled || !settings.channel_email) return false

    // 2) Opt-out email global S26 (null = désinscrit ou introuvable → pas d'envoi).
    const recipient = await getEmailRecipient(payload.userId, { marketing: true })
    if (!recipient) return false

    // 3) Rendu + envoi. Même source de copy que le push et l'in-app (message.ts).
    //    JAMAIS de coordonnée : le payload ne porte que nom + slug du spot.
    const { emailSubject } = buildBigTideMessage(payload)
    const { sent } = await sendEmail({
      to: recipient.email,
      subject: emailSubject,
      react: (
        <BigTideAlertEmail
          firstName={recipient.firstName}
          spotName={payload.spotName}
          spotSlug={payload.spotSlug}
          rangeM={payload.rangeM}
          thresholdM={payload.thresholdM}
          unsubToken={recipient.unsubToken}
        />
      ),
    })
    return sent
  } catch (err) {
    // sendEmail ne throw pas par design ; ce catch couvre le reste (DB, rendu).
    console.error('[email] alerte grande marée : envoi échoué', { userId: payload.userId, err })
    return false
  }
}
