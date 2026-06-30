"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_REGEX } from "@/lib/labels";

// Validation serveur du step 1 — même regex canonique que profil/actions.ts
const step1ServerSchema = z.object({
  username: z
    .string()
    .min(3, "Minimum 3 caractères.")
    .max(30, "Maximum 30 caractères.")
    .regex(USERNAME_REGEX, "Lettres, chiffres, -, _ et . uniquement."),
});

export async function saveOnboardingStep(
  step: number,
  data: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié." };

  // Validation serveur pour le step 1 (username) — garde-fou contre les appels directs.
  if (step === 1) {
    const parsed = step1ServerSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Pseudo invalide." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error(`[onboarding step ${step}]`, error.message);
    return { error: error.message };
  }

  revalidatePath("/onboarding");
  return { error: null };
}

export async function checkUsernameAvailable(username: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Unicité insensible à la casse (alignée sur l'index profiles_username_lower_key,
  // migration 096). On échappe %, _ et \ pour que ilike se comporte en égalité
  // littérale : un pseudo « bob_x » ne doit pas matcher « bobax ».
  const pattern = username.replace(/[\\%_]/g, "\\$&");
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", pattern)
    .neq("id", user?.id ?? "")
    .maybeSingle();

  return { available: !data };
}

export async function completeOnboarding(data: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié." };

  // État AVANT l'update : l'email de bienvenue ne part qu'au premier passage
  // (l'étape 6 peut être re-soumise — pas de doublon).
  const { data: before } = await supabase
    .from("profiles")
    .select("onboarded, display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      onboarded: true,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[completeOnboarding]", error.message);
    return { error: error.message };
  }

  // Email de bienvenue (sprint 11 Bloc C) — onboarding terminé = inscription
  // effective. Jamais bloquant : sendEmail ne throw pas, et un échec d'envoi
  // ne doit pas faire échouer la fin d'onboarding.
  if (!before?.onboarded && user.email) {
    const { sendEmail } = await import("@/lib/email/send");
    const { default: WelcomeEmail } = await import("@/emails/welcome");
    await sendEmail({
      to: user.email,
      subject: "Bienvenue dans Carnet de Pêche 🎣",
      react: WelcomeEmail({
        firstName: before?.display_name || before?.username || undefined,
      }),
    });
  }

  revalidatePath("/home");
  return { error: null };
}
