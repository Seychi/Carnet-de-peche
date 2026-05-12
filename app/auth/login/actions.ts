"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type LoginState = {
  error: string | null;
  success: boolean;
  email: string;
  submittedAt: number | null;
};

function translateError(message: string, status?: number): string {
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

export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const parsed = z.email().safeParse(emailRaw);

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
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(".supabase.co", "");

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
      error: translateError(error.message, error.status),
      success: false,
      email,
      submittedAt: null,
    };
  }

  return { error: null, success: true, email, submittedAt: Date.now() };
}
