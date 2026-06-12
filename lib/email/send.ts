import 'server-only'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'

/**
 * Envoi d'emails transactionnels via Resend (sprint 11 Bloc C).
 * - Expéditeur : bonjour@carnet-de-peche.com (domaine vérifié SPF/DKIM
 *   dans le dashboard Resend — prérequis avant tout envoi réel).
 * - Sans RESEND_API_KEY (dev) : no-op loggé, jamais de crash.
 * - Un échec d'envoi ne doit JAMAIS faire échouer l'appelant (webhook
 *   Stripe, action) : capture Sentry + log, pas de throw.
 */

const FROM = 'Carnet de Pêche <bonjour@carnet-de-peche.com>'

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}): Promise<{ sent: boolean }> {
  const resend = getClient()
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY absente — email « ${subject} » non envoyé (dev ?)`)
    return { sent: false }
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, react })
    if (error) {
      console.error('[email] échec Resend', { subject, to: to.replace(/(.{2}).+(@.*)/, '$1***$2'), error })
      Sentry.captureException(new Error(`Resend: ${error.message}`), {
        tags: { email: subject },
      })
      return { sent: false }
    }
    return { sent: true }
  } catch (err) {
    console.error('[email] exception Resend', err)
    Sentry.captureException(err, { tags: { email: subject } })
    return { sent: false }
  }
}
