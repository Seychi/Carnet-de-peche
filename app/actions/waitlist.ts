'use server'

import '@/lib/zod-config'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Email seul (minimisation RGPD). Même idiome de validation que l'auth (lib/auth/schema).
const waitlistEmail = z
  .string()
  .trim()
  .min(1, 'Ton email est requis pour continuer')
  .max(254, 'Cet email est trop long')
  .pipe(
    z.email("Cet email n'a pas l'air valide — vérifie le format (ex : pecheur@exemple.fr)"),
  )

export type WaitlistResult = { ok: true } | { ok: false; error: string }

/**
 * Liste d'attente « préviens-moi à la sortie des guides » (/techniques, F8 sprint 31).
 * Public (anon OK — la capture doit marcher déconnecté). Idempotent : upsert
 * ignoreDuplicates → ON CONFLICT DO NOTHING → jamais d'erreur de doublon ni de fuite
 * « cet email est déjà inscrit ». `source` est FIXÉ serveur (jamais piloté par le
 * client). Aucune lecture (la table n'a pas de policy SELECT).
 */
export async function joinGuideWaitlist(rawEmail: string): Promise<WaitlistResult> {
  const parsed = waitlistEmail.safeParse(rawEmail)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Email invalide.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('guide_waitlist')
    .upsert(
      { email: parsed.data, source: 'techniques' },
      { onConflict: 'email,source', ignoreDuplicates: true },
    )

  if (error) {
    console.error('[joinGuideWaitlist]', error.message)
    return { ok: false, error: "Inscription impossible pour l'instant. Réessaie dans un moment." }
  }
  return { ok: true }
}
