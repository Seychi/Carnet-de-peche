import { createClient } from '@/lib/supabase/server'
import { isCoastalDepartment } from '@/lib/geo/departments'

// ── Calibration marées par port de référence (sprint 38, F3 + fix offset) ──────
// Source unique du mapping département côtier → port de référence audité, et lecture
// de la ligne `tide_calibration` (table publique). L'audit (docs/sprint-38/
// tide-calibration-results.md) a montré que l'erreur Open-Meteo vs SHOM est presque
// entièrement un décalage de phase CONSTANT par port (biais signé), le résidu après
// correction étant petit (1 à 8 min). On applique donc l'offset = -bias_min aux heures
// de PM/BM affichées (décision John : v2 offset activée).
//
// Méditerranée volontairement absente : micro-marée surtout météorologique, non
// auditée → pas d'encart ni d'offset (plutôt qu'un faux chiffre).

export type Facade = 'manche' | 'atlantique'

const FACADE_REFERENCE_PORT: Record<Facade, string> = {
  manche: 'Saint-Malo',
  atlantique: 'Brest',
}

// Atlantique : chaque département rattaché au port étalon audité le plus représentatif.
const ATLANTIC_PORT_BY_DEPARTMENT: Record<string, string> = {
  '29': 'Brest', // Finistère
  '56': 'Pornichet', // Morbihan
  '44': 'Pornichet', // Loire-Atlantique
  '85': "Les Sables-d'Olonne", // Vendée
  '17': "Les Sables-d'Olonne", // Charente-Maritime
  '33': 'Arcachon (Eyrac)', // Gironde
  '40': 'Arcachon (Eyrac)', // Landes
  '64': 'Arcachon (Eyrac)', // Pyrénées-Atlantiques
}

const DEPARTMENT_FACADE: Record<string, Facade> = {
  // Manche / mer du Nord
  '14': 'manche', // Calvados
  '50': 'manche', // Manche
  '76': 'manche', // Seine-Maritime
  '59': 'manche', // Nord
  '62': 'manche', // Pas-de-Calais
  '35': 'manche', // Ille-et-Vilaine (Saint-Malo)
  '22': 'manche', // Côtes-d'Armor (côte nord Bretagne)
  // Atlantique
  '29': 'atlantique', // Finistère
  '56': 'atlantique', // Morbihan
  '44': 'atlantique', // Loire-Atlantique
  '85': 'atlantique', // Vendée
  '17': 'atlantique', // Charente-Maritime
  '33': 'atlantique', // Gironde
  '40': 'atlantique', // Landes
  '64': 'atlantique', // Pyrénées-Atlantiques
  // Méditerranée → volontairement non mappée (pas d'encart ni d'offset)
}

/** Port de référence audité pour un département côtier (null si non couvert). */
export function referencePortForDepartment(department: string): string | null {
  const dept = String(department).trim()
  const facade = DEPARTMENT_FACADE[dept]
  if (!facade) return null
  if (facade === 'atlantique') {
    return ATLANTIC_PORT_BY_DEPARTMENT[dept] ?? FACADE_REFERENCE_PORT.atlantique
  }
  return FACADE_REFERENCE_PORT[facade]
}

/**
 * Vrai pour un département côtier à FAIBLE marnage (Méditerranée + Corse) : pas de
 * façade Manche/Atlantique mappée, donc marée surtout météo-dominée et non auditée.
 * Sert à afficher une note honnête « marnage faible » au lieu d'un trou silencieux
 * sur la fiche spot, là où l'encart de calibration ne s'applique pas.
 */
export function isLowTidalRangeDepartment(department: string): boolean {
  const dept = String(department).trim()
  return isCoastalDepartment(dept) && !DEPARTMENT_FACADE[dept]
}

export type TideCalibration = {
  port: string
  /** Écart médian brut mesuré (min) Open-Meteo vs SHOM, avant correction. */
  medianErrorMin: number
  /** Biais signé médian (min). Négatif = Open-Meteo en avance sur le SHOM. */
  biasMin: number
  /** Écart médian résiduel (min) APRÈS application de l'offset. La précision réelle. */
  residualMin: number | null
  /**
   * Offset à AJOUTER aux heures de PM/BM dérivées d'Open-Meteo pour les caler sur le
   * SHOM = -biasMin (un biais négatif/avance → on décale plus tard). En minutes.
   */
  offsetMinutes: number
  verifiedAt: string | null
  source: string | null
}

/**
 * Calibration marée du port de référence d'un département (lecture serveur de la
 * table publique `tide_calibration`). null si département non couvert (ex.
 * Méditerranée) ou table sans donnée pour ce port.
 */
export async function getTideCalibration(
  department: string,
): Promise<TideCalibration | null> {
  const refPort = referencePortForDepartment(department)
  if (!refPort) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('tide_calibration')
    .select('port, median_error_min, bias_min, residual_min, verified_at, source')
    .eq('port', refPort)
    .maybeSingle()

  if (!data || data.median_error_min == null || data.bias_min == null) return null

  return {
    port: data.port,
    medianErrorMin: data.median_error_min,
    biasMin: data.bias_min,
    residualMin: data.residual_min ?? null,
    offsetMinutes: -data.bias_min,
    verifiedAt: data.verified_at,
    source: data.source,
  }
}

/**
 * Données d'AFFICHAGE du chip compact « marées ±N min · calé SHOM » (sprint 48, WS D).
 * Logique d'affichage pure : ne lit que la calibration déjà mesurée du port de
 * référence (aucune donnée fabriquée, aucun port inventé). Renvoie null pour les
 * départements non couverts (Méditerranée, table vide) → le chip ne s'affiche pas
 * et le comportement actuel (TideCalibrationNote / note marnage faible) tient.
 *
 * `residualMin` = écart résiduel arrondi vs SHOM (la précision réelle, jamais « à la
 * minute »). `auditedMonthsAgo` = fraîcheur relative dérivée de `verified_at`.
 */
export type TideAccuracyChip = {
  port: string
  residualMin: number
  /** Nombre de mois écoulés depuis l'audit (>= 0), ou null si verified_at absent/invalide. */
  auditedMonthsAgo: number | null
}

export async function getTideAccuracyChip(
  department: string,
): Promise<TideAccuracyChip | null> {
  const cal = await getTideCalibration(department)
  if (!cal) return null

  // Résidu mesuré après correction du biais ; fallback sur l'écart brut si absent.
  const residual = cal.residualMin ?? cal.medianErrorMin
  return {
    port: cal.port,
    residualMin: Math.round(residual),
    auditedMonthsAgo: monthsAgo(cal.verifiedAt),
  }
}

/** Nombre de mois pleins écoulés depuis une date ISO (>= 0), null si absente/invalide. */
export function monthsAgo(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  return Math.max(0, months)
}
