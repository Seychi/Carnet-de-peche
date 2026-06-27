'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/create'
import { proposeOutingSchema, type ProposeOutingInput, outingMessageSchema } from './schema'
import { getOutingMessages, type OutingMessage } from './queries'
import { ALL_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'

// Co-pêchage. AUCUNE coordonnée précise n'est jamais lue/écrite (D-D3).

const KNOWN_SPECIES = new Set(ALL_SPECIES_DB_KEYS)

/** Ne garde que des clés d'espèces connues (référentiel) ; tableau vide → null. */
function normalizeSpecies(input: string[] | undefined): string[] | null {
  if (!input || input.length === 0) return null
  const cleaned = [...new Set(input.filter((s) => KNOWN_SPECIES.has(s)))]
  return cleaned.length > 0 ? cleaned : null
}

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
      species: normalizeSpecies(d.species),
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

  // Anti-spam léger (app-level) : max 10 demandes par 24 h. La RLS laisse lire sa
  // propre participation (053) → ce compteur est fiable côté utilisateur.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count: recentJoins } = await db
    .from('outing_participants')
    .select('proposal_id', { count: 'exact', head: true })
    .eq('user_id', u.id)
    .gte('created_at', since)
  if ((recentJoins ?? 0) >= 10) {
    return { error: 'Tu as envoyé beaucoup de demandes ces dernières 24 h. Réessaie demain.' }
  }

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

    // Le trigger DB (067) a peut-être basculé la sortie en `full` après cet accept.
    // Si c'est le cas, on prévient tous les acceptés que le groupe est complet.
    // Best-effort : ne casse jamais l'acceptation.
    try {
      const { data: prop } = await db
        .from('outing_proposals')
        .select('status')
        .eq('id', proposalId)
        .maybeSingle()
      if (prop?.status === 'full') {
        const { data: accepted } = await db
          .from('outing_participants')
          .select('user_id')
          .eq('proposal_id', proposalId)
          .eq('status', 'accepted')
        await Promise.all(
          ((accepted ?? []) as { user_id: string }[]).map((r) =>
            createNotification({
              userId: r.user_id,
              type: 'outing_full',
              actorId: u.id,
              targetType: 'outing',
              targetId: proposalId,
              previewText: 'la sortie est complète, le groupe est au complet',
            }),
          ),
        )
      }
    } catch (e) {
      console.error('[cofishing] outing_full notif :', e)
    }
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
  const { error, count } = await supabase
    .from('outing_proposals')
    .update({ status: 'cancelled' }, { count: 'exact' })
    .eq('id', proposalId)
    .eq('host_id', u.id)
  if (error) {
    console.error('[cofishing] cancelOuting error :', error)
    return { error: 'Impossible d’annuler la sortie.' }
  }

  // Prévenir les participants acceptés que la sortie est annulée. Best-effort,
  // seulement si l'annulation a bien eu lieu (count = 1, donc hôte légitime).
  if (count) {
    try {
      const { data: accepted } = await supabase
        .from('outing_participants')
        .select('user_id')
        .eq('proposal_id', proposalId)
        .eq('status', 'accepted')
      await Promise.all(
        ((accepted ?? []) as { user_id: string }[]).map((r) =>
          createNotification({
            userId: r.user_id,
            type: 'outing_cancelled',
            actorId: u.id,
            targetType: 'outing',
            targetId: proposalId,
            previewText: 'a annulé la sortie',
          }),
        ),
      )
    } catch (e) {
      console.error('[cofishing] outing_cancelled notif :', e)
    }
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

/**
 * Charger l'historique du chat d'une sortie (appelé au montage du panneau chat,
 * côté client). La RLS (068) filtre : un non-membre obtient une liste vide.
 */
export async function loadOutingMessages(proposalId: string): Promise<OutingMessage[]> {
  const u = await getUserId()
  if ('error' in u) return []
  return getOutingMessages(proposalId)
}

/**
 * Envoyer un message dans le chat d'une sortie. FAIL-CLOSED : la RLS n'autorise
 * l'INSERT que pour l'hôte ou un participant `accepted` (migration 068) → un tiers
 * obtient 0 ligne et un message d'erreur propre. `LOOKS_LIKE_COORD` refuse une
 * coordonnée tapée à la main (anti spot-burning). Notifie les AUTRES membres acceptés
 * + l'hôte (best-effort, ne casse jamais l'envoi).
 */
export async function sendOutingMessage(
  proposalId: string,
  body: string,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u

  const parsed = outingMessageSchema.safeParse({ body })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(', ') }

  const supabase = await createClient()
  const { error } = await supabase
    .from('outing_messages')
    .insert({ proposal_id: proposalId, user_id: u.id, body: parsed.data.body })
  if (error) {
    // RLS (non-membre) ou autre : message propre, on ne révèle pas le détail.
    console.error('[cofishing] sendOutingMessage error :', error)
    return { error: 'Impossible d’envoyer le message (réservé aux participants de la sortie).' }
  }

  // Notifier les AUTRES membres (hôte + acceptés), sauf l'expéditeur. Best-effort.
  try {
    const { data: prop } = await supabase
      .from('outing_proposals')
      .select('host_id')
      .eq('id', proposalId)
      .maybeSingle()
    const { data: accepted } = await supabase
      .from('outing_participants')
      .select('user_id')
      .eq('proposal_id', proposalId)
      .eq('status', 'accepted')

    const recipients = new Set<string>()
    if (prop?.host_id) recipients.add(prop.host_id as string)
    for (const r of (accepted ?? []) as { user_id: string }[]) recipients.add(r.user_id)
    recipients.delete(u.id) // jamais se notifier soi-même

    await Promise.all(
      [...recipients].map((userId) =>
        createNotification({
          userId,
          type: 'outing_message',
          actorId: u.id,
          targetType: 'outing',
          targetId: proposalId,
          previewText: 'a écrit dans le chat de la sortie',
        }),
      ),
    )
  } catch (e) {
    console.error('[cofishing] sendOutingMessage notif :', e)
  }

  return { ok: true }
}
