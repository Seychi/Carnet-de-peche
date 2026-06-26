import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { priceIdToPlan, priceIdToInterval, PLAN_PRICING } from '@/lib/stripe/pricing'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Cron des relances email (sprint 26, WS-A). Deux temps, idempotents via des
// marqueurs DB (subscriptions.trial_reminder_j1_at / post_trial_winback_at) :
//
//   1. J-1 essai — TRANSACTIONNEL. status='trialing' + trial_end dans ~48 h →
//      email « ton essai finit demain ». Base légale = exécution du contrat,
//      PAS de check d'opt-out marketing.
//   2. J+2 post-essai — MARKETING. Un essai qui s'est terminé sans conversion
//      (status != active/trialing, J-1 envoyé il y a ~2-3 j) → email win-back.
//      On RESPECTE l'opt-out : getEmailRecipient({marketing:true}) renvoie null
//      si l'utilisateur s'est désinscrit.
//
// ⚠️ Plan Vercel Hobby = 1 exécution/jour. Les fenêtres sont larges (≥ 24 h) pour
// rattraper un run manqué sans renvoyer (le marqueur garantit l'unicité). Un échec
// d'email ne bloque jamais le run (sendEmail ne throw pas ; on continue la boucle).

// Détection du win-back : à la suppression de la subscription Stripe (essai non
// converti), trial_end est nullé (cf handleSubscriptionDeleted). On ne peut donc
// pas se fier à trial_end pour le J+2. On s'appuie sur trial_reminder_j1_at (preuve
// que l'utilisateur était en essai) posé il y a ~2 à 4 jours + un statut non actif.

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    let sentJ1 = 0
    let sentWinback = 0

    // ── 1. J-1 essai (TRANSACTIONNEL) ────────────────────────────────────────
    // trialing + trial_end entre maintenant et +48 h + jamais relancé.
    const in48h = new Date(now + 48 * 60 * 60 * 1000).toISOString()
    const { data: j1Rows, error: j1Error } = await admin
      .from('subscriptions')
      .select('user_id, stripe_price_id, trial_end')
      .eq('status', 'trialing')
      .is('trial_reminder_j1_at', null)
      .not('trial_end', 'is', null)
      .gte('trial_end', nowIso)
      .lte('trial_end', in48h)
    if (j1Error) throw j1Error

    for (const row of j1Rows ?? []) {
      const plan = row.stripe_price_id ? priceIdToPlan(row.stripe_price_id) : null
      const interval = row.stripe_price_id ? priceIdToInterval(row.stripe_price_id) : null

      const { getEmailRecipient } = await import('@/lib/email/recipient')
      const recipient = await getEmailRecipient(row.user_id) // transactionnel
      if (!recipient) {
        // Pas de destinataire résolu : on marque quand même pour ne pas rescanner
        // indéfiniment cette ligne chaque jour.
        await admin
          .from('subscriptions')
          .update({ trial_reminder_j1_at: nowIso })
          .eq('user_id', row.user_id)
        continue
      }

      const dateLabel = row.trial_end
        ? new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            timeZone: 'Europe/Paris',
          }).format(new Date(row.trial_end))
        : 'demain'
      const amount = plan && interval ? PLAN_PRICING[plan][interval].amount : 'le montant de ton plan'

      const { sendEmail } = await import('@/lib/email/send')
      const { default: TrialEndingJ1Email } = await import('@/emails/trial-ending-j1')
      await sendEmail({
        to: recipient.email,
        subject: 'Ton essai se termine demain',
        react: TrialEndingJ1Email({ firstName: recipient.firstName, amount, dateLabel }),
      })

      // Marqueur anti-doublon APRÈS l'envoi (un échec d'email n'avait de toute façon
      // pas throw ; on évite juste de renvoyer demain).
      await admin
        .from('subscriptions')
        .update({ trial_reminder_j1_at: nowIso })
        .eq('user_id', row.user_id)
      sentJ1++
    }

    // ── 2. J+2 post-essai non converti (MARKETING) ──────────────────────────
    // J-1 envoyé il y a 2 à 4 jours + statut non actif/non trialing + jamais relancé.
    const winbackFrom = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()
    const winbackTo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    const { data: wbRows, error: wbError } = await admin
      .from('subscriptions')
      .select('user_id, status')
      .is('post_trial_winback_at', null)
      .not('trial_reminder_j1_at', 'is', null)
      .gte('trial_reminder_j1_at', winbackFrom)
      .lte('trial_reminder_j1_at', winbackTo)
    if (wbError) throw wbError

    for (const row of wbRows ?? []) {
      // Converti (active/trialing) → pas de win-back. On marque pour ne plus rescanner.
      const converted = row.status === 'active' || row.status === 'trialing'
      if (converted) {
        await admin
          .from('subscriptions')
          .update({ post_trial_winback_at: nowIso })
          .eq('user_id', row.user_id)
        continue
      }

      const { getEmailRecipient } = await import('@/lib/email/recipient')
      const recipient = await getEmailRecipient(row.user_id, { marketing: true })
      if (!recipient) {
        // Désinscrit (opt-out) ou introuvable → on respecte le choix et on marque
        // pour ne plus rescanner cette ligne.
        await admin
          .from('subscriptions')
          .update({ post_trial_winback_at: nowIso })
          .eq('user_id', row.user_id)
        continue
      }

      const { sendEmail } = await import('@/lib/email/send')
      const { default: PostTrialWinbackEmail } = await import('@/emails/post-trial-winback')
      await sendEmail({
        to: recipient.email,
        subject: "Ton essai est terminé. Ton carnet t'attend",
        react: PostTrialWinbackEmail({
          firstName: recipient.firstName,
          unsubToken: recipient.unsubToken,
        }),
      })

      await admin
        .from('subscriptions')
        .update({ post_trial_winback_at: nowIso })
        .eq('user_id', row.user_id)
      sentWinback++
    }

    return NextResponse.json({ ok: true, sentJ1, sentWinback })
  } catch (err) {
    console.error('[cron dunning-relances] échec global:', err)
    Sentry.captureException(err, { tags: { job: 'dunning-relances' } })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
