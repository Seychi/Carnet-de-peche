'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/create'
import { proposeOutingSchema, type ProposeOutingInput } from './schema'

// Co-pêchage. AUCUNE coordonnée précise n'est jamais lue/écrite (D-D3).

type Result<T> = T | { error: string }

async function getUserId(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  return { id: user.id }
}

/** Proposer une sortie (hôte). Rate-limit DB (max 5/24h) → message propre. */
export async function proposeOuting(input: ProposeOutingInput): Promise<Result<{ id: string }>> {
  const parsed = proposeOutingSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  const d = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('outing_proposals')
    .insert({
      host_id: user.id,
      department: d.department,
      area_label: d.area_label ?? null,
      planned_at: d.planned_at,
      capacity: d.capacity ?? null,
      notes: d.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    if (String(error?.message ?? '').includes('rate_limit_outings')) {
      return { error: 'Tu as déjà proposé 5 sorties ces dernières 24 h. Réessaie demain.' }
    }
    console.error('[cofishing] proposeOuting error :', error)
    return { error: 'Impossible de proposer la sortie. Réessaie.' }
  }

  revalidatePath('/sorties')
  return { id: data.id as string }
}

/** Demander à rejoindre une sortie. Notifie l'hôte. */
export async function requestJoin(proposalId: string): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u

  const supabase = await createClient()
  const db = supabase

  // Hôte de la sortie (pour la notif) — la RLS SELECT autorise la lecture authentifiée.
  const { data: prop } = await db
    .from('outing_proposals')
    .select('host_id, status')
    .eq('id', proposalId)
    .maybeSingle()
  if (!prop) return { error: 'Sortie introuvable.' }
  if (prop.status !== 'open') return { error: 'Cette sortie n’accepte plus de participants.' }

  const { error } = await db
    .from('outing_participants')
    .insert({ proposal_id: proposalId, user_id: u.id, status: 'requested' })
  if (error) {
    if (String(error.message).includes('duplicate')) return { error: 'Tu as déjà demandé à rejoindre.' }
    console.error('[cofishing] requestJoin error :', error)
    return { error: 'Impossible d’envoyer la demande. Réessaie.' }
  }

  await createNotification({
    userId: prop.host_id as string,
    type: 'outing_join',
    actorId: u.id,
    targetType: 'outing',
    targetId: proposalId,
    previewText: 'a demandé à rejoindre ta sortie',
  })

  revalidatePath('/sorties')
  return { ok: true }
}

/** L'hôte accepte ou refuse un participant. Notifie le participant si accepté. */
export async function respondToParticipant(
  proposalId: string,
  participantUserId: string,
  accept: boolean,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u

  const supabase = await createClient()
  const db = supabase

  // La RLS UPDATE n'autorise que l'hôte → un non-hôte ne modifie rien (0 ligne).
  const { error, count } = await db
    .from('outing_participants')
    .update({ status: accept ? 'accepted' : 'declined' }, { count: 'exact' })
    .eq('proposal_id', proposalId)
    .eq('user_id', participantUserId)
  if (error) {
    console.error('[cofishing] respondToParticipant error :', error)
    return { error: 'Impossible de mettre à jour la participation.' }
  }
  if (!count) return { error: 'Action non autorisée.' }

  if (accept) {
    await createNotification({
      userId: participantUserId,
      type: 'outing_accepted',
      actorId: u.id,
      targetType: 'outing',
      targetId: proposalId,
      previewText: 'a accepté ta participation à la sortie',
    })
  }

  revalidatePath('/sorties')
  return { ok: true }
}

/** L'hôte annule sa sortie. */
export async function cancelOuting(proposalId: string): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u

  const supabase = await createClient()
  // RLS UPDATE = hôte uniquement.
  const { error } = await supabase
    .from('outing_proposals')
    .update({ status: 'cancelled' })
    .eq('id', proposalId)
    .eq('host_id', u.id)
  if (error) {
    console.error('[cofishing] cancelOuting error :', error)
    return { error: 'Impossible d’annuler la sortie.' }
  }
  revalidatePath('/sorties')
  return { ok: true }
}

/** Le participant retire sa demande. */
export async function withdrawJoin(proposalId: string): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u

  const supabase = await createClient()
  const { error } = await supabase
    .from('outing_participants')
    .delete()
    .eq('proposal_id', proposalId)
    .eq('user_id', u.id)
  if (error) {
    console.error('[cofishing] withdrawJoin error :', error)
    return { error: 'Impossible de retirer ta demande.' }
  }
  revalidatePath('/sorties')
  return { ok: true }
}
