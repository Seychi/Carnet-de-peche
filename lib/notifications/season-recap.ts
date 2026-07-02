// Émetteur des notifs de FIN DE SAISON (Sprint 67, Bloc 0/1) : récap + champion.
//
// Appelé par le cron archive-season APRÈS archive_season(). La RPC renvoie UNIQUEMENT les
// lignes FRAÎCHEMENT archivées du board flagship (national XP) → une notif est émise UNE
// SEULE FOIS par pêcheur et par saison (idempotence portée par archive_season). Retrospectif
// et célébratoire (jamais anxiogène, garde-fou brief). SPOT-SAFE : aucune coordonnée.
//
// Self-notifs (aucun acteur humain) → insérées en service_role avec actor_id NULL (modèle
// dopamine.ts / cron personal-window). In-app toujours ; PUSH gaté par la pref 'ranking'.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getNotificationPrefs } from './create'
import { isNotificationPrefEnabled } from './prefs-meta'
import { sendPushToUser } from '@/lib/push/send'
import { seasonLabelFromKey } from '@/lib/gamification/season'

/** Une ligne fraîche renvoyée par archive_season (board national XP). */
export type SeasonRecapRow = {
  kind: 'champion' | 'recap'
  o_user_id: string
  o_season_key: string
  o_rank: number
}

function previewFor(row: SeasonRecapRow): string {
  const label = seasonLabelFromKey(row.o_season_key)
  if (row.kind === 'champion') {
    return `🏆 Champion de saison ${label} : tu finis 1er au classement national XP. Chapeau.`
  }
  return `Saison ${label} terminée : tu finis ${row.o_rank}e au classement national XP 🎣`
}

/**
 * Émet les notifs de récap de fin de saison pour les lignes fraîches renvoyées par
 * archive_season. Best-effort STRICT : ne throw jamais (le cron a déjà archivé). No-op si
 * la liste est vide (saison déjà archivée → aucune ligne fraîche → aucune notif rejouée).
 */
export async function emitSeasonRecapNotifications(
  admin: SupabaseClient,
  rows: SeasonRecapRow[],
): Promise<{ inApp: number }> {
  const valid = (rows ?? []).filter((r) => r && r.o_user_id)
  if (valid.length === 0) return { inApp: 0 }

  // In-app : une ligne par finaliste (self-notif → actor_id / target NULL).
  const inAppRows = valid.map((r) => ({
    user_id: r.o_user_id,
    type: 'season_recap' as const,
    actor_id: null,
    target_type: null,
    target_id: null,
    actor_username: null,
    preview_text: previewFor(r).slice(0, 140),
  }))
  const { error } = await admin.from('notifications').insert(inAppRows)
  if (error) console.error('[season-recap] insert notif (non bloquant) :', error.message)

  // Push best-effort, gaté par la pref 'ranking' de chaque destinataire.
  for (const r of valid) {
    try {
      const prefs = await getNotificationPrefs(admin, r.o_user_id)
      if (!isNotificationPrefEnabled(prefs, 'ranking')) continue
      await sendPushToUser(admin, r.o_user_id, {
        title: 'Carnet de Pêche',
        body: previewFor(r),
        url: '/classements',
      })
    } catch (e) {
      console.error('[season-recap] push best-effort (non bloquant) :', e)
    }
  }

  return { inApp: inAppRows.length }
}
