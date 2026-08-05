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
    .select("onboarded, display_name, username, home_department")
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

  // Premier passage uniquement (l'étape 6 peut être re-soumise) : email de
  // bienvenue + event du funnel d'activation. Jamais bloquant.
  if (!before?.onboarded) {
    // Funnel d'activation (sprint 74, Bloc 4) : signup_completed → onboarding_finished
    // → favorite_spot_added → retour. Best-effort, ne throw jamais, zéro PII.
    const { captureServerEvent } = await import("@/lib/analytics/server");
    await captureServerEvent(user.id, "onboarding_finished");

    // Email de bienvenue (sprint 11 Bloc C, enrichi au sprint 74) — onboarding
    // terminé = inscription effective. Passe désormais par l'orchestrateur
    // lifecycle : prénom + créneau du secteur + UTM + désinscription un clic,
    // opt-out marketing respecté, et journalisation dans `lifecycle_emails`
    // (dédup durable même si l'étape 6 est rejouée). Ne throw jamais : un échec
    // d'envoi ne fait pas échouer la fin d'onboarding.
    const dept =
      ((data.home_department as string | undefined) ?? before?.home_department)?.trim() || null;
    const { sendWelcomeEmail } = await import("@/lib/lifecycle/send");
    await sendWelcomeEmail(user.id, dept);
  }

  revalidatePath("/home");
  return { error: null };
}
