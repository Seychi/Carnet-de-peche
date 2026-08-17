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

// Sprint 84, Bloc 2 — nom du cookie de session écrit par @supabase/ssr :
// `sb-<project-ref>-auth-token`, éventuellement découpé en `.0`, `.1`… quand la
// valeur dépasse la taille max d'un cookie (cf `storageKey` par défaut de
// supabase-js : `sb-${hostname.split('.')[0]}-auth-token`). Le cookie PKCE
// `…-auth-token-code-verifier` est volontairement EXCLU : il existe pendant le
// callback OAuth, où il n'y a pas encore de session à rafraîchir.
const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => SUPABASE_AUTH_COOKIE.test(cookie.name));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAppRoute = APP_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  // Sprint 77, Bloc 7 : ouverte aux anonymes, mais TOUJOURS soumise au reste des
  // règles app (l'onboarding d'un connecté non-onboardé, plus bas, s'applique).
  const isPublicAppRoute = PUBLIC_APP_ROUTES.some((r) => pathname.startsWith(r));

  // ─────────────────────────────────────────────────────────────────────────
  // Sprint 85, Bloc 1 — `/auth/login?tab=register` → 301 vers `/auth/register`.
  //
  // Le sprint 76 a fait de `/auth/register` une vraie page ; `?tab=register` n'a
  // survécu que pour honorer des liens externes historiques. AUCUN lien interne
  // n'y pointe plus (un test de `components/map/__tests__/bottom-stack.test.ts`
  // l'interdit même). Depuis que `/auth/login` est en `noindex`, ces liens
  // externes alimentent une page qui ne sera plus indexée : le 301 consolide le
  // signal vers la bonne porte, et surtout il fait atterrir un humain venu d'un
  // vieux lien sur le formulaire d'INSCRIPTION plutôt que sur une page qui dit
  // « login ».
  //
  // ⚠️ Ici et pas dans la page : `/auth/login` fait partie des routes
  // PRÉ-RENDUES du sprint 84. Lire `searchParams` dans le composant de page
  // interromprait la génération statique et forcerait `revalidate = 0` (c'est
  // exactement ce qui coûte `/spots`). Le middleware tourne déjà sur AUTH_ROUTES.
  //
  // ⚠️ On copie la query ENTIÈRE puis on retire `tab` : une recopie clé par clé
  // écraserait les paramètres répétés. `?redirect=` doit survivre intact
  // (invariant sprint 70 Bloc C), `?plan=` aussi.
  // ─────────────────────────────────────────────────────────────────────────
  if (
    pathname === "/auth/login" &&
    request.nextUrl.searchParams.get("tab") === "register"
  ) {
    const target = new URL("/auth/register", request.url);
    target.search = request.nextUrl.search;
    target.searchParams.delete("tab");
    return NextResponse.redirect(target, 301);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sprint 84, Bloc 2 — SORTIE ANTICIPÉE avant toute création de client.
  //
  // `supabase.auth.getUser()` valide le JWT contre le serveur Auth : c'est UN
  // ALLER-RETOUR RÉSEAU par requête HTTP (vérifié sur @supabase/ssr 0.10.3 :
  // `getSession()` lit le cookie sans fetch, `getUser()` fait un GET /user).
  // Sur `/`, `/spots/*`, `/especes/*`, `/peche/*` il ne sert à RIEN : aucune de
  // ces routes n'est redirigée par le middleware. C'est de la latence pure,
  // payée par Googlebot et par 100 % du trafic SEO.
  //
  // ⚠️ Deux conditions, pas une :
  //   1. la route n'est concernée par aucune des trois listes ci-dessus ;
  //   2. la requête ne porte AUCUN cookie de session Supabase.
  // La 2e n'est pas du zèle. Le middleware est le seul endroit qui peut
  // PERSISTER un token rafraîchi : `lib/supabase/server.ts` avale l'écriture
  // (`setAll` en try/catch, un Server Component ne peut pas poser de cookie).
  // Or `/spots/[slug]` (page SEO n°1) appelle `getUser()` + `getUserTier()`
  // côté serveur. Sans le middleware, un connecté revenant à froid avec un
  // access token expiré ferait consommer son refresh token par le RSC sans
  // pouvoir le réécrire — les refresh tokens Supabase étant à usage unique, le
  // rafraîchissement suivant du client navigateur échouerait et le
  // déconnecterait. Le visiteur SANS cookie, lui (Googlebot et l'écrasante
  // majorité du trafic SEO), n'a par définition rien à rafraîchir.
  // ─────────────────────────────────────────────────────────────────────────
  if (
    !isAppRoute &&
    !isAuthRoute &&
    !isPublicAppRoute &&
    !hasSupabaseAuthCookie(request)
  ) {
    return NextResponse.next({ request });
  }

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
