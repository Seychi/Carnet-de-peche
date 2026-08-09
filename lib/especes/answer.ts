// Bloc « réponse » des fiches espèces (sprint 75, Bloc 2) — dérive la réponse que
// les gens cherchent depuis Google (maille, quota, statut du jour) de la SEULE
// source réglementaire structurée du projet : lib/regulation/data.ts (sourcée,
// datée, testée contre les fiches). Rien n'est écrit en dur ici : si la donnée
// n'existe pas, on renvoie null et l'UI n'affiche rien plutôt que de deviner.
//
// Pur → testable (lib/especes/__tests__/answer.test.ts). Aucune dépendance React.

import type { Facade, SpeciesSlug } from '@/lib/seo/programmatic'
import { getClosedWindows, getDailyQuota, type RegulationQuotaRule } from '@/lib/regulation'

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** Année + mois (1-12) en heure de Paris : les fermetures sont des dates FR. */
function parisParts(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0')
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '0')
  return { year, month }
}

function lastDayOfMonth(year: number, month: number): number {
  // Jour 0 du mois suivant = dernier jour du mois (gère les années bissextiles).
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Dernier jour de la plage de mois CONTIGUË qui contient la date (« 31 mars » pour
 * une fenêtre [2, 3] consultée en février). Gère le passage d'année ([12, 1, 2]).
 * null si la date n'est pas dans la fenêtre.
 */
export function windowEndLabel(months: number[], now: Date): string | null {
  const { year, month } = parisParts(now)
  if (!months.includes(month)) return null
  let m = month
  let y = year
  for (let i = 0; i < 12; i++) {
    const next = m === 12 ? 1 : m + 1
    if (!months.includes(next)) break
    if (next === 1) y += 1
    m = next
  }
  return `${lastDayOfMonth(y, m)} ${MONTHS_FR[m - 1]}`
}

export type SpeciesStatus = {
  facade: Facade
  /** 'open' = aucune restriction active aujourd'hui sur cette façade. */
  kind: 'open' | 'no-take' | 'closed'
  /** true quand une restriction existe dans l'année mais n'est PAS active aujourd'hui. */
  upcoming: boolean
  /** « Pêche ouverte », « Pêcher-relâcher jusqu'au 31 mars »… */
  label: string
  /** Sous-zone quand la règle n'est pas façade-large (48e parallèle, parc marin). */
  zone: string | null
  /** Phrase réglementaire sourcée (jamais reformulée ici). */
  note: string | null
}

/**
 * Statut du jour d'une espèce sur une façade, calculé à partir des fenêtres de
 * fermeture structurées. Une fenêtre zonée (48e parallèle) ne peut pas être
 * tranchée depuis la seule façade : on annonce la restriction ET sa zone, à
 * l'utilisateur de situer son spot.
 */
export function getSpeciesStatus(slug: SpeciesSlug, facade: Facade, now: Date): SpeciesStatus {
  const windows = getClosedWindows(slug, facade)
  const { month } = parisParts(now)
  const active = windows.filter((w) => w.months.includes(month))

  if (active.length === 0) {
    const next = windows[0] ?? null
    return {
      facade,
      kind: 'open',
      upcoming: next !== null,
      label: 'Pêche ouverte',
      zone: next?.zone ?? null,
      note: next?.note ?? null,
    }
  }

  // Restriction la plus forte d'abord : une fermeture prime sur un pêcher-relâcher.
  const w = active.find((x) => x.type === 'closed') ?? active[0]
  const end = windowEndLabel(w.months, now)
  const base = w.type === 'closed' ? 'Pêche fermée' : 'Pêcher-relâcher obligatoire'
  return {
    facade,
    kind: w.type === 'closed' ? 'closed' : 'no-take',
    upcoming: false,
    label: end ? `${base} jusqu’au ${end}` : base,
    zone: w.zone,
    note: w.note,
  }
}

/** Statut du jour sur chaque façade où l'espèce est présente. */
export function getSpeciesStatuses(
  slug: SpeciesSlug,
  facades: Facade[],
  now: Date,
): SpeciesStatus[] {
  return facades.map((f) => getSpeciesStatus(slug, f, now))
}

/** Quotas journaliers applicables aux façades présentes, dédoublonnés par note. */
export function getSpeciesQuotas(slug: SpeciesSlug, facades: Facade[]): RegulationQuotaRule[] {
  const seen = new Set<string>()
  const out: RegulationQuotaRule[] = []
  for (const f of facades) {
    for (const q of getDailyQuota(slug, f)) {
      if (seen.has(q.note)) continue
      seen.add(q.note)
      out.push(q)
    }
  }
  return out
}

export type MailleRow = { facades: Facade[]; minSizeCm: number | null }

/**
 * Lignes de maille pour l'affichage : les façades qui partagent la même valeur
 * sont regroupées (« 60 cm » une seule fois plutôt que deux lignes identiques).
 * Ne renvoie QUE les façades passées en entrée (celles où l'espèce est présente).
 */
export function mailleRows(
  minSizeCm: Record<Facade, number | null>,
  facades: Facade[],
): MailleRow[] {
  const rows: MailleRow[] = []
  for (const f of facades) {
    const value = minSizeCm[f] ?? null
    const same = rows.find((r) => r.minSizeCm === value)
    if (same) same.facades.push(f)
    else rows.push({ facades: [f], minSizeCm: value })
  }
  return rows
}
