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

  // Suppression effective via le client service-role (bypass RLS). On ne dépend
  // PLUS de la RPC delete_my_account (absente en prod). auth.admin.deleteUser
  // efface auth.users → cascade SQL (profiles, catches, feed_posts, feed_comments,
  // feed_likes, follows, subscriptions). Les FK moderated_by/resolved_by passent
  // à NULL grâce à la migration 030 (ON DELETE SET NULL).
  try {
    const admin = createServiceRoleClient()

    // 1) Nettoyage Storage : photos de prises sous catches/<uid>/ (bucket privé).
    //    Fait AVANT la suppression du compte car ensuite le dossier n'est plus listable.
    //    Non bloquant : un échec Storage ne doit pas empêcher l'effacement du compte,
    //    mais on le remonte à Sentry pour traiter les orphelins.
    const { data: files, error: listError } = await admin.storage
      .from('catches')
      .list(uid, { limit: 1000 })
    if (listError) {
      Sentry.captureException(listError, {
        tags: { action: 'deleteAccount', step: 'storage_list' },
        extra: { uid },
      })
    } else if (files && files.length > 0) {
      const paths = files.map((f) => `${uid}/${f.name}`)
      const { error: removeError } = await admin.storage.from('catches').remove(paths)
      if (removeError) {
        Sentry.captureException(removeError, {
          tags: { action: 'deleteAccount', step: 'storage_remove' },
          extra: { uid, count: paths.length },
        })
      }
    }

    // 2) Suppression du compte auth (cascade SQL sur toutes les tables liées).
    const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
    if (deleteError) {
      Sentry.captureException(deleteError, {
        tags: { action: 'deleteAccount', step: 'auth_delete' },
        extra: { uid },
      })
      console.error('[deleteAccount] auth.admin.deleteUser :', deleteError.message)
      return {
        error:
          "La suppression n'a pas pu aboutir. On a été prévenus et on règle ça — réessaie dans quelques minutes ou écris à support@carnet-de-peche.com.",
      }
    }
  } catch (err) {
    // Ex. SUPABASE_SERVICE_ROLE_KEY absente → createServiceRoleClient throw.
    Sentry.captureException(err, {
      tags: { action: 'deleteAccount', step: 'unexpected' },
      extra: { uid },
    })
    console.error('[deleteAccount] erreur inattendue :', err)
    return {
      error:
        "La suppression n'a pas pu aboutir (erreur serveur). On a été prévenus — réessaie plus tard ou écris à support@carnet-de-peche.com.",
    }
  }

  // redirect() throw NEXT_REDIRECT : OBLIGATOIREMENT hors du try/catch ci-dessus,
  // sinon il serait capturé comme une 'erreur' par Sentry / le catch.
  redirect('/')
}
