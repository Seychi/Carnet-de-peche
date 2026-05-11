import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth-callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=auth-callback`);
  }

  // Le trigger handle_new_user a créé le profil avec onboarded=false.
  // Le middleware redirigera vers /onboarding/1 si nécessaire.
  return NextResponse.redirect(`${origin}${next}`);
}
