import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/auth/tier'
import { isCoastalDepartment, DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { getFeedPage } from '@/app/actions/feed'
import { FeedTabs } from '@/components/feed/FeedTabs'
import { PostComposer, type RecentCatch } from '@/components/feed/PostComposer'
import { PostList } from '@/components/feed/PostList'
import type { FeedTab } from '@/lib/feed/types'

export const dynamic = 'force-dynamic'

function resolveTab(raw: string | string[] | undefined, canSeeAll: boolean): FeedTab {
  const t = Array.isArray(raw) ? raw[0] : raw
  if (t === 'follows') return 'follows'
  if (t === 'all') return canSeeAll ? 'all' : 'dept'
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
  if (!user) redirect(`/auth/login?redirect=/fil/${department}`)

  const tier = await getUserTier()
  const canSeeAll = tier === 'itinerant'
  const { tab: rawTab } = await searchParams
  const tab = resolveTab(rawTab, canSeeAll)

  // Droit d'écriture/interaction sur CE département (ceinture+bretelles avec le RLS).
  const { data: canPostRaw } = await supabase.rpc('can_post_in_department', { dept: department })
  const canInteract = Boolean(canPostRaw)

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()

  const blockedReason: 'discovery' | 'cross-dept' | undefined = canInteract
    ? undefined
    : tier === 'local' && profile?.home_department !== department
      ? 'cross-dept'
      : 'discovery'

  const { data: recent } = await supabase
    .from('catches')
    .select('id, species, size_cm, caught_at')
    .eq('user_id', user.id)
    .order('caught_at', { ascending: false })
    .limit(20)

  const initial = await getFeedPage({ tab, region: department })
  const posts = initial.ok ? initial.data.posts : []
  const cursor = initial.ok ? initial.data.nextCursor : null

  const deptName = DEPARTMENT_LABELS[department] ?? department
  const emptyVariant = tab === 'follows' ? 'follows-empty' : 'dept'

  return (
    <main className="bg-sand-50 min-h-screen">
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 px-4 py-6">
        <header>
          <h1 className="font-display text-2xl text-navy-900">Fil du {deptName}</h1>
          <p className="text-[13px] text-ink-400">
            Ce qui se passe sur le bord dans le {department}.
          </p>
        </header>

        <FeedTabs current={tab} canSeeAll={canSeeAll} />

        <PostComposer
          region={department}
          canPost={canInteract}
          blockedReason={blockedReason}
          recentCatches={(recent ?? []) as RecentCatch[]}
        />

        <PostList
          initialPosts={posts}
          initialCursor={cursor}
          region={department}
          tab={tab}
          currentUserId={user.id}
          canInteract={canInteract}
          emptyVariant={emptyVariant}
        />
      </div>
    </main>
  )
}
