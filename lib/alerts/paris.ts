// ─── Helpers Europe/Paris pour les alertes (sprint 72) ─────────────────────────
// PUR (Intl uniquement, aucune I/O). Toute la logique calendrier/heure des alertes
// raisonne en heure de Paris (leçon « heures de soleil » sprint 35) : le pêcheur
// planifie sa veille en heure française, pas en UTC.
//
// On RÉUTILISE les formatteurs existants de lib/solunar/format (même Intl, même TZ)
// au lieu d'en dupliquer : parisDateKey == formatLocalDate (en-CA → YYYY-MM-DD).

import { formatLocalDate, formatLocalTime } from '@/lib/solunar/format'

const PARIS_TZ = 'Europe/Paris'

/** Jour civil de Paris (YYYY-MM-DD) d'un instant. */
export function parisDateKey(d: Date): string {
  return formatLocalDate(d)
}

/**
 * Clé du jour SUIVANT une clé YYYY-MM-DD, en arithmétique de calendrier pure
 * (Date.UTC). Robuste aux bascules d'heure d'été/hiver : ajouter 24 h à un instant
 * puis relire la date de Paris peut sauter un jour la nuit du changement d'heure ;
 * incrémenter la date civile, jamais.
 */
export function nextDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + 1)).toISOString().slice(0, 10)
}

/** Le « demain » de Paris (YYYY-MM-DD) vu depuis un instant donné. */
export function tomorrowParisDateKey(now: Date): string {
  return nextDateKey(parisDateKey(now))
}

/** Minutes écoulées depuis minuit, heure de Paris (0-1439). Sert aux quiet hours. */
export function parisMinutesOfDay(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10)
  return (get('hour') % 24) * 60 + get('minute')
}

/**
 * Libellé de fenêtre du contrat SpotAlertPayload : « demain 06:10 » (heure de Paris).
 * L'appelant garantit que startTimeISO tombe bien le LENDEMAIN (cf decision.ts) ;
 * ici on ne fait que formater.
 */
export function buildWindowLabel(startTimeISO: string): string {
  return `demain ${formatLocalTime(new Date(startTimeISO))}`
}
