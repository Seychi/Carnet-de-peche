import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingStep } from "./onboarding-step";

const TOTAL_STEPS = 6;

export default async function OnboardingStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ comp?: string; tier?: string }>;
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

  // Retour du code fondateur saisi à l'inscription (sprint 68) : message doux,
  // jamais bloquant (l'inscription a réussi dans les deux cas). Le tier vient
  // de l'URL (posé par la server action depuis la réponse RPC), validé ici.
  const { comp, tier } = await searchParams;
  const grantedTier = tier === "itinerant" ? "Itinérant" : "Local";

  return (
    <>
      {comp === "granted" && (
        <div className="mx-auto max-w-[560px] px-4 pt-4">
          <p
            role="status"
            className="rounded-[12px] border border-teal-200 bg-teal-50 px-4 py-3 text-[14px] text-navy-900"
          >
            🎉 <span className="font-semibold">Abonnement {grantedTier} offert, activé !</span>{" "}
            Ton code fondateur a bien été échangé.
          </p>
        </div>
      )}
      {comp === "invalid" && (
        <div className="mx-auto max-w-[560px] px-4 pt-4">
          <p
            role="status"
            className="rounded-[12px] border border-sand-200 bg-sand-50 px-4 py-3 text-[14px] text-ink-700"
          >
            Ton compte est créé, mais le code fondateur n&rsquo;a pas été reconnu.
            Tu pourras réessayer plus tard depuis{" "}
            <span className="font-semibold">Mon abonnement</span>.
          </p>
        </div>
      )}
      <OnboardingStep
        step={step}
        totalSteps={TOTAL_STEPS}
        profile={profile ?? {}}
      />
    </>
  );
}
