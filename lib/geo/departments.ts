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
  '80', // Somme
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
  '80': 'Somme',
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
