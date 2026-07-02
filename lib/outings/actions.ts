'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createOutingSchema, type CreateOutingInput } from './schema'
import { recomputeSoloChallenges, type CompletedChallenge } from '@/lib/gamification/challenges-solo'
import { getUserXpOrNull } from '@/lib/gamification/progress'
import { emitDopamineNotifications } from '@/lib/notifications/dopamine'
import { emitRankChangeNotifications } from '@/lib/notifications/rank'

// Action de création d'une sortie (y compris bredouille). RLS owner-only : on insère
// avec user_id = l'utilisateur courant ; une sortie n'apparaît jamais dans catches,
// la heatmap ou le fil (table séparée). Aucun geom précis.

export async function createOuting(
  input: CreateOutingInput,
): Promise<{ id: string } | { error: string }> {
  const parsed = createOutingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }
  const d = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // XP AVANT le log (pour détecter un éventuel passage de niveau via un crédit de défi).
  // getUserXpOrNull renvoie null si la lecture échoue → pas de faux palier. Best-effort.
  const xpBefore = await getUserXpOrNull(user.id, supabase).catch(() => null)

  const { data, error } = await supabase
    .from('outings')
    .insert({
      user_id: user.id,
      started_at: d.started_at,
      ended_at: d.ended_at ?? null,
      department: d.department,
      spot_id: d.spot_id ?? null,
      technique: d.technique ?? null,
      species_targeted: d.species_targeted ?? null,
      notes: d.notes ?? null,
    })
    .select('id, created_at')
    .single()

  if (error || !data) {
    console.error('[outings/actions] createOuting error :', error)
    return { error: 'Impossible d’enregistrer la sortie. Réessaie.' }
  }

  // Défis solo (Sprint 63) : une sortie loguée fait progresser « Logue une sortie » et les
  // défis mensuels. On passe sinceIso pour récupérer les complétions fraîches, puis on émet
  // les notifs dopamine (level up + défi relevé). Best-effort STRICT — la sortie est déjà
  // enregistrée. Pas de CelebrationOverlay ici (le formulaire de sortie n'en a pas) : le
  // moment de fête passe par la notif in-app (+ push si activé).
  let newlyCompleted: CompletedChallenge[] = []
  try {
    const res = await recomputeSoloChallenges({
      supabase,
      userId: user.id,
      sinceIso: data.created_at ?? null,
    })
    newlyCompleted = res.newlyCompleted
  } catch (e) {
    console.error('[outings/actions] recomputeSoloChallenges (non bloquant) :', e)
  }

  // XP après le log + les crédits (série hebdo via trigger 099, défis). Lue une fois, partagée.
  const xpAfter = await getUserXpOrNull(user.id, supabase).catch(() => null)
  try {
    await emitDopamineNotifications({
      userId: user.id,
      xpBefore,
      xpAfter,
      celebration: null,
      completedChallenges: newlyCompleted,
    })
  } catch (e) {
    console.error('[outings/actions] emitDopamineNotifications (non bloquant) :', e)
  }
  // Notifs de rang « X t'a dépassé » (sprint 67) : une sortie peut créditer de l'XP (série).
  try {
    await emitRankChangeNotifications({ actorId: user.id, xpBefore, xpAfter })
  } catch (e) {
    console.error('[outings/actions] emitRankChangeNotifications (non bloquant) :', e)
  }

  revalidatePath('/carnet')
  return { id: data.id }
}
