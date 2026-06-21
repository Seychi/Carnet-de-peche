'use client'

import { memo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Heart, MessageCircle, Flag, Share2, MoreHorizontal, Trash2, Loader2, Fish, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FollowButton } from './FollowButton'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { toggleLike, deletePost, moderatorDeletePost } from '@/app/actions/feed'
import { usePostInteractionsRealtime } from '@/lib/feed/usePostInteractionsRealtime'
import { linkifyText } from '@/lib/feed/linkify'
import type { FeedPost } from '@/lib/feed/types'

// Commentaires + signalement ne s'affichent qu'au clic : lazy-load (sprint 11
// Bloc F) pour sortir leurs deps (Server Actions, Radix Dialog…) du first load
// du fil. Le fallback reprend le spinner que CommentThread affiche lui-même
// pendant le chargement des commentaires → aucune rupture visuelle.
const CommentThread = dynamic(
  () => import('./CommentThread').then((m) => m.CommentThread),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3 pt-3">
        <div className="flex justify-center py-4 text-ink-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      </div>
    ),
  },
)

const ReportDialog = dynamic(
  () => import('./ReportDialog').then((m) => m.ReportDialog),
  { ssr: false },
)

const PostDeleteDialog = dynamic(() => import('./PostDeleteDialog'), { ssr: false })

function initials(name: string | null, username: string | null) {
  return (name || username || '?').trim().slice(0, 2).toUpperCase()
}

// memo : un like sur un post ne doit pas re-rendre les autres cartes de la
// liste (perf INP, audit 2026-06-11). Les props sont stables côté PostList.
export const PostCard = memo(function PostCard({
  post,
  currentUserId,
  catchPhotoUrl,
  viewerIsModerator = false,
  showFollow = true,
  onDeleted,
}: {
  post: FeedPost
  currentUserId: string | null
  catchPhotoUrl?: string | null
  viewerIsModerator?: boolean
  // Bouton « Suivre » dans l'en-tête (Bloc C). Désactivé sur le profil public, où
  // tous les posts sont du même auteur (le bouton est déjà dans le hero).
  showFollow?: boolean
  // Appelé après une suppression réussie → le parent retire la carte (BUG-09).
  onDeleted?: (id: string) => void
}) {
  const postId = post.id
  const [liked, setLiked] = useState(Boolean(post.liked_by_me))
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0)
  const [commentCount, setCommentCount] = useState(post.comments_count ?? 0)
  const [showComments, setShowComments] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  // Le dialog (lazy) n'est monté qu'au premier clic « Signaler », puis reste
  // monté : animation de fermeture et brouillon de détails préservés.
  const [reportMounted, setReportMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Flux de confirmation (BUG-15) : modale montée à la 1re demande puis laissée
  // montée (anim de fermeture + retour focus natifs). `deleteKind` distingue la
  // suppression auteur de la suppression modérateur.
  const [deleteMounted, setDeleteMounted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteKind, setDeleteKind] = useState<'self' | 'moderation'>('self')

  // Nombre d'actions like optimistes en vol dont l'écho Realtime n'est pas
  // encore revenu : on consomme ces échos au lieu de les recompter (sinon
  // double incrément). Les actions des AUTRES (et nos autres onglets) passent.
  const pendingSelfLikes = useRef(0)

  usePostInteractionsRealtime(postId ?? '', {
    onLikeDelta: (d, userId) => {
      if (userId !== null && userId === currentUserId && pendingSelfLikes.current > 0) {
        pendingSelfLikes.current -= 1
        return
      }
      setLikeCount((c) => Math.max(0, c + d))
    },
    onCommentDelta: (d) => setCommentCount((c) => Math.max(0, c + d)),
  })

  if (!postId) return null
  const id: string = postId

  const isMine = currentUserId != null && currentUserId === post.author_id
  const authorName = post.author_display_name || `@${post.author_username ?? 'pêcheur'}`
  const isLong = (post.text?.length ?? 0) > 300
  const profileHref = post.author_username ? `/u/${post.author_username}` : null

  // Identité de l'auteur (avatar + nom + méta) factorisée : rendue dans un
  // <Link> vers le profil public quand le pseudo existe, sinon dans un <div>.
  const authorIdentity = (
    <>
      <Avatar className="size-9 shrink-0">
        {post.author_avatar_url && <AvatarImage src={post.author_avatar_url} alt="" />}
        <AvatarFallback className="bg-navy-800 font-mono text-[12px] font-semibold text-teal-300">
          {initials(post.author_display_name, post.author_username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-navy-900">
          {authorName}
          {post.catch_id && (
            <span className="rounded-full border border-sand-200 bg-sand-100 px-2 py-0.5 font-mono text-[9.5px] font-medium tracking-[0.06em] text-ink-600">
              CARNET
            </span>
          )}
        </p>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
          {post.region ? `${post.region.trim()} · ` : ''}
          {post.created_at &&
            formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </>
  )

  async function handleLike() {
    if (!currentUserId) {
      toast('Connecte-toi pour aimer et commenter.')
      return
    }
    const next = !liked
    // Optimistic complet : cœur ET compteur (l'audit voyait « 1 » n'apparaître
    // qu'à l'écho Realtime, voire jamais). L'écho de cette action sera dédupliqué.
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))
    pendingSelfLikes.current += 1
    const res = await toggleLike(id)
    if (!res.ok) {
      setLiked(!next)
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
      pendingSelfLikes.current = Math.max(0, pendingSelfLikes.current - 1)
      toast.error(res.error)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/fil/${post.region}?post=${id}`
    try {
      if (navigator.share) await navigator.share({ url, title: 'Carnet de Pêche' })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Lien copié !')
      }
    } catch {
      /* annulé */
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await deletePost(id)
    if (!res.ok) {
      setDeleting(false)
      toast.error(res.error)
      return
    }
    toast.success('Post supprimé.')
    onDeleted?.(id)
  }

  async function handleModeratorDelete() {
    setDeleting(true)
    const res = await moderatorDeletePost(id)
    if (!res.ok) {
      setDeleting(false)
      toast.error(res.error)
      return
    }
    toast.success('Post supprimé (modération).')
    onDeleted?.(id)
  }

  function openDeleteFlow(kind: 'self' | 'moderation') {
    setDeleteKind(kind)
    setDeleteMounted(true)
    setShowDelete(true)
  }

  return (
    <article className="flex flex-col gap-2.5 rounded-[14px] border border-sand-200 bg-white p-4">
      {/* En-tête */}
      <header className="flex items-center gap-2.5">
        {profileHref ? (
          <Link
            href={profileHref}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-opacity hover:opacity-90"
          >
            {authorIdentity}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">{authorIdentity}</div>
        )}
        {/* Suivre l'auteur sans quitter le fil (Bloc C) — pas sur mes posts ni en non-connecté */}
        {showFollow && currentUserId && !isMine && post.author_id && post.author_username && (
          <FollowButton
            targetUserId={post.author_id}
            initialFollowing={Boolean(post.author_is_following)}
            size="sm"
          />
        )}
        {(isMine || viewerIsModerator) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Options du post"
              className="flex size-11 items-center justify-center rounded-full text-ink-400 hover:bg-slate-100"
            >
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <MoreHorizontal size={18} />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              {isMine && (
                <DropdownMenuItem variant="destructive" className="gap-2 cursor-pointer" onClick={() => openDeleteFlow('self')}>
                  <Trash2 size={14} />
                  Supprimer
                </DropdownMenuItem>
              )}
              {viewerIsModerator && !isMine && (
                <DropdownMenuItem variant="destructive" className="gap-2 cursor-pointer" onClick={() => openDeleteFlow('moderation')}>
                  <Trash2 size={14} />
                  Supprimer (modération)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Texte */}
      {post.text && (
        <div>
          <div className={expanded ? '' : 'line-clamp-6'}>
            <p className="whitespace-pre-wrap break-words text-[15px] text-ink-700">
              {linkifyText(post.text)}
            </p>
          </div>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-0.5 text-[13px] font-semibold text-teal-600 hover:underline"
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      {/* Encart prise partagée */}
      {post.catch_id && (
        <CatchEmbed post={post} photoUrl={catchPhotoUrl} />
      )}

      {/* Actions */}
      <footer className="flex items-center gap-1 pt-1 text-ink-500">
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          aria-label="Aimer"
          className="flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[13px] hover:bg-slate-50"
        >
          <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : ''} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          aria-label="Commentaires"
          className="flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[13px] hover:bg-slate-50"
        >
          <MessageCircle size={18} />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => {
            setReportMounted(true)
            setReportOpen(true)
          }}
          aria-label="Signaler"
          className="flex size-11 items-center justify-center rounded-full hover:bg-slate-50"
        >
          <Flag size={17} />
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Partager"
          className="ml-auto flex size-11 items-center justify-center rounded-full hover:bg-slate-50"
        >
          <Share2 size={17} />
        </button>
      </footer>

      {showComments && (
        <CommentThread postId={postId} currentUserId={currentUserId} />
      )}

      {reportMounted && (
        <ReportDialog postId={postId} open={reportOpen} onOpenChange={setReportOpen} />
      )}

      {deleteMounted && (
        <PostDeleteDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          deleting={deleting}
          moderation={deleteKind === 'moderation'}
          onConfirm={deleteKind === 'moderation' ? handleModeratorDelete : handleDelete}
        />
      )}
    </article>
  )
})

function CatchEmbed({ post, photoUrl }: { post: FeedPost; photoUrl?: string | null }) {
  const species = SPECIES_LABELS[post.catch_species ?? ''] ?? post.catch_species ?? 'Prise'
  const dataLine = [
    species.toUpperCase(),
    post.catch_size_cm ? `${post.catch_size_cm} CM` : null,
    post.catch_weight_g ? `${(post.catch_weight_g / 1000).toFixed(1)} KG` : null,
    post.catch_technique
      ? (TECHNIQUE_LABELS[post.catch_technique] ?? post.catch_technique).toUpperCase()
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  // Photo en grand + bandeau données mono par-dessus (réf mobile.html 04) ;
  // sans photo : encart compact dégradé navy.
  const inner = photoUrl ? (
    <div className="relative overflow-hidden rounded-[12px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} alt={species} className="max-h-72 w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-3 pt-8 pb-2.5">
        <p className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-teal-300">
          {dataLine}
        </p>
        {post.catch_spot_name && (
          <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[9.5px] tracking-[0.06em] text-white/55 uppercase">
            <MapPin size={10} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{post.catch_spot_name}</span>
          </p>
        )}
      </div>
    </div>
  ) : (
    <div className="relative overflow-hidden rounded-[12px] bg-gradient-to-br from-navy-800 to-navy-950 p-3">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(94,234,212,.2),transparent_60%)]" />
      <div className="relative flex items-center gap-2.5">
        <Fish size={20} className="shrink-0 text-teal-300" strokeWidth={1.7} />
        <div className="min-w-0">
          <p className="truncate font-mono text-[10.5px] font-medium tracking-[0.08em] text-teal-300">
            {dataLine}
          </p>
          {post.catch_spot_name && (
            <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[9.5px] tracking-[0.06em] text-white/55 uppercase">
              <MapPin size={10} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{post.catch_spot_name}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return post.catch_spot_slug ? (
    <Link href={`/spots/${post.catch_spot_slug}`} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  ) : (
    inner
  )
}
