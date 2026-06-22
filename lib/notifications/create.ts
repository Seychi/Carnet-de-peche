// Helper de création de notifications in-app (sprint 17 Bloc B).
// (Pas d'`import 'server-only'` au top : casserait vitest. L'isolation serveur est
//  assurée par l'import DYNAMIQUE de admin.ts dans la fonction — cf lib/feed/media.ts.)
//
// INVARIANTS :
// - La table `notifications` a une policy INSERT `WITH CHECK (false)` pour
//   `authenticated` (migration 037) → un INSERT depuis le client user/RSC est
//   TOUJOURS rejeté. On insère donc via le client service_role (createAdminClient),
//   qui bypass la RLS. C'est le seul vecteur d'écriture autorisé.
// - NON-BLOQUANT : une notif qui rate ne doit JAMAIS casser l'action métier
//   (un like / commentaire / follow réussi reste réussi). Tout est try/catch +
//   log, jamais throw.
// - ANTI-AUTO-NOTIF : on ne notifie jamais quelqu'un de sa propre action
//   (actorId === userId → on ne fait rien).
// - En dev/test sans SUPABASE_SERVICE_ROLE_KEY, l'import dynamique de admin.ts
//   throw (server-only / clé absente) → on log et on continue, comme media.ts.

export type NotificationType =
  | 'new_follower'
  | 'post_liked'
  | 'post_commented'
  | 'catch_commented'
  | 'mention'

export type NotificationTargetType = 'post' | 'catch' | 'comment'

export type CreateNotificationInput = {
  /** Destinataire de la notif. */
  userId: string
  type: NotificationType
  /** Auteur de l'action (déclencheur). Si === userId, on n'insère rien. */
  actorId: string
  targetType?: NotificationTargetType | null
  /** id de la cible (post, prise, commentaire). */
  targetId?: string | null
  /** Pseudo dénormalisé de l'acteur (anti N+1 à l'affichage). Résolu si absent. */
  actorUsername?: string | null
  /** Extrait d'affichage (≤ 140 car., contrainte DB). */
  previewText?: string | null
}

/**
 * Crée une notification in-app via le client service_role. Best-effort :
 * ne throw jamais, ne retourne rien d'utile au flux appelant.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  // Anti-auto-notif : on ne se notifie pas soi-même.
  if (!input.userId || !input.actorId || input.userId === input.actorId) return

  try {
    // Import dynamique : admin.ts charge 'server-only' et exige la clé
    // service_role → on l'isole pour ne jamais casser l'action si elle manque.
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // Pseudo de l'acteur si non fourni (dénormalisation pour le badge/la liste).
    let actorUsername = input.actorUsername ?? null
    if (actorUsername == null) {
      const { data } = await admin
        .from('profiles')
        .select('username')
        .eq('id', input.actorId)
        .maybeSingle()
      actorUsername = data?.username ?? null
    }

    // preview_text borné à 140 (contrainte CHECK en 037) — on tronque par sécurité.
    const previewText = input.previewText
      ? input.previewText.slice(0, 140)
      : null

    const { error } = await admin.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      actor_id: input.actorId,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      actor_username: actorUsername,
      preview_text: previewText,
    })
    if (error) {
      // Jamais silencieux, mais non bloquant (l'action métier a déjà réussi).
      console.error('[createNotification]', input.type, error.message)
    }
  } catch (e) {
    // Pas de clé service_role (dev) ou hors runtime serveur (test) → on continue.
    console.error('[createNotification] indisponible', input.type, e)
  }
}
