/**
 * Point de référence côtier par département (lat/lng en mer, proche du
 * littoral) — sert au bandeau instruments de l'app (marées/météo du
 * département principal du profil). Données statiques, pas de logique.
 * Whitelist canonique : lib/geo/departments.ts.
 */
export const DEPARTMENT_SEA_COORDS: Record<string, { lat: number; lng: number; place: string }> = {
  // Manche / Atlantique
  '14': { lat: 49.3, lng: -0.25, place: 'Ouistreham' },
  '17': { lat: 46.15, lng: -1.22, place: 'La Rochelle' },
  '22': { lat: 48.67, lng: -2.83, place: 'Saint-Quay-Portrieux' },
  '29': { lat: 48.3, lng: -4.6, place: 'Brest (Iroise)' },
  '33': { lat: 45.0, lng: -1.25, place: 'Lacanau' },
  '35': { lat: 48.69, lng: -2.03, place: 'Saint-Malo' },
  '40': { lat: 43.65, lng: -1.5, place: 'Capbreton' },
  '44': { lat: 47.22, lng: -2.38, place: 'Pornichet' },
  '50': { lat: 49.67, lng: -1.62, place: 'Cherbourg' },
  '56': { lat: 47.45, lng: -3.15, place: 'Quiberon' },
  '59': { lat: 51.06, lng: 2.35, place: 'Dunkerque' },
  '62': { lat: 50.74, lng: 1.55, place: 'Boulogne-sur-Mer' },
  '64': { lat: 43.49, lng: -1.58, place: 'Biarritz' },
  '76': { lat: 49.95, lng: 1.07, place: 'Dieppe' },
  '80': { lat: 50.2, lng: 1.45, place: 'Cayeux-sur-Mer' },
  '85': { lat: 46.46, lng: -1.83, place: 'Les Sables-d’Olonne' },
  // Méditerranée
  '06': { lat: 43.66, lng: 7.25, place: 'Nice' },
  '11': { lat: 43.09, lng: 3.15, place: 'Gruissan' },
  '13': { lat: 43.25, lng: 5.35, place: 'Marseille' },
  '30': { lat: 43.5, lng: 4.15, place: 'Le Grau-du-Roi' },
  '34': { lat: 43.37, lng: 3.7, place: 'Sète' },
  '66': { lat: 42.68, lng: 3.08, place: 'Canet-en-Roussillon' },
  '83': { lat: 43.08, lng: 5.93, place: 'Toulon' },
  '2A': { lat: 41.88, lng: 8.7, place: 'Ajaccio' },
  '2B': { lat: 42.7, lng: 9.48, place: 'Bastia' },
}
