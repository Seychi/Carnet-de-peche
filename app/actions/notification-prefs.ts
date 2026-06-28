'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  NOTIFICATION_PREF_KEYS,
  type NotificationPrefKey,
} from '@/lib/notifications/prefs-meta'

// Server actions des préférences de notification push (sprint 49 WS C).
//
// Sécurité : tout est scopé à auth.uid() — on lit/écrit UNIQUEMENT le profil du
// viewer (.eq('id', user.id) + RLS « update own » sur profiles). Aucune lecture de
// coordonnée, aucun accès cross-user.
//
// 'use server' : ce module n'exporte QUE des fonctions async. Les constantes
// (clés, libellés) vivent dans lib/notifications/prefs-meta.ts (fichier neutre).

function isValidKey(type: string): type is NotificationPrefKey {
  return (NOTIFICATION_PREF_KEYS as readonly string[]).includes(type)
}

/**
 * Lit l'objet notification_prefs du viewer. Défaut {} si absent/non connecté.
 * (Toutes les prefs comptent alors comme activées : absent = activé.)
 */
export async function getNotificationPrefs(): Promise<Record<string, unknown>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[getNotificationPrefs]', error.message)
    return {}
  }

  const prefs = data?.notification_prefs
  // notification_prefs est jsonb NOT NULL DEFAULT '{}' (migration 086) mais on
  // garde la garde objet par sûreté (un jsonb peut techniquement être un scalaire).
  if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
    return prefs as Record<string, unknown>
  }
  return {}
}

/**
 * Active/désactive un type de push (merge de la clé dans notification_prefs).
 * `enabled=true` retire la clé (revient au défaut « activé ») ; `enabled=false`
 * pose explicitement la valeur "false" (opt-out). Scopé au profil du viewer.
 */
export async function setNotificationPref(
  type: string,
  enabled: boolean,
): Promise<{ ok: boolean }> {
  if (!isValidKey(type)) return { ok: false }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  // Lecture de l'état courant pour merger (on ne réécrit pas les autres clés).
  const { data: current, error: readErr } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', user.id)
    .maybeSingle()
  if (readErr) {
    console.error('[setNotificationPref] lecture', readErr.message)
    return { ok: false }
  }

  const base =
    current?.notification_prefs &&
    typeof current.notification_prefs === 'object' &&
    !Array.isArray(current.notification_prefs)
      ? { ...(current.notification_prefs as Record<string, unknown>) }
      : {}

  if (enabled) {
    // Activé = défaut : on retire la clé pour garder l'objet propre.
    delete base[type]
  } else {
    base[type] = false
  }

  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: base })
    .eq('id', user.id)
  if (error) {
    console.error('[setNotificationPref] écriture', error.message)
    return { ok: false }
  }

  revalidatePath('/notifications')
  return { ok: true }
}
