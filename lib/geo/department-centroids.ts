import { COASTAL_DEFAULT_CENTER } from '@/lib/map/utils'

// Centres géographiques approximatifs [lng, lat] des départements côtiers FR.
// Utiles pour recentrer la carte sur un département sélectionné.
export const DEPARTMENT_CENTROIDS: Record<string, [number, number]> = {
  // Manche / Atlantique
  '14': [-0.36, 49.10], // Calvados
  '17': [-0.88, 45.75], // Charente-Maritime
  '22': [-2.88, 48.42], // Côtes-d'Armor
  '29': [-4.02, 48.18], // Finistère
  '33': [-0.60, 44.80], // Gironde
  '35': [-1.65, 48.15], // Ille-et-Vilaine
  '40': [-0.78, 43.95], // Landes
  '44': [-1.65, 47.35], // Loire-Atlantique
  '50': [-1.50, 49.10], // Manche
  '56': [-2.80, 47.85], // Morbihan
  '59': [3.15, 50.52],  // Nord
  '62': [2.30, 50.52],  // Pas-de-Calais
  '64': [-0.75, 43.30], // Pyrénées-Atlantiques
  '76': [1.00, 49.65],  // Seine-Maritime
  '85': [-1.30, 46.65], // Vendée
  // Méditerranée
  '06': [7.18, 43.93],  // Alpes-Maritimes
  '11': [2.48, 43.22],  // Aude
  '13': [5.15, 43.52],  // Bouches-du-Rhône
  '30': [4.15, 43.95],  // Gard
  '34': [3.40, 43.60],  // Hérault
  '66': [2.55, 42.60],  // Pyrénées-Orientales
  '83': [6.12, 43.42],  // Var
  '2A': [8.95, 41.72],  // Corse-du-Sud
  '2B': [9.22, 42.40],  // Haute-Corse
}

export function getCenterForDepartment(
  code: string,
  fallback: [number, number] = COASTAL_DEFAULT_CENTER
): [number, number] {
  return DEPARTMENT_CENTROIDS[code] ?? fallback
}
