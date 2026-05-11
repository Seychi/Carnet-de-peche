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

  revalidatePath("/home");
  return { error: null };
}
