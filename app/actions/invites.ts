'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import '@/lib/zod-config'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Codes fondateurs & comp grants (sprint 68) — actions MODÉRATEUR.
// Les RPC SQL (migration 104) re-vérifient is_moderator en SECURITY DEFINER :
// le check TS ci-dessous ne sert qu'à renvoyer un message propre (défense en
// profondeur, pattern spots.ts).
// ---------------------------------------------------------------------------

export type ModResult = { ok: true } | { ok: false; error: string }
export type MintResult =
  | { ok: true; codes: string[] }
  | { ok: false; error: string }

const AUTH_MSG = 'Connecte-toi pour continuer.'
const MOD_MSG = 'Action réservée aux modérateurs.'

async function viewerIsModerator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_moderator === true
}

const mintSchema = z.object({
  count: z.coerce.number().int().min(1, 'Au moins 1 code.').max(200, '200 codes max par vague.'),
  label: z.string().trim().max(80, 'Étiquette trop longue (80 max).'),
  maxUses: z.coerce
    .number()
    .int()
    .min(1, 'Au moins 1 usage.')
    .max(10000, '10 000 usages max.'),
  tier: z.enum(['local', 'itinerant']),
})

/**
 * Mint N codes fondateurs via la RPC create_invite_codes (modérateur only).
 * `months` vide = comp sans expiration ; défaut proposé côté UI = 6 mois
 * (décision John 2026-07-02).
 */
export async function mintInviteCodes(formData: FormData): Promise<MintResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: AUTH_MSG }
  if (!(await viewerIsModerator(supabase, user.id))) {
    return { ok: false, error: MOD_MSG }
  }

  const parsed = mintSchema.safeParse({
    count: formData.get('count'),
    label: String(formData.get('label') ?? ''),
    maxUses: formData.get('maxUses'),
    tier: formData.get('tier'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' }
  }

  const monthsRaw = String(formData.get('months') ?? '').trim()
  const months = monthsRaw === '' ? null : Number.parseInt(monthsRaw, 10)
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 120)) {
    return { ok: false, error: 'Durée invalide (1 à 120 mois, ou vide pour sans expiration).' }
  }

  // p_grant_months est nullable en SQL (NULL = sans expiration) mais le
  // générateur de types Supabase le déclare `?: number` : `undefined` ferait
  // tomber sur le DEFAULT SQL (6 mois) au lieu de NULL → cast explicite.
  const { data, error } = await supabase.rpc('create_invite_codes', {
    p_count: parsed.data.count,
    p_label: parsed.data.label || undefined,
    p_max_uses: parsed.data.maxUses,
    p_grants_tier: parsed.data.tier,
    p_grant_months: (months === null ? null : months) as unknown as number,
  })
  if (error) {
    console.error('[mintInviteCodes]', error.message)
    return {
      ok: false,
      error: error.message.includes('moderator_only') ? MOD_MSG : 'La génération a échoué.',
    }
  }

  revalidatePath('/moderation')
  return { ok: true, codes: (data as string[]) ?? [] }
}

/**
 * Révoque un comp_grant (retire l'accès offert) via revoke_comp_grant.
 * Idempotent : un grant déjà révoqué est un succès (pattern sprint 52).
 */
export async function revokeCompGrant(grantId: string): Promise<ModResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: AUTH_MSG }
  if (!(await viewerIsModerator(supabase, user.id))) {
    return { ok: false, error: MOD_MSG }
  }

  const idParsed = z.string().uuid().safeParse(grantId)
  if (!idParsed.success) return { ok: false, error: 'Identifiant invalide.' }

  const { error } = await supabase.rpc('revoke_comp_grant', {
    p_grant_id: idParsed.data,
  })
  if (error) {
    console.error('[revokeCompGrant]', error.message)
    return {
      ok: false,
      error: error.message.includes('moderator_only') ? MOD_MSG : 'La révocation a échoué.',
    }
  }

  revalidatePath('/moderation')
  return { ok: true }
}

/**
 * Désactive un code fondateur (plus échangeable) via disable_invite_code.
 * Ne touche pas aux grants déjà émis. Idempotent.
 */
export async function disableInviteCode(code: string): Promise<ModResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: AUTH_MSG }
  if (!(await viewerIsModerator(supabase, user.id))) {
    return { ok: false, error: MOD_MSG }
  }

  const codeParsed = z.string().trim().min(4).max(40).safeParse(code)
  if (!codeParsed.success) return { ok: false, error: 'Code invalide.' }

  const { error } = await supabase.rpc('disable_invite_code', {
    p_code: codeParsed.data,
  })
  if (error) {
    console.error('[disableInviteCode]', error.message)
    return {
      ok: false,
      error: error.message.includes('moderator_only') ? MOD_MSG : 'La désactivation a échoué.',
    }
  }

  revalidatePath('/moderation')
  return { ok: true }
}
