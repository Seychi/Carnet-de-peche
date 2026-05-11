import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingStep } from "./onboarding-step";

const TOTAL_STEPS = 6;

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step: stepParam } = await params;
  const step = parseInt(stepParam, 10);

  if (isNaN(step) || step < 1 || step > TOTAL_STEPS) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, city, home_department, techniques, favorite_species, level, fishing_frequency, years_practicing, onboarded")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded) redirect("/home");

  return (
    <OnboardingStep
      step={step}
      totalSteps={TOTAL_STEPS}
      profile={profile ?? {}}
    />
  );
}
