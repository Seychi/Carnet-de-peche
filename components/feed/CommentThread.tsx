'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Loader2, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { addComment, deleteComment, getComments, type FeedComment } from '@/app/actions/feed'

const PAGE = 10

function initials(name: string | null, username: string | null) {
  const base = (name || username || '?').trim()
  return base.slice(0, 2).toUpperCase()
}

export function CommentThread({
  postId,
  currentUserId,
  canInteract,
}: {
  postId: string
  currentUserId: string | null
  canInteract: boolean
}) {
  const [comments, setComments] = useState<FeedComment[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(
    async (limit: number) => {
      const res = await getComments(postId, 0, limit)
      setLoading(false)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setComments(res.data)
      setHasMore(res.data.length >= limit)
    },
    [postId],
  )

  // Chargement initial : setState dans le callback .then (pattern autorisé pour
  // se synchroniser avec une source externe), avec annulation au démontage.
  useEffect(() => {
    let active = true
    getComments(postId, 0, PAGE).then((res) => {
      if (!active) return
      setLoading(false)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setComments(res.data)
      setHasMore(res.data.length >= PAGE)
    })
    return () => {
      active = false
    }
  }, [postId])

  async function handleAdd() {
    const value = text.trim()
    if (!value) return
    setSubmitting(true)
    const res = await addComment(postId, value)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setText('')
    await load(Math.max(PAGE, comments.length + 1))
  }

  async function handleDelete(id: string) {
    const res = await deleteComment(id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      {loading ? (
        <div className="flex justify-center py-4 text-ink-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar className="size-7 shrink-0">
                {c.author_avatar_url && <AvatarImage src={c.author_avatar_url} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {initials(c.author_display_name, c.author_username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug">
                  <span className="font-semibold text-navy-900">
                    {c.author_display_name || `@${c.author_username ?? 'pêcheur'}`}
                  </span>{' '}
                  <span className="text-ink-400 text-[11px]">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </p>
                <p className="text-[14px] text-ink-700 whitespace-pre-wrap break-words">{c.text}</p>
              </div>
              {currentUserId === c.author_id && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  aria-label="Supprimer mon commentaire"
                  className="shrink-0 text-ink-300 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => load(comments.length + PAGE)}
              className="self-start text-[13px] font-semibold text-teal-600 hover:underline"
            >
              Voir plus de commentaires
            </button>
          )}
        </>
      )}

      {canInteract ? (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleAdd()
              }
            }}
            maxLength={1000}
            placeholder="Ton commentaire…"
            className="flex-1 min-h-11 rounded-full border border-slate-200 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting || !text.trim()}
            aria-label="Envoyer"
            className="flex items-center justify-center size-11 rounded-full bg-teal-500 text-white disabled:opacity-40 hover:bg-teal-600 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-ink-400 pt-1">
          Passe en Local sur ton département pour commenter.
        </p>
      )}
    </div>
  )
}
