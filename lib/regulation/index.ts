import { SPECIES_BY_DB_KEY, type Facade, type SpeciesSlug } from '@/lib/seo/programmatic'
import {
  SPECIES_REGULATION,
  type SpeciesRegulation,
  type RegulationQuotaRule,
  type RegulationClosedWindow,
} from './data'

export type { SpeciesRegulation, RegulationQuotaRule, RegulationClosedWindow }
export { getFacadeForCatch, facadeFromLatLng, FACADE_LABELS } from './facade'
export type { CatchFacadeInput } from './facade'

// ─── Résolution d'espèce (pont prise ↔ fiche) ─────────────────────────────────
// `catches.species` stocke la clé DB (snake_case : 'dorade_royale', 'lieu_jaune'),
// la réglementation est indexée par slug (kebab : 'dorade-royale'). On accepte les
// deux et on retombe sur null si l'espèce est inconnue (jamais de verdict faux).

export function resolveSpeciesSlug(speciesKey: string | null | undefined): SpeciesSlug | null {
  if (!speciesKey) return null
  if (speciesKey in SPECIES_REGULATION) return speciesKey as SpeciesSlug
  return SPECIES_BY_DB_KEY[speciesKey] ?? null
}

export function getRegulation(speciesKey: string | null | undefined): SpeciesRegulation | null {
  const slug = resolveSpeciesSlug(speciesKey)
  return slug ? SPECIES_REGULATION[slug] : null
}

// ─── Maille ─────────────────────────────────────────────────────────────────

/** Maille (cm) de l'espèce sur la façade donnée. null = pas de maille (espèce non listée / absente). */
export function getMinSize(speciesKey: string | null | undefined, facade: Facade): number | null {
  return getRegulation(speciesKey)?.minSizeCm[facade] ?? null
}

export type SizeVerdict =
  /** Taille saisie sous la maille → à relâcher. */
  | { status: 'undersize'; minSizeCm: number }
  /** Taille saisie ≥ maille. */
  | { status: 'legal'; minSizeCm: number }
  /** Espèce sans maille réglementaire sur cette façade (honnête, pas un manque de données). */
  | { status: 'no-min'; minSizeCm: null }
  /** Espèce non reconnue → aucun verdict. */
  | { status: 'unknown'; minSizeCm: null }

/**
 * Vérifie une taille (cm) contre la maille façade-aware. Ne JAMAIS appeler avec une
 * façade inconnue : si la prise n'a ni spot ni géoloc, l'appelant doit afficher
 * « façade inconnue » au lieu d'un verdict (cf getFacadeForCatch → null).
 */
export function checkSize(
  speciesKey: string | null | undefined,
  facade: Facade,
  sizeCm: number,
): SizeVerdict {
  const reg = getRegulation(speciesKey)
  if (!reg) return { status: 'unknown', minSizeCm: null }
  const min = reg.minSizeCm[facade]
  if (min == null) return { status: 'no-min', minSizeCm: null }
  return sizeCm < min ? { status: 'undersize', minSizeCm: min } : { status: 'legal', minSizeCm: min }
}

// ─── Marquage ─────────────────────────────────────────────────────────────────

export function isMarquageRequired(speciesKey: string | null | undefined): boolean {
  return getRegulation(speciesKey)?.marquage ?? false
}

// ─── Quota journalier ───────────────────────────────────────────────────────

/** Règles de quota applicables à la façade (inclut les règles 'all'). [] si aucune. */
export function getDailyQuota(speciesKey: string | null | undefined, facade: Facade): RegulationQuotaRule[] {
  const reg = getRegulation(speciesKey)
  if (!reg) return []
  return reg.dailyQuota.filter((q) => q.facade === facade || q.facade === 'all')
}

// ─── Fenêtres de fermeture / pêcher-relâcher ──────────────────────────────────

/** Fenêtres de fermeture applicables à la façade (inclut 'all'). [] si aucune. */
export function getClosedWindows(
  speciesKey: string | null | undefined,
  facade: Facade,
): RegulationClosedWindow[] {
  const reg = getRegulation(speciesKey)
  if (!reg) return []
  return reg.closedWindows.filter((w) => w.facade === facade || w.facade === 'all')
}

function monthInParis(date: Date): number {
  // 1-12 en heure de Paris (les fermetures sont des dates FR).
  const m = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', month: 'numeric' }).format(date)
  return parseInt(m, 10)
}

export type ClosedSeasonResult = {
  /** Fenêtres actives ce mois-ci sur la façade. */
  active: RegulationClosedWindow[]
  /**
   * true UNIQUEMENT si une fermeture façade-large (zone null) interdit le
   * prélèvement ce mois-ci. Quand toutes les fenêtres actives portent une `zone`
   * (ex. 48e parallèle), on ne peut pas trancher sans la position fine → false,
   * et l'appelant affiche la/les fenêtre(s) avec leur note (honnête).
   */
  strictlyClosed: boolean
}

/**
 * Fermetures actives pour une espèce/façade à une date donnée. Ne ferme « dur »
 * (strictlyClosed) que pour les fenêtres façade-larges (sans sous-zone), car une
 * fenêtre zonée (48e parallèle) ne peut pas être tranchée depuis la seule façade.
 */
export function isClosedSeason(
  speciesKey: string | null | undefined,
  facade: Facade,
  date: Date,
): ClosedSeasonResult {
  const month = monthInParis(date)
  const active = getClosedWindows(speciesKey, facade).filter((w) => w.months.includes(month))
  const strictlyClosed = active.some((w) => w.zone === null && (w.type === 'closed' || w.type === 'no-take'))
  return { active, strictlyClosed }
}
