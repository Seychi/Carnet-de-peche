// Helper « grande marée » (sprint 49 « Push & engagement », émetteur big-tide).
//
// Greffé dans le cron personal-window (~07:00) : ZÉRO appel réseau en plus. On
// réutilise fetchSpotForecastWeek (caché 1h) déjà appelé par le pipeline de fenêtre
// du département, et on lit le marnage RÉEL du jour à partir des extrema de marée.
//
// INVARIANTS NON NÉGOCIABLES :
// - MARNAGE RÉEL = max(extrema.high) - min(extrema.low) du jour, dérivé de
//   sea_level_height_msl (Open-Meteo). JAMAIS de coefficient inventé : on ne fabrique
//   pas de « coef 95 », on mesure une amplitude en mètres.
// - Seuils « grande marée » par façade (décision John D2) :
//     Manche      > 9 m
//     Atlantique  > 5 m
//     Méditerranée → JAMAIS (marnage trop faible, marée météo-dominée)
//   La façade est tranchée via le mapping existant (lib/conditions/tide-calibration).
// - Pas de tier gating (décision John D1) : la grande marée est un hook d'engagement
//   ouvert à TOUS les tiers, gratuit inclus.

import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'
import {
  referencePortForDepartment,
  isLowTidalRangeDepartment,
} from '@/lib/conditions/tide-calibration'

// ⚠️ fetchSpotForecastWeek (lib/conditions/spot-forecast) tire `server-only` via le
// client service-role : un import statique casserait l'évaluation hors runtime serveur
// (vitest, modules client). On l'importe DYNAMIQUEMENT à l'usage (modèle create.ts /
// send.ts). Aucun coût réseau en plus : la fonction est cachée 1h, keyée lat/lng.

// Seuils de marnage (m) au-delà desquels on parle de « grande marée », par façade.
// Médée volontairement absente : pas de notif (marnage trop faible pour un seuil sain).
const MANCHE_THRESHOLD_M = 9
const ATLANTIQUE_THRESHOLD_M = 5

/** Façade marée d'un département côtier, ou null (Méditerranée / non couvert). */
function tideFacadeForDepartment(dept: string): 'manche' | 'atlantique' | null {
  const d = String(dept).trim()
  // referencePortForDepartment ne renvoie un port que pour Manche/Atlantique mappés.
  if (!referencePortForDepartment(d)) return null
  // On distingue Manche d'Atlantique via le seuil : on lit la façade depuis le même
  // mapping (port étalon). Les ports Manche sont Saint-Malo ; sinon Atlantique.
  // Plus robuste : on s'appuie sur le tableau de façades exporté indirectement par
  // referencePortForDepartment, mais comme il n'expose pas la façade, on reclasse via
  // le seuil de marnage (cf seuils D2). Pour rester exact, on mappe explicitement.
  return MANCHE_DEPARTMENTS.has(d) ? 'manche' : 'atlantique'
}

// Départements façade Manche (calqué sur DEPARTMENT_FACADE de tide-calibration, qui
// n'exporte pas la map directement). Le reste des départements couverts = Atlantique.
const MANCHE_DEPARTMENTS = new Set<string>(['14', '50', '76', '59', '62', '35', '22'])

export type BigTideResult = {
  /** Marnage RÉEL du jour (m) = max(high) - min(low) des extrema. */
  rangeM: number
  /** Seuil de la façade dépassé (m). */
  thresholdM: number
  facade: 'manche' | 'atlantique'
}

/**
 * Marnage du jour pour le département, et indication « grande marée » si le seuil de
 * la façade est dépassé. Renvoie null quand :
 *  - le département n'a pas de point de référence côtier connu,
 *  - la façade est non concernée (Méditerranée / faible marnage),
 *  - les données marée du jour sont indisponibles ou insuffisantes (< 1 high ET 1 low),
 *  - le seuil n'est PAS dépassé (pas une grande marée → pas de notif).
 *
 * Aucun appel réseau supplémentaire : fetchSpotForecastWeek est mémoïsé/caché 1h et
 * déjà sollicité par le pipeline de fenêtre du même département dans le même run.
 */
export async function getBigTideForDay(dept: string): Promise<BigTideResult | null> {
  const d = String(dept).trim()

  // Méditerranée / faible marnage : jamais de grande marée (décision D2).
  if (isLowTidalRangeDepartment(d)) return null

  const facade = tideFacadeForDepartment(d)
  if (!facade) return null

  const coords = DEPARTMENT_SEA_COORDS[d]
  if (!coords) return null

  // Import dynamique (isolation server-only, cf en-tête). Caché 1h.
  const { fetchSpotForecastWeek } = await import('@/lib/conditions/spot-forecast')
  const week = await fetchSpotForecastWeek(coords.lat, coords.lng)
  const today = week[0]
  if (!today) return null

  const range = tideRangeFromExtrema(today.tide.extrema)
  if (range == null) return null

  const thresholdM = facade === 'manche' ? MANCHE_THRESHOLD_M : ATLANTIQUE_THRESHOLD_M
  if (range <= thresholdM) return null

  return { rangeM: range, thresholdM, facade }
}

/**
 * Marnage RÉEL (m) d'un jour = max(hauteur des pleines mers) - min(hauteur des basses
 * mers). Pur, testable, sans aucune notion de coefficient. Renvoie null s'il manque
 * au moins une PM ou une BM dans la journée (donnée insuffisante → pas de chiffre faux).
 */
export function tideRangeFromExtrema(
  extrema: { type: 'high' | 'low'; height_m: number }[],
): number | null {
  const highs = extrema.filter((e) => e.type === 'high').map((e) => e.height_m)
  const lows = extrema.filter((e) => e.type === 'low').map((e) => e.height_m)
  if (highs.length === 0 || lows.length === 0) return null
  const range = Math.max(...highs) - Math.min(...lows)
  if (!Number.isFinite(range) || range <= 0) return null
  return range
}

/** Copie FR du push « grande marée » (sans tiret cadratin). Marnage arrondi à 0,1 m. */
export function bigTidePreviewText(rangeM: number): string {
  const rounded = Math.round(rangeM * 10) / 10
  // Format français : virgule décimale.
  const label = rounded.toFixed(1).replace('.', ',')
  return `Grande marée aujourd'hui : marnage de ${label} m. La mer va beaucoup bouger.`
}
