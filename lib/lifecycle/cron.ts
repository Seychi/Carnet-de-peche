import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'
import { isExactlyDaysAfterInParis, isParisFriday, parisIsoWeekKey } from './dates'
import { J1_WINDOW_DAYS, J2_FIRST_CATCH_DAYS, J3_IMPORT_DAYS, journalRowKey } from './kinds'
import { selectLifecycleTargets, type LifecycleProfile } from './targeting'
import {
  sendFirstCatchNudgeEmail,
  sendFirstWindowEmail,
  sendImportNudgeEmail,
  sendWeeklyWindowEmail,
} from './send'

// ─── Greffon LIFECYCLE du cron `personal-window` (sprint 74, étendu S77) ──────
//
// PAS de 5e cron (contrainte du plan Hobby, répétée S40 → S72) : ce greffon vit
// dans le cron quotidien de 07:00 UTC, soit ~09:00 Paris. Bonne heure d'envoi
// pour un email d'activation, et le vendredi pour l'hebdo du week-end.
//
// TOUT est en requêtes GROUPÉES (exigence du brief : pas de N+1). Le coût DB du
// greffon est de 4 requêtes fixes, quel que soit le nombre d'inscrits :
//   1) profils onboardés  2) prises des candidats  3) journal des candidats
//   4) spots favoris des cibles J+1 et J+2
//
// ⚠️ CADENCE (sprint 77) : la relance J+2 ajoutée ici porte à TROIS le nombre de
// relances consécutives visant un compte à zéro prise (J+1, J+2, J+3), en plus du
// welcome de J+0. Les offsets vivent dans ./kinds pour que desserrer la séquence
// reste une décision produit à une ligne. Aucune de ces relances ne part à un
// compte qui a déjà logué : c'est le gate d'honnêteté de selectLifecycleTargets.
// Les envois eux-mêmes sont séquentiels et fail-soft, sous time-box.
//
// La sélection est déléguée à `selectLifecycleTargets` (pur, testé sans DB) :
// ce fichier ne fait que de l'I/O et de l'orchestration.

type Admin = ReturnType<typeof createAdminClient>

export type LifecycleGreffonResult = {
  j1: number
  /** Relance J+2 « logue ta première prise » (sprint 77, Bloc 8.4). */
  j2: number
  j3: number
  weekly: number
  /** Cibles retenues mais non envoyées (échec d'envoi, opt-out, créneau indisponible). */
  failed: number
  /** true si la time-box a coupé la boucle avant la fin (les restes repartent demain). */
  timedOut: boolean
}

const EMPTY: LifecycleGreffonResult = {
  j1: 0,
  j2: 0,
  j3: 0,
  weekly: 0,
  failed: 0,
  timedOut: false,
}

/**
 * Envoie les emails de cycle de vie dus aujourd'hui.
 *
 * `deadlineMs` = timestamp epoch au-delà duquel on s'arrête proprement (pattern
 * S72). Le cron a `maxDuration = 60` et le legacy passe AVANT : ce greffon ne
 * doit jamais être la raison d'un timeout. Ce qui n'est pas envoyé aujourd'hui
 * l'est demain, sauf J+1/J+3 dont la fenêtre est le jour même (assumé : mieux
 * vaut sauter un email que casser le cron des abonnés payants).
 *
 * Ne throw JAMAIS : l'appelant compte sur un résultat, pas sur une exception.
 */
export async function runLifecycleGreffon(
  admin: Admin,
  now: Date,
  deadlineMs: number,
): Promise<LifecycleGreffonResult> {
  try {
    // 1) Profils onboardés. `onboarded_at` et `home_department` sont garantis
    //    non nuls pour les onboardés (vérifié en prod, anchor.md §2), mais on
    //    reste défensif : selectLifecycleTargets ignore les profils incomplets.
    const { data: rows, error } = await admin
      .from('profiles')
      .select('id, home_department, onboarded_at, weekly_window_optin')
      .eq('onboarded', true)
    if (error) throw error

    const profiles: LifecycleProfile[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      onboardedAt: (r.onboarded_at as string | null) ?? null,
      // char(3) paddé en DB (« 29 ») : on trimme À LA LECTURE, une seule fois,
      // pour que tout l'aval compare des valeurs propres (leçon S66/103b).
      dept: (r.home_department as string | null)?.trim() || null,
      weeklyWindowOptin: r.weekly_window_optin === true,
    }))
    if (profiles.length === 0) return EMPTY

    // 2) Candidats. On restreint AVANT d'interroger prises et journal : sur une
    //    base qui grossit, seuls les comptes onboardés il y a exactement 1 ou 3
    //    jours (plus les opt-in du vendredi) coûtent quelque chose.
    const friday = isParisFriday(now)
    const weekKey = parisIsoWeekKey(now)

    const dateCandidates = profiles.filter((p) => {
      if (!p.onboardedAt || !p.dept) return false
      const at = new Date(p.onboardedAt)
      if (Number.isNaN(at.getTime())) return false
      // Offsets centralisés dans ./kinds (cadence = décision produit, cf le bloc
      // ⚠️ CADENCE de ce fichier) : le pré-filtre doit rester aligné sur eux,
      // sinon une cible serait éliminée AVANT selectLifecycleTargets.
      return (
        isExactlyDaysAfterInParis(now, at, J1_WINDOW_DAYS) ||
        isExactlyDaysAfterInParis(now, at, J2_FIRST_CATCH_DAYS) ||
        isExactlyDaysAfterInParis(now, at, J3_IMPORT_DAYS)
      )
    })
    const weeklyCandidates = friday
      ? profiles.filter((p) => p.weeklyWindowOptin && p.dept)
      : []

    if (dateCandidates.length === 0 && weeklyCandidates.length === 0) return EMPTY

    // 3) Qui a déjà logué ? Gate d'honnêteté : on ne relance JAMAIS un compte qui
    //    a déjà une prise (ni J+1 ni J+3). Une seule requête, bornée aux candidats.
    const hasCatch = new Set<string>()
    if (dateCandidates.length > 0) {
      const { data: catchRows, error: catchErr } = await admin
        .from('catches')
        .select('user_id')
        .in(
          'user_id',
          dateCandidates.map((p) => p.id),
        )
      if (catchErr) throw catchErr
      for (const row of catchRows ?? []) hasCatch.add(row.user_id as string)
    }

    // 4) Journal (migration 108) : ce qui est déjà parti ne repart pas.
    const candidateIds = Array.from(
      new Set([...dateCandidates, ...weeklyCandidates].map((p) => p.id)),
    )
    const alreadySent = new Set<string>()
    const { data: journalRows, error: journalErr } = await admin
      .from('lifecycle_emails')
      .select('user_id, kind, sent_key')
      .in('user_id', candidateIds)
    if (journalErr) throw journalErr
    for (const row of journalRows ?? []) {
      alreadySent.add(
        journalRowKey(
          row.user_id as string,
          row.kind as Parameters<typeof journalRowKey>[1],
          row.sent_key as string,
        ),
      )
    }

    const targets = selectLifecycleTargets(profiles, hasCatch, alreadySent, now)

    // 5) Spot favori des cibles J+1 et J+2 (pour nommer le spot dans l'email et,
    //    au J+2, pré-remplir /carnet/nouvelle?spot_id=…). Groupé, et sans
    //    coordonnée : on ne sort que id + name + slug.
    const favoriteByUser = new Map<string, { id: string; name: string; slug: string }>()
    const favoriteTargets = Array.from(new Set([...targets.j1, ...targets.j2]))
    if (favoriteTargets.length > 0) {
      const { data: favRows } = await admin
        .from('favorite_spots')
        .select('user_id, spot_id, spots(name, slug)')
        .in('user_id', favoriteTargets)
        .order('created_at', { ascending: true })
      for (const row of favRows ?? []) {
        const userId = row.user_id as string
        if (favoriteByUser.has(userId)) continue // le plus ancien favori suffit
        // Embed many-to-one : objet au runtime, tableau pour le typegen (même
        // remarque que components/spots/FavoriteSpotsList.tsx).
        const embed = row.spots as unknown
        const spot = Array.isArray(embed) ? embed[0] : embed
        const named = spot as { name?: string; slug?: string } | null
        if (named?.name && named.slug) {
          favoriteByUser.set(userId, {
            id: row.spot_id as string,
            name: named.name,
            slug: named.slug,
          })
        }
      }
    }

    const deptById = new Map(profiles.map((p) => [p.id, p.dept]))
    const result: LifecycleGreffonResult = {
      j1: 0,
      j2: 0,
      j3: 0,
      weekly: 0,
      failed: 0,
      timedOut: false,
    }

    // 6) Envois. Chaque utilisateur est isolé : un échec n'arrête ni la boucle ni
    //    le cron. Les fonctions d'envoi ne throw déjà pas, le try/catch couvre le
    //    reste (rendu React, réseau DB du journal).
    const jobs: { userId: string; run: () => Promise<boolean>; bump: () => void }[] = [
      ...targets.j1.map((userId) => ({
        userId,
        run: () =>
          sendFirstWindowEmail(
            userId,
            deptById.get(userId) as string,
            favoriteByUser.get(userId) ?? null,
            now,
          ),
        bump: () => result.j1++,
      })),
      ...targets.j2.map((userId) => ({
        userId,
        run: () => sendFirstCatchNudgeEmail(userId, favoriteByUser.get(userId) ?? null),
        bump: () => result.j2++,
      })),
      ...targets.j3.map((userId) => ({
        userId,
        run: () => sendImportNudgeEmail(userId),
        bump: () => result.j3++,
      })),
      ...targets.weekly.map((userId) => ({
        userId,
        run: () => sendWeeklyWindowEmail(userId, deptById.get(userId) as string, weekKey, now),
        bump: () => result.weekly++,
      })),
    ]

    for (const job of jobs) {
      if (Date.now() > deadlineMs) {
        result.timedOut = true
        console.warn('[cron lifecycle] time-box atteinte, reste reporté', {
          restants:
            jobs.length - (result.j1 + result.j2 + result.j3 + result.weekly + result.failed),
        })
        break
      }
      try {
        if (await job.run()) job.bump()
        else result.failed++
      } catch (e) {
        console.error('[cron lifecycle] envoi échoué (non bloquant) :', job.userId, e)
        result.failed++
      }
    }

    return result
  } catch (err) {
    console.error('[cron lifecycle] greffon échoué (non bloquant) :', err)
    return EMPTY
  }
}
