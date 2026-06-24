import type Stripe from "stripe";
import type { Database } from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { priceIdToPlan, priceIdToInterval, PLAN_LABELS, PLAN_PRICING } from "./pricing";

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

/** "28 juin 2026" — dates affichées dans les emails (fuseau Paris). */
const toFrDate = (unixSeconds: number): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(unixSeconds * 1000));

/** "4,90 €" — montants Stripe (centimes) au format français. */
const toFrAmount = (cents: number, currency: string | null | undefined): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency ?? "eur").toUpperCase(),
  }).format(cents / 100);

/**
 * Émet un event analytics serveur (PostHog) rattaché au user_id Supabase.
 * Import dynamique (même pattern que les emails), JAMAIS bloquant, flush après :
 * un échec d'analytics ne doit pas faire rejouer le webhook. AUCUNE PII en props.
 */
async function trackServer(
  distinctId: string | null | undefined,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  if (!distinctId) return;
  try {
    const { captureServer, flush } = await import("@/lib/analytics-server");
    captureServer(distinctId, event, properties);
    await flush();
  } catch (err) {
    console.error("[stripe-webhook] analytics non émis", { event, err });
  }
}

/**
 * Résout le user_id Supabase à partir d'un stripe_subscription_id (les events
 * `invoice.*` ne portent pas toujours le metadata.user_id). Retourne null si
 * introuvable — l'event analytics est alors simplement omis.
 */
async function resolveUserIdBySubscription(subId: string | null): Promise<string | null> {
  if (!subId) return null;
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id, plan")
      .eq("stripe_subscription_id", subId)
      .maybeSingle();
    return data?.user_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Crée ou met à jour la subscription locale depuis un event Stripe
 * (customer.subscription.created / .updated). Idempotent via onConflict user_id.
 *
 * NB API dahlia (2026-04-22) : current_period_start/end ne sont plus sur la
 * Subscription mais sur chaque SubscriptionItem.
 */
export async function handleSubscriptionUpsert(
  sub: Stripe.Subscription,
  opts: {
    isCreation?: boolean;
    /** event.data.previous_attributes (events .updated) — détecte les flips d'état. */
    previousAttributes?: Partial<Stripe.Subscription>;
  } = {}
) {
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

  // Email « ton essai démarre » UNIQUEMENT sur customer.subscription.created
  // (pas sur .updated, qui rejoue à chaque changement d'état) + status trialing.
  // Après l'update DB, et jamais bloquant : un échec d'email ne doit pas faire
  // rejouer le webhook (sendEmail ne throw pas, le reste est try/catch).
  if (opts.isCreation && sub.status === "trialing") {
    // Analytics serveur — début d'essai (tunnel de conversion, sprint 26).
    const interval = priceId ? priceIdToInterval(priceId) : null;
    await trackServer(userId, "trial_started", { plan, interval, tier: plan });

    try {
      const { getEmailRecipient } = await import("@/lib/email/recipient");
      const recipient = await getEmailRecipient(userId);
      if (recipient) {
        const { sendEmail } = await import("@/lib/email/send");
        const { default: WelcomeTrialEmail } = await import("@/emails/welcome-trial");
        await sendEmail({
          to: recipient.email,
          subject: "Bienvenue dans Carnet de Pêche · Ton essai 7 jours démarre",
          react: WelcomeTrialEmail({
            firstName: recipient.firstName,
            planLabel: PLAN_LABELS[plan],
          }),
        });
      }
    } catch (err) {
      console.error("[stripe-webhook] email trial start non envoyé", { subId: sub.id, err });
    }
  }

  // Email « abonnement annulé » sur le FLIP cancel_at_period_end false → true
  // (l'utilisateur vient d'annuler via le Customer Portal ; l'accès court
  // jusqu'à la fin de période). previous_attributes ne contient le champ que
  // sur l'event où il a changé → pas de renvoi sur les updates suivants.
  const justCanceled =
    sub.cancel_at_period_end &&
    opts.previousAttributes !== undefined &&
    "cancel_at_period_end" in opts.previousAttributes &&
    opts.previousAttributes.cancel_at_period_end === false;

  if (justCanceled) {
    try {
      const { getEmailRecipient } = await import("@/lib/email/recipient");
      const recipient = await getEmailRecipient(userId);
      if (recipient) {
        const { sendEmail } = await import("@/lib/email/send");
        const { default: SubscriptionCanceledEmail } = await import(
          "@/emails/subscription-canceled"
        );
        await sendEmail({
          to: recipient.email,
          subject: "Ton abonnement est annulé — à bientôt",
          react: SubscriptionCanceledEmail({
            firstName: recipient.firstName,
            // Fallback compatible avec le « jusqu'au » du template
            accessUntil:
              typeof item?.current_period_end === "number"
                ? toFrDate(item.current_period_end)
                : "terme de ta période en cours",
          }),
        });
      }
    } catch (err) {
      console.error("[stripe-webhook] email annulation non envoyé", { subId: sub.id, err });
    }
  }
}

/**
 * customer.subscription.deleted : retombe en discovery. On cible par
 * stripe_subscription_id (pas user_id) pour ne pas écraser une éventuelle
 * nouvelle subscription déjà recréée entre-temps.
 */
export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = createServiceRoleClient();

  // Résout le user_id AVANT l'update (qui efface le stripe_subscription_id), et
  // tente d'abord le metadata de l'event (présent en général sur .deleted).
  const userId =
    sub.metadata?.user_id ?? (await resolveUserIdBySubscription(sub.id));

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

  // Analytics serveur — churn EFFECTIF (l'abonnement est résilié et l'accès
  // retombe en discovery). Distinct du flip cancel_at_period_end (intention),
  // donc pas de double comptage. Le plan résilié vient du price de l'event.
  const churnedPlan = sub.items.data[0]?.price.id
    ? priceIdToPlan(sub.items.data[0].price.id)
    : null;
  await trackServer(userId, "subscription_churned", { plan: churnedPlan });
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
 * d'essai → email « plus que X jours » (sprint 11 Bloc C). Pas d'écriture DB.
 * Stripe n'émet cet event qu'UNE fois par trial → pas de doublon possible
 * hors retry réseau (acceptable).
 */
export async function handleTrialWillEnd(sub: Stripe.Subscription) {
  const userId = sub.metadata.user_id;
  console.log("[stripe-webhook] trial bientôt fini", {
    subId: sub.id,
    userId,
    trialEnd: toIso(sub.trial_end),
  });

  if (!userId || typeof sub.trial_end !== "number") return;

  const priceId = sub.items.data[0]?.price.id;
  const plan = priceId ? priceIdToPlan(priceId) : null;
  const interval = priceId ? priceIdToInterval(priceId) : null;
  if (!plan || !interval) return; // price inconnu : pas d'email plutôt qu'un montant faux

  try {
    const { getEmailRecipient } = await import("@/lib/email/recipient");
    const recipient = await getEmailRecipient(userId);
    if (!recipient) return;

    const daysLeft = Math.max(
      1,
      Math.round((sub.trial_end * 1000 - Date.now()) / 86_400_000)
    );
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Paris",
    }).format(new Date(sub.trial_end * 1000));

    const { sendEmail } = await import("@/lib/email/send");
    const { default: TrialDay5Email } = await import("@/emails/trial-day-5");
    await sendEmail({
      to: recipient.email,
      subject: `Plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""} d'essai — toujours partant ?`,
      react: TrialDay5Email({
        firstName: recipient.firstName,
        daysLeft,
        amount: PLAN_PRICING[plan][interval].amount,
        dateLabel,
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook] email trial J-2 non envoyé", { subId: sub.id, err });
  }
}

/**
 * invoice.payment_succeeded : l'état actif est déjà reflété par
 * customer.subscription.updated (pas d'écriture DB ici). Email reçu de
 * paiement (sprint 11 Bloc C) quand un vrai montant a été encaissé — la
 * facture à 0 € du début d'essai n'envoie rien (welcome-trial couvre).
 */
export async function handleInvoicePaymentSucceeded(inv: Stripe.Invoice) {
  console.log("[stripe-webhook] paiement réussi", { invId: inv.id, amountPaid: inv.amount_paid });

  if (typeof inv.amount_paid !== "number" || inv.amount_paid <= 0) return;

  // Analytics serveur — conversion (premier vrai paiement encaissé, > 0 €).
  // La facture à 0 € du début d'essai est exclue par le garde amount_paid > 0.
  const subRef = inv.parent?.subscription_details?.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
  const convertedUserId = await resolveUserIdBySubscription(subId);
  await trackServer(convertedUserId, "trial_converted", {
    amount: inv.amount_paid,
    currency: inv.currency ?? null,
  });

  if (!inv.customer_email) return;

  try {
    const { sendEmail } = await import("@/lib/email/send");
    const { default: PaymentSuccessEmail } = await import("@/emails/payment-success");
    await sendEmail({
      to: inv.customer_email,
      subject: "Paiement reçu — bonne pêche 🎣",
      react: PaymentSuccessEmail({
        amount: toFrAmount(inv.amount_paid, inv.currency),
        dateLabel: toFrDate(
          typeof inv.status_transitions?.paid_at === "number"
            ? inv.status_transitions.paid_at
            : inv.created
        ),
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook] email reçu de paiement non envoyé", { invId: inv.id, err });
  }
}

/**
 * invoice.payment_failed : tag la subscription en past_due + email Resend
 * « mets à jour ta CB » (sprint 11 Bloc C). NB API dahlia : l'id de
 * subscription est sous invoice.parent.subscription_details.subscription.
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

  // Analytics serveur — échec de paiement (signal de churn involontaire).
  const failedUserId = await resolveUserIdBySubscription(subId);
  await trackServer(failedUserId, "payment_failed", {});

  // Email après l'update DB. try/catch obligatoire (même pattern que tous les
  // envois de ce fichier) : un échec d'email — y compris au chargement des
  // modules — ne doit JAMAIS faire rejouer le webhook par Stripe.
  if (inv.customer_email) {
    try {
      const { sendEmail } = await import("@/lib/email/send");
      const { default: PaymentFailedEmail } = await import("@/emails/payment-failed");
      await sendEmail({
        to: inv.customer_email,
        subject: "On n'a pas pu encaisser ton paiement",
        react: PaymentFailedEmail({}),
      });
    } catch (err) {
      console.error("[stripe-webhook] email échec de paiement non envoyé", { invId: inv.id, err });
    }
  }
}
