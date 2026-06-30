'use client'

import { useEffect, useRef } from 'react'

export type PostInteractionHandlers = {
  /**
   * delta = +1 (like ajouté) / -1 (like retiré).
   * userId = auteur de l'action (null si absent du payload) — permet d'ignorer
   * l'écho Realtime de sa propre action déjà appliquée en optimiste (10.6 WS F).
   */
  onLikeDelta?: (delta: number, userId: string | null) => void
  /** delta = +1 (commentaire ajouté) / -1 (commentaire supprimé) */
  onCommentDelta?: (delta: number, userId: string | null) => void
}

// user_id (likes) / author_id (commentaires) du payload postgres_changes.
// INSERT → record dans `new` ; DELETE → PK dans `old` (REPLICA IDENTITY, migration 020).
function actorFromPayload(payload: unknown, key: 'user_id' | 'author_id'): string | null {
  const p = payload as { new?: Record<string, unknown>; old?: Record<string, unknown> }
  const v = p.new?.[key] ?? p.old?.[key]
  return typeof v === 'string' ? v : null
}

/**
 * S'abonne aux likes et commentaires d'un post pour mettre à jour les compteurs
 * en live dans <PostCard>. INSERT → +1, DELETE → -1.
 *
 * Les events DELETE sont filtrables sur `post_id` grâce à REPLICA IDENTITY FULL
 * posée en migration 020 (feed_comments) — feed_likes l'a déjà via sa PK.
 *
 * supabase-js (~62 kB gz) est importé dynamiquement DANS l'effet (sprint 11
 * Bloc F) : il sort du first load du fil — Realtime ne sert qu'après hydratation.
 */
export function usePostInteractionsRealtime(postId: string, handlers: PostInteractionHandlers) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!postId) return
    // L'import peut résoudre APRÈS le démontage : flag `cancelled` pour ne pas
    // souscrire dans le vide, et `cleanup` posé seulement une fois souscrit.
    let cancelled = false
    let cleanup: (() => void) | undefined

    void Promise.all([
      import('@/lib/supabase/client'),
      import('@/lib/supabase/resilient-channel'),
    ]).then(([{ createClient }, { subscribeResilient }]) => {
      if (cancelled) return
      const supabase = createClient()
      // Reconnexion sur coupure durable (compteurs likes/commentaires figés sinon).
      cleanup = subscribeResilient(supabase, (c) =>
        c
          .channel(`post:${postId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'feed_likes', filter: `post_id=eq.${postId}` },
            (payload) => handlersRef.current.onLikeDelta?.(1, actorFromPayload(payload, 'user_id')),
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'feed_likes', filter: `post_id=eq.${postId}` },
            (payload) => handlersRef.current.onLikeDelta?.(-1, actorFromPayload(payload, 'user_id')),
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` },
            (payload) => handlersRef.current.onCommentDelta?.(1, actorFromPayload(payload, 'author_id')),
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` },
            (payload) => handlersRef.current.onCommentDelta?.(-1, actorFromPayload(payload, 'author_id')),
          ),
      )
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [postId])
}
