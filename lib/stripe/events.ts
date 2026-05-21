import type Stripe from "stripe";
import type { Database } from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { priceIdToPlan } from "./pricing";

// Handlers webhook Stripe. RÈGLES :
//  - Stripe est la SEULE source de vérité : on écrit `subscriptions` uniquement ici
//    (+ seed dev). user_id (PK) garantit l'idempotence : un event rejoué upsert
//    la même ligne au lieu d'en créer une nouvelle.
//  - On ne pose JAMAIS un état qui contredit l'event reçu (ex : un delete rejoué
//    ne matche plus si une nouvelle sub a déjà été recréée → 0 ligne touchée).
//  - Tout est loggé console (Sentry câblé en sprint 11).

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Insert"];

const toIso = (unixSeconds: number | null | undefined): string | null =>
  typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;

/**
 * Crée ou met à jour la subscription locale depuis un event Stripe
 * (customer.subscription.created / .updated). Idempotent via onConflict user_id.
 *
 * NB API dahlia (2026-04-22) : current_period_start/end ne sont plus sur la
 * Subscription mais sur chaque SubscriptionItem.
 */
export async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const plan = priceId ? priceIdToPlan(priceId) : null;

  if (!plan) {
    console.warn("[stripe-webhook] subscription au price inconnu, ignorée", {
      subId: sub.id,
      priceId,
    });
    return;
  }

  const userId = sub.metadata.user_id; // posé dans createCheckoutSession (D1)
  if (!userId) {
    console.error("[stripe-webhook] subscription sans metadata.user_id", { subId: sub.id });
    return;
  }

  const payload: SubscriptionRow = {
    user_id: userId,
    plan,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: toIso(item?.current_period_start),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    trial_end: toIso(sub.trial_end),
    latest_invoice_id:
      typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id ?? null,
    default_payment_method:
      typeof sub.default_payment_method === "string"
        ? sub.default_payment_method
        : sub.default_payment_method?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[stripe-webhook] upsert subscription échoué", { subId: sub.id, error });
    throw error; // 500 → Stripe retry (idempotent)
  }

  console.log("[stripe-webhook] subscription upsert", {
    subId: sub.id,
    userId,
    plan,
    status: sub.status,
  });
}

/**
 * customer.subscription.deleted : retombe en discovery. On cible par
 * stripe_subscription_id (pas user_id) pour ne pas écraser une éventuelle
 * nouvelle subscription déjà recréée entre-temps.
 */
export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: "discovery",
      status: "canceled",
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      stripe_price_id: null,
      trial_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("[stripe-webhook] downgrade discovery échoué", { subId: sub.id, error });
    throw error;
  }

  console.log("[stripe-webhook] subscription supprimée → discovery", { subId: sub.id });
}

/**
 * checkout.session.completed : la subscription est créée en parallèle par
 * customer.subscription.created (qui fait l'upsert). Ici on se contente de
 * logger — utile pour la traçabilité et les métriques (sprint 11).
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[stripe-webhook] checkout complété", {
    sessionId: session.id,
    userId: session.metadata?.user_id,
    subscription:
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
  });
}

/**
 * customer.subscription.trial_will_end : Stripe prévient ~3j avant la fin
 * d'essai. Email J-2 câblé en sprint 11 (Resend) — ici on logge.
 */
export async function handleTrialWillEnd(sub: Stripe.Subscription) {
  console.log("[stripe-webhook] trial bientôt fini", {
    subId: sub.id,
    userId: sub.metadata.user_id,
    trialEnd: toIso(sub.trial_end),
  });
}

/**
 * invoice.payment_succeeded : l'état actif est déjà reflété par
 * customer.subscription.updated. On logge uniquement.
 */
export async function handleInvoicePaymentSucceeded(inv: Stripe.Invoice) {
  console.log("[stripe-webhook] paiement réussi", { invId: inv.id });
}

/**
 * invoice.payment_failed : tag la subscription en past_due (email Resend en
 * sprint 11). NB API dahlia : l'id de subscription est sous
 * invoice.parent.subscription_details.subscription.
 */
export async function handleInvoicePaymentFailed(inv: Stripe.Invoice) {
  const subRef = inv.parent?.subscription_details?.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;

  console.warn("[stripe-webhook] paiement échoué", { invId: inv.id, subId });

  if (!subId) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId);

  if (error) {
    console.error("[stripe-webhook] tag past_due échoué", { subId, error });
    throw error;
  }
}
