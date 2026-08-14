import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/redirect";
import { replayPendingDrafts } from "@/lib/drafts/replay";

// Vérification des liens reçus PAR EMAIL (reset mot de passe, confirmation
// d'inscription, magic link…) via `token_hash` + `verifyOtp`.
//
// Pourquoi une route distincte de /auth/callback :
//   - /auth/callback lit `?code=` + exchangeCodeForSession → flux PKCE, où le
//     « code verifier » vit dans un cookie DU NAVIGATEUR qui a initié la demande.
//     Parfait pour l'OAuth (Google), où le retour se fait dans le bon navigateur.
//   - Pour un lien reçu par email, l'utilisateur l'ouvre souvent sur un AUTRE
//     appareil/navigateur (desktop → mobile, webview du client mail) : le cookie
//     verifier est absent → l'échange échoue → atterrissage sur /auth/login.
//   - `verifyOtp({ token_hash })` est AUTO-SUFFISANT (validé par un POST
//     serveur → Supabase, sans cookie préalable) → fonctionne cross-device.
//
// Le template email doit pointer ici en `token_hash` (cf
// supabase/email-templates/reset-password.html), PAS via {{ .ConfirmationURL }}.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // ANTI OPEN-REDIRECT : `next` n'est accepté que s'il s'agit d'un chemin
  // interne sûr (même garde que les autres flux auth). Défaut = page de saisie
  // du nouveau mot de passe.
  const next = safeInternalPath(searchParams.get("next"), "/auth/reset-password");

  if (token_hash && type) {
    const supabase = await createClient();
    // `type` est un string : EmailOtpType inclut `(string & {})`, donc assignable.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      // Rejeu des brouillons d'inscription différée (sprint 77, Bloc 7) : ce
      // chemin sert la confirmation d'inscription et le lien magique en
      // token_hash. Un reset de mot de passe n'a normalement aucun brouillon en
      // attente ; s'il en a un, c'est qu'il vient de le poser, et le rejouer est
      // exactement ce qu'il veut. Ne lève jamais.
      // ⚠️ JAMAIS sur un `recovery` : le visiteur DOIT atterrir sur la page de
      // saisie du nouveau mot de passe. Son brouillon n'est pas purgé, il sera
      // rejoué à la prochaine authentification réelle.
      let destination = next;
      if (type !== "recovery") {
        try {
          const { returnPath } = await replayPendingDrafts();
          if (returnPath) destination = returnPath;
        } catch (err) {
          console.error("[auth/confirm] rejeu des brouillons échoué :", err);
        }
      }
      // La session de récupération est désormais posée en cookie → la page
      // /auth/reset-password peut appeler updateUser({ password }) directement.
      return NextResponse.redirect(`${origin}${destination}`);
    }

    console.error("[auth/confirm]", error.message);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth-callback`);
}
