'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ALERT_THRESHOLD } from '@/lib/alerts/decision'
import '@/lib/zod-config'
import { z } from 'zod'

// ─── Réglages des alertes par port (sprint 72, Bloc 3) ────────────────────────
// Table alert_settings (migration 106, RLS CRUD own-only). Décisions verrouillées :
// - opt-in explicite (alerts_enabled default false) ;
// - alertes réservées Local/Itinérant : l'ACTIVATION est refusée côté serveur pour
//   un tier non éligible (RPC current_tier, 1 appel, jamais de N+1). La coupure et
//   les autres réglages restent toujours permis (opt-out sans friction, RGPD) ;
// - seuil 50-90 (CHECK alert_settings_threshold_check en backstop DB).

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour régler tes alertes.'
const TIER_MSG =
  'Les alertes personnalisées sont réservées aux abonnés Local et Itinérant. Essai 7 jours depuis la page Tarifs.'
const SAVE_MSG = 'Impossible d’enregistrer tes réglages. Réessaie.'

const alertSettingsSchema = z.object({
  alertsEnabled: z.boolean().optional(),
  channelPush: z.boolean().optional(),
  channelEmail: z.boolean().optional(),
  threshold: z
    .number()
    .int('Le seuil doit être un entier.')
    .min(50, 'Le seuil minimum est 50.')
    .max(90, 'Le seuil maximum est 90.')
    .optional(),
})

export type AlertSettingsInput = z.infer<typeof alertSettingsSchema>

/**
 * Met à jour les réglages d'alerte du viewer (merge partiel + upsert own).
 * Gating serveur : activer (alertsEnabled=true) exige un tier Local/Itinérant,
 * pas seulement une UI cachée. Désactiver est toujours permis.
 */
export async function updateAlertSettings(
  input: AlertSettingsInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const parsed = alertSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Réglages invalides.')
  }
  const d = parsed.data

  // Activation = bénéfice payant (CLAUDE.md §8). Un seul appel current_tier,
  // uniquement quand on tente d'ACTIVER (l'opt-out reste libre pour tous).
  if (d.alertsEnabled === true) {
    const { data: tier, error: tierErr } = await supabase.rpc('current_tier', {
      uid: user.id,
    })
    if (tierErr) {
      console.error('[updateAlertSettings] current_tier', tierErr.message)
      return fail(SAVE_MSG)
    }
    if (tier !== 'local' && tier !== 'itinerant') return fail(TIER_MSG)
  }

  // Merge avec l'existant : on ne réécrit pas les réglages non fournis.
  const { data: current, error: readErr } = await supabase
    .from('alert_settings')
    .select('alerts_enabled, channel_push, channel_email, alert_threshold')
    .eq('user_id', user.id)
    .maybeSingle()
  if (readErr) {
    console.error('[updateAlertSettings] lecture', readErr.message)
    return fail(SAVE_MSG)
  }

  const row = {
    user_id: user.id,
    alerts_enabled: d.alertsEnabled ?? current?.alerts_enabled ?? false,
    channel_push: d.channelPush ?? current?.channel_push ?? true,
    channel_email: d.channelEmail ?? current?.channel_email ?? true,
    alert_threshold: d.threshold ?? current?.alert_threshold ?? DEFAULT_ALERT_THRESHOLD,
  }

  const { error } = await supabase
    .from('alert_settings')
    .upsert(row, { onConflict: 'user_id' })
  if (error) {
    console.error('[updateAlertSettings] upsert', error.message)
    return fail(SAVE_MSG)
  }

  revalidatePath('/notifications')
  return ok(undefined)
}
