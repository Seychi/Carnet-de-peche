"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveOnboardingStep(
  step: number,
  data: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié." };

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

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
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
