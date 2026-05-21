import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/auth/tier'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FollowButton } from '@/components/feed/FollowButton'
import { PostCard } from '@/components/feed/PostCard'
import type { FeedPostEnriched } from '@/app/actions/feed'
import type { FeedPost } from '@/lib/feed/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  // Profils volontairement non indexés (pas de consentement explicite).
  return { title: `@${username} · Carnet de Pêche`, robots: { index: false, follow: false } }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, home_department, techniques, favorite_species, created_at')
    .eq('username', username)
    .maybeSingle()
  if (!profile) notFound()

  const isMe = user?.id === profile.id
  let initialFollowing = false
  if (user && !isMe) {
    const { data: f } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    initialFollowing = Boolean(f)
  }

  const { count: publicCatches } = await supabase
    .from('catches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('privacy', 'public')

  // Posts de ce pêcheur (+ photos signées).
  const { data: rawPosts } = await supabase
    .from('feed_posts_for_viewer')
    .select('*')
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const posts = (rawPosts ?? []) as FeedPost[]

  const paths = posts.map((p) => p.catch_photo_path).filter((p): p is string => Boolean(p))
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data } = await supabase.storage.from('catches').createSignedUrls(paths, 3600)
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl)
  }
  const enriched: FeedPostEnriched[] = posts.map((p) => ({
    ...p,
    catchPhotoUrl: p.catch_photo_path ? (signed.get(p.catch_photo_path) ?? null) : null,
  }))

  const tier = await getUserTier()
  const canInteract = tier === 'local' || tier === 'itinerant'

  const name = profile.display_name || `@${profile.username}`
  const dept = profile.home_department
    ? (DEPARTMENT_LABELS[profile.home_department] ?? profile.home_department)
    : null
  const since = profile.created_at
    ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })
    : null

  return (
    <main className="bg-sand-50 min-h-screen">
      <div className="mx-auto flex max-w-[680px] flex-col gap-6 px-4 py-6">
        {/* En-tête profil */}
        <header className="flex items-start gap-4">
          <Avatar className="size-20 shrink-0">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="text-xl">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl text-navy-900 leading-tight">{name}</h1>
            <p className="text-[13px] text-ink-400">
              @{profile.username}
              {dept ? ` · ${dept}` : ''}
            </p>
            {profile.bio && <p className="mt-1.5 text-[14px] text-ink-700">{profile.bio}</p>}
          </div>
          {user && !isMe && (
            <FollowButton targetUserId={profile.id} initialFollowing={initialFollowing} />
          )}
        </header>

        {/* Stats + chips */}
        <div className="flex flex-col gap-2 text-[13px] text-ink-600">
          <p>
            <strong className="text-navy-900">{publicCatches ?? 0}</strong> prise
            {(publicCatches ?? 0) > 1 ? 's' : ''} publique{(publicCatches ?? 0) > 1 ? 's' : ''}
            {since ? ` · pêcheur depuis ${since}` : ''}
          </p>
          <Chips items={profile.favorite_species} labels={SPECIES_LABELS} />
          <Chips items={profile.techniques} labels={TECHNIQUE_LABELS} />
        </div>

        {/* Posts */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">Posts</h2>
          {enriched.length === 0 ? (
            <p className="text-[14px] text-ink-400">Aucun post pour l’instant.</p>
          ) : (
            enriched.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={user?.id ?? null}
                catchPhotoUrl={p.catchPhotoUrl}
                canInteract={canInteract}
              />
            ))
          )}
        </section>
      </div>
    </main>
  )
}

function Chips({ items, labels }: { items: string[] | null; labels: Record<string, string> }) {
  if (!items || items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[12px] font-medium text-teal-700"
        >
          {labels[it] ?? it}
        </span>
      ))}
    </div>
  )
}
