'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ALERT_THRESHOLD } from '@/lib/alerts/decision'

// ─── Opt-in « alerte grande marée sur mes spots favoris » (sprint 77, Bloc 10.2) ─
//
// Colonne `alert_settings.big_tide_alert_enabled` (migration 111), DISTINCTE de
// `alerts_enabled` :
//  - `alerts_enabled` = alerte PERSONNALISÉE, réservée Local/Itinérant. Son
//    activation est gatée au tier par updateAlertSettings (app/actions/alert-settings).
//  - `big_tide_alert_enabled` = alerte grande marée, ouverte à TOUS les tiers.
//    Aucun gating de tier ici, et c'est volontaire : le déclencheur est un
//    marnage MESURÉ, pas le moteur perso. C'est même l'intérêt du bloc 10, offrir
//    une raison de créer un compte GRATUIT.
//
// Opt-in explicite (défaut false en DB) et opt-out toujours libre. La RLS
// `alert_settings_*_own` fait le reste : un utilisateur ne peut écrire que sa ligne.

export type ActionResult = { ok: true } | { ok: false; error: string }

const AUTH_MSG = 'Connecte-toi pour régler tes alertes.'
const SAVE_MSG = 'Impossible d’enregistrer ton réglage. Réessaie.'

export async function setBigTideAlertOptin(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: AUTH_MSG }

  // Merge avec l'existant : ne JAMAIS réécrire les réglages d'alerte perso (seuil,
  // canaux, master switch) en activant celle-ci. L'upsert écrit toute la ligne.
  const { data: current, error: readErr } = await supabase
    .from('alert_settings')
    .select('alerts_enabled, channel_push, channel_email, alert_threshold')
    .eq('user_id', user.id)
    .maybeSingle()
  if (readErr) {
    console.error('[setBigTideAlertOptin] lecture', readErr.message)
    return { ok: false, error: SAVE_MSG }
  }

  const { error } = await supabase.from('alert_settings').upsert(
    {
      user_id: user.id,
      alerts_enabled: current?.alerts_enabled ?? false,
      channel_push: current?.channel_push ?? true,
      channel_email: current?.channel_email ?? true,
      alert_threshold: current?.alert_threshold ?? DEFAULT_ALERT_THRESHOLD,
      big_tide_alert_enabled: enabled,
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.error('[setBigTideAlertOptin] upsert', error.message)
    return { ok: false, error: SAVE_MSG }
  }

  revalidatePath('/notifications')
  return { ok: true }
}
