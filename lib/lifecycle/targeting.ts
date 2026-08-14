// Ciblage PUR des emails de cycle de vie (sprint 74, migration 108). Aucune I/O :
// prend en entrée des données déjà lues en requêtes GROUPÉES par le greffon cron
// (lib/lifecycle/cron.ts), renvoie la liste des user_id éligibles par kind.
// Testable sans mock Supabase — c'est tout l'intérêt de l'isoler ici.

import { isExactlyDaysAfterInParis, isParisFriday, parisIsoWeekKey } from './dates'
import {
  J1_WINDOW_DAYS,
  J2_FIRST_CATCH_DAYS,
  J3_IMPORT_DAYS,
  journalRowKey,
  ONCE_SENT_KEY,
} from './kinds'

/** Profil minimal nécessaire au ciblage (colonnes lues par le greffon cron). */
export type LifecycleProfile = {
  id: string
  /** ISO timestamptz, ou null si pas (encore) onboardé (défensif, ne devrait pas arriver ici). */
  onboardedAt: string | null
  /** Département trimmé (l'appelant a déjà fait le .trim() du char(3) padded, leçon 103b). */
  dept: string | null
  weeklyWindowOptin: boolean
}

export type LifecycleTargets = {
  /** Emails J+1 « ton créneau » (comptes à 0 prise, exactement 1 jour après onboarding). */
  j1: string[]
  /** Emails J+2 « logue ta première prise » (toujours 0 prise, exactement 2 jours après). */
  j2: string[]
  /** Emails J+3 « débloque tes tendances » (toujours 0 prise, exactement 3 jours après). */
  j3: string[]
  /** Emails hebdo « ton créneau du week-end » (opt-in + vendredi uniquement). */
  weekly: string[]
}

/**
 * Sélectionne, pour l'instant `now`, les utilisateurs éligibles à chaque email de
 * cycle de vie. `hasCatch` = Set des user_id ayant au moins une prise (gate
 * honnêteté : on ne relance jamais qui a déjà loggé). `alreadySent` = Set de
 * `journalRowKey(...)` déjà présents dans `lifecycle_emails` (dédup, migrations
 * 108 puis 111 pour le J+2).
 *
 * Un profil sans département ou sans date d'onboarding est ignoré partout : on ne
 * peut rien calculer d'honnête sans ces deux données (jamais de créneau inventé).
 */
export function selectLifecycleTargets(
  profiles: LifecycleProfile[],
  hasCatch: Set<string>,
  alreadySent: Set<string>,
  now: Date,
): LifecycleTargets {
  const todayIsFriday = isParisFriday(now)
  const weekKey = parisIsoWeekKey(now)

  const targets: LifecycleTargets = { j1: [], j2: [], j3: [], weekly: [] }

  for (const profile of profiles) {
    if (!profile.dept || !profile.onboardedAt) continue
    const onboardedAt = new Date(profile.onboardedAt)
    if (Number.isNaN(onboardedAt.getTime())) continue

    const stillNoCatch = !hasCatch.has(profile.id)

    if (
      stillNoCatch &&
      isExactlyDaysAfterInParis(now, onboardedAt, J1_WINDOW_DAYS) &&
      !alreadySent.has(journalRowKey(profile.id, 'j1_window', ONCE_SENT_KEY))
    ) {
      targets.j1.push(profile.id)
    }

    // J+2 « logue ta première prise » (sprint 77, Bloc 8.4). Même gate d'honnêteté
    // que J+1/J+3 : un compte qui a DÉJÀ logué ne le reçoit jamais. Un seul email,
    // une seule action, dédup à vie via lifecycle_emails (kind j2_first_catch).
    if (
      stillNoCatch &&
      isExactlyDaysAfterInParis(now, onboardedAt, J2_FIRST_CATCH_DAYS) &&
      !alreadySent.has(journalRowKey(profile.id, 'j2_first_catch', ONCE_SENT_KEY))
    ) {
      targets.j2.push(profile.id)
    }

    if (
      stillNoCatch &&
      isExactlyDaysAfterInParis(now, onboardedAt, J3_IMPORT_DAYS) &&
      !alreadySent.has(journalRowKey(profile.id, 'j3_import', ONCE_SENT_KEY))
    ) {
      targets.j3.push(profile.id)
    }

    if (
      todayIsFriday &&
      profile.weeklyWindowOptin &&
      !alreadySent.has(journalRowKey(profile.id, 'weekly_window', weekKey))
    ) {
      targets.weekly.push(profile.id)
    }
  }

  return targets
}
