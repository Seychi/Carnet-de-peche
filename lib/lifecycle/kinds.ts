// Types partagés du cycle de vie des emails d'activation (sprint 74, migration 108).
//
// `LifecycleKind` doit rester synchronisé avec le CHECK `lifecycle_emails_kind_check`
// de la migration 108 (welcome / j1_window / j3_import / weekly_window). `sent_key`
// vaut 'once' pour les envois uniques (welcome, j1, j3) et une clé de semaine ISO
// ('2026-W32', cf lib/lifecycle/dates.ts::parisIsoWeekKey) pour l'hebdo, conformément
// au CHECK `lifecycle_emails_sent_key_check` (regex ^\d{4}-W\d{2}$ | 'once').

export type LifecycleKind = 'welcome' | 'j1_window' | 'j3_import' | 'weekly_window'

/** `sent_key` des envois uniques (welcome, J+1, J+3) : un seul par utilisateur, jamais rejoué. */
export const ONCE_SENT_KEY = 'once'

/**
 * Clé de membership pour les Sets en mémoire (journal déjà envoyé). Format neutre
 * (séparateur `::`, absent des uuid/kind/semaine ISO) — jamais persisté tel quel,
 * seulement utilisé pour des tests d'appartenance PURS côté TypeScript.
 */
export function journalRowKey(userId: string, kind: LifecycleKind, sentKey: string): string {
  return `${userId}::${kind}::${sentKey}`
}
