'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createOutingSchema, type CreateOutingInput } from './schema'

// Action de création d'une sortie (y compris bredouille). RLS owner-only : on insère
// avec user_id = l'utilisateur courant ; une sortie n'apparaît jamais dans catches,
// la heatmap ou le fil (table séparée). Aucun geom précis.

export async function createOuting(
  input: CreateOutingInput,
): Promise<{ id: string } | { error: string }> {
  const parsed = createOutingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }
  const d = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('outings')
    .insert({
      user_id: user.id,
      started_at: d.started_at,
      ended_at: d.ended_at ?? null,
      department: d.department,
      spot_id: d.spot_id ?? null,
      technique: d.technique ?? null,
      species_targeted: d.species_targeted ?? null,
      notes: d.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[outings/actions] createOuting error :', error)
    return { error: 'Impossible d’enregistrer la sortie. Réessaie.' }
  }

  revalidatePath('/carnet')
  return { id: data.id }
}
