'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PostInteractionHandlers = {
  /** delta = +1 (like ajouté) / -1 (like retiré) */
  onLikeDelta?: (delta: number) => void
  /** delta = +1 (commentaire ajouté) / -1 (commentaire supprimé) */
  onCommentDelta?: (delta: number) => void
}

/**
 * S'abonne aux likes et commentaires d'un post pour mettre à jour les compteurs
 * en live dans <PostCard>. INSERT → +1, DELETE → -1.
 *
 * Les events DELETE sont filtrables sur `post_id` grâce à REPLICA IDENTITY FULL
 * posée en migration 020 (feed_comments) — feed_likes l'a déjà via sa PK.
 */
export function usePostInteractionsRealtime(postId: string, handlers: PostInteractionHandlers) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!postId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`post:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_likes', filter: `post_id=eq.${postId}` },
        () => handlersRef.current.onLikeDelta?.(1),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'feed_likes', filter: `post_id=eq.${postId}` },
        () => handlersRef.current.onLikeDelta?.(-1),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` },
        () => handlersRef.current.onCommentDelta?.(1),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` },
        () => handlersRef.current.onCommentDelta?.(-1),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])
}
