'use client'

import { useState } from 'react'
import Link from 'next/link'
import Linkify from 'linkify-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Heart, MessageCircle, Flag, Share2, MoreHorizontal, Trash2, Loader2, Fish } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SPECIES_LABELS, TECHNIQUE_LABELS } from '@/lib/labels'
import { toggleLike, deletePost } from '@/app/actions/feed'
import { usePostInteractionsRealtime } from '@/lib/feed/usePostInteractionsRealtime'
import type { FeedPost } from '@/lib/feed/types'
import { CommentThread } from './CommentThread'
import { ReportDialog } from './ReportDialog'

const LINKIFY_OPTS = {
  target: '_blank',
  rel: 'noopener noreferrer',
  className: 'text-teal-600 underline break-words',
}

function initials(name: string | null, username: string | null) {
  return (name || username || '?').trim().slice(0, 2).toUpperCase()
}

export function PostCard({
  post,
  currentUserId,
  catchPhotoUrl,
}: {
  post: FeedPost
  currentUserId: string | null
  catchPhotoUrl?: string | null
}) {
  const postId = post.id
  const [liked, setLiked] = useState(Boolean(post.liked_by_me))
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0)
  const [commentCount, setCommentCount] = useState(post.comments_count ?? 0)
  const [showComments, setShowComments] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Compteurs pilotés par le Realtime (couvre aussi nos propres actions
  // rediffusées) → pas de double comptage avec l'optimistic du cœur.
  usePostInteractionsRealtime(postId ?? '', {
    onLikeDelta: (d) => setLikeCount((c) => Math.max(0, c + d)),
    onCommentDelta: (d) => setCommentCount((c) => Math.max(0, c + d)),
  })

  if (!postId) return null
  const id: string = postId

  const isMine = currentUserId != null && currentUserId === post.author_id
  const authorName = post.author_display_name || `@${post.author_username ?? 'pêcheur'}`
  const isLong = (post.text?.length ?? 0) > 300

  async function handleLike() {
    if (!currentUserId) {
      toast('Connecte-toi pour aimer et commenter.')
      return
    }
    const next = !liked
    setLiked(next) // optimistic (cœur). Le compteur suit via Realtime.
    const res = await toggleLike(id)
    if (!res.ok) {
      setLiked(!next)
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
  }

  return (
    <article className="flex flex-col gap-2.5 rounded-[14px] border border-slate-100 bg-white p-4 shadow-sm">
      {/* En-tête */}
      <header className="flex items-center gap-2.5">
        <Avatar className="size-9 shrink-0">
          {post.author_avatar_url && <AvatarImage src={post.author_avatar_url} alt="" />}
          <AvatarFallback className="text-[12px]">
            {initials(post.author_display_name, post.author_username)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14px] font-semibold text-navy-900">{authorName}</p>
          <p className="text-[11px] text-ink-400">
            {post.region ? `${post.region} · ` : ''}
            {post.created_at &&
              formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
        {isMine && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Options du post"
              className="flex size-11 items-center justify-center rounded-full text-ink-400 hover:bg-slate-100"
            >
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <MoreHorizontal size={18} />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem variant="destructive" className="gap-2 cursor-pointer" onClick={handleDelete}>
                <Trash2 size={14} />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Texte */}
      {post.text && (
        <div>
          <div className={expanded ? '' : 'line-clamp-6'}>
            <p className="whitespace-pre-wrap break-words text-[15px] text-ink-700">
              <Linkify options={LINKIFY_OPTS}>{post.text}</Linkify>
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
          onClick={() => setReportOpen(true)}
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

      <ReportDialog postId={postId} open={reportOpen} onOpenChange={setReportOpen} />
    </article>
  )
}

function CatchEmbed({ post, photoUrl }: { post: FeedPost; photoUrl?: string | null }) {
  const species = SPECIES_LABELS[post.catch_species ?? ''] ?? post.catch_species ?? 'Prise'
  const bits = [
    post.catch_size_cm ? `${post.catch_size_cm} cm` : null,
    post.catch_weight_g ? `${(post.catch_weight_g / 1000).toFixed(2)} kg` : null,
    post.catch_technique ? TECHNIQUE_LABELS[post.catch_technique] ?? post.catch_technique : null,
  ].filter(Boolean)

  const inner = (
    <div className="flex items-center gap-3 rounded-[12px] bg-teal-50 p-2.5">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-teal-100/60">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={species} className="size-full object-cover" />
        ) : (
          <Fish size={22} className="text-teal-500" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-navy-900">{species}</p>
        {bits.length > 0 && <p className="text-[12px] text-ink-500">{bits.join(' · ')}</p>}
        {post.catch_spot_name && (
          <p className="truncate text-[11px] text-ink-400">📍 {post.catch_spot_name}</p>
        )}
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
