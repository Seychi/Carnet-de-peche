import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Liste de suppression d'emails (sprint 78, migration 112).
 *
 * Règle : une adresse qui a rebondi durement, ou qui nous a signalés comme
 * indésirables, ne reçoit plus JAMAIS d'email de notre part. Ni transactionnel,
 * ni cycle de vie, ni alerte.
 *
 * Pourquoi c'est nécessaire ici : la confirmation d'email est désactivée sur le
 * projet (décision assumée, elle viderait de son sens l'inscription différée du
 * sprint 77). Des adresses invalides entrent donc en base, et le sprint 77 vient
 * d'ajouter deux flux d'emails qui vont leur écrire. Chaque rebond dégrade la
 * réputation du domaine, et la première victime serait l'alerte de marnage,
 * c'est-à-dire le seul bénéfice qu'on ne peut pas avoir sans compte.
 *
 * ⚠️ Ce module ne throw JAMAIS. Un incident sur la liste de suppression ne doit
 * pas empêcher un envoi légitime (on préfère un email de trop qu'un cron cassé),
 * SAUF pour `isEmailSuppressed`, qui échoue en « non supprimé » à dessein : voir
 * le commentaire de la fonction.
 */

export type SuppressionReason = 'hard_bounce' | 'complaint' | 'invalid_domain' | 'manual'

/** Normalisation unique : la contrainte DB impose `email = lower(email)`. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Cette adresse est-elle sur la liste de suppression ?
 *
 * ⚠️ En cas d'erreur DB, renvoie `false` (donc « on envoie »). C'est un choix :
 * l'alternative (bloquer tous les envois quand la base tousse) transformerait un
 * incident de lecture en panne totale des emails, alertes comprises. Le coût du
 * choix inverse est un email de trop vers une adresse morte, ce qui est déjà la
 * situation actuelle.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('email_suppressions')
      .select('email')
      .eq('email', normalizeEmail(email))
      .maybeSingle()
    if (error) {
      console.error('[email] lecture de la liste de suppression échouée', error.message)
      return false
    }
    return data != null
  } catch (err) {
    console.error('[email] exception sur la liste de suppression', err)
    return false
  }
}

/**
 * Ajoute une adresse à la liste. Idempotent : un second rebond sur la même
 * adresse ne crée pas de doublon et ne réécrit pas la raison d'origine (on garde
 * la PREMIÈRE, qui est la plus proche de la cause réelle).
 */
export async function suppressEmail(input: {
  email: string
  reason: SuppressionReason
  detail?: string | null
  userId?: string | null
}): Promise<{ suppressed: boolean }> {
  const email = normalizeEmail(input.email)
  if (!email.includes('@')) return { suppressed: false }
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('email_suppressions')
      .upsert(
        {
          email,
          reason: input.reason,
          detail: input.detail ?? null,
          user_id: input.userId ?? null,
        },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    if (error) {
      console.error('[email] ajout à la liste de suppression échoué', error.message)
      Sentry.captureException(new Error(`suppression: ${error.message}`))
      return { suppressed: false }
    }
    console.warn('[email] adresse supprimée des envois', { reason: input.reason })
    return { suppressed: true }
  } catch (err) {
    console.error('[email] exception à l’ajout en liste de suppression', err)
    Sentry.captureException(err)
    return { suppressed: false }
  }
}
