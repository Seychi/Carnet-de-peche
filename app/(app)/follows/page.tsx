import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { buildLoginRedirect } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'
import { listFollowing, listFollowers, getFollowSuggestions } from '@/app/actions/follow'
import { UserCard } from '@/components/feed/UserCard'
import { FollowingList } from '@/components/feed/FollowingList'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Tes pêcheurs · Carnet de Pêche',
  robots: { index: false, follow: false },
}

export default async function FollowsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(buildLoginRedirect('/follows'))

  const [following, followers, suggestions] = await Promise.all([
    listFollowing(user.id),
    listFollowers(user.id),
    getFollowSuggestions(),
  ])
  // BUG-04 : ne plus retomber silencieusement sur [] en cas d'échec (« Tu suis (0) »
  // trompeur). On distingue erreur (message rouge) de vide réel.
  const followingList = following.ok ? following.data : []
  const followersList = followers.ok ? followers.data : []
  const suggestionsList = suggestions.ok ? suggestions.data : []
  const followingError = following.ok ? null : following.error
  const followersError = followers.ok ? null : followers.error
  const followingIds = new Set(followingList.map((u) => u.id))

  return (
    <div className="bg-sand-50 min-h-screen">
      <div className="mx-auto flex max-w-[680px] flex-col gap-8 px-4 py-6">
        <h1 className="font-display text-2xl text-navy-900">Tes pêcheurs</h1>

        <Section
          title={followingError ? 'Tu suis' : `Tu suis (${followingList.length})`}
          empty="Tu ne suis personne pour l’instant."
          error={followingError}
        >
          <FollowingList initialUsers={followingList} />
        </Section>

        <Section
          title={followersError ? 'Te suivent' : `Te suivent (${followersList.length})`}
          empty="Personne ne te suit encore."
          error={followersError}
        >
          {followersList.map((u) => (
            <UserCard key={u.id} user={u} following={followingIds.has(u.id)} />
          ))}
        </Section>

        {suggestionsList.length > 0 && (
          <Section title="Suggestions pour toi" empty="">
            {suggestionsList.map((u) => (
              <UserCard key={u.id} user={u} following={false} />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  empty,
  error,
  children,
}: {
  title: string
  empty: string
  error?: string | null
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const isEmpty = items.filter(Boolean).length === 0
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">{title}</h2>
      {error ? (
        <p className="text-[14px] text-red-600" role="alert">{error}</p>
      ) : isEmpty && empty ? (
        <p className="text-[14px] text-ink-400">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </section>
  )
}
