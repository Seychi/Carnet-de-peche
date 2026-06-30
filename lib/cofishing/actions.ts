'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createNotification, getNotificationPrefs } from '@/lib/notifications/create'
import { isNotificationPrefEnabled } from '@/lib/notifications/prefs-meta'
import { sendPushToUser } from '@/lib/push/send'
import { departmentArticle } from '@/lib/geo/departments'
import {
  proposeOutingSchema,
  type ProposeOutingInput,
  outingMessageSchema,
  outingReviewSchema,
} from './schema'
import { getOutingMessages, type OutingMessage } from './queries'
import { ALL_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'

// Les helpers photo de chat (uploadOutingPhoto, getOutingPhotoSignedUrl) vivent dans
// lib/cofishing/outing-photo.ts ('use server') et s'importent DIRECTEMENT de là : un
// fichier 'use server' ne peut pas RÉEXPORTER (seules des fn async définies localement
// sont exportables). Gotcha sprint 48/50.

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

  // Best-effort : prévenir les pêcheurs du département qu'une sortie vient d'ouvrir
  // près de chez eux. Ne casse JAMAIS la création (try/catch interne).
  await notifyNearbyOfNewOuting({
    proposalId: data.id as string,
    hostId: user.id,
    department: d.department,
    areaLabel: d.area_label ?? null,
  })

  revalidatePath('/sorties')
  return { id: data.id as string }
}

/**
 * Notifie les pêcheurs dont le département de résidence (profiles.home_department)
 * est celui de la sortie qu'une sortie vient d'ouvrir. BEST-EFFORT total : avale
 * toute erreur, isolé par destinataire. ZÉRO coordonnée : on ne transmet que le
 * département + un éventuel repère LIBRE (area_label, déjà nettoyé anti-coord à
 * l'écriture). Push gaté par la pref 'nearby_outing' de chaque destinataire.
 */
async function notifyNearbyOfNewOuting(params: {
  proposalId: string
  hostId: string
  department: string
  areaLabel: string | null
}): Promise<void> {
  const { proposalId, hostId, department, areaLabel } = params
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // Destinataires = pêcheurs résidant dans le département de la sortie, sauf l'hôte.
    const { data: rows, error } = await admin
      .from('profiles')
      .select('id')
      .eq('home_department', department)
      .neq('id', hostId)
      .limit(500)
    if (error) {
      console.error('[cofishing] nearby_outing lecture profils :', error.message)
      return
    }

    const recipientIds = (rows ?? [])
      .map((r) => r.id as string | null)
      .filter((id): id is string => Boolean(id) && id !== hostId)
    if (recipientIds.length === 0) return

    // Texte SANS coordonnée : « du Finistère » + éventuel repère libre.
    const where = departmentArticle(department, 'de')
    const preview = areaLabel
      ? `a proposé une sortie ${where} (${areaLabel})`
      : `a proposé une sortie ${where}`
    const pushBody = areaLabel
      ? `Nouvelle sortie ${where} : ${areaLabel}.`
      : `Une sortie vient d’ouvrir ${where}.`

    for (const userId of recipientIds) {
      // IN-APP toujours (createNotification est best-effort + anti-auto-notif).
      try {
        await createNotification({
          userId,
          type: 'nearby_outing',
          actorId: hostId,
          targetType: 'outing',
          targetId: proposalId,
          previewText: preview,
        })
      } catch (e) {
        console.error('[cofishing] nearby_outing in-app (non bloquant) :', e)
      }

      // PUSH seulement si la pref 'nearby_outing' est active (no-op sans clés VAPID).
      try {
        const prefs = await getNotificationPrefs(admin, userId)
        if (!isNotificationPrefEnabled(prefs, 'nearby_outing')) continue
        await sendPushToUser(admin, userId, {
          title: 'Carnet de Pêche',
          body: pushBody,
          url: '/sorties',
        })
      } catch (e) {
        console.error('[cofishing] nearby_outing push (non bloquant) :', e)
      }
    }
  } catch (e) {
    // Filet global : admin indisponible, etc. Jamais de throw.
    console.error('[cofishing] notifyNearbyOfNewOuting indisponible :', e)
  }
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
  photoPath?: string,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u

  const parsed = outingMessageSchema.safeParse({ body })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(', ') }

  // Un message doit porter du texte OU une photo (jamais les deux vides).
  const cleanBody = parsed.data.body
  const photo = photoPath?.trim() || null
  if (!cleanBody && !photo) return { error: 'Écris un message ou ajoute une photo.' }

  // NB (sprint 58 WS-A, décision John) : le chat reste OUVERT après la date de la
  // sortie (`planned_at` passé), volontairement → débrief post-sortie. Seul le statut
  // `cancelled` ferme le chat (policy INSERT outing_messages). Pas de garde
  // `planned_at < now()` : c'est un choix produit assumé, pas un oubli.

  // Garde-fou : un photo_path doit pointer dans le bucket privé, dossier de l'auteur
  // (`<uid>/...`). On REFUSE tout chemin qui n'est pas scopé à l'expéditeur (anti
  // injection d'un chemin arbitraire). La lecture restera de toute façon gatée par
  // l'appartenance via getOutingPhotoSignedUrl.
  if (photo && !photo.startsWith(`${u.id}/`)) {
    return { error: 'Photo invalide.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('outing_messages')
    .insert({ proposal_id: proposalId, user_id: u.id, body: cleanBody, photo_path: photo })
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

// ─── Sur place (D) ─────────────────────────────────────────────────────────────
/**
 * Un participant accepté pointe SA présence sur la sortie (RPC mark_on_site, 089).
 * La RPC vérifie côté DB que l'appelant est bien participant accepté → un tiers
 * obtient une erreur. AUCUNE coordonnée : on ne fait qu'horodater on_site_at.
 */
export async function markOnSite(proposalId: string): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u
  if (!z.string().uuid().safeParse(proposalId).success) return { error: 'Sortie invalide.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_on_site', { p_proposal_id: proposalId })
  if (error) {
    console.error('[cofishing] markOnSite error :', error.message)
    return { error: 'Impossible de pointer ta présence (réservé aux participants acceptés).' }
  }

  revalidatePath('/sorties')
  return { ok: true }
}

// ─── Avis co-pêchage (B) ─────────────────────────────────────────────────────
/**
 * Laisser un avis sur un AUTRE membre d'une sortie PASSÉE. La RLS (087) cadenasse :
 * INSERT autorisé seulement si l'auteur ET la cible sont membres d'une même sortie
 * passée (un tiers ou un avis sur une sortie à venir échoue à la DB). Le schéma borne
 * la note (1-5) et le commentaire (≤ 500 + anti-coord). DESCRIPTIF, jamais classant.
 */
export async function createOutingReview(
  proposalId: string,
  revieweeId: string,
  rating: number,
  comment?: string,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u
  if (!z.string().uuid().safeParse(proposalId).success) return { error: 'Sortie invalide.' }
  if (!z.string().uuid().safeParse(revieweeId).success) return { error: 'Pêcheur invalide.' }
  if (revieweeId === u.id) return { error: 'Tu ne peux pas t’évaluer toi-même.' }

  const parsed = outingReviewSchema.safeParse({ rating, comment })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(', ') }

  const supabase = await createClient()
  const { error } = await supabase.from('outing_reviews').insert({
    proposal_id: proposalId,
    reviewer_id: u.id,
    reviewee_id: revieweeId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  })
  if (error) {
    if (String(error.message).includes('duplicate')) {
      return { error: 'Tu as déjà laissé un avis à ce pêcheur pour cette sortie.' }
    }
    // RLS (pas membre / sortie pas passée) ou autre : message propre.
    console.error('[cofishing] createOutingReview error :', error.message)
    return { error: 'Avis impossible (réservé aux membres d’une sortie déjà passée).' }
  }

  revalidatePath('/sorties')
  return { ok: true }
}

/** Supprimer SON propre avis (la RLS DELETE 087 = own uniquement). */
export async function deleteOutingReview(reviewId: string): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u
  if (!z.string().uuid().safeParse(reviewId).success) return { error: 'Avis invalide.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('outing_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('reviewer_id', u.id)
  if (error) {
    console.error('[cofishing] deleteOutingReview error :', error.message)
    return { error: 'Impossible de supprimer cet avis.' }
  }

  revalidatePath('/sorties')
  return { ok: true }
}

// ─── Modération du chat / des avis (D) ───────────────────────────────────────
/** L'utilisateur courant est-il modérateur (profiles.is_moderator) ? */
async function viewerIsModerator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_moderator === true
}

/**
 * Signaler un message de chat (modèle reportPost). Insère un report
 * target_type='outing_message' (accepté par la migration 089) SANS aucune donnée
 * sensible : seulement (target_id, reason, details). Modération libre au lancement.
 */
export async function reportOutingMessage(
  messageId: string,
  reason: string,
  details?: string,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u
  if (!z.string().uuid().safeParse(messageId).success) return { error: 'Message invalide.' }

  const parsed = z
    .object({
      reason: z.enum(['spam', 'inapproprie', 'spot_burning', 'autre']),
      details: z.string().trim().max(1000, 'Ta précision est trop longue (max 1000).').optional(),
    })
    .safeParse({ reason, details })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(', ') }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').insert({
    reporter_id: u.id,
    target_type: 'outing_message',
    target_id: messageId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  })
  if (error) {
    console.error('[cofishing] reportOutingMessage error :', error.message)
    return { error: 'Impossible d’envoyer ton signalement. Réessaie.' }
  }
  return { ok: true }
}

/**
 * Suppression d'un message de chat par un modérateur. Le chat est append-only (pas
 * de policy DELETE) → on passe en service-role. Gate is_moderator. Résout aussi les
 * signalements en attente sur ce message (trace d'audit).
 */
export async function moderatorDeleteOutingMessage(
  messageId: string,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u
  if (!z.string().uuid().safeParse(messageId).success) return { error: 'Message invalide.' }

  const supabase = await createClient()
  if (!(await viewerIsModerator(supabase, u.id))) {
    return { error: 'Action réservée aux modérateurs.' }
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { error } = await admin.from('outing_messages').delete().eq('id', messageId)
    if (error) {
      console.error('[cofishing] moderatorDeleteOutingMessage error :', error.message)
      return { error: 'Suppression impossible.' }
    }
    // Résout les signalements en attente sur ce message (best-effort).
    const now = new Date().toISOString()
    await admin
      .from('reports')
      .update({ status: 'resolved', resolved_by: u.id, resolved_at: now })
      .eq('target_type', 'outing_message')
      .eq('target_id', messageId)
      .eq('status', 'pending')
  } catch (e) {
    console.error('[cofishing] moderatorDeleteOutingMessage indisponible :', e)
    return { error: 'Suppression indisponible.' }
  }

  revalidatePath('/sorties')
  return { ok: true }
}

/**
 * Suppression d'un avis par un modérateur (service-role, gate is_moderator). Sert à
 * retirer un avis abusif sans toucher à la RLS DELETE own. Résout les signalements.
 */
export async function moderatorDeleteOutingReview(
  reviewId: string,
): Promise<Result<{ ok: true }>> {
  const u = await getUserId()
  if ('error' in u) return u
  if (!z.string().uuid().safeParse(reviewId).success) return { error: 'Avis invalide.' }

  const supabase = await createClient()
  if (!(await viewerIsModerator(supabase, u.id))) {
    return { error: 'Action réservée aux modérateurs.' }
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { error } = await admin.from('outing_reviews').delete().eq('id', reviewId)
    if (error) {
      console.error('[cofishing] moderatorDeleteOutingReview error :', error.message)
      return { error: 'Suppression impossible.' }
    }
  } catch (e) {
    console.error('[cofishing] moderatorDeleteOutingReview indisponible :', e)
    return { error: 'Suppression indisponible.' }
  }

  revalidatePath('/sorties')
  return { ok: true }
}
