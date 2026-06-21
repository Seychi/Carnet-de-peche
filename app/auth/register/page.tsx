import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/redirect";

type Search = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Redirige vers /auth/login (onglet Inscription) en PRÉSERVANT le contexte
// d'abonnement : plan + interval (CTA « Essayer 7 jours » de /tarifs) et la
// cible de retour post-auth. Sans ça, le plan choisi était perdu (BUG-10).
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "register");

  const plan = first(sp.plan);
  if (plan === "local" || plan === "itinerant") params.set("plan", plan);

  const interval = first(sp.interval);
  if (interval === "monthly" || interval === "annual")
    params.set("interval", interval);

  // `next` (CTA tarifs) sert de cible de retour → on le normalise en `redirect`,
  // validé chemin interne pour éviter tout open-redirect.
  const back = first(sp.redirect) ?? first(sp.next);
  if (back) params.set("redirect", safeInternalPath(back, "/tarifs"));

  redirect(`/auth/login?${params.toString()}`);
}
