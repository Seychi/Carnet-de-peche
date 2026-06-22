export const COASTAL_DEPARTMENTS: readonly string[] = [
  // Manche / Atlantique
  '14', // Calvados
  '17', // Charente-Maritime
  '22', // Côtes-d'Armor
  '29', // Finistère
  '33', // Gironde
  '35', // Ille-et-Vilaine
  '40', // Landes
  '44', // Loire-Atlantique
  '50', // Manche
  '56', // Morbihan
  '59', // Nord
  '62', // Pas-de-Calais
  '64', // Pyrénées-Atlantiques
  '76', // Seine-Maritime
  '85', // Vendée
  // Méditerranée
  '06', // Alpes-Maritimes
  '11', // Aude
  '13', // Bouches-du-Rhône
  '30', // Gard
  '34', // Hérault
  '66', // Pyrénées-Orientales
  '83', // Var
  '2A', // Corse-du-Sud
  '2B', // Haute-Corse
] as const

export function isCoastalDepartment(dept: string): boolean {
  return COASTAL_DEPARTMENTS.includes(dept)
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  '14': 'Calvados',
  '17': 'Charente-Maritime',
  '22': "Côtes-d'Armor",
  '29': 'Finistère',
  '33': 'Gironde',
  '35': 'Ille-et-Vilaine',
  '40': 'Landes',
  '44': 'Loire-Atlantique',
  '50': 'Manche',
  '56': 'Morbihan',
  '59': 'Nord',
  '62': 'Pas-de-Calais',
  '64': 'Pyrénées-Atlantiques',
  '76': 'Seine-Maritime',
  '85': 'Vendée',
  '06': 'Alpes-Maritimes',
  '11': 'Aude',
  '13': 'Bouches-du-Rhône',
  '30': 'Gard',
  '34': 'Hérault',
  '66': 'Pyrénées-Orientales',
  '83': 'Var',
  '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse',
}

/**
 * Liste { code, label } prête pour les <select> (onboarding étape 2 + profil).
 * Source unique : COASTAL_DEPARTMENTS / DEPARTMENT_LABELS ci-dessus.
 * Tri : numérique croissant puis Corse (2A, 2B) en fin.
 */
export const DEPARTMENT_OPTIONS: { code: string; label: string }[] =
  [...COASTAL_DEPARTMENTS]
    .sort((a, b) => {
      // ⚠️ parseInt('2A') = 2 (pas NaN) → on teste explicitement le format
      // purement numérique. Les codes Corse (2A/2B) passent en fin de liste.
      const na = /^\d+$/.test(a) ? parseInt(a, 10) : Number.POSITIVE_INFINITY
      const nb = /^\d+$/.test(b) ? parseInt(b, 10) : Number.POSITIVE_INFINITY
      if (na === nb) return a.localeCompare(b) // 2A < 2B
      return na - nb
    })
    .map((code) => ({ code, label: `${code} — ${DEPARTMENT_LABELS[code]}` }))

/**
 * Région administrative par département côtier — utilisée pour remplir
 * `spots.region` (NOT NULL) lors d'une proposition community (lib/spots) ou
 * d'un import OSM (scripts/import-osm-spots.ts). Source unique.
 */
export const DEPARTMENT_REGION: Record<string, string> = {
  '14': 'Normandie',
  '50': 'Normandie',
  '76': 'Normandie',
  '59': 'Hauts-de-France',
  '62': 'Hauts-de-France',
  '22': 'Bretagne',
  '29': 'Bretagne',
  '35': 'Bretagne',
  '56': 'Bretagne',
  '44': 'Pays de la Loire',
  '85': 'Pays de la Loire',
  '17': 'Nouvelle-Aquitaine',
  '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine',
  '64': 'Nouvelle-Aquitaine',
  '11': 'Occitanie',
  '30': 'Occitanie',
  '34': 'Occitanie',
  '66': 'Occitanie',
  '06': 'Provence-Alpes-Côte d’Azur',
  '13': 'Provence-Alpes-Côte d’Azur',
  '83': 'Provence-Alpes-Côte d’Azur',
  '2A': 'Corse',
  '2B': 'Corse',
}

export function regionForDepartment(dept: string): string {
  return DEPARTMENT_REGION[dept.trim()] ?? ''
}
