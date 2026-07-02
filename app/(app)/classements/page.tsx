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

  // `home_department` est un char(3) → paddé (« 29 ␠ ») ; sans trim, le <select>
  // du tableau n'a aucune option qui matche (gotcha S67, finding correctness #3).
  const homeDepartment = profile?.home_department?.trim() || null

  const initial = await getLeaderboard({
    scope: 'national',
    metric: 'xp',
    period: 'season',
    dept: homeDepartment,
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
  // Sprint 69 : ne proposer que les saisons passées AYANT des résultats archivés
  // (fini les chips « Automne 2025 » pré-lancement forcément vides). Filtre sur
  // contenu réel (season_results via RPC), la saison courante reste toujours là.
  const { data: archivedKeys } = await supabase.rpc('get_archived_season_keys')
  const archived = new Set(((archivedKeys ?? []) as string[]).map(String))
  const seasons = seasonOptions(currentSeasonKey, 3).filter(
    (s) => s.offset === 0 || archived.has(s.key)
  )

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
          initialErrored={!initial.ok}
          myUserId={user.id}
          homeDepartment={homeDepartment}
          seasons={seasons}
          optedIn={profile?.public_ranking ?? false}
        />
      </div>
    </div>
  )
}
