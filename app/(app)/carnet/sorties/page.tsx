import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus, Wind } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listMyOutings } from '@/lib/outings/list'
import { getOutingPostState } from '@/app/actions/feed'
import { TagData } from '@/components/ui-v2/tag-data'
import { OutingListRow } from '@/components/outings/OutingListRow'
import {
  RegroupCatchesCard,
  type RegroupDay,
} from '@/components/outings/RegroupCatchesCard'
import type { ComposerUser } from '@/components/feed/PostComposer'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mes sorties · Carnet de Pêche',
}

// Jour civil (Europe/Paris) d'un timestamp ISO → 'YYYY-MM-DD' (cohérent avec la clé
// de regroupement serveur dans lib/outings/regroup).
const parisDayKeyFmt = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const fmtDayLabel = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})
const fmtTime = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

// Jours candidats au regroupement : prises d'une même journée SANS sortie (≥2). On
// lit via catches_for_viewer (geom-free, owner-scopé) et on n'expose que species /
// size_cm / heure — jamais une coordonnée ni un spot.
async function getRegroupDays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<RegroupDay[]> {
  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('id, species, size_cm, caught_at')
    .eq('user_id', userId)
    .is('outing_id', null)
    .not('caught_at', 'is', null)
    .order('caught_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('[carnet/sorties] regroup candidates', error.message)
    return []
  }

  type Row = { id: string; species: string | null; size_cm: number | null; caught_at: string | null }
  const byDay = new Map<string, { label: string; catches: RegroupDay['catches'] }>()
  for (const c of (data ?? []) as Row[]) {
    if (!c.caught_at) continue
    const d = new Date(c.caught_at)
    const key = parisDayKeyFmt.format(d)
    let day = byDay.get(key)
    if (!day) {
      day = { label: fmtDayLabel.format(d), catches: [] }
      byDay.set(key, day)
    }
    day.catches.push({
      id: c.id,
      species: c.species,
      size_cm: c.size_cm,
      time: fmtTime.format(d),
    })
  }

  // On ne propose que les journées à ≥2 prises (le sens de « regrouper »), triées
  // par heure croissante à l'intérieur du jour, et on plafonne à 8 journées récentes.
  return [...byDay.entries()]
    .filter(([, day]) => day.catches.length >= 2)
    .slice(0, 8)
    .map(([key, day]) => ({
      key,
      label: day.label,
      catches: [...day.catches].reverse(),
    }))
}

export default async function MesSortiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/carnet/sorties')

  const outings = await listMyOutings()
  const total = outings.length

  // Identité auteur (pour le composer de récit) + jours candidats au regroupement +
  // état « récit déjà publié ? » par sortie (owner-scopé, une requête).
  const [{ data: profile }, regroupDays, postStateRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
    getRegroupDays(supabase, user.id),
    getOutingPostState(outings.map((o) => o.id)),
  ])

  const composerUser: ComposerUser = {
    id: user.id,
    username: profile?.username ?? null,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  }
  const postState = postStateRes.ok ? postStateRes.data : {}

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">

        {/* Retour au carnet */}
        <Link
          href="/carnet"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Retour au carnet
        </Link>

        {/* En-tête */}
        <header className="mb-5">
          <TagData>MES SORTIES</TagData>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
            {total > 0
              ? `${total} sortie${total > 1 ? 's' : ''} loguée${total > 1 ? 's' : ''}`
              : 'Mes sorties'}
          </h1>
          <p className="mt-1 text-[14px] text-ink-600">
            Tes sorties de pêche, prises comme bredouilles. Partage celle dont tu es fier,
            sans jamais montrer tes spots.
          </p>
        </header>

        {/* Loguer une nouvelle sortie */}
        <Link
          href="/carnet/sortie"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          <Plus size={16} aria-hidden="true" /> Loguer une sortie
        </Link>

        {/* Regrouper des prises éparses en une sortie (rétroactif, sans XP) */}
        <RegroupCatchesCard days={regroupDays} currentUser={composerUser} />

        {/* Liste ou état vide */}
        {total === 0 ? (
          <div className="rounded-[16px] border border-dashed border-sand-300 bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <Wind size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-[16px] font-semibold text-navy-900">
              Aucune sortie loguée pour l&rsquo;instant
            </p>
            <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-600">
              Une sortie, c&rsquo;est ton dénominateur honnête. Même une bredouille compte, et
              rend tes statistiques plus justes.
            </p>
            <Link
              href="/carnet/sortie"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-500 px-5 text-[15px] font-bold text-navy-950 transition-colors hover:bg-teal-300"
            >
              <Plus size={17} aria-hidden="true" /> Logue ta première sortie
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {outings.map((o) => (
              <OutingListRow
                key={o.id}
                outing={o}
                composerUser={composerUser}
                postId={postState[o.id] ?? null}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
