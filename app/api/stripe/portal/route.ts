import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stripe/portal — crée une session Customer Portal Stripe (FR) et
// redirige (303) le navigateur dessus. Appelé par /compte/abonnement (E2).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Connecte-toi pour gérer ton abonnement." }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Pas de Customer Portal sans abonnement." },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/compte/abonnement`,
      locale: "fr",
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[stripe-portal] échec création session", err);
    return NextResponse.json({ error: "Impossible d'ouvrir le portail." }, { status: 500 });
  }
}
