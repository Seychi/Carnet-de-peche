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
  | 'spot_approved'
  | 'spot_rejected'
  // Co-pêchage (sprint 25) : demande de participation (→ hôte), acceptation (→ participant).
  | 'outing_join'
  | 'outing_accepted'
  // Notif perso proactive (sprint 26) : le créneau favorable du jour coïncide avec TES
  // conditions. Émise par le cron en service_role (PAS via createNotification : pas
  // d'acteur humain → le no-op actorId casserait l'envoi). Réservée Local/Itinérant.
  | 'optimal_window'
  // Modération (sprint 37 WS-F) : un modérateur a vérifié la coordonnée d'un spot
  // proposé. Notifié au proposeur (created_by). CHECK DB étendu en migration 060.
  | 'spot_verified'
  // Co-pêchage musclé (sprint 40, « La meute ») : sortie complète, annulée, nouveau
  // message de chat, rappel la veille. CHECK DB étendu en migration 067. target_type='outing'.
  | 'outing_full'
  | 'outing_cancelled'
  | 'outing_message'
  | 'outing_reminder'
  // Rappel RecFishing (sprint 24, cron recfishing-reminders) : la prise d'une espèce
  // sensible n'est pas encore déclarée. Type DÉJÀ émis en DB/UI mais absent de ce union
  // jusqu'au sprint 49 (discordance corrigée). target_type='catch'.
  | 'recfishing_reminder'
  // Push & engagement (sprint 49) : grande marée du jour (tous tiers), prise d'un
  // pêcheur suivi (event-driven), fermeture d'espèce imminente, récap hebdo. CHECK DB
  // étendu en migration 085 (20 types). Voir lib/notifications/prefs-meta.ts pour les
  // clés de préférence associées (gate par type + master switch push).
  | 'big_tide'
  | 'followed_catch'
  | 'species_closure'
  | 'weekly_digest'
  // Co-pêchage v2 (sprint 50) : une sortie vient d'ouvrir dans le département de
  // résidence du destinataire. CHECK DB étendu en migration 090. target_type='outing'.
  // 0 coordonnée : le preview ne porte que le département + un repère libre.
  | 'nearby_outing'

export type NotificationTargetType = 'post' | 'catch' | 'comment' | 'spot' | 'outing'

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

// ─── Préférences de notification push (sprint 49) ──────────────────────────────
// Lecture des préférences d'un destinataire pour gater les PUSH par type. La règle
// (clé absente ou != 'false' → activé) est partagée avec l'UI Réglages via
// isNotificationPrefEnabled (lib/notifications/prefs-meta.ts). Best-effort : en cas
// d'échec de lecture on renvoie {} (= tous les types activés par défaut) plutôt que
// de bloquer un envoi légitime.

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Charge l'objet `notification_prefs` (jsonb) d'un utilisateur via un client admin
 * (service_role, bypass RLS). Renvoie un objet plat clé→valeur, ou {} si absent /
 * lecture impossible. À combiner avec isNotificationPrefEnabled pour décider d'un push.
 */
export async function getNotificationPrefs(
  admin: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  if (!userId) return {}
  try {
    const { data, error } = await admin
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return {}
    const prefs = data.notification_prefs
    return prefs && typeof prefs === 'object' && !Array.isArray(prefs)
      ? (prefs as Record<string, unknown>)
      : {}
  } catch (e) {
    console.error('[getNotificationPrefs] indisponible', e)
    return {}
  }
}
