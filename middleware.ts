import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes qui nécessitent d'être authentifié
const APP_ROUTES = ["/home", "/carnet", "/onboarding"];
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

  // Pas connecté → redirige vers /auth/login si tentative d'accès à l'app
  if (!user && isAppRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
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
      const isOnboardingRoute = pathname.startsWith("/onboarding");

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
