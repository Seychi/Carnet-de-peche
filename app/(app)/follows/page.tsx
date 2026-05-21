import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listFollowing, listFollowers, getFollowSuggestions } from '@/app/actions/follow'
import { UserCard } from '@/components/feed/UserCard'

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
  if (!user) redirect('/auth/login?redirect=/follows')

  const [following, followers, suggestions] = await Promise.all([
    listFollowing(user.id),
    listFollowers(user.id),
    getFollowSuggestions(),
  ])
  const followingList = following.ok ? following.data : []
  const followersList = followers.ok ? followers.data : []
  const suggestionsList = suggestions.ok ? suggestions.data : []
  const followingIds = new Set(followingList.map((u) => u.id))

  return (
    <main className="bg-sand-50 min-h-screen">
      <div className="mx-auto flex max-w-[680px] flex-col gap-8 px-4 py-6">
        <h1 className="font-display text-2xl text-navy-900">Tes pêcheurs</h1>

        <Section title={`Tu suis (${followingList.length})`} empty="Tu ne suis personne pour l’instant.">
          {followingList.map((u) => (
            <UserCard key={u.id} user={u} following />
          ))}
        </Section>

        <Section title={`Te suivent (${followersList.length})`} empty="Personne ne te suit encore.">
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
    </main>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const isEmpty = items.filter(Boolean).length === 0
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">{title}</h2>
      {isEmpty && empty ? (
        <p className="text-[14px] text-ink-400">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </section>
  )
}
