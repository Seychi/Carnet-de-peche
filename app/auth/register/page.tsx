import type { Metadata } from "next";
import { normalizeAuthContext } from "@/lib/auth/auth-context";
import { LoginPageClient } from "../login/login-client";

type Search = { [key: string]: string | string[] | undefined };

export const metadata: Metadata = {
  title: "Créer ton carnet de pêche, gratuit",
  description:
    "Crée ton carnet de pêche en 30 secondes, sans carte bancaire. Logue tes prises, suis les marées et la météo de tes spots.",
};

/**
 * Page d'INSCRIPTION (sprint 76, Bloc 3).
 *
 * Avant : un `redirect()` serveur vers /auth/login?tab=register. Le visiteur
 * cliquait « Créer mon carnet » et atterrissait sur une URL qui dit *login*.
 * Mesuré sur la semaine du 06/08 : 28 personnes sur /auth/login, 8 sur
 * /auth/register, 10 comptes créés.
 *
 * Maintenant : la page rend le formulaire d'inscription directement, et la
 * normalisation de contexte (correctif BUG-10) est CONSERVÉE à l'identique,
 * simplement passée en props au lieu d'être poussée dans une query de redirection.
 * /auth/login?tab=register continue de fonctionner (liens déjà indexés).
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  // Normalisation identique à celle que faisait le `redirect()` (BUG-10),
  // extraite en fonction pure et testée : plan / interval filtrés, cible de
  // retour lue en `?redirect=` ou `?next=` et validée par `safeInternalPath`.
  const ctx = normalizeAuthContext(sp);

  return (
    <LoginPageClient
      inviteOnly={process.env.INVITE_ONLY === "true"}
      initialTab="signup"
      initialCtx={ctx}
    />
  );
}
