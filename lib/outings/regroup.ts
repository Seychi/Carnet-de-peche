'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import '@/lib/zod-config'
import { z } from 'zod'

// ─── Regrouper des prises en sortie rétroactive (Sprint 73, solo-first) ───────
// « Regrouper en sortie » prend des prises d'une MÊME journée civile qui ne sont
// rattachées à aucune sortie, et crée une outing SOLO rétroactive owner-scopée.
//
// ⚠️ INVARIANT DUR (surface anti-farm scellée au S69) : cette action NE crée AUCUN
// événement XP. Elle N'appelle PAS createOuting (qui émet de l'XP + des notifs
// dopamine). Elle insère l'outing DIRECTEMENT, puis rattache les prises. Aucun
// award_xp / xp_events / emitDopamine* ici, jamais.
//
// Privacy : aucune coordonnée. On lit les prises via catches_for_viewer (geom-free,
// owner-scopé) et on n'écrit sur outings que département + fenêtre temporelle.

type Result = { id: string } | { error: string }

const regroupSchema = z.object({
  catchIds: z
    .array(z.string().uuid('Prise invalide.'))
    .min(1, 'Sélectionne au moins une prise.')
    .max(30, 'Trop de prises sélectionnées (30 max).'),
})

export type RegroupCatchesInput = z.infer<typeof regroupSchema>

// Jour civil (Europe/Paris) d'un timestamp ISO → 'YYYY-MM-DD'. On regroupe sur le
// fuseau local du pêcheur : une prise à 23h et une à 1h du matin ne sont pas le
// même jour, une prise à 1h et une à 23h le même jour le sont.
function parisDayKey(iso: string): string {
  // fr-CA formate en 'YYYY-MM-DD' (ordre ISO), pratique pour la comparaison.
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/**
 * Crée une sortie rétroactive à partir de prises d'une même journée.
 * Renvoie l'id de la sortie créée (pour ouvrir le composer de post), ou une erreur.
 */
export async function regroupCatchesIntoOuting(
  input: RegroupCatchesInput,
): Promise<Result> {
  const parsed = regroupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Sélection invalide.' }
  }
  // Dédoublonne les ids en entrée (le client peut envoyer un doublon).
  const catchIds = [...new Set(parsed.data.catchIds)]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Connecte-toi pour regrouper tes prises.' }

  // 1) Lecture des prises via catches_for_viewer (geom-free), owner-scopée. On ne
  //    lit que ce qui sert : jour, département, spot de groupage, état de rattachement.
  const { data: rows, error: readErr } = await supabase
    .from('catches_for_viewer')
    .select('id, caught_at, department, spot_id, outing_id')
    .eq('user_id', user.id)
    .in('id', catchIds)

  if (readErr) {
    console.error('[regroup] read', readErr.message)
    return { error: 'Impossible de lire tes prises. Réessaie.' }
  }

  // 2) Toutes les prises demandées doivent exister ET être à moi.
  if (!rows || rows.length !== catchIds.length) {
    return { error: 'Certaines prises sont introuvables ou ne sont pas à toi.' }
  }

  // 3) Aucune ne doit déjà appartenir à une sortie.
  if (rows.some((r) => r.outing_id != null)) {
    return { error: 'Une de ces prises est déjà rattachée à une sortie.' }
  }

  // 4) caught_at requis pour la fenêtre temporelle + même jour civil (Paris).
  const times: string[] = []
  for (const r of rows) {
    if (!r.caught_at) {
      return { error: 'Une prise n’a pas de date : impossible de la regrouper.' }
    }
    times.push(r.caught_at)
  }
  const dayKeys = new Set(times.map(parisDayKey))
  if (dayKeys.size > 1) {
    return { error: 'Ces prises ne sont pas du même jour. Regroupe une seule journée.' }
  }

  // started_at / ended_at = bornes de la journée de pêche.
  const sorted = [...times].sort()
  const started_at = sorted[0]
  const ended_at = sorted[sorted.length - 1]

  // 5) Département : commun aux prises s'il est unique et non null, sinon le
  //    département d'attache du profil (home_department). outings.department est
  //    NOT NULL : sans département déterminable, on refuse proprement.
  const depts = new Set(
    rows.map((r) => r.department).filter((d): d is string => !!d),
  )
  let department: string | null = depts.size === 1 ? [...depts][0] : null
  if (!department) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('home_department')
      .eq('id', user.id)
      .maybeSingle()
    department = profile?.home_department ?? null
  }
  if (!department) {
    return {
      error:
        'Impossible de déterminer le département de la sortie. Renseigne un spot ou ton département d’attache.',
    }
  }

  // 6) spot_id : conservé seulement si toutes les prises partagent le même spot non null.
  const spotIds = new Set(
    rows.map((r) => r.spot_id).filter((s): s is string => !!s),
  )
  const spot_id = spotIds.size === 1 && rows.every((r) => r.spot_id != null) ? [...spotIds][0] : null

  // 7) Insertion DIRECTE de l'outing (owner-scopé). PAS de createOuting → PAS d'XP.
  //    is_retroactive=true : la sortie est REGROUPÉE a posteriori → exclue du défi
  //    `outing_logged` (migration 107b) pour ne créer AUCUN événement XP (invariant
  //    anti-farm S69). La série reste saine (déjà filtrée is_competitive côté DB).
  const { data: outing, error: insErr } = await supabase
    .from('outings')
    .insert({
      user_id: user.id,
      started_at,
      ended_at,
      department,
      spot_id,
      is_retroactive: true,
    })
    .select('id')
    .single()

  if (insErr || !outing) {
    console.error('[regroup] insert outing', insErr?.message)
    return { error: 'Impossible de créer la sortie. Réessaie.' }
  }

  // 8) Rattachement des prises. Le garde-fou `.is('outing_id', null)` empêche de
  //    voler une prise déjà regroupée entre-temps (idempotence raisonnable).
  const { data: attached, error: updErr } = await supabase
    .from('catches')
    .update({ outing_id: outing.id })
    .in('id', catchIds)
    .eq('user_id', user.id)
    .is('outing_id', null)
    .select('id')

  if (updErr) {
    console.error('[regroup] attach', updErr.message)
    // Nettoyage : l'outing orpheline ne doit pas rester (elle fausserait le carnet).
    await supabase.from('outings').delete().eq('id', outing.id).eq('user_id', user.id)
    return { error: 'Impossible de rattacher tes prises à la sortie. Réessaie.' }
  }
  // Atomicité : on exige que TOUTES les prises demandées aient été rattachées. Si une
  // seule a changé entre la lecture et l'update (rattachée/supprimée dans un autre
  // onglet, double-clic), on annule tout plutôt que de créer une sortie partielle
  // silencieuse. Supprimer l'outing remet outing_id à null sur les prises déjà
  // rattachées (ON DELETE SET NULL) → aucun état incohérent ne subsiste.
  if (!attached || attached.length !== catchIds.length) {
    await supabase.from('outings').delete().eq('id', outing.id).eq('user_id', user.id)
    return { error: 'Une de ces prises a changé entre-temps. Recharge la page et réessaie.' }
  }

  revalidatePath('/carnet')
  revalidatePath('/carnet/sorties')
  return { id: outing.id }
}
