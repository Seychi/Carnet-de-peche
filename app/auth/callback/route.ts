import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/redirect";
import { replayPendingDrafts } from "@/lib/drafts/replay";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // ANTI OPEN-REDIRECT : `next` vient de l'URL, il ne sort jamais du site.
  const next = safeInternalPath(searchParams.get("next"), "/home");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth-callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=auth-callback`);
  }

  // Rejeu des brouillons d'inscription différée (sprint 77, Bloc 7) : ce
  // callback sert Google ET le lien magique, les deux chemins par lesquels un
  // visiteur qui a mis un spot ou une prise de côté crée son compte. Le rejeu se
  // fait AVANT l'onboarding, et renvoie la fiche du spot d'où il venait.
  // Ne lève jamais : une authentification réussie reste réussie.
  let destination = next;
  try {
    const { returnPath } = await replayPendingDrafts();
    if (returnPath) destination = returnPath;
  } catch (err) {
    console.error("[auth/callback] rejeu des brouillons échoué :", err);
  }

  // Le trigger handle_new_user a créé le profil avec onboarded=false.
  // Le middleware redirigera vers /onboarding/1 si nécessaire.
  return NextResponse.redirect(`${origin}${destination}`);
}
