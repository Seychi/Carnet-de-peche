import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import {
  PLAN_LABELS,
  PLAN_PRICING,
  priceIdToInterval,
  type PaidPlan,
  type PlanInterval,
} from "@/lib/stripe/pricing";
import { EmailPrefsToggle } from "./email-prefs-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton abonnement — Carnet de Pêche",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function daysUntil(iso: string | null): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Bouton de redirection vers le Customer Portal (POST classique → 303 vers Stripe).
function PortalForm({ label, variant }: { label: string; variant: "primary" | "ghost" }) {
  const cls =
    variant === "primary"
      ? "bg-teal-500 hover:bg-teal-400 text-navy-950"
      : "bg-white border border-ink-200 text-navy-900 hover:bg-sand-50";
  return (
    <form action="/api/stripe/portal" method="POST">
      <button
        type="submit"
        className={`w-full sm:w-auto px-6 py-3 rounded-[12px] font-semibold text-sm transition-colors duration-200 ${cls}`}
      >
        {label}
      </button>
    </form>
  );
}

// Barre de progression de l'essai (rendu serveur, pas d'interactivité).
function TrialCountdown({ trialEnd }: { trialEnd: string | null }) {
  const remaining = daysUntil(trialEnd);
  const pct = Math.min(100, Math.max(0, ((7 - remaining) / 7) * 100));
  return (
    <div className="mt-4">
      <p className="text-sm text-ink-700 mb-2">
        Il reste <span className="font-mono font-semibold text-navy-900">{remaining} jour{remaining > 1 ? "s" : ""}</span> d&rsquo;essai
      </p>
      <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
        <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AbonnementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, stripe_customer_id, stripe_price_id, current_period_end, cancel_at_period_end, trial_end"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("marketing_email_optin")
    .eq("id", user.id)
    .maybeSingle();
  const marketingOptin = profile?.marketing_email_optin ?? true;

  const plan = (sub?.plan === "local" || sub?.plan === "itinerant" ? sub.plan : null) as PaidPlan | null;
  const interval: PlanInterval | null = sub?.stripe_price_id
    ? priceIdToInterval(sub.stripe_price_id)
    : null;
  const priceLabel =
    plan && interval ? PLAN_PRICING[plan][interval] : null;

  // 5 dernières factures (best-effort : on n'échoue pas la page si Stripe est indispo)
  let invoices: { id: string; date: string; amount: string; url: string | null }[] = [];
  if (sub?.stripe_customer_id) {
    try {
      const list = await stripe.invoices.list({ customer: sub.stripe_customer_id, limit: 5 });
      invoices = list.data.map((inv) => ({
        id: inv.id ?? "",
        date: inv.created ? new Date(inv.created * 1000).toISOString() : "",
        amount: new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: (inv.currency ?? "eur").toUpperCase(),
        }).format((inv.total ?? 0) / 100),
        url: inv.hosted_invoice_url ?? inv.invoice_pdf ?? null,
      }));
    } catch (err) {
      console.error("[abonnement] échec récupération factures", err);
    }
  }

  const status = sub?.status ?? null;
  const isPaid = plan !== null;
  const isTrial = status === "trialing";
  const isActive = status === "active" && !sub?.cancel_at_period_end;
  const isCancelScheduled = status === "active" && sub?.cancel_at_period_end === true;
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  const isEmpty = !sub || (!isPaid && !isCanceled);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-8">Ton abonnement</h1>

      {isEmpty ? (
        <div className="bg-sand-100 border border-ink-200 rounded-[18px] p-8 text-center">
          <p className="text-ink-700 mb-5">Tu n&rsquo;as pas encore d&rsquo;abonnement.</p>
          <Link
            href="/tarifs"
            className="inline-block px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
          >
            Voir les formules
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-[18px] p-8">
          {/* Plan + prix */}
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
                {plan ? PLAN_LABELS[plan] : "Abonnement"}{" "}
                {interval === "annual" ? "annuel" : interval === "monthly" ? "mensuel" : ""}
              </p>
              {priceLabel && (
                <p className="text-2xl font-bold text-navy-900 mt-1">
                  <span className="font-mono">{priceLabel.amount}</span>
                  <span className="text-ink-500 text-base font-normal"> {priceLabel.period}</span>
                </p>
              )}
            </div>
          </div>

          {/* Bandeau « passe à l'annuel » — uniquement si actif et mensuel.
              Pas de dark pattern : on renvoie vers le Customer Portal (changement
              de plan en 1 clic). */}
          {isActive && interval === "monthly" && sub?.stripe_customer_id && (
            <div className="mt-5 rounded-[14px] border border-teal-200 bg-teal-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm text-navy-900">
                <span className="font-semibold">Passe à l&rsquo;annuel</span> et économise{" "}
                <span className="font-mono font-semibold text-teal-700">−17%</span> sur l&rsquo;année.
              </p>
              <form action="/api/stripe/portal" method="POST">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
                >
                  Changer de plan
                </button>
              </form>
            </div>
          )}

          {/* Statut */}
          <div className="mt-5 border-t border-ink-100 pt-5">
            {isTrial && (
              <>
                <p className="text-sm text-ink-700">
                  <span className="font-semibold text-navy-900">Essai en cours</span> · finit le{" "}
                  <span className="font-mono">{formatDate(sub?.trial_end ?? null)}</span>
                </p>
                <TrialCountdown trialEnd={sub?.trial_end ?? null} />
              </>
            )}
            {isActive && (
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-navy-900">Actif</span> · prochain prélèvement le{" "}
                <span className="font-mono">{formatDate(sub?.current_period_end ?? null)}</span>
                {priceLabel ? <span className="font-mono"> ({priceLabel.amount})</span> : ""}
              </p>
            )}
            {isCancelScheduled && (
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-amber-600">Annulation programmée</span> · accès
                jusqu&rsquo;au <span className="font-mono">{formatDate(sub?.current_period_end ?? null)}</span>
              </p>
            )}
            {isPastDue && (
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-red-600">Paiement en échec</span> · mets à jour
                ta carte pour conserver ton accès.
              </p>
            )}
            {isCanceled && (
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-ink-500">Annulé</span> · ton abonnement a pris
                fin. Ton carnet, lui, reste à toi.
              </p>
            )}
          </div>

          {/* Win-back — abonnement annulé : on rappelle ce qui est perdu et on
              propose de revenir (re-checkout depuis /tarifs). */}
          {isCanceled && (
            <div className="mt-5 rounded-[14px] border border-sand-200 bg-sand-50 p-5">
              <p className="text-sm font-semibold text-navy-900">Voilà ce que tu rates</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-700">
                <li>Carte complète : tous les spots, coordonnées précises au mètre.</li>
                <li>Score d&rsquo;activité 0-100 par spot et filtres espèces / techniques.</li>
                <li>Notifications et stats avancées de ton carnet.</li>
              </ul>
              <Link
                href="/tarifs"
                className="mt-5 inline-block px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
              >
                Reprendre un abonnement
              </Link>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {isCanceled ? (
              // Annulé : le Portal n'a plus d'objet (plus d'abonnement actif). On
              // ne montre que la reprise (gérée par le bloc win-back ci-dessus).
              <Link
                href="/tarifs"
                className="inline-block px-6 py-3 rounded-[12px] bg-white border border-ink-200 text-navy-900 hover:bg-sand-50 font-semibold text-sm transition-colors duration-200"
              >
                Voir les formules
              </Link>
            ) : sub?.stripe_customer_id ? (
              <>
                <PortalForm label="Gérer mon abonnement" variant="primary" />
                {(isTrial || isActive || isCancelScheduled) && (
                  <PortalForm label="Changer de plan" variant="ghost" />
                )}
              </>
            ) : (
              <Link
                href="/tarifs"
                className="inline-block px-6 py-3 rounded-[12px] bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm transition-colors duration-200"
              >
                Voir les formules
              </Link>
            )}
          </div>

          {/* Historique factures */}
          {invoices.length > 0 && (
            <div className="mt-8 border-t border-ink-100 pt-5">
              <p className="text-sm font-semibold text-navy-900 mb-3">Dernières factures</p>
              <ul className="flex flex-col gap-2">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-ink-700">{formatDate(inv.date)}</span>
                    <span className="font-mono text-ink-700">{inv.amount}</span>
                    {inv.url ? (
                      <a
                        href={inv.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-700 underline"
                      >
                        Voir
                      </a>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Préférences email — opt-out marketing en 1 clic. Toujours visible. */}
      <div className="mt-6 bg-white border border-sand-200 rounded-[18px] p-6">
        <EmailPrefsToggle initial={marketingOptin} />
      </div>
    </div>
  );
}
