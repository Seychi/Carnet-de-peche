// Helpers de date PURS pour le cycle de vie des emails d'activation (sprint 74).
// Toute la logique calendrier raisonne en Europe/Paris (leçon « heures de soleil »
// sprint 35 : un cron qui tourne en UTC ne doit jamais décider un « J+1 » ou un
// « vendredi » sur le jour UTC, le pêcheur planifie en heure française).
//
// On RÉUTILISE parisDateKey de lib/alerts/paris.ts (seule source de vérité pour le
// jour civil de Paris, cf sprint 72) plutôt que de le dupliquer. Le reste
// (arithmétique de semaine ISO, jour de la semaine, libellés relatifs) est propre
// à ce sprint et vit ici, testé isolément.

import { parisDateKey } from '@/lib/alerts/paris'

export { parisDateKey }

/**
 * Jour ISO (1 = lundi … 7 = dimanche) d'une clé YYYY-MM-DD. Arithmétique de
 * calendrier pure (Date.UTC à midi neutre) : jamais de dépendance au fuseau
 * d'exécution du process.
 */
export function isoWeekdayOfDateKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  const wd = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay() // 0=dim … 6=sam
  return wd === 0 ? 7 : wd
}

/**
 * Clé YYYY-MM-DD décalée de `days` jours (négatif = avant, positif = après).
 * Arithmétique de calendrier pure (Date.UTC gère nativement les débordements de
 * mois/année) : même idiome que `nextDateKey` de lib/alerts/paris.ts, généralisé
 * à un delta quelconque plutôt que +1 seul.
 */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10)
}

/**
 * Semaine ISO 8601 (« 2026-W32 ») du jour de Paris de `now`. Algorithme standard :
 * l'année ISO d'une semaine est celle du JEUDI de cette semaine (invariant utilisé
 * pour le test : le 4 janvier appartient TOUJOURS à la semaine 1 de son année).
 * Sert de `sent_key` pour l'email hebdo (dédup migration 108, CHECK ^\d{4}-W\d{2}$).
 */
export function parisIsoWeekKey(now: Date): string {
  const [y, m, d] = parisDateKey(now).split('-').map(Number)
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  const dayNum = date.getUTCDay() || 7 // 1=lundi … 7=dimanche
  date.setUTCDate(date.getUTCDate() + 4 - dayNum) // jeudi de la semaine ISO courante
  const isoYear = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`
}

/** Vrai si `now`, lu en Europe/Paris, tombe un vendredi. */
export function isParisFriday(now: Date): boolean {
  return isoWeekdayOfDateKey(parisDateKey(now)) === 5
}

/** Vrai si `now`, lu en Europe/Paris, tombe un samedi ou un dimanche. */
export function isParisWeekend(now: Date): boolean {
  const wd = isoWeekdayOfDateKey(parisDateKey(now))
  return wd === 6 || wd === 7
}

/**
 * Vrai si `onboardedAt`, lu en jour civil de Paris, tombe exactement `days` jours
 * avant le jour civil de Paris de `now`. Ciblage J+1 / J+3 (migration 108) : on
 * gate sur `profiles.onboarded_at`, JAMAIS sur un compteur d'exécutions du cron
 * (un cron qui saute un jour ne doit ni doubler ni perdre silencieusement la cible
 * suivante, cf le journal `lifecycle_emails` pour la dédup réelle).
 */
export function isExactlyDaysAfterInParis(now: Date, onboardedAt: Date, days: number): boolean {
  return parisDateKey(onboardedAt) === shiftDateKey(parisDateKey(now), -days)
}

/**
 * Libellé relatif FR d'un instant ISO, vu depuis `now` (Europe/Paris) :
 * « Aujourd'hui » / « Demain » / nom du jour (« Vendredi »). Porté depuis
 * components/catches/NextWindowInsight.tsx (même idiome, même DA), version pure
 * et testable pour les emails : `now` est un paramètre explicite (jamais
 * `Date.now()` en interne), pas de composant React.
 */
export function formatRelativeDayLabel(iso: string, now: Date): string {
  const dateKey = parisDateKey(new Date(iso))
  const todayKey = parisDateKey(now)
  if (dateKey === todayKey) return 'Aujourd’hui'
  if (dateKey === shiftDateKey(todayKey, 1)) return 'Demain'
  const day = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
  return day.charAt(0).toUpperCase() + day.slice(1)
}

/**
 * « Demain 06:10 » : libellé complet d'une fenêtre solunar pour les emails.
 * `startLocal` vient déjà formaté (HH:MM, heure de Paris) sur `FishingWindow` :
 * on ne reformat pas l'heure, seulement le jour relatif.
 */
export function formatWindowWhen(startTimeISO: string, startLocal: string, now: Date): string {
  return `${formatRelativeDayLabel(startTimeISO, now)} ${startLocal}`
}
