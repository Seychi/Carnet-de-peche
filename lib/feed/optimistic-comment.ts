import type { FeedComment } from '@/app/actions/feed'
import type { ComposerUser } from '@/components/feed/PostComposer'

/** Construit le commentaire affiché immédiatement (optimiste) avec l'identité
 *  réelle du viewer. Repli « Toi » si le profil n'a ni nom ni pseudo. */
export function buildOptimisticComment(
  currentUser: ComposerUser,
  text: string,
  tempId: string,
): FeedComment {
  return {
    id: tempId,
    text,
    created_at: new Date().toISOString(),
    author_id: currentUser.id,
    author_username: currentUser.username,
    author_display_name: currentUser.display_name || currentUser.username || 'Toi',
    author_avatar_url: currentUser.avatar_url,
  }
}
