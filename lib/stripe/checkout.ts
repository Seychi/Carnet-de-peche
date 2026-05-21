import "server-only";
import type Stripe from "stripe";
import { stripe } from "./client";
import { planToPriceId, type PaidPlan, type PlanInterval } from "./pricing";

// Récupère le customer Stripe de l'utilisateur, ou le crée. On NE persiste PAS
// le customer_id côté DB ici (règle d'or sprint 9 : seul le webhook écrit dans
// subscriptions) — on s'appuie sur :
//   1. le customer_id déjà connu (posé par un précédent webhook), si fourni ;
//   2. sinon une recherche Stripe par metadata.user_id (évite les doublons) ;
//   3. sinon une création.
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string | undefined;
  existingCustomerId?: string | null;
}): Promise<string> {
  const { userId, email, existingCustomerId } = params;
  if (existingCustomerId) return existingCustomerId;

  const found = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
    limit: 1,
  });
  if (found.data[0]) return found.data[0].id;

  const created = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });
  return created.id;
}

// Crée la Checkout Session d'abonnement avec essai 7 jours AVEC CB
// (payment_method_collection: 'always' → la carte est capturée d'emblée),
// Stripe Tax activé, et le user_id propagé en metadata (lu par le webhook).
export async function createSubscriptionCheckoutSession(params: {
  userId: string;
  customerId: string;
  plan: PaidPlan;
  interval: PlanInterval;
  origin: string;
}): Promise<Stripe.Checkout.Session> {
  const { userId, customerId, plan, interval, origin } = params;
  const price = planToPriceId(plan, interval);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: userId },
    },
    metadata: { user_id: userId, plan, interval },
    locale: "fr",
    allow_promotion_codes: true, // coupon BETA2026 (sprint 11)
    automatic_tax: { enabled: true }, // Stripe Tax FR
    customer_update: { address: "auto" },
    tax_id_collection: { enabled: false }, // B2C
    billing_address_collection: "required",
    payment_method_collection: "always", // CB requise dès l'essai
    success_url: `${origin}/compte/abonnement/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/compte/abonnement/cancel`,
  });
}
