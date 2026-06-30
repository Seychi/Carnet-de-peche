import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Fish, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bathy } from '@/components/ui-v2/bathy'
import { FollowButton } from '@/components/feed/FollowButton'
import { ProfileFollowStats } from '@/components/feed/ProfileFollowStats'
import { PostCard } from '@/components/feed/PostCard'
import { attachPostMedia } from '@/lib/feed/media'
import { getProfileCatches, type ProfileCatch } from '@/lib/catches/media'
import { getUserReputation } from '@/lib/cofishing/queries'
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

  // Bouton « Supprimer (modération) » sur les posts du profil (migration 023) —
  // c'est ici qu'on retrouve tous les posts d'un compte spammeur.
  // viewerProfile sert aussi à construire currentUser pour le commentaire optimiste.
  let viewerIsModerator = false
  let currentUser: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null = null
  if (user) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('is_moderator, username, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    viewerIsModerator = viewerProfile?.is_moderator === true
    currentUser = {
      id: user.id,
      username: viewerProfile?.username ?? null,
      display_name: viewerProfile?.display_name ?? null,
      avatar_url: viewerProfile?.avatar_url ?? null,
    }
  }

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

  // Compteurs sociaux (Bloc E) — comptés via follows (RLS select-all pour les
  // authentifiés) plutôt que la vue profile_stats, qui a perdu son SELECT en 031.
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  // Ids que le viewer suit → marque l'état des entrées des listes abonnés/abonnements.
  let viewerFollowingIds: string[] = []
  if (user) {
    const { data: vf } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    viewerFollowingIds = (vf ?? []).map((r) => r.following_id)
  }

  // Posts de ce pêcheur (+ photos signées).
  const { data: rawPosts } = await supabase
    .from('feed_posts_for_viewer')
    .select('*')
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const posts = (rawPosts ?? []) as FeedPost[]

  // Médias signés en batch (photos de prise + photos de post). Via service_role
  // pour qu'un visiteur voie aussi les photos d'un AUTRE pêcheur (cf lib/feed/media).
  const enriched: FeedPostEnriched[] = await attachPostMedia(posts, supabase)

  // Prises visibles du profil (catches_for_viewer — privacy + floutage GPS gérés
  // par la vue ; jamais de prise privée d'autrui, ni de geom précis pour les non-abonnés).
  const catches = await getProfileCatches(profile.id, supabase, 12)

  // Réputation co-pêchage (sprint 50) — avis nominatifs PUBLICS laissés après une
  // sortie passée. DESCRIPTIF, jamais un classement : on affiche la moyenne, le
  // nombre d'avis et les commentaires nominatifs, masqué si aucun avis. Lu via la
  // query (jamais la table outing_reviews directement).
  const reputation = await getUserReputation(profile.id)

  const name = profile.display_name || `@${profile.username}`
  // char(3) Postgres → '29 ' paddé : trim avant lookup (cf. backlog ROADMAP)
  const dept = profile.home_department
    ? (DEPARTMENT_LABELS[profile.home_department.trim()] ?? profile.home_department.trim())
    : null
  const since = profile.created_at
    ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })
    : null

  return (
    <div className="bg-sand-50 min-h-screen">
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
            <ProfileFollowStats
              profileId={profile.id}
              viewerId={user?.id ?? null}
              followersCount={followersCount ?? 0}
              followingCount={followingCount ?? 0}
              initialViewerFollowingIds={viewerFollowingIds}
            />
            {reputation.count > 0 && reputation.average != null && (
              <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] text-white/70">
                <Star size={13} className="shrink-0 text-gold-400" aria-hidden />
                <span>
                  <span className="font-semibold text-white">{reputation.average.toFixed(1)}</span>/5
                  {' · '}
                  {reputation.count} avis de co-pêchage
                </span>
              </p>
            )}
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

        {/* Avis de co-pêchage (sprint 50) — nominatifs et PUBLICS, laissés après une
            sortie passée. DESCRIPTIF, pas un classement : on liste « @pêcheur : note +
            commentaire », jamais de « meilleur pêcheur ». Masqué si aucun avis. */}
        {reputation.count > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-400">
              Avis de co-pêchage
            </h2>
            <div className="flex flex-col gap-2">
              {reputation.reviews
                .filter((r) => (r.comment ?? '').trim().length > 0)
                .map((r, i) => (
                  <article
                    key={`${r.reviewerUsername ?? 'anon'}-${i}`}
                    className="rounded-[14px] border border-sand-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-navy-900">
                        @{r.reviewerUsername ?? 'pêcheur'}
                      </span>
                      <span
                        className="flex shrink-0 items-center gap-1 font-mono text-[12px] text-gold-600"
                        aria-label={`Note ${r.rating} sur 5`}
                      >
                        <Star size={12} className="text-gold-400" aria-hidden />
                        {r.rating}/5
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{r.comment}</p>
                  </article>
                ))}
            </div>
          </section>
        )}

        {/* Prises */}
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Prises
          </h2>
          {catches.length === 0 ? (
            <p className="text-[14px] text-ink-400">
              {isMe
                ? "Aucune prise publique pour l'instant. Logue ta prochaine sortie !"
                : "Aucune prise publique pour l'instant."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {catches.map((c) => (
                <ProfileCatchTile key={c.id} catch_={c} />
              ))}
            </div>
          )}
        </section>

        {/* Posts */}
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Posts
          </h2>
          {enriched.length === 0 ? (
            <p className="text-[14px] text-ink-400">{"Aucun post pour l'instant."}</p>
          ) : (
            enriched.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={user?.id ?? null}
                currentUser={currentUser}
                viewerIsModerator={viewerIsModerator}
                catchPhotoUrl={p.catchPhotoUrl}
                photoUrls={p.photoUrls}
                showFollow={false}
              />
            ))
          )}
        </section>
      </div>
    </div>
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

// Tuile de prise pour la grille du profil public.
// Lien vers /carnet/[id] — la page fiche prise gère elle-même l'auth + privacy.
function ProfileCatchTile({ catch_: c }: { catch_: ProfileCatch }) {
  const label = c.species ? (SPECIES_LABELS[c.species] ?? c.species) : 'Prise'
  const date = c.caught_at
    ? format(new Date(c.caught_at), 'd MMM yyyy', { locale: fr })
    : null

  return (
    <Link
      href={`/carnet/${c.id}`}
      className="group relative aspect-square overflow-hidden rounded-lg bg-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
    >
      {c.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.photoUrl}
          alt={label}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Fish className="size-7 text-white/20" />
        </div>
      )}
      {/* Bandeau bas : espèce + taille */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
        <p className="truncate font-mono text-[10px] font-semibold leading-tight text-white">
          {label}
          {c.size_cm ? ` · ${c.size_cm} cm` : ''}
        </p>
        {date && (
          <p className="font-mono text-[9px] leading-tight text-white/55">{date}</p>
        )}
      </div>
    </Link>
  )
}
