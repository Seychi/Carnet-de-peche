'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const { error } = await supabase
    .from('profiles')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[updateProfile]', error.message)
    return { error: 'Erreur lors de la mise à jour. Réessaie.' }
  }

  revalidatePath('/profil')
  return { error: null }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    console.error('[deleteAccount]', error.message)
    return { error: 'Erreur lors de la suppression. Contacte le support.' }
  }

  redirect('/')
}
