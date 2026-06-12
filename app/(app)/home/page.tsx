import Link from "next/link";
import { redirect } from "next/navigation";
import { Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyCatchStats } from "@/lib/catches/queries";
import { SPECIES_LABELS } from "@/lib/labels";
import { SignOutButton } from "./sign-out-button";

function speciesLabel(species: string | null): string {
  if (!species) return "—";
  return (SPECIES_LABELS as Record<string, string>)[species] ?? species;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const [stats, { data: recent }] = await Promise.all([
    getMyCatchStats().catch(() => null),
    supabase
      .from("catches_for_viewer")
      .select("id, species, size_cm, caught_at, location_label")
      .eq("user_id", user.id)
      .order("caught_at", { ascending: false })
      .limit(3),
  ]);

  const username = profile?.username ?? "pêcheur";
  const total = stats?.totalCount ?? 0;

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-[760px] mx-auto px-5 py-10 sm:py-14 flex flex-col gap-8">

        {/* En-tête */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-navy-900 text-[26px] sm:text-[32px]">
              Salut {username} 👋
            </h1>
            <p className="text-ink-500 text-[15px] mt-1">
              {total > 0
                ? "Voici ton tableau de bord."
                : "Bienvenue à bord — il est temps de loguer ta première prise."}
            </p>
          </div>
          <SignOutButton />
        </header>

        {total === 0 ? (
          /* ── Empty state ── */
          <div className="bg-white rounded-[22px] border border-ink-100 p-8 text-center flex flex-col items-center gap-4">
            <Fish size={44} className="text-teal-500" strokeWidth={1.7} aria-hidden="true" />
            <p className="text-ink-700 max-w-sm">
              Pour démarrer, logue ta première prise ou explore la carte des spots
              près de chez toi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/carnet/nouvelle"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm min-h-[48px]"
              >
                Loguer une prise →
              </Link>
              <Link
                href="/carte"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-[1.5px] border-navy-900 text-navy-900 font-semibold text-sm min-h-[48px]"
              >
                Voir la carte
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats clés ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Prises loguées" value={String(total)} hint={`dont ${stats?.thisMonthCount ?? 0} ce mois-ci`} />
              <StatCard
                label="Plus belle prise"
                value={stats?.biggestCatch ? `${stats.biggestCatch.size_cm} cm` : "—"}
                hint={stats?.biggestCatch ? speciesLabel(stats.biggestCatch.species) : "Pas encore de taille"}
              />
              <StatCard
                label="Espèce favorite"
                value={speciesLabel(stats?.favoriteSpecies ?? null)}
                hint={`${Math.round(stats?.releasedRate ?? 0)}% relâchées`}
              />
            </div>

            {/* ── CTA principaux ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/carnet/nouvelle"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm min-h-[52px]"
              >
                Loguer une prise →
              </Link>
              <Link
                href="/carte"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-[1.5px] border-navy-900 text-navy-900 font-semibold text-sm min-h-[52px] hover:bg-navy-900 hover:text-white transition-colors"
              >
                Voir la carte
              </Link>
            </div>

            {/* ── Dernières prises ── */}
            <section className="bg-white rounded-[22px] border border-ink-100 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-navy-900 text-lg">Tes dernières prises</h2>
                <Link href="/carnet" className="text-sm text-teal-600 hover:underline">
                  Voir tout le carnet →
                </Link>
              </div>
              <ul className="flex flex-col divide-y divide-ink-100">
                {(recent ?? []).map((c) => (
                  <li key={c.id as string} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-navy-900">
                        {speciesLabel(c.species as string)}
                        {c.size_cm ? <span className="text-ink-500 font-normal"> · {c.size_cm as number} cm</span> : null}
                      </p>
                      {c.location_label ? (
                        <p className="text-[12px] text-ink-400 truncate">{c.location_label as string}</p>
                      ) : null}
                    </div>
                    <span className="text-[12px] text-ink-400 shrink-0 ml-3">
                      {formatDate(c.caught_at as string)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-[18px] border border-ink-100 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="font-display text-navy-900 text-2xl mt-1 truncate">{value}</p>
      <p className="text-[12px] text-ink-400 mt-0.5 truncate">{hint}</p>
    </div>
  );
}
