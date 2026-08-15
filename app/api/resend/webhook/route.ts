import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { decideSuppression, verifyResendSignature, type ResendEvent } from '@/lib/email/resend-webhook'
import { suppressEmail } from '@/lib/email/suppression'

// ⚠️ Runtime Node obligatoire : la vérification de signature a besoin du raw body
// et de `node:crypto`. Même contrainte que le webhook Stripe.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/resend/webhook — SEUL Resend appelle cette route.
 *
 * Rôle unique : alimenter la liste de suppression (migration 112) quand une
 * adresse rebondit durement ou nous signale comme indésirables. Voir
 * `lib/email/suppression.ts` pour le pourquoi.
 *
 * ⚠️ On répond 200 à tout événement correctement signé, même ignoré. Un webhook
 * qui renvoie une erreur sur un type qu'il ne traite pas déclenche des retries
 * inutiles côté fournisseur, et finit par faire désactiver l'endpoint.
 * Les seuls non-200 sont : signature absente/invalide (400) et secret non
 * configuré (500), qui sont de vraies anomalies.
 *
 * ⚠️ Cette route ne doit JAMAIS être accessible en GET (cf handler plus bas).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET absente')
    return new NextResponse('Not configured', { status: 500 })
  }

  const rawBody = await request.text() // raw body requis pour la signature

  const verdict = verifyResendSignature(
    rawBody,
    {
      id: request.headers.get('svix-id'),
      timestamp: request.headers.get('svix-timestamp'),
      signature: request.headers.get('svix-signature'),
    },
    secret,
  )
  if (!verdict.ok) {
    console.error('[resend-webhook] signature refusée', verdict.reason)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody) as ResendEvent
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const decision = decideSuppression(event)
  if (!decision.suppress) {
    // Rebond passager, ou type d'événement hors périmètre : rien à faire.
    return NextResponse.json({ ok: true, suppressed: false })
  }

  try {
    await suppressEmail({
      email: decision.email,
      reason: decision.reason,
      detail: decision.detail,
    })
  } catch (err) {
    // On ne renvoie pas d'erreur : un échec d'écriture ici ne doit pas provoquer
    // une avalanche de retries. Sentry porte l'alerte.
    Sentry.captureException(err, { tags: { webhook: 'resend' } })
  }

  return NextResponse.json({ ok: true, suppressed: true })
}

export function GET() {
  return new NextResponse('Method not allowed', { status: 405 })
}
