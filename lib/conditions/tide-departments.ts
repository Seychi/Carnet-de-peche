import { isCoastalDepartment } from '@/lib/geo/departments'

// ── Mapping PUR département côtier → façade / port de référence (sprint 83) ────
//
// Ce module ne contient QUE de la donnée et des fonctions pures. Il a été extrait
// de `lib/conditions/tide-calibration.ts`, qui importe `@/lib/supabase/server` au
// niveau module : importer ce dernier depuis un module de titres SEO (testé en
// environnement `node`) ferait entrer une dépendance serveur dans du code pur,
// exactement le piège « barrel client/serveur » du sprint 22.
//
// `tide-calibration.ts` ré-exporte tout ce qui suit : la source de vérité reste
// unique, et aucun site d'import existant n'a bougé.
//
// Historique (sprint 38, F3 + fix offset) : l'audit `docs/sprint-38/
// tide-calibration-results.md` a montré que l'erreur Open-Meteo vs SHOM est
// presque entièrement un décalage de phase CONSTANT par port.
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

export const DEPARTMENT_FACADE: Record<string, Facade> = {
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

/**
 * Vrai pour un département dont la marée est calibrée sur un port audité, donc
 * dont le marnage est réel et l'horaire de PM/BM digne d'être promis.
 * Faux pour la Méditerranée, la Corse, et tout département non côtier.
 *
 * ⚠️ Attend un code déjà « propre ». La colonne `spots.department` est en
 * `char(3)` : elle revient complétée par des espaces, d'où le `trim()`.
 */
export function isCalibratedTideDepartment(department: string): boolean {
  return DEPARTMENT_FACADE[String(department).trim()] !== undefined
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
