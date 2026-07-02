// ─── Signal « grande marée » du LENDEMAIN pour le mode générique (sprint 72) ───
// PUR (aucune I/O) : adapte le pattern S49 getBigTideForDay (lib/notifications/
// big-tide) qui lit week[0] = AUJOURD'HUI, alors que les alertes par port raisonnent
// sur DEMAIN. Ici l'appelant (lib/alerts/engine) fournit les extrema de marée du
// lendemain déjà fetchés pour le spot → zéro appel réseau en plus, zéro duplication
// de la chaîne forecast.
//
// INVARIANTS (identiques à S49, non négociables) :
// - AUCUN coefficient inventé : le repo n'en calcule aucun (tide_coefficient toujours
//   null). Le signal est un MARNAGE MESURÉ (max PM - min BM) comparé au seuil de façade.
// - Seuils par façade (décision John D2, S49) : Manche > 9 m ; Atlantique > 5 m ;
//   Méditerranée / Corse → JAMAIS (marnage météo-dominé, pas de seuil sain).
// - Le signal est DESCRIPTIF : il porte rangeM + thresholdM, c'est
//   genericSignalQualifies (lib/alerts/decision) qui tranche l'envoi.

import {
  tideRangeFromExtrema,
  MANCHE_THRESHOLD_M,
  ATLANTIQUE_THRESHOLD_M,
  MANCHE_DEPARTMENTS,
} from '@/lib/notifications/big-tide'
import {
  isLowTidalRangeDepartment,
  referencePortForDepartment,
} from '@/lib/conditions/tide-calibration'
import type { GenericTideSignal } from './types'

// Seuils/façades : importés de lib/notifications/big-tide (S49, exportés en revue
// S72) — une seule source de vérité, les deux greffons ne peuvent plus diverger.
export { MANCHE_THRESHOLD_M, ATLANTIQUE_THRESHOLD_M }

/**
 * Signal grande marée d'UN jour (les extrema fournis par l'appelant : ici, DEMAIN),
 * pour le mode générique (cold start). Renvoie null quand :
 *  - département absent, Méditerranée/Corse (jamais de grande marée, décision D2),
 *  - département sans façade marée mappée (pas de port de référence),
 *  - données de marée insuffisantes (< 1 PM ou < 1 BM → pas de chiffre faux).
 *
 * ⚠️ Renvoie le signal MÊME si le seuil n'est pas dépassé : la décision d'envoi
 * appartient à genericSignalQualifies (rangeM > thresholdM STRICT). On sépare la
 * mesure (ici) du jugement (decision.ts).
 */
export function genericTideSignalForDay(
  extrema: { type: 'high' | 'low'; height_m: number }[],
  department: string | null | undefined,
): GenericTideSignal | null {
  const dept = String(department ?? '').trim()
  if (!dept) return null

  // Méditerranée / Corse : marnage trop faible, jamais d'alerte grande marée.
  if (isLowTidalRangeDepartment(dept)) return null

  // Pas de façade marée mappée (département inconnu / non couvert) → pas de signal.
  if (!referencePortForDepartment(dept)) return null

  const rangeM = tideRangeFromExtrema(extrema)
  if (rangeM == null) return null

  const thresholdM = MANCHE_DEPARTMENTS.has(dept) ? MANCHE_THRESHOLD_M : ATLANTIQUE_THRESHOLD_M
  return { type: 'marnage', rangeM, thresholdM }
}
