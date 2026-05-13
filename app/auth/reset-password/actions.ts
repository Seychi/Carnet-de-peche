"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PasswordUpdateState = {
  error: string | null;
  success: boolean;
};

const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères.")
  .regex(/\d/, "Doit contenir au moins 1 chiffre.");

export async function updatePassword(
  _prevState: PasswordUpdateState,
  formData: FormData
): Promise<PasswordUpdateState> {
  const passwordRaw = formData.get("password");
  const confirmRaw = formData.get("password_confirm");

  const parsed = passwordSchema.safeParse(passwordRaw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  if (String(passwordRaw) !== String(confirmRaw)) {
    return { error: "Les mots de passe ne correspondent pas.", success: false };
  }

  const supabase = await createClient();

  // Vérifie qu'on a bien une session de récupération active
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Lien expiré ou invalide. Recommence depuis « Mot de passe oublié ».",
      success: false,
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    console.error("[updatePassword]", error.message);
    const msg = error.message.toLowerCase();
    if (msg.includes("same password") || msg.includes("different from the old password")) {
      return {
        error: "Ce mot de passe est identique à l'ancien. Choisis-en un nouveau.",
        success: false,
      };
    }
    return {
      error: "Une erreur est survenue. Réessaie depuis le lien reçu par email.",
      success: false,
    };
  }

  redirect("/home");
}
