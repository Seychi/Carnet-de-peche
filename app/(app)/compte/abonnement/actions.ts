'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Met à jour la préférence d'emails de relance/conseils (marketing) de
 * l'utilisateur courant. RLS own (UPDATE de son propre profil). Opt-out 1 clic.
 */
// ─── Code fondateur (sprint 68) ──────────────────────────────────────────────

export type RedeemState =
  | { status: 'idle' }
  | { status: 'granted'; tier: string; expiresAt: string | null }
  | { status: 'error'; error: string }

const redeemSchema = z
  .string()
  .trim()
  .min(4, 'Code trop court.')
  .max(40, 'Code trop long.')

// Messages doux, jamais bloquants (le compte n'est pas affecté par un échec).
const REDEEM_ERRORS: Record<string, string> = {
  invalid: 'Code non reconnu. Vérifie la saisie.',
  expired: 'Ce code a expiré.',
  exhausted: 'Ce code a déjà été utilisé le nombre maximal de fois.',
  already_redeemed: 'Tu as déjà échangé ce code.',
  auth_required: 'Connecte-toi pour échanger un code.',
}

/**
 * Échange un code fondateur contre l'abonnement offert (comp_grant) via la RPC
 * redeem_comp_code (migration 104, SECURITY DEFINER, authenticated only).
 * Pas de revalidatePath ici : le client affiche d'abord la célébration puis
 * fait router.refresh() à la fermeture (sinon le formulaire serait démonté
 * avant que l'overlay n'apparaisse).
 */
export async function redeemFounderCode(
  _prev: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  const parsed = redeemSchema.safeParse(formData.get('code'))
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', error: REDEEM_ERRORS.auth_required }

  const { data, error } = await supabase.rpc('redeem_comp_code', {
    p_code: parsed.data,
  })
  if (error) {
    console.error('[abonnement] redeem_comp_code', error.message)
    return { status: 'error', error: 'Une erreur est survenue. Réessaie dans quelques instants.' }
  }

  const res = data as { ok?: boolean; tier?: string; expires_at?: string | null; error?: string } | null
  if (res?.ok !== true) {
    const code = res?.error ?? 'invalid'
    return { status: 'error', error: REDEEM_ERRORS[code] ?? REDEEM_ERRORS.invalid }
  }

  return {
    status: 'granted',
    tier: res.tier ?? 'local',
    expiresAt: res.expires_at ?? null,
  }
}

export async function setMarketingOptin(optin: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ marketing_email_optin: optin })
    .eq('id', user.id)
  if (error) {
    console.error('[abonnement] échec maj préférence email', error)
    return { ok: false }
  }
  revalidatePath('/compte/abonnement')
  return { ok: true }
}
