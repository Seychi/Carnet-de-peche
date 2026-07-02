import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboard } from '@/app/actions/leaderboard'
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable'
import { seasonOptions } from '@/lib/gamification/season'

// Classements (Sprint 66) — réservés aux connectés (décision John). La RPC get_leaderboard
// est spot-safe (aucune coordonnée) et opt-in (public_ranking). Cette page rend le premier
// classement côté serveur (national / XP / saison) puis laisse le tableau client changer de
// portée/métrique via la Server Action.
export const metadata: Metadata = {
  title: 'Classements — Carnet de Pêche',
  robots: { index: false, follow: false }, // connectés uniquement, pas de SEO
}

export default async function ClassementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/classements')

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department, public_ranking')
    .eq('id', user.id)
    .maybeSingle()

  const initial = await getLeaderboard({
    scope: 'national',
    metric: 'xp',
    period: 'season',
    dept: profile?.home_department ?? null,
    species: null,
    seasonOffset: 0,
  })
  const initialRows = initial.ok ? initial.rows : []

  // Saison courante (clé + frontières calculées côté SQL, Europe/Paris). On dérive le
  // libellé + les saisons passées en TS (arithmétique de trimestres). Repli honnête si la
  // RPC échoue : trimestre déduit de la date (ne bloque jamais l'affichage).
  const { data: seasonRows } = await supabase.rpc('season_window', { p_offset: 0 })
  const currentSeasonKey =
    (Array.isArray(seasonRows) ? seasonRows[0]?.season_key : null) ??
    `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`
  const seasons = seasonOptions(currentSeasonKey, 3)

  return (
    <div className="min-h-screen bg-sand-50 py-10">
      <div className="mx-auto max-w-[760px] px-5">
        <header className="mb-6">
          <p className="mb-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            COMPÉTITION
          </p>
          <h1 className="font-display text-3xl text-navy-900">Classements</h1>
          <p className="mt-2 text-sm text-ink-600">
            Mesure-toi aux autres pêcheurs, sans jamais dévoiler un spot. Ta participation est
            optionnelle et réversible à tout moment.
          </p>
        </header>

        <LeaderboardTable
          initialRows={initialRows}
          myUserId={user.id}
          homeDepartment={profile?.home_department ?? null}
          seasons={seasons}
          optedIn={profile?.public_ranking ?? false}
        />
      </div>
    </div>
  )
}
