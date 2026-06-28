// Notification event-driven « prise d'un pêcheur suivi » (sprint 49, WS A — tâche 4).
//
// Appelé depuis createCatch / updateCatch APRÈS un insert / une transition vers public
// RÉUSSI. STRICTEMENT BEST-EFFORT : ne throw JAMAIS, ne bloque jamais l'action métier
// (un catch publié reste publié même si toute la notification rate). Modèle = bloc
// co-pêchage de runOutingReminders : isolé par destinataire, try/catch partout.
//
// Fichier NEUTRE (pas de 'use server') : il exporte une fonction async réutilisable,
// importée par lib/catches/actions.ts ('use server'). Un 'use server' ne peut exporter
// que des fonctions async → on garde la logique ici, hors de la frontière server-action.
//
// INVARIANTS :
// - IN-APP TOUJOURS pour chaque follower (createNotification, service_role).
// - PUSH SEULEMENT si la pref 'followed_catch' du follower est active ET sous le
//   RATE-LIMIT (décision John D3) : au plus ~4 push/jour/follower. Au-delà, in-app only.
// - Isolé par destinataire : un échec sur un follower n'interrompt pas les autres.
// - Anti-auto-notif géré par createNotification (un follower == l'auteur est impossible).

import { createNotification, getNotificationPrefs } from '@/lib/notifications/create'
import { isNotificationPrefEnabled } from '@/lib/notifications/prefs-meta'
import { sendPushToUser } from '@/lib/push/send'

/** Plafond de push « prise suivie » par follower et par jour (décision John D3). */
export const FOLLOWED_CATCH_DAILY_PUSH_CAP = 4

/**
 * Notifie les abonnés de l'auteur qu'il vient de publier une prise PUBLIQUE.
 *
 * `authorId` = id de l'auteur de la prise. `catchId` = id de la prise (cible de la
 * notif). `authorUsername` (optionnel) = pseudo dénormalisé pour l'affichage.
 *
 * Best-effort total : avale toute erreur. No-op silencieux si le client admin n'est pas
 * disponible (dev sans service_role) ou s'il n'y a aucun follower.
 */
export async function notifyFollowersOfPublicCatch(params: {
  authorId: string
  catchId: string
  authorUsername?: string | null
}): Promise<void> {
  const { authorId, catchId, authorUsername } = params
  if (!authorId || !catchId) return

  try {
    // Import dynamique de l'admin (server-only + clé service_role) : isolé pour ne
    // jamais casser l'action si la clé manque (modèle createNotification).
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // Pseudo de l'auteur (dénormalisé pour le badge in-app + le texte du push). Résolu
    // une seule fois ici si non fourni, plutôt que par follower dans createNotification.
    let resolvedUsername = authorUsername ?? null
    if (resolvedUsername == null) {
      const { data: prof } = await admin
        .from('profiles')
        .select('username')
        .eq('id', authorId)
        .maybeSingle()
      resolvedUsername = prof?.username ?? null
    }

    // Followers = qui suit l'auteur (follows.following_id = authorId). Lecture admin
    // (bypass RLS) : on ne lit que les ids, aucune donnée sensible.
    const { data: rows, error } = await admin
      .from('follows')
      .select('follower_id')
      .eq('following_id', authorId)
    if (error) {
      console.error('[notifyFollowersOfPublicCatch] lecture followers échec :', error.message)
      return
    }

    const followerIds = (rows ?? [])
      .map((r) => r.follower_id as string | null)
      .filter((id): id is string => Boolean(id) && id !== authorId)
    if (followerIds.length === 0) return

    // Borne UTC du jour courant (Europe/Paris) pour le rate-limit push (D3).
    const { startUtc, endUtc } = parisTodayBoundsUtc(new Date())

    for (const followerId of followerIds) {
      // IN-APP TOUJOURS (createNotification est best-effort + anti-auto-notif intégré).
      try {
        await createNotification({
          userId: followerId,
          type: 'followed_catch',
          actorId: authorId,
          actorUsername: resolvedUsername,
          targetType: 'catch',
          targetId: catchId,
        })
      } catch (e) {
        console.error('[notifyFollowersOfPublicCatch] in-app échec (non bloquant) :', e)
      }

      // PUSH : gaté pref 'followed_catch' + rate-limit D3 + master switch (no-op sans clés).
      try {
        const prefs = await getNotificationPrefs(admin, followerId)
        if (!isNotificationPrefEnabled(prefs, 'followed_catch')) continue

        // Rate-limit : compter les followed_catch DÉJÀ reçus par ce follower aujourd'hui.
        // On compte AVANT d'envoyer ; >= cap → in-app only (la notif in-app vient d'être
        // créée, mais on n'ajoute pas de push au-delà du plafond).
        const { count: todayCount, error: cntErr } = await admin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', followerId)
          .eq('type', 'followed_catch')
          .gte('created_at', startUtc)
          .lt('created_at', endUtc)
        if (cntErr) {
          console.error('[notifyFollowersOfPublicCatch] rate-limit count échec :', cntErr.message)
          continue
        }
        // La notif in-app de CETTE prise est déjà insérée → todayCount l'inclut. On
        // pousse tant qu'on est AU PLUS au plafond (<= cap), pour autoriser jusqu'à
        // `cap` push/jour. Au-delà : in-app only.
        if ((todayCount ?? 0) > FOLLOWED_CATCH_DAILY_PUSH_CAP) continue

        await sendPushToUser(admin, followerId, {
          title: 'Carnet de Pêche',
          body: resolvedUsername
            ? `${resolvedUsername} vient de publier une prise.`
            : 'Un pêcheur que tu suis vient de publier une prise.',
          url: '/fil',
        })
      } catch (e) {
        console.error('[notifyFollowersOfPublicCatch] push échec (non bloquant) :', e)
      }
    }
  } catch (e) {
    // Filet global : admin indisponible, etc. Jamais de throw.
    console.error('[notifyFollowersOfPublicCatch] indisponible (non bloquant) :', e)
  }
}

// Bornes UTC [00:00, 24:00) du jour courant en Europe/Paris (pour le rate-limit
// par jour civil français). Même méthode d'offset que les crons (heure de Paris à midi
// UTC → offset robuste été/hiver).
function parisTodayBoundsUtc(now: Date): { startUtc: string; endUtc: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`

  const noonUtc = new Date(`${dateKey}T12:00:00Z`)
  const parisHourAtNoonUtc = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hour12: false,
    }).format(noonUtc),
  )
  const offsetH = parisHourAtNoonUtc - 12
  const startUtc = new Date(`${dateKey}T00:00:00Z`)
  startUtc.setUTCHours(startUtc.getUTCHours() - offsetH)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() }
}
