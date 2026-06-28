// Helper « fermeture d'espèce » (sprint 49 « Push & engagement », émetteur species-closure).
//
// Greffé dans un cron faible fréquence (personal-window, ~07:00) : ZÉRO appel réseau.
// Logique 100 % en mémoire à partir de la réglementation déjà sourcée
// (lib/regulation/data.ts → SPECIES_REGULATION[].closedWindows). Seules bar (mois
// [2,3]) et lieu-jaune (mois [1-4]) ont une fenêtre de fermeture aujourd'hui.
//
// INVARIANTS :
// - On NORMALISE le slug AVANT de croiser : favorite_species stocke des dbKeys
//   (underscore, ex. 'lieu_jaune') tandis que SpeciesSlug est en kebab ('lieu-jaune').
//   Le pont est SPECIES_BY_DB_KEY (référentiel unique). Un favori inconnu est ignoré.
// - On notifie À J-N jours AVANT le 1er du mois où la fermeture COMMENCE (et non
//   pendant). « commence » = premier mois consécutif d'une fenêtre (mois M tel que
//   M-1 n'est pas déjà fermé), pour ne pas re-prévenir à chaque mois d'une longue
//   fermeture.
// - Aucune valeur inventée : les mois proviennent EXACTEMENT de closedWindows.

import { SPECIES, SPECIES_BY_DB_KEY } from '@/lib/seo/programmatic'
import type { SpeciesSlug } from '@/lib/seo/programmatic'
import { SPECIES_REGULATION } from '@/lib/regulation/data'

/** Combien de jours avant le 1er du mois de fermeture on prévient (fenêtre de J-N). */
export const CLOSURE_LEAD_DAYS = 7

export type UpcomingClosure = {
  slug: SpeciesSlug
  /** dbKey d'origine (favorite_species), pour idempotence/déduplication éventuelle. */
  dbKey: string
  /** Mois (1-12) où la fermeture commence. */
  startMonth: number
  /** Libellé FR minuscule de l'espèce (« lieu jaune »…). */
  speciesLabelLower: string
  /** Copie FR prête à l'emploi (sans tiret cadratin). */
  previewText: string
}

/**
 * Vrai si le mois `month` (1-12) est le PREMIER mois d'une fenêtre de fermeture
 * (le mois précédent, en cyclant sur l'année, n'est pas lui-même fermé). Évite de
 * traiter chaque mois d'une fermeture pluri-mois comme un nouveau « début ».
 */
function isClosureStartMonth(months: number[], month: number): boolean {
  if (!months.includes(month)) return false
  const prev = month === 1 ? 12 : month - 1
  return !months.includes(prev)
}

/**
 * Pour une date `now`, renvoie les fermetures d'espèces favorites qui COMMENCENT dans
 * exactement la fenêtre J-`leadDays` (c.-à-d. le 1er du mois de fermeture tombe entre
 * demain et J+leadDays). On déduplique par espèce (une seule notif par espèce/an).
 *
 * `favoriteDbKeys` = profiles.favorite_species (dbKeys underscore). Pur et testable.
 */
export function getUpcomingClosuresForFavorites(
  favoriteDbKeys: readonly string[] | null | undefined,
  now: Date = new Date(),
  leadDays: number = CLOSURE_LEAD_DAYS,
): UpcomingClosure[] {
  if (!favoriteDbKeys || favoriteDbKeys.length === 0) return []

  const out: UpcomingClosure[] = []
  const seen = new Set<SpeciesSlug>()

  for (const dbKey of favoriteDbKeys) {
    // Normalisation underscore → slug kebab (favori inconnu = ignoré).
    const slug = SPECIES_BY_DB_KEY[dbKey]
    if (!slug || seen.has(slug)) continue

    const reg = SPECIES_REGULATION[slug]
    if (!reg || reg.closedWindows.length === 0) continue

    // Mois de DÉBUT de fermeture, tous fenêtres confondues pour cette espèce.
    const startMonths = new Set<number>()
    for (const w of reg.closedWindows) {
      for (const m of w.months) {
        if (isClosureStartMonth(w.months, m)) startMonths.add(m)
      }
    }
    if (startMonths.size === 0) continue

    // Le 1er du prochain mois de début tombe-t-il dans (maintenant, J+leadDays] ?
    const hitMonth = nextStartMonthWithinLead(startMonths, now, leadDays)
    if (hitMonth == null) continue

    const meta = SPECIES[slug]
    out.push({
      slug,
      dbKey,
      startMonth: hitMonth,
      speciesLabelLower: meta.labelLower,
      previewText: closurePreviewText(meta.articleDe, meta.labelLower),
    })
    seen.add(slug)
  }

  return out
}

/**
 * Parmi les mois de début `startMonths` (1-12), renvoie celui dont le 1er du mois tombe
 * dans la fenêtre (now, now+leadDays jours], ou null. On regarde l'année courante puis
 * l'année suivante (cas d'une fermeture en janvier vue fin décembre). Comparaison sur
 * le jour civil (heure ignorée) pour une fenêtre J-N stable.
 */
function nextStartMonthWithinLead(
  startMonths: Set<number>,
  now: Date,
  leadDays: number,
): number | null {
  const todayMid = atMidnight(now)
  const horizon = atMidnight(new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000))

  for (const yearOffset of [0, 1]) {
    for (const month of startMonths) {
      const firstOfMonth = new Date(now.getFullYear() + yearOffset, month - 1, 1)
      const firstMid = atMidnight(firstOfMonth)
      // Strictement après aujourd'hui (on ne notifie pas le jour J ni après le début)
      // et au plus tard à l'horizon J+leadDays.
      if (firstMid.getTime() > todayMid.getTime() && firstMid.getTime() <= horizon.getTime()) {
        return month
      }
    }
  }
  return null
}

function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Copie FR du push « fermeture qui arrive » (sans tiret cadratin). `articleDe` =
 * « du »/« de la »/« de l' » (espace final sauf élision) à coller au libellé minuscule.
 */
export function closurePreviewText(articleDe: string, speciesLabelLower: string): string {
  return `La fermeture ${articleDe}${speciesLabelLower} commence bientôt. Pense à en profiter avant.`
}
