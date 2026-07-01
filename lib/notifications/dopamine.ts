// Émetteur des notifications DOPAMINE proactives (Sprint 63, Bloc 3).
//
// Self-notifs SANS acteur humain (actor_id NULL) → on insère en service_role (createNotification
// no-op quand actorId === userId ; ici il n'y a pas d'acteur). In-app TOUJOURS créée (centre de
// notifs) ; le PUSH est gaté par la préférence de type ('progress' ou 'streak_reminder') et par
// le master switch push (sendPushToUser no-op sans clés VAPID / sans abonnement). Modèle exact
// des greffons du cron personal-window (big_tide / weekly_digest).
//
// BEST-EFFORT intégral : ne throw JAMAIS (le log de prise a déjà réussi à l'appel). AUCUNE notif
// de rang/classement (Phase E) : on ne compare jamais deux pêcheurs.
//
// Pas d'`import 'server-only'` au top (casserait vitest) : l'isolation serveur passe par l'import
// dynamique de admin.ts (cf lib/notifications/create.ts).

import { levelFromXp } from '@/lib/gamification/levels'
import { isNotificationPrefEnabled, type NotificationPrefKey } from './prefs-meta'
import { getNotificationPrefs } from './create'
import { sendPushToUser } from '@/lib/push/send'
import { SPECIES_LABELS } from '@/lib/labels'
import type { CompletedChallenge } from '@/lib/gamification/challenges-solo'
import type { CatchCelebration } from '@/lib/gamification/celebration'

type DopamineNotifType =
  | 'level_up'
  | 'badge_earned'
  | 'new_record'
  | 'challenge_completed'
  | 'streak_danger'

// Chaque type dopamine est gaté par UNE des deux prefs groupées (opt-out sprint 49/86).
const PREF_KEY: Record<DopamineNotifType, NotificationPrefKey> = {
  level_up: 'progress',
  badge_earned: 'progress',
  new_record: 'progress',
  challenge_completed: 'progress',
  streak_danger: 'streak_reminder',
}

// URL ouverte au tap du push (in-app, la cible utile est dans preview_text).
const PUSH_URL: Record<DopamineNotifType, string> = {
  level_up: '/home',
  badge_earned: '/home',
  new_record: '/carnet',
  challenge_completed: '/home',
  streak_danger: '/home',
}

type NotifSpec = { type: DopamineNotifType; previewText: string }

/**
 * Insère une file de notifs proactives en service_role (in-app) + envoie le push GATÉ par pref.
 * Best-effort : ne throw jamais. No-op si liste vide ou userId absent.
 */
async function emitProactiveNotifications(userId: string, specs: NotifSpec[]): Promise<void> {
  if (!userId || specs.length === 0) return
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // In-app : une ligne par spec (système → actor_id / target_type / target_id NULL).
    const rows = specs.map((s) => ({
      user_id: userId,
      type: s.type,
      actor_id: null,
      target_type: null,
      target_id: null,
      actor_username: null,
      preview_text: s.previewText.slice(0, 140),
    }))
    const { error } = await admin.from('notifications').insert(rows)
    if (error) console.error('[dopamine] insert notif (non bloquant) :', error.message)

    // Push best-effort, gaté par pref de type + master switch (no-op sans clés/abonnement).
    const prefs = await getNotificationPrefs(admin, userId)
    for (const s of specs) {
      if (!isNotificationPrefEnabled(prefs, PREF_KEY[s.type])) continue
      try {
        await sendPushToUser(admin, userId, {
          title: 'Carnet de Pêche',
          body: s.previewText,
          url: PUSH_URL[s.type],
        })
      } catch (e) {
        console.error('[dopamine] push best-effort (non bloquant) :', e)
      }
    }
  } catch (e) {
    console.error('[dopamine] indisponible (non bloquant) :', e)
  }
}

/**
 * Émet les notifs dopamine déclenchées par le log d'une prise OU d'une sortie : passage de
 * niveau (XP avant/après), nouveau record, badge(s) débloqué(s), défi(s) relevé(s). Best-effort.
 *
 * `xpBefore`/`xpAfter` valent `null` si la lecture XP a ÉCHOUÉ (getUserXpOrNull) → dans ce cas
 * on NE détecte PAS de passage de niveau (un 0 « d'erreur » fabriquerait un faux palier, cf
 * invariant d'honnêteté du sprint dopamine). Une sortie n'a ni record ni badge : `celebration`
 * vaut alors `null` et seuls level_up / challenge_completed peuvent se déclencher.
 */
export async function emitDopamineNotifications(opts: {
  userId: string
  xpBefore: number | null
  xpAfter: number | null
  celebration?: CatchCelebration | null
  completedChallenges: CompletedChallenge[]
}): Promise<void> {
  const { userId, xpBefore, xpAfter, celebration, completedChallenges } = opts
  const specs: NotifSpec[] = []

  // Passage de niveau : le rang a-t-il augmenté entre l'XP d'avant et d'après ? On ne le
  // détecte QUE si les DEUX lectures ont réussi (sinon un 0 d'erreur fabriquerait un faux
  // palier, ex. Mousse → rang réel). Voir getUserXpOrNull.
  if (xpBefore != null && xpAfter != null) {
    const before = levelFromXp(xpBefore)
    const after = levelFromXp(xpAfter)
    if (after.level > before.level) {
      specs.push({
        type: 'level_up',
        previewText: `Niveau ${after.level} atteint : ${after.rankName}. Beau parcours.`,
      })
    }
  }

  // Nouveau record perso (mesuré, photo-vérifié — cf celebration.ts).
  if (celebration?.newRecord) {
    const label = SPECIES_LABELS[celebration.newRecord.species] ?? celebration.newRecord.species
    specs.push({
      type: 'new_record',
      previewText: `Nouveau record perso : ${label} de ${celebration.newRecord.length} cm.`,
    })
  }

  // Badges débloqués par ce log.
  for (const b of celebration?.newBadges ?? []) {
    specs.push({ type: 'badge_earned', previewText: `Badge débloqué : ${b.label}.` })
  }

  // Défis relevés par ce log.
  for (const ch of completedChallenges) {
    const xp = ch.rewardXp > 0 ? ` (+${ch.rewardXp} XP)` : ''
    specs.push({ type: 'challenge_completed', previewText: `Défi relevé : ${ch.title}${xp}.` })
  }

  await emitProactiveNotifications(userId, specs)
}
