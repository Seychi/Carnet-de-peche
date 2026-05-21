import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateStripeCustomer,
  createSubscriptionCheckoutSession,
} from "@/lib/stripe/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  plan: z.enum(["local", "itinerant"]),
  interval: z.enum(["monthly", "annual"]),
});

// POST /api/stripe/checkout
// Crée une Checkout Session Stripe et redirige (303) le navigateur vers Stripe.
// Appelé par le formulaire de /tarifs (E1). Garde-fous serveur : auth +
// éligibilité géo (DOM-TOM → 403) + refus si déjà abonné (→ Customer Portal).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Connecte-toi pour t'abonner." }, { status: 401 });
  }

  // Parse plan + interval (form-urlencoded ou JSON)
  const contentType = request.headers.get("content-type") ?? "";
  let raw: { plan?: unknown; interval?: unknown };
  if (contentType.includes("application/json")) {
    raw = await request.json();
  } else {
    const form = await request.formData();
    raw = { plan: form.get("plan"), interval: form.get("interval") };
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan ou intervalle invalide." }, { status: 400 });
  }
  const { plan, interval } = parsed.data;

  // Éligibilité géographique (DOM-TOM bloqués v1)
  const { data: eligible, error: eligErr } = await supabase.rpc("is_eligible_for_paid_tier", {
    uid: user.id,
  });
  if (eligErr || !eligible) {
    return NextResponse.json(
      { error: "Outre-mer non éligible pour l'instant." },
      { status: 403 }
    );
  }

  // Déjà abonné ? → on renvoie vers la gestion d'abonnement (changement via Portal)
  const { data: tier } = await supabase.rpc("current_tier", { uid: user.id });
  if (tier === "local" || tier === "itinerant") {
    return NextResponse.redirect(new URL("/compte/abonnement", request.url), 303);
  }

  // customer_id éventuellement déjà connu (posé par un précédent webhook)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      existingCustomerId: sub?.stripe_customer_id,
    });

    const session = await createSubscriptionCheckoutSession({
      userId: user.id,
      customerId,
      plan,
      interval,
      origin: new URL(request.url).origin,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Session Checkout sans URL." }, { status: 500 });
    }
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[stripe-checkout] échec création session", err);
    return NextResponse.json({ error: "Impossible de démarrer le paiement." }, { status: 500 });
  }
}
