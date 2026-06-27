import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_SEA_COORDS } from "@/lib/geo/department-coords";
import { GamificationHub } from "@/components/gamification/GamificationHub";
import { TodayForecast } from "@/components/home/TodayForecast";
import { NearYou } from "@/components/home/NearYou";
import {
  TodayHeader,
  ActionOfTheDay,
  OnboardingBanner,
  DeptChoosePrompt,
  SectionSkeleton,
} from "@/components/home/home-ui";
import { TagData } from "@/components/ui-v2/tag-data";
import { ShareButton } from "@/components/share/ShareButton";

export const dynamic = "force-dynamic";

// Loguée aujourd'hui ? (comparaison de jour local Europe/Paris).
function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
  return fmt.format(new Date(iso)) === fmt.format(new Date());
}

/**
 * Cockpit « Aujourd'hui » (sprint 30) : présent + futur + progression. Ce n'est plus
 * un sous-ensemble du carnet — le passé (journal, stats, tendances) vit sur /carnet,
 * les réglages sur /profil. Les sections lourdes (conditions/solunar, communauté,
 * gamification) sont streamées en Suspense pour un premier paint immédiat.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, home_department")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username ?? "pêcheur";
  const dept = profile?.home_department?.trim() || null;
  const coords = dept ? DEPARTMENT_SEA_COORDS[dept] ?? null : null;

  // Léger (critical path) : total des prises (cold start) + dernière prise (loguée
  // aujourd'hui ?). Le lourd est streamé plus bas.
  const [{ count }, { data: lastCatch }] = await Promise.all([
    supabase
      .from("catches_for_viewer")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("catches_for_viewer")
      .select("caught_at")
      .eq("user_id", user.id)
      .order("caught_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const total = count ?? 0;
  const loggedToday = isToday(lastCatch?.caught_at ?? null);

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto flex max-w-[820px] flex-col gap-5 px-4 py-6 sm:py-8">
        <TodayHeader username={username} dept={dept} />

        {/* Cold start (0 prise, dépt défini) : amorçage du carnet. La valeur du jour
            (conditions + créneau générique) reste affichée juste en dessous. */}
        {total === 0 && dept ? <OnboardingBanner /> : null}

        {/* Sans département : choisir sa côte plutôt qu'un cockpit vide. */}
        {!dept ? <DeptChoosePrompt /> : null}

        {/* Action du jour (avec un historique seulement). */}
        {total > 0 ? <ActionOfTheDay loggedToday={loggedToday} /> : null}

        {/* Maintenant + Cette semaine — streamés (conditions/solunar). */}
        {dept && coords ? (
          <Suspense fallback={<SectionSkeleton lines={4} label="Conditions du jour" />}>
            <TodayForecast dept={dept} lat={coords.lat} lng={coords.lng} />
          </Suspense>
        ) : null}

        {/* Près de toi — streamé (signal communautaire k-anon + fil). */}
        {dept ? (
          <Suspense fallback={<SectionSkeleton lines={2} label="Activité près de toi" />}>
            <NearYou dept={dept} />
          </Suspense>
        ) : null}

        {/* Ta progression — gamification (déplacée du carnet, sprint 30). Aucun dépt requis. */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <TagData variant="teal" className="inline-flex items-center gap-1.5">
              <TrendingUp size={13} aria-hidden="true" /> TA PROGRESSION
            </TagData>
            {/* Partager ses conditions gagnantes (sprint 38) — gardé sur le seuil de
                tendances (3 prises) ; l'action revalide et refuse une carte vide. */}
            {total >= 3 ? (
              <ShareButton
                input={{ kind: "conditions" }}
                title="Mes conditions gagnantes — Carnet de Pêche"
                text="Voici quand et dans quelles conditions je sors le plus."
                label="Partager mes conditions"
                variant="ghost"
                className="shrink-0"
              />
            ) : null}
          </div>
          <Suspense fallback={<SectionSkeleton lines={3} label="Ta progression" />}>
            <GamificationHub />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
