import type { Metadata } from "next";
import { cookies } from "next/headers";
import { normalizeAuthContext } from "@/lib/auth/auth-context";
import { LoginPageClient } from "../login/login-client";
import {
  PENDING_CATCH_COOKIE,
  PENDING_FAVORITES_COOKIE,
  parsePendingCatch,
  parsePendingFavorites,
} from "@/lib/drafts/schema";
import { buildDraftSummary } from "@/lib/drafts/summary";
import { createClient } from "@/lib/supabase/server";

type Search = { [key: string]: string | string[] | undefined };

export const metadata: Metadata = {
  title: "Créer ton carnet de pêche, gratuit",
  description:
    "Crée ton carnet de pêche en 30 secondes, sans carte bancaire. Logue tes prises, suis les marées et la météo de tes spots.",
  // Sprint 79, Bloc 6 : les variantes `?redirect=…` / `?plan=…` sont autant d'URL
  // distinctes pour un moteur. On les rabat sur la page nue.
  alternates: { canonical: "https://www.carnet-de-peche.com/auth/register" },
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
  const draftSummary = await readDraftSummary();

  return (
    <LoginPageClient
      inviteOnly={process.env.INVITE_ONLY === "true"}
      initialTab="signup"
      initialCtx={ctx}
      draftSummary={draftSummary}
    />
  );
}

/**
 * Sprint 78, Bloc 1 — lit les brouillons en attente pour les rappeler au visiteur.
 *
 * Côté SERVEUR à dessein : la phrase est présente dès le premier rendu, sans
 * scintillement, et sans exposer un composant client à la lecture de cookies.
 *
 * ⚠️ Ne throw jamais. Un brouillon illisible, expiré ou un spot introuvable ne
 * doit pas empêcher quelqu'un de s'inscrire : on retombe silencieusement sur la
 * copie générique. C'est le dernier mètre du tunnel, il ne se casse pas pour un
 * ornement.
 */
async function readDraftSummary(): Promise<string | null> {
  try {
    const jar = await cookies();
    const pendingCatch = parsePendingCatch(jar.get(PENDING_CATCH_COOKIE)?.value);
    const favorites = parsePendingFavorites(jar.get(PENDING_FAVORITES_COOKIE)?.value);
    if (!pendingCatch && favorites.length === 0) return null;

    // Le cookie ne porte qu'un slug : on résout le NOM lisible, parce que
    // « à Pointe de Penvins » pèse et « à pointe-de-penvins » fait bricolage.
    // Une seule lecture, indexée, et l'échec est sans conséquence.
    let spotName: string | null = null;
    if (pendingCatch?.spot_slug) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("spots")
          .select("name")
          .eq("slug", pendingCatch.spot_slug)
          .maybeSingle();
        spotName = data?.name ?? null;
      } catch {
        /* nom non résolu : la phrase se dégrade proprement, sans le spot */
      }
    }

    return buildDraftSummary({
      species: pendingCatch?.species ?? null,
      spotName,
      favoritesCount: favorites.length,
    });
  } catch {
    return null;
  }
}
