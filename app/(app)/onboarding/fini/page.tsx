import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchSpotConditions } from '@/lib/conditions/spot-forecast'
import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { TideSparkline } from '@/components/ui-v2/tide-sparkline'
import { AvatarUploader } from '@/components/profile/AvatarUploader'

export const dynamic = 'force-dynamic'

const FREQUENCY_LABELS: Record<string, string> = {
  rare: 'RARE',
  hebdomadaire: 'HEBDO',
  quotidienne: 'QUOTIDIEN',
  saisonniere: 'SAISONNIER',
}

function parisHour(): number {
  return (
    parseInt(
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Europe/Paris',
      }).format(new Date()),
      10,
    ) % 24
  )
}

function ChipDark({ accent = false, children }: { accent?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        accent
          ? 'rounded-full border border-teal-300/30 bg-teal-300/10 px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.06em] text-teal-300'
          : 'rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.06em] text-white/75'
      }
    >
      {children}
    </span>
  )
}

/**
 * Écran final d'onboarding « Ton carnet est prêt » (DA v2, frame 07) —
 * la seule addition de flow du sprint 10.5. Réutilise completeOnboarding
 * (déjà exécutée) + le profil + les marées du dépt : aucune nouvelle action.
 */
export default async function OnboardingFiniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'username, display_name, city, home_department, techniques, favorite_species, fishing_frequency, years_practicing, onboarded, avatar_url',
    )
    .eq('id', user.id)
    .maybeSingle()

  // Pas encore onboardé → retour au flow (le middleware couvre déjà ce cas).
  if (!profile?.onboarded) redirect('/onboarding/1')

  const dept = profile.home_department?.trim() ?? null
  const deptLabel = dept ? (DEPARTMENT_LABELS[dept] ?? dept) : null
  const coords = dept ? DEPARTMENT_SEA_COORDS[dept] : null
  const conditions = coords
    ? await fetchSpotConditions(coords.lat, coords.lng).catch(() => null)
    : null

  const name = profile.display_name || profile.username || 'pêcheur'
  const initials = (profile.username ?? name).slice(0, 2).toUpperCase()

  const freqBits = [
    profile.fishing_frequency ? FREQUENCY_LABELS[profile.fishing_frequency] : null,
    profile.years_practicing ? `${profile.years_practicing} ANS` : null,
  ].filter(Boolean)

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-navy-950 text-white">
      <Bathy opacity={0.35} />

      <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 pt-12 pb-8">
        <TagData variant="on-dark">CALIBRAGE TERMINÉ</TagData>
        <h1 className="mt-2 mb-2 font-display text-[28px] leading-tight text-white sm:text-[32px]">
          Ton carnet est prêt.
        </h1>
        <p className="text-[14px] leading-relaxed text-white/60">
          Chaque prise que tu logueras affinera tes patterns. Plus tu logues, plus il devient le
          tien.
        </p>

        {/* Récap profil */}
        <div className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.05] p-4">
          <div className="mb-3 flex items-center gap-2.5">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar utilisateur (Storage public), <img> volontaire
              <img
                src={profile.avatar_url}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-800 font-mono text-[12px] font-semibold text-teal-300">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{name}</p>
              <TagData className="block text-white/45">
                {[profile.city?.toUpperCase(), deptLabel?.toUpperCase()].filter(Boolean).join(' · ') ||
                  'PÊCHEUR DU BORD'}
              </TagData>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dept && <ChipDark accent>DÉPT {dept}</ChipDark>}
            {(profile.techniques ?? []).map((t: string) => (
              <ChipDark key={t}>{(TECHNIQUE_LABELS[t] ?? t).toUpperCase()}</ChipDark>
            ))}
            {(profile.favorite_species ?? []).length > 0 && (
              <ChipDark>
                {(profile.favorite_species ?? [])
                  .map((s: string) => (SPECIES_LABELS[s] ?? s).toUpperCase())
                  .join(' · ')}
              </ChipDark>
            )}
            {freqBits.length > 0 && <ChipDark>{freqBits.join(' · ')}</ChipDark>}
          </div>
        </div>

        {/* Marée du département */}
        {conditions && conditions.tide.points.length > 1 && (
          <div className="mt-3 rounded-[14px] border border-white/10 bg-white/[0.05] px-4 pt-3 pb-2">
            <div className="mb-1 flex items-baseline justify-between">
              <TagData className="text-white/50">PROCHAINE MARÉE · {dept}</TagData>
            </div>
            <TideSparkline
              points={conditions.tide.points}
              extrema={conditions.tide.extrema}
              nowHour={parisHour()}
              onDark
              className="h-14"
            />
          </div>
        )}

        {/* Photo de profil (optionnel) — l'onboarding est déjà terminé ici, donc
            cet encart ne bloque jamais : « Ouvrir mon carnet » fait office de Passer. */}
        <div className="mt-3 rounded-[14px] border border-white/10 bg-white/[0.05] p-4">
          <TagData className="mb-2.5 block text-white/50">TA PHOTO · OPTIONNEL</TagData>
          <AvatarUploader
            userId={user.id}
            username={profile.username}
            initialUrl={profile.avatar_url ?? null}
            variant="dark"
          />
          <p className="mt-2.5 text-[12px] text-white/40">
            Tu peux aussi l’ajouter plus tard depuis ton profil.
          </p>
        </div>

        {/* Payoff time-to-value (sprint 25 WS-A/C) : l'import débloque les tendances
            dès 3 prises — le chemin le plus court vers la valeur pour un compte neuf. */}
        <div className="mt-6 rounded-[14px] border border-teal-300/30 bg-teal-300/[0.07] p-4">
          <TagData variant="on-dark" className="mb-1.5 block text-teal-300/80">
            DÉBLOQUE TES TENDANCES EN 2 MIN
          </TagData>
          <p className="text-[13.5px] leading-relaxed text-white/70">
            Tu as déjà des sorties en tête ? Importe tes dernières prises d&rsquo;un coup : dès
            <span className="font-semibold text-white"> 3 prises</span>, ton carnet commence à te
            dire où et quand tu prends.
          </p>
          <Link
            href="/carnet/import"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-300 hover:text-teal-200"
          >
            Importer mes prises passées
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {/* CTAs */}
        <div className="mt-auto pt-8">
          <Link
            href="/home"
            className="flex min-h-[52px] w-full items-center justify-center rounded-lg bg-teal-500 text-[15.5px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 gap-2"
          >
            Ouvrir mon carnet
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/carnet/nouvelle"
            className="mt-4 block text-center font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-white/40 transition-colors hover:text-teal-300"
          >
            LOGUER MA PREMIÈRE PRISE
          </Link>
        </div>
      </div>
    </main>
  )
}
