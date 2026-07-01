'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import '@/lib/zod-config'
import { z } from 'zod'

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Le pseudo doit faire au moins 3 caractères.')
    .max(30, 'Le pseudo ne peut pas dépasser 30 caractères.')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Le pseudo ne peut contenir que des lettres, chiffres, _, . et -.'),
  bio: z.string().max(200, 'La bio ne peut pas dépasser 200 caractères.').optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  home_department: z.string().max(3).optional().nullable(),
  level: z.enum(['debutant', 'intermediaire', 'expert']).optional().nullable(),
  techniques: z.array(z.string()).min(1, 'Choisis au moins une technique.'),
  favorite_species: z.array(z.string()).optional(),
  fishing_frequency: z.enum(['rare', 'weekly', 'daily', 'seasonal']).optional().nullable(),
  years_practicing: z.number().int().min(0, '0 minimum.').max(70, '70 maximum.').optional().nullable(),
})

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const yearsPracticingRaw = formData.get('years_practicing')
  const raw = {
    username: formData.get('username') as string,
    bio: (formData.get('bio') as string) || null,
    city: (formData.get('city') as string) || null,
    home_department: (formData.get('home_department') as string) || null,
    level: (formData.get('level') as string) || null,
    techniques: formData.getAll('techniques') as string[],
    favorite_species: formData.getAll('favorite_species') as string[],
    fishing_frequency: (formData.get('fishing_frequency') as string) || null,
    years_practicing: yearsPracticingRaw !== null && yearsPracticingRaw !== ''
      ? parseInt(yearsPracticingRaw as string, 10)
      : null,
  }

  const parsed = profileSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides.'
    return { error: firstError }
  }

  // Vérifier que le pseudo n'est pas déjà pris par quelqu'un d'autre
  if (parsed.data.username) {
    // Unicité insensible à la casse (index profiles_username_lower_key, migration 096).
    // Échappe %, _ et \ pour que ilike reste une égalité littérale.
    const pattern = parsed.data.username.replace(/[\\%_]/g, '\\$&')
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', pattern)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      return { error: 'Ce pseudo est déjà utilisé.' }
    }
  }

  // BUG-05 : un department vide ne doit jamais écraser la valeur existante.
  // (le <select> est désormais pré-rempli, mais on garde ce garde-fou serveur)
  const { home_department, ...rest } = parsed.data
  const updatePayload: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  }
  if (home_department) {
    updatePayload.home_department = home_department
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (error) {
    console.error('[updateProfile]', error.message)
    return { error: 'Erreur lors de la mise à jour. Réessaie.' }
  }

  revalidatePath('/profil')
  return { error: null }
}

// Opt-in RGPD aux classements (Sprint 66). Action DÉDIÉE (découplée du gros formulaire, qui
// exige ≥ 1 technique) → retour arrière IMMÉDIAT : repasser en privé te retire de TOUS les
// classements sans autre condition. Ne touche QUE la colonne public_ranking.
export async function updateRankingVisibility(enabled: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('profiles')
    .update({ public_ranking: enabled, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('[updateRankingVisibility]', error.message)
    return { error: 'Erreur lors de la mise à jour. Réessaie.' }
  }

  revalidatePath('/profil')
  revalidatePath('/classements')
  return { error: null }
}

const AVATAR_BUCKET = 'avatars'

// Extrait le chemin Storage (<uid>/fichier.webp) d'une URL publique avatars,
// uniquement si elle pointe bien vers le dossier de l'utilisateur.
function avatarPathFromUrl(url: string, uid: string): string | null {
  const marker = `/object/public/${AVATAR_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  const path = url.slice(i + marker.length).split('?')[0]
  return path.startsWith(`${uid}/`) ? path : null
}

// Enregistre l'avatar (fichier déjà uploadé côté client dans avatars/<uid>/…).
export async function updateAvatar(path: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  // Anti-claim + validation stricte du chemin : <uid>/<nom>.webp, sans '/'
  // intermédiaire ni '..' (défense en profondeur ; le composant génère un UUID).
  if (!new RegExp(`^${user.id}/[A-Za-z0-9-]+\\.webp$`).test(path)) {
    return { error: 'Chemin invalide.' }
  }

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  const publicUrl = pub.publicUrl
  if (!publicUrl) return { error: 'URL de la photo introuvable.' }

  const { data: prof } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  const oldUrl = prof?.avatar_url ?? null

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) {
    console.error('[updateAvatar]', error.message)
    return { error: 'Erreur lors de la mise à jour de la photo. Réessaie.' }
  }

  // Supprime l'ancien fichier (best-effort) pour éviter les orphelins.
  if (oldUrl) {
    const oldPath = avatarPathFromUrl(oldUrl, user.id)
    if (oldPath && oldPath !== path) {
      const { error: rmErr } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      if (rmErr) console.error('[updateAvatar:storage]', rmErr.message)
    }
  }

  revalidatePath('/profil')
  return { error: null, url: publicUrl }
}

export async function removeAvatar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: prof } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  const oldUrl = prof?.avatar_url ?? null

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) {
    console.error('[removeAvatar]', error.message)
    return { error: 'Erreur lors du retrait de la photo. Réessaie.' }
  }

  if (oldUrl) {
    const oldPath = avatarPathFromUrl(oldUrl, user.id)
    if (oldPath) {
      const { error: rmErr } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      if (rmErr) console.error('[removeAvatar:storage]', rmErr.message)
    }
  }

  revalidatePath('/profil')
  return { error: null }
}

export async function deleteAccount() {
  // Auth via le client SSR (cookie de session de l'utilisateur courant).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }
  const uid = user.id

  // Suppression du compte via le RPC SECURITY DEFINER delete_my_account (owner
  // postgres) : il fait `delete from auth.users where id = auth.uid()`, et la
  // cascade ON DELETE s'exécute alors avec les droits de postgres.
  // ⚠️ NE PAS revenir à auth.admin.deleteUser : ce chemin tourne sous le rôle
  // supabase_auth_admin (GoTrue), qui n'a PAS les droits DELETE sur les tables
  // public → échec « permission denied for table feed_posts » (SQLSTATE 42501).
  const { error: deleteError } = await supabase.rpc('delete_my_account')
  if (deleteError) {
    Sentry.captureException(deleteError, {
      tags: { action: 'deleteAccount', step: 'rpc_delete' },
      extra: { uid },
    })
    console.error('[deleteAccount] delete_my_account :', deleteError.message)
    return {
      error:
        "La suppression n'a pas pu aboutir. On a été prévenus et on règle ça. Réessaie dans quelques minutes ou écris à support@carnet-de-peche.com.",
    }
  }

  // Compte supprimé : nettoyage best-effort des photos (bucket privé catches/<uid>/).
  // Non bloquant — un échec laisse des orphelins, remontés à Sentry. Le client
  // service-role est indépendant de la session (désormais invalide).
  try {
    const admin = createServiceRoleClient()
    // Photos de prises (bucket privé catches/<uid>/).
    const { data: catchFiles } = await admin.storage.from('catches').list(uid, { limit: 1000 })
    if (catchFiles && catchFiles.length > 0) {
      await admin.storage.from('catches').remove(catchFiles.map((f) => `${uid}/${f.name}`))
    }
    // Avatars (bucket public avatars/<uid>/) — sprint 12.5.
    const { data: avatarFiles } = await admin.storage.from('avatars').list(uid, { limit: 1000 })
    if (avatarFiles && avatarFiles.length > 0) {
      await admin.storage.from('avatars').remove(avatarFiles.map((f) => `${uid}/${f.name}`))
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { action: 'deleteAccount', step: 'storage_cleanup' },
      extra: { uid },
    })
    console.error('[deleteAccount] nettoyage Storage :', err)
  }

  // redirect() throw NEXT_REDIRECT : OBLIGATOIREMENT hors de tout try/catch.
  redirect('/')
}
