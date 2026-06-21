import { notFound, redirect } from 'next/navigation'
import { buildLoginRedirect } from '@/lib/auth/redirect'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isCoastalDepartment, DEPARTMENT_LABELS } from '@/lib/geo/departments'
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
    title: name ? `Fil du ${name} (${department}) · Carnet de Pêche` : 'Fil · Carnet de Pêche',
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

  // Bouton « Supprimer (modération) » sur les cartes (migration 023).
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', user.id)
    .maybeSingle()
  const viewerIsModerator = viewerProfile?.is_moderator === true

  const initial = await getFeedPage({ tab, region: department })
  const posts = initial.ok ? initial.data.posts : []
  const cursor = initial.ok ? initial.data.nextCursor : null

  const deptName = DEPARTMENT_LABELS[department] ?? department

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
            Ce qui se passe sur le bord dans le {department}.
          </p>
        </header>

        <FeedTabs current={tab} />

        <FeedClient
          initialPosts={posts}
          initialCursor={cursor}
          region={department}
          tab={tab}
          currentUserId={user.id}
          viewerIsModerator={viewerIsModerator}
          emptyVariant={emptyVariant}
          recentCatches={(recent ?? []) as RecentCatch[]}
        />
      </div>
    </main>
  )
}
