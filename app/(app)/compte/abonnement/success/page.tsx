import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { stripe } from "@/lib/stripe/client";
import { PLAN_LABELS, type PaidPlan } from "@/lib/stripe/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bienvenue — Carnet de Pêche",
};

// Atterrissage post-Checkout. On confirme tout de suite côté UI en relisant la
// session Stripe (sans attendre la latence du webhook). En cas de session
// invalide → on renvoie vers la page de gestion.
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/compte/abonnement");

  let planLabel = "ton abonnement";
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const plan = session.metadata?.plan as PaidPlan | undefined;
    if (plan && PLAN_LABELS[plan]) planLabel = PLAN_LABELS[plan];
  } catch (err) {
    console.error("[checkout-success] session introuvable", err);
    redirect("/compte/abonnement");
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <div className="text-5xl mb-5" aria-hidden>
        🎉
      </div>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-3">
        Bienvenue dans {planLabel}
      </h1>
      <p className="text-ink-700 mb-8">
        Ton essai 7 jours démarre maintenant. Tu peux annuler à tout moment, en ligne, depuis
        ton compte. Aucune charge avant la fin de l&rsquo;essai.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/carte"
          className="px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
        >
          Explorer la carte complète
        </Link>
        <Link
          href="/compte/abonnement"
          className="px-6 py-3 rounded-[12px] bg-white border border-ink-200 text-navy-900 font-semibold text-sm hover:bg-sand-50 transition-colors duration-200"
        >
          Voir mon abonnement
        </Link>
      </div>
    </div>
  );
}
