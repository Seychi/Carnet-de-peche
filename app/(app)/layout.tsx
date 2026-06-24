import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { priceIdToInterval, PLAN_PRICING, type PaidPlan } from "@/lib/stripe/pricing";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppInstruments } from "@/components/layout/AppInstruments";
import { TrialBanner } from "./trial-banner";

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

// Le middleware gère les redirections d'auth.
// Ce layout est une sécurité secondaire (defense in depth).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Statut modérateur (gating UI « Modération ») + département d'attache (pour pointer
  // « Fil » directement vers /fil/[dept] depuis le shell app → zéro traversée du shell
  // marketing, donc plus de flash du footer au clic, cf sprint 28 Bloc 1).
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator, home_department")
    .eq("id", user.id)
    .maybeSingle();
  const isModerator = profile?.is_moderator ?? false;
  const homeDepartment = profile?.home_department?.trim() || null;

  // Bandeau "essai bientôt fini" si trial à J-3 ou moins.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, trial_end, stripe_price_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let banner: React.ReactNode = null;
  if (sub?.status === "trialing" && sub.trial_end) {
    const daysLeft = daysUntil(sub.trial_end);
    if (daysLeft <= 3) {
      const plan = (sub.plan === "local" || sub.plan === "itinerant" ? sub.plan : null) as PaidPlan | null;
      const interval = sub.stripe_price_id ? priceIdToInterval(sub.stripe_price_id) : null;
      const amount = plan && interval ? PLAN_PRICING[plan][interval].amount : null;
      banner = (
        <TrialBanner daysLeft={daysLeft} amount={amount} dateLabel={formatDate(sub.trial_end)} />
      );
    }
  }

  return (
    <AppShell
      header={<AppHeader />}
      instruments={<AppInstruments />}
      banner={banner}
      isModerator={isModerator}
      homeDepartment={homeDepartment}
    >
      {children}
    </AppShell>
  );
}
