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
  techniques: z.array(z.string()).optional(),
  favorite_species: z.array(z.string()).optional(),
  fishing_frequency: z.enum(['rare', 'weekly', 'daily', 'seasonal']).optional().nullable(),
})

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const raw = {
    username: formData.get('username') as string,
    bio: (formData.get('bio') as string) || null,
    city: (formData.get('city') as string) || null,
    home_department: (formData.get('home_department') as string) || null,
    level: (formData.get('level') as string) || null,
    techniques: formData.getAll('techniques') as string[],
    favorite_species: formData.getAll('favorite_species') as string[],
    fishing_frequency: (formData.get('fishing_frequency') as string) || null,
  }

  const parsed = profileSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides.'
    return { error: firstError }
  }

  // Vérifier que le pseudo n'est pas déjà pris par quelqu'un d'autre
  if (parsed.data.username) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', parsed.data.username)
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
        "La suppression n'a pas pu aboutir. On a été prévenus et on règle ça — réessaie dans quelques minutes ou écris à support@carnet-de-peche.com.",
    }
  }

  // Compte supprimé : nettoyage best-effort des photos (bucket privé catches/<uid>/).
  // Non bloquant — un échec laisse des orphelins, remontés à Sentry. Le client
  // service-role est indépendant de la session (désormais invalide).
  try {
    const admin = createServiceRoleClient()
    const { data: files } = await admin.storage.from('catches').list(uid, { limit: 1000 })
    if (files && files.length > 0) {
      await admin.storage.from('catches').remove(files.map((f) => `${uid}/${f.name}`))
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
