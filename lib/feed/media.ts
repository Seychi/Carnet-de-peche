import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeedPost } from './types'

// Signe les médias d'une page de posts (photos de prise + photos de post), en
// UN batch par bucket. Les buckets `catches` et `feed-photos` sont privés →
// URLs signées. On signe avec le client service_role : l'autorisation est déjà
// garantie en amont (la vue feed_posts_for_viewer / la requête profil ne
// renvoient que des posts visibles par le viewer, et photo_paths est filtré par
// la RLS de feed_post_photos). En dev sans SUPABASE_SERVICE_ROLE_KEY, on
// retombe sur le client viewer (ne signera que SES propres fichiers via la RLS
// storage) — pas de crash.
export type PostWithMedia<T> = T & {
  catchPhotoUrl: string | null
  photoUrls: string[]
}

export async function attachPostMedia<T extends FeedPost>(
  posts: T[],
  fallback: SupabaseClient,
): Promise<PostWithMedia<T>[]> {
  let signer: SupabaseClient = fallback
  try {
    // Import dynamique : admin.ts charge 'server-only' (qui throw hors runtime
    // serveur, ex. vitest) → on l'isole dans le try pour retomber sur le client
    // viewer sans casser. En prod (server action / RSC), l'import résout normalement.
    const { createAdminClient } = await import('@/lib/supabase/admin')
    signer = createAdminClient()
  } catch {
    // Pas de clé service_role (dev) ou hors runtime serveur (test) → client viewer.
  }

  // Photos de prise (bucket catches)
  const catchPaths = [
    ...new Set(posts.map((p) => p.catch_photo_path).filter((x): x is string => Boolean(x))),
  ]
  const catchSigned = new Map<string, string>()
  if (catchPaths.length > 0) {
    const { data } = await signer.storage.from('catches').createSignedUrls(catchPaths, 3600)
    for (const s of data ?? []) if (s.path && s.signedUrl) catchSigned.set(s.path, s.signedUrl)
  }

  // Photos de post (bucket feed-photos) — toute la page en un seul appel.
  const photoPaths = [...new Set(posts.flatMap((p) => p.photo_paths ?? []))]
  const photoSigned = new Map<string, string>()
  if (photoPaths.length > 0) {
    const { data } = await signer.storage.from('feed-photos').createSignedUrls(photoPaths, 3600)
    for (const s of data ?? []) if (s.path && s.signedUrl) photoSigned.set(s.path, s.signedUrl)
  }

  return posts.map((p) => ({
    ...p,
    catchPhotoUrl: p.catch_photo_path ? (catchSigned.get(p.catch_photo_path) ?? null) : null,
    photoUrls: (p.photo_paths ?? [])
      .map((path) => photoSigned.get(path))
      .filter((u): u is string => Boolean(u)),
  }))
}
