'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import '@/lib/zod-config'
import { z } from 'zod'
import { captureServerEvent } from '@/lib/analytics/server'

// ─── Email hebdo "ton créneau du week-end" (sprint 74) ────────────────────────
// Distinct des alertes par port (payantes, réglage `alert_settings`, migration
// 106) : ce toggle-là est GRATUIT, ouvert à tous les tiers, et couvre un seul
// email par semaine (le vendredi, cf `lifecycle_emails.kind = 'weekly_window'`).
// Colonne `profiles.weekly_window_optin boolean not null default false`
// (migration 108). Sécurité : toujours scopé à auth.uid(), RLS "update own"
// sur profiles (comme setMarketingOptin / setNotificationPref).

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour gérer cette préférence.'
const SAVE_MSG = 'Impossible de mettre à jour ce réglage. Réessaie.'

const enabledSchema = z.boolean({
  message: 'Valeur invalide pour ce réglage.',
})

/**
 * Active/désactive l'email hebdomadaire du créneau du week-end. Opt-in strict
 * (défaut colonne = false) : ne s'active jamais tout seul, se coupe en un clic
 * depuis /notifications ou le lien de désinscription de l'email lui-même.
 * Émet `weekly_optin_changed` (funnel d'engagement email) : fire-and-forget
 * borné, ne bloque jamais l'écriture même si PostHog est down.
 */
export async function setWeeklyWindowOptin(
  enabled: boolean,
): Promise<ActionResult<{ enabled: boolean }>> {
  const parsed = enabledSchema.safeParse(enabled)
  if (!parsed.success) return fail(SAVE_MSG)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const { error } = await supabase
    .from('profiles')
    .update({ weekly_window_optin: parsed.data })
    .eq('id', user.id)
  if (error) {
    console.error('[setWeeklyWindowOptin]', error.message)
    return fail(SAVE_MSG)
  }

  await captureServerEvent(user.id, 'weekly_optin_changed', { enabled: parsed.data })

  // Revalide les deux surfaces où ce toggle peut apparaître : l'écran de fin
  // d'onboarding (première offre) et /notifications (réglage après coup).
  revalidatePath('/onboarding/fini')
  revalidatePath('/notifications')
  return ok({ enabled: parsed.data })
}
