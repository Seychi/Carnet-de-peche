import { notFound, redirect } from 'next/navigation'
import { buildLoginRedirect } from '@/lib/auth/redirect'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Ruler } from 'lucide-react'
import { isCoastalDepartment, DEPARTMENT_LABELS, departmentArticle } from '@/lib/geo/departments'
import { SPECIES_LABELS } from '@/lib/labels'
import { getFeedPage } from '@/app/actions/feed'
import { FeedTabs } from '@/components/feed/FeedTabs'
import { type RecentCatch } from '@/components/feed/PostComposer'
import { FeedClient } from '@/components/feed/FeedClient'
import type { FeedTab } from '@/lib/feed/types'

export const dynamic = 'force-dynamic'

function resolveTab(raw: string | string[] | undefined): FeedTab {
  const t = Array.isArray(raw) ? raw[0] : raw
  if (t === 'follows') return 'follows'
  if (t === 'all') return 'all'
  return 'dept'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ department: string }>
}): Promise<Metadata> {
  const { department } = await params
  const name = DEPARTMENT_LABELS[department]
  // Le fil est réservé aux connectés → noindex.
  return {
    title: name
      ? `Fil ${departmentArticle(department, 'de')} (${department}) · Carnet de Pêche`
      : 'Fil · Carnet de Pêche',
    robots: { index: false, follow: false },
  }
}

export default async function DepartmentFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ department: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { department } = await params
  if (!isCoastalDepartment(department)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(buildLoginRedirect(`/fil/${department}`))

  const { tab: rawTab } = await searchParams
  const tab = resolveTab(rawTab)

  const { data: recent } = await supabase
    .from('catches')
    .select('id, species, size_cm, caught_at')
    .eq('user_id', user.id)
    .order('caught_at', { ascending: false })
    .limit(20)

  // Bouton « Supprimer (modération) » sur les cartes (migration 023) + identité
  // de l'auteur pour le rendu optimiste du composer (Bloc E).
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('is_moderator, username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  const viewerIsModerator = viewerProfile?.is_moderator === true
  const currentUser = {
    id: user.id,
    username: viewerProfile?.username ?? null,
    display_name: viewerProfile?.display_name ?? null,
    avatar_url: viewerProfile?.avatar_url ?? null,
  }

  const initial = await getFeedPage({ tab, region: department })
  const posts = initial.ok ? initial.data.posts : []
  const cursor = initial.ok ? initial.data.nextCursor : null

  const deptName = DEPARTMENT_LABELS[department] ?? department

  // Les plus belles prises MESURÉES du département (sprint 50). DESCRIPTIF, jamais un
  // classement compétitif : on met en avant de belles prises, pas un « meilleur pêcheur ».
  // On lit catches_for_viewer (la vue gère privacy + floutage) et on ne sélectionne
  // QUE des champs non géo : surtout PAS geom_visible / lat / lng. Filtres : prise
  // publique, mesurée (measured_length_cm non nul), du département courant.
  const { data: rawMeasured } = await supabase
    .from('catches_for_viewer')
    .select('id, species, measured_length_cm, username, spot_name, department')
    .eq('department', department)
    .eq('privacy', 'public')
    .not('measured_length_cm', 'is', null)
    .order('measured_length_cm', { ascending: false })
    .limit(10)
  const measuredCatches = (rawMeasured ?? []) as Array<{
    id: string
    species: string | null
    measured_length_cm: number | null
    username: string | null
    spot_name: string | null
    department: string | null
  }>

  // Onglet « Tes follows » : distinguer « tu ne suis personne » (CTA découverte)
  // de « tes follows n'ont rien posté » (calme plat). getFeedPage renvoie [] dans
  // les deux cas → on tranche ici via le nombre d'abonnements (Bloc F).
  let emptyVariant: 'dept' | 'follows-none' | 'follows-empty' = 'dept'
  if (tab === 'follows') {
    const { count: followCount } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('follower_id', user.id)
    emptyVariant = (followCount ?? 0) === 0 ? 'follows-none' : 'follows-empty'
  }

  return (
    <main className="bg-sand-50 min-h-screen">
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 px-4 py-6">
        <header>
          <p className="mb-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            LE FIL · {department}
          </p>
          <h1 className="font-display text-2xl text-navy-900">Fil {deptName}</h1>
          <p className="text-[13px] text-ink-600">
            Ce qui se passe sur le bord {departmentArticle(department, 'dans')}.
          </p>
        </header>

        <FeedTabs current={tab} />

        {/* Les plus belles prises mesurées du coin (sprint 50). DESCRIPTIF, jamais un
            classement : pas de rang affiché, pas de « meilleur pêcheur ». On célèbre de
            belles prises auto-déclarées « mesurées ». Aucune coordonnée n'est exposée. */}
        {measuredCatches.length > 0 && (
          <section className="rounded-[14px] border border-sand-200 bg-white px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <Ruler size={15} className="shrink-0 text-teal-600" aria-hidden />
              <h2 className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
                Les plus belles prises mesurées du coin
              </h2>
            </div>
            <ul className="flex flex-col divide-y divide-sand-200">
              {measuredCatches.map((c) => {
                const speciesLabel = c.species ? (SPECIES_LABELS[c.species] ?? c.species) : 'Prise'
                return (
                  <li key={c.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link
                        href={`/carnet/${c.id}`}
                        className="text-[14px] font-semibold text-navy-900 hover:text-teal-700"
                      >
                        {speciesLabel}{' '}
                        <span className="font-mono text-teal-700">{c.measured_length_cm} cm</span>
                      </Link>
                      <p className="mt-0.5 truncate text-[12px] text-ink-500">
                        {c.username ? (
                          <Link href={`/u/${c.username}`} className="hover:text-teal-700">
                            @{c.username}
                          </Link>
                        ) : (
                          'Un pêcheur'
                        )}
                        {c.spot_name ? ` · ${c.spot_name}` : ''}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-snug text-ink-400">
              Tailles auto-déclarées « mesurées » par leurs auteurs, sans coordonnée de spot.
            </p>
          </section>
        )}

        <FeedClient
          initialPosts={posts}
          initialCursor={cursor}
          region={department}
          tab={tab}
          currentUser={currentUser}
          viewerIsModerator={viewerIsModerator}
          emptyVariant={emptyVariant}
          recentCatches={(recent ?? []) as RecentCatch[]}
        />
      </div>
    </main>
  )
}
