"use server";

import "@/lib/zod-config";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

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
          "Confirme ton email avant de te connecter — vérifie ta boîte de réception.",
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

  redirect("/home");
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

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password: passwordParsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding/1`,
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
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
