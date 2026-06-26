"use server";

import "@/lib/zod-config";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { safeInternalPath } from "@/lib/auth/redirect";

// Détermine la destination post-auth à partir des hidden inputs du formulaire.
// Priorité : plan payant (→ /tarifs avec sélection) > redirect interne validé
// > /home. Le lancement réel du Checkout se fait via le formulaire POST de
// /tarifs (qui exige déjà auth + éligibilité), donc on renvoie l'utilisateur
// authentifié sur /tarifs avec son plan/intervalle pré-sélectionnés.
function destinationFrom(formData: FormData): string {
  const plan = formData.get("plan");
  const interval = formData.get("interval");
  if (plan === "local" || plan === "itinerant") {
    const params = new URLSearchParams({ plan });
    if (interval === "monthly" || interval === "annual")
      params.set("interval", interval);
    return `/tarifs?${params.toString()}`;
  }
  return safeInternalPath(
    typeof formData.get("redirect") === "string"
      ? (formData.get("redirect") as string)
      : null,
    "/home"
  );
}

export type LoginState = {
  error: string | null;
  success: boolean;
  email: string;
  submittedAt: number | null;
};

async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function translateAuthError(message: string, status?: number): string {
  if (status === 429 || message.toLowerCase().includes("rate limit")) {
    return "Trop de tentatives, réessaie dans quelques minutes.";
  }
  if (
    message.toLowerCase().includes("sending") ||
    message.toLowerCase().includes("confirmation email")
  ) {
    return "Impossible d'envoyer l'email. Vérifie l'adresse ou réessaie plus tard.";
  }
  if (
    message.toLowerCase().includes("invalid email") ||
    message.toLowerCase().includes("unable to validate")
  ) {
    return "Adresse email invalide.";
  }
  if (message.toLowerCase().includes("signup is disabled")) {
    return "L'inscription est temporairement désactivée.";
  }
  return "Une erreur est survenue. Réessaie dans quelques instants.";
}

const emailSchema = z.email();
const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères.")
  .regex(/\d/, "Doit contenir au moins 1 chiffre.");

export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const parsed = emailSchema.safeParse(emailRaw);

  if (!parsed.success) {
    return {
      error: "Adresse email invalide.",
      success: false,
      email: String(emailRaw ?? ""),
      submittedAt: null,
    };
  }

  const email = parsed.data;
  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/home`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[sendMagicLink]", error.message);
    return {
      error: translateAuthError(error.message, error.status),
      success: false,
      email,
      submittedAt: null,
    };
  }

  return { error: null, success: true, email, submittedAt: Date.now() };
}

export async function signInWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const emailParsed = emailSchema.safeParse(emailRaw);
  if (!emailParsed.success) {
    return {
      error: "Adresse email invalide.",
      success: false,
      email: String(emailRaw ?? ""),
      submittedAt: null,
    };
  }

  const email = emailParsed.data;

  if (!passwordRaw || String(passwordRaw).length < 1) {
    return { error: "Mot de passe requis.", success: false, email, submittedAt: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: String(passwordRaw),
  });

  if (error) {
    console.error("[signInWithPassword]", error.message);
    const msg = error.message.toLowerCase();
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials") ||
      msg.includes("invalid email or password")
    ) {
      return {
        error: "Email ou mot de passe incorrect.",
        success: false,
        email,
        submittedAt: null,
      };
    }
    if (msg.includes("email not confirmed")) {
      return {
        error:
          "Confirme ton email avant de te connecter. Vérifie ta boîte de réception.",
        success: false,
        email,
        submittedAt: null,
      };
    }
    return {
      error: translateAuthError(error.message, error.status),
      success: false,
      email,
      submittedAt: null,
    };
  }

  redirect(destinationFrom(formData));
}

export async function signUpWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const confirmRaw = formData.get("password_confirm");

  const emailParsed = emailSchema.safeParse(emailRaw);
  if (!emailParsed.success) {
    return {
      error: "Adresse email invalide.",
      success: false,
      email: String(emailRaw ?? ""),
      submittedAt: null,
    };
  }

  const email = emailParsed.data;

  const passwordParsed = passwordSchema.safeParse(passwordRaw);
  if (!passwordParsed.success) {
    return {
      error: passwordParsed.error.issues[0].message,
      success: false,
      email,
      submittedAt: null,
    };
  }

  if (String(passwordRaw) !== String(confirmRaw)) {
    return {
      error: "Les mots de passe ne correspondent pas.",
      success: false,
      email,
      submittedAt: null,
    };
  }

  // Gate beta fondateurs (sprint 25) : si INVITE_ONLY=true, un code d'invitation
  // valide est requis. OFF par défaut → inscription ouverte, comportement inchangé.
  // Consommation atomique via RPC service_role (consume_invite_code, migration 052).
  if (process.env.INVITE_ONLY === "true") {
    const code = String(formData.get("invite_code") ?? "").trim();
    if (!code) {
      return {
        error: "Un code d'invitation est requis pour rejoindre la beta fondateurs.",
        success: false,
        email,
        submittedAt: null,
      };
    }
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { data: consumed, error: cErr } = await createAdminClient().rpc(
        "consume_invite_code",
        { p_code: code },
      );
      if (cErr || consumed !== true) {
        return {
          error: "Code d'invitation invalide, expiré ou déjà utilisé.",
          success: false,
          email,
          submittedAt: null,
        };
      }
    } catch (e) {
      console.error("[signUpWithPassword] invite gate", e);
      return {
        error: "Inscription momentanément indisponible. Réessaie.",
        success: false,
        email,
        submittedAt: null,
      };
    }
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  // L'onboarding reste obligatoire ; on reporte le contexte plan/redirect en
  // query du callback pour le réutiliser une fois l'onboarding terminé.
  const ctxParams = new URLSearchParams({ next: "/onboarding/1" });
  const plan = formData.get("plan");
  if (plan === "local" || plan === "itinerant") ctxParams.set("plan", plan);
  const interval = formData.get("interval");
  if (interval === "monthly" || interval === "annual")
    ctxParams.set("interval", interval);
  const back = formData.get("redirect");
  if (typeof back === "string") {
    const safe = safeInternalPath(back, "");
    if (safe) ctxParams.set("after", safe);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwordParsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?${ctxParams.toString()}`,
    },
  });

  if (error) {
    console.error("[signUpWithPassword]", error.message);
    const msg = error.message.toLowerCase();
    if (msg.includes("user already registered") || msg.includes("already registered")) {
      return {
        error: "Un compte existe déjà avec cet email. Connecte-toi.",
        success: false,
        email,
        submittedAt: null,
      };
    }
    return {
      error: translateAuthError(error.message, error.status),
      success: false,
      email,
      submittedAt: null,
    };
  }

  // Si la confirmation d'email est DÉSACTIVÉE côté Dashboard (ou l'adresse
  // auto-confirmée), signUp renvoie directement une SESSION → l'utilisateur est
  // déjà connecté (cookies posés par le client serveur). On l'envoie dans
  // l'onboarding sans passer par l'écran « confirme ton adresse ». Le middleware
  // route de toute façon tout nouvel inscrit non-onboardé vers /onboarding/1.
  // Si la confirmation est ACTIVE, data.session est null → on retombe sur
  // l'écran SentScreen ci-dessous. Le code marche donc dans les deux cas, sans
  // hypothèse figée sur le réglage Supabase.
  if (data.session) {
    redirect("/onboarding/1");
  }

  return { error: null, success: true, email, submittedAt: Date.now() };
}

export async function requestPasswordReset(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const parsed = emailSchema.safeParse(emailRaw);

  if (!parsed.success) {
    return {
      error: "Adresse email invalide.",
      success: false,
      email: String(emailRaw ?? ""),
      submittedAt: null,
    };
  }

  const email = parsed.data;
  const supabase = await createClient();
  const origin = await getOrigin();

  // Le lien de reset passe par /auth/confirm (token_hash + verifyOtp), câblé
  // DANS le template email (supabase/email-templates/reset-password.html) :
  // robuste cross-device, contrairement au flux PKCE de /auth/callback. Le
  // `redirectTo` ci-dessous n'alimente que {{ .RedirectTo }} (non utilisé par
  // le template token_hash) ; on le pointe sur la destination finale par
  // cohérence — il doit figurer dans l'allowlist Redirect URLs du Dashboard.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    console.error("[requestPasswordReset]", error.message);
    return {
      error: translateAuthError(error.message, error.status),
      success: false,
      email,
      submittedAt: null,
    };
  }

  return { error: null, success: true, email, submittedAt: Date.now() };
}

export async function signInWithGoogle(_formData: FormData): Promise<void> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/home`,
    },
  });

  if (error || !data.url) {
    console.error("[signInWithGoogle]", error?.message ?? "no URL returned");
    redirect("/auth/login?error=oauth");
  }

  redirect(data.url);
}
