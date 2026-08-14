import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes qui nécessitent d'être authentifié. Le middleware redirige vers
// /auth/login EN PRÉSERVANT la cible (?redirect=…) ; le garde-fou du layout
// (app) redirige sans paramètre, donc toute route protégée doit être listée
// ICI pour ne pas perdre la destination. NB « /fil/ » (slash final) cible
// /fil/[department] sans capturer le teaser public « /fil ». NB « /spots/… » :
// seules les sous-routes du groupe (app) sont listées (préfixes exacts), JAMAIS
// « /spots » seul — l'annuaire public /spots et /spots/[slug] restent ouverts.
const APP_ROUTES = [
  "/home",
  "/carnet",
  "/onboarding",
  "/fil/",
  "/follows",
  "/profil",
  "/compte",
  // Sprint 70 Bloc C (audit 2026-07-02 §3.8) : routes (app) qui perdaient le
  // ?redirect de retour au login.
  "/classements",
  "/sorties",
  "/notifications",
  "/moderation",
  "/spots/mes-propositions",
  "/spots/proposer",
];

// Exceptions d'AUTHENTIFICATION à l'intérieur de APP_ROUTES (sprint 77, Bloc 7,
// « inscription différée »). Ces chemins restent des routes app à tous les
// autres égards (onboarding obligatoire pour un connecté non-onboardé), mais un
// visiteur SANS COMPTE peut les atteindre : c'est là qu'il remplit son brouillon,
// et le compte ne lui est demandé qu'au moment d'enregistrer.
// ⚠️ Liste à garder minuscule et EXACTE : chaque entrée est une page qui doit
// tolérer `user === null` de bout en bout, sans jamais lire ni écrire de donnée
// utilisateur. `/carnet/nouvelle` a été sortie du groupe (app) pour cette raison
// (son layout redirigeait encore les anonymes).
const PUBLIC_APP_ROUTES = ["/carnet/nouvelle"];

// Routes réservées aux visiteurs non-connectés
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAppRoute = APP_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  // Sprint 77, Bloc 7 : ouverte aux anonymes, mais TOUJOURS soumise au reste des
  // règles app (l'onboarding d'un connecté non-onboardé, plus bas, s'applique).
  const isPublicAppRoute = PUBLIC_APP_ROUTES.some((r) => pathname.startsWith(r));

  // Pas connecté → redirige vers /auth/login en gardant la cible de retour
  // (chemin INTERNE uniquement — l'URL est construite à partir du pathname
  // courant, jamais d'une entrée externe → pas d'open-redirect possible ici).
  if (!user && isAppRoute && !isPublicAppRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    // Connecté → redirige hors des pages auth
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/home", request.url));
    }

    // Vérifie le statut d'onboarding seulement sur les routes app
    if (isAppRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .single();

      const isOnboarded = profile?.onboarded === true;
      // /onboarding/fini = écran « carnet prêt » affiché APRÈS completeOnboarding
      // (sprint 10.5) : accessible aux onboardés, exclu du redirect ci-dessous.
      const isOnboardingRoute =
        pathname.startsWith("/onboarding") && pathname !== "/onboarding/fini";

      // Pas encore onboardé + tentative d'accès à l'app (hors onboarding)
      if (!isOnboarded && !isOnboardingRoute) {
        return NextResponse.redirect(new URL("/onboarding/1", request.url));
      }

      // Déjà onboardé + tentative d'accès à l'onboarding
      if (isOnboarded && isOnboardingRoute) {
        return NextResponse.redirect(new URL("/home", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
