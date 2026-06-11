import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bathy } from '@/components/ui-v2/bathy'
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

  const name = profile.display_name || `@${profile.username}`
  // char(3) Postgres → '29 ' paddé : trim avant lookup (cf. backlog ROADMAP)
  const dept = profile.home_department
    ? (DEPARTMENT_LABELS[profile.home_department.trim()] ?? profile.home_department.trim())
    : null
  const since = profile.created_at
    ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })
    : null

  return (
    <main className="bg-sand-50 min-h-screen">
      {/* Hero navy (réf profil.html) */}
      <header className="relative overflow-hidden bg-navy-950 text-white">
        <Bathy opacity={0.3} />
        <div className="relative mx-auto flex max-w-[680px] flex-wrap items-start gap-4 px-4 py-7">
          <Avatar className="size-20 shrink-0">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="bg-navy-800 font-mono text-xl font-semibold text-teal-300">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight text-white">{name}</h1>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
              @{profile.username}
              {since ? ` · DEPUIS ${since.toUpperCase()}` : ''}
            </p>
            {profile.bio && <p className="mt-1.5 text-[14px] text-white/75">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dept && <HeroChip>{`${dept.toUpperCase()}`}</HeroChip>}
              {(profile.techniques ?? []).length > 0 && (
                <HeroChip>
                  {(profile.techniques ?? [])
                    .map((t: string) => (TECHNIQUE_LABELS[t] ?? t).toUpperCase())
                    .join(' · ')}
                </HeroChip>
              )}
              {(profile.favorite_species ?? []).length > 0 && (
                <HeroChip>
                  {(profile.favorite_species ?? [])
                    .map((s: string) => (SPECIES_LABELS[s] ?? s).toUpperCase())
                    .join(' · ')}
                </HeroChip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="font-mono text-[24px] font-semibold leading-none text-teal-300">
                {publicCatches ?? 0}
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                prise{(publicCatches ?? 0) > 1 ? 's' : ''}
              </p>
            </div>
            {user && !isMe && (
              <FollowButton targetUserId={profile.id} initialFollowing={initialFollowing} />
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[680px] flex-col gap-6 px-4 py-6">

        {/* Posts */}
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Posts
          </h2>
          {enriched.length === 0 ? (
            <p className="text-[14px] text-ink-400">Aucun post pour l’instant.</p>
          ) : (
            enriched.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={user?.id ?? null}
                catchPhotoUrl={p.catchPhotoUrl}
              />
            ))
          )}
        </section>
      </div>
    </main>
  )
}

// Chip mono sur fond sombre (hero profil, réf profil.html)
function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.06em] text-white">
      {children}
    </span>
  )
}
