// Types partagés du cycle de vie des emails d'activation (sprint 74, migration 108 ;
// étendu au sprint 77, migration 111).
//
// `LifecycleKind` doit rester synchronisé avec le CHECK `lifecycle_emails_kind_check`
// (welcome / j1_window / j2_first_catch / j3_import / weekly_window). `sent_key`
// vaut 'once' pour les envois uniques (welcome, j1, j2, j3) et une clé de semaine ISO
// ('2026-W32', cf lib/lifecycle/dates.ts::parisIsoWeekKey) pour l'hebdo, conformément
// au CHECK `lifecycle_emails_sent_key_check` (regex ^\d{4}-W\d{2}$ | 'once').

export type LifecycleKind =
  | 'welcome'
  | 'j1_window'
  | 'j2_first_catch'
  | 'j3_import'
  | 'weekly_window'

/** `sent_key` des envois uniques (welcome, J+1, J+2, J+3) : un seul par utilisateur, jamais rejoué. */
export const ONCE_SENT_KEY = 'once'

// ─── Cadence de la séquence d'activation ───────────────────────────────────────
// ⚠️ CADENCE : ces trois relances ne visent QUE les comptes à zéro prise, et elles
// tombent désormais sur trois jours CONSÉCUTIFS (J+1, J+2, J+3), en plus du welcome
// de J+0. Soit 4 emails en 4 jours pour un compte qui n'a rien logué.
//
// C'est le coût assumé du Bloc 8 du sprint 77 (le J+2 est une demande explicite du
// brief), MAIS c'est une décision produit qui appartient à John, pas au code. Les
// offsets sont donc centralisés ICI : desserrer la séquence (par exemple J+3 -> J+5)
// est une modification d'UNE ligne, sans toucher au ciblage ni aux tests de dédup.
export const J1_WINDOW_DAYS = 1
export const J2_FIRST_CATCH_DAYS = 2
export const J3_IMPORT_DAYS = 3

/**
 * Clé de membership pour les Sets en mémoire (journal déjà envoyé). Format neutre
 * (séparateur `::`, absent des uuid/kind/semaine ISO) — jamais persisté tel quel,
 * seulement utilisé pour des tests d'appartenance PURS côté TypeScript.
 */
export function journalRowKey(userId: string, kind: LifecycleKind, sentKey: string): string {
  return `${userId}::${kind}::${sentKey}`
}
