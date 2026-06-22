import type { SupabaseClient } from '@supabase/supabase-js'

// Prise visible affichée sur un profil public : sous-ensemble de catches_for_viewer
// + l'URL de photo signée. La VUE applique déjà la confidentialité (publique pour
// tous, « amis » si le viewer suit l'auteur, tout si c'est le sien) et le floutage.
export type ProfileCatch = {
  id: string
  species: string | null
  size_cm: number | null
  caught_at: string | null
  technique: string | null
  photoUrl: string | null
}

/**
 * Prises d'un pêcheur **visibles par le viewer courant**, pour la grille du profil.
 * On lit `catches_for_viewer` filtré sur l'auteur — la RLS de la vue fait le tri
 * (aucune prise privée d'autrui ne ressort). Les photos (bucket privé `catches`)
 * sont signées via service_role pour qu'un visiteur voie aussi les photos d'un
 * AUTRE pêcheur (même logique que `lib/feed/media.ts`), avec repli viewer en dev.
 */
export async function getProfileCatches(
  userId: string,
  viewer: SupabaseClient,
  limit = 12,
): Promise<ProfileCatch[]> {
  const { data } = await viewer
    .from('catches_for_viewer')
    .select('id, species, size_cm, caught_at, technique, photo_path')
    .eq('user_id', userId)
    // Sur un profil public, ne jamais montrer les prises PRIVÉES — même au
    // propriétaire qui regarde son propre profil. (Pour autrui, la RLS de la vue
    // les exclut déjà ; ce filtre couvre le cas « c'est moi ».)
    .neq('privacy', 'private')
    .order('caught_at', { ascending: false })
    .limit(limit)

  const rows = (data ?? []) as Array<ProfileCatch & { photo_path: string | null }>

  let signer: SupabaseClient = viewer
  try {
    // Import dynamique : admin.ts charge 'server-only' (qui throw hors runtime
    // serveur, ex. vitest) → on l'isole dans le try pour retomber sur le client
    // viewer sans casser. En prod (RSC), l'import résout normalement.
    const { createAdminClient } = await import('@/lib/supabase/admin')
    signer = createAdminClient()
  } catch {
    // Pas de clé service_role (dev) ou hors runtime serveur (test) → client viewer.
  }

  const paths = [
    ...new Set(rows.map((r) => r.photo_path).filter((x): x is string => Boolean(x))),
  ]
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: urls } = await signer.storage.from('catches').createSignedUrls(paths, 3600)
    for (const s of urls ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl)
  }

  return rows.map((r) => ({
    id: r.id,
    species: r.species,
    size_cm: r.size_cm,
    caught_at: r.caught_at,
    technique: r.technique,
    photoUrl: r.photo_path ? (signed.get(r.photo_path) ?? null) : null,
  }))
}
