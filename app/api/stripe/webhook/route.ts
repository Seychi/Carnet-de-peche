import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/client";
import * as handlers from "@/lib/stripe/events";

// ⚠️ Runtime Node obligatoire : stripe.webhooks.constructEvent a besoin du raw
// body (string/Buffer) pour vérifier la signature. Edge pose des soucis de stream.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stripe/webhook — SEUL Stripe appelle cette route. POST-ONLY :
// ne JAMAIS la rendre accessible en GET (cf handler GET → 405 plus bas).
// Pas de CORS (appel serveur-à-serveur), pas de rate-limit custom (Stripe gère
// ses propres retries). L'idempotence est garantie côté handlers (lib/stripe/events.ts).
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("No signature", { status: 400 });
  }

  const body = await request.text(); // raw body requis pour la vérif de signature

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] signature invalide", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  console.log("[webhook]", event.id, event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handlers.handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handlers.handleSubscriptionUpsert(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handlers.handleSubscriptionDeleted(event.data.object);
        break;
      case "customer.subscription.trial_will_end":
        await handlers.handleTrialWillEnd(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlers.handleInvoicePaymentSucceeded(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlers.handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        console.log("[webhook] ignoré", event.type);
    }
    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    // 500 → Stripe rejoue. Idempotence garantie côté handlers.
    // Capture Sentry explicite : un user payé non-débloqué est l'incident
    // le plus coûteux du produit (brief Bloc D : alerte sur tout échec webhook).
    console.error("[webhook] erreur handler", event.id, err);
    Sentry.captureException(err, {
      tags: { webhook: "stripe", event_type: event.type },
      extra: { event_id: event.id },
    });
    return new NextResponse("Handler error", { status: 500 });
  }
}

// La route est POST-only. Tout autre verbe → 405.
export async function GET() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
