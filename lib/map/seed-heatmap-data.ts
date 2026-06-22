// Données de seed de la HEATMAP (Carte v2 / C1) — DEV/PREVIEW uniquement.
// But : créer des PRISES PUBLIQUES géolocalisées et GROUPÉES pour que la heatmap
// k-anonyme (RPC get_catch_heatmap, K=3) ait au moins quelques « zones chaudes » à
// afficher avant l'arrivée des vraies prises beta. Réutilise les 6 pêcheurs de
// SEED_AUTHORS (lib/feed/seed-data) pour garantir des user_id DISTINCTS.
//
// 🔒 K-anonymat & fiabilité : chaque zone reçoit 8 prises de 5 pêcheurs DISTINCTS,
// centrées sur un NŒUD de grille 0.20° (lng/lat multiples de 0.20).
// ⚠️ Le trigger catches_blur réécrit geom_public avec un jitter ALÉATOIRE ±0.009°
// (~1 km) — c'est LUI qui disperse les points, pas notre micro-décalage. En centrant
// sur un nœud de grille, ce jitter ±1 km reste DANS la maille à tous les paliers de
// zoom régional/local (cellules 0.20 / 0.10 / 0.05°, demi-maille >= 0.025° >> 0.009°)
// → la maille agrège >= 3 prises de >= 3 pêcheurs → K=3 fiable. (Au zoom max, cellule
// 0.01°, le k-anonymat peut masquer la maille : sens sûr, pas un bug.)
//
// Les prises de seed portent location_label = SEED_HEAT_LABEL pour une suppression
// idempotente ciblée (sans toucher au seed du fil ni aux vraies prises).

export const SEED_HEAT_LABEL = 'seed-heatmap-c1'

export type HeatSeedCatch = {
  authorIdx: number // index dans SEED_AUTHORS
  species: string
  sizeCm: number
  weightG: number
  daysAgo: number
  dLng: number // micro-décalage (immatériel face au jitter ±0.009° du flou)
  dLat: number
}

export type HeatSeedZone = {
  key: string
  label: string
  department: string
  lng: number // centre = NŒUD de grille 0.20° (multiple de 0.20), coordonnée côtière crédible
  lat: number
  catches: HeatSeedCatch[]
}

// Micro-décalages quasi nuls : le vrai éparpillement vient du jitter du trigger.
const SPREAD: Array<[number, number]> = [
  [0.0008, 0.0006], [-0.0007, 0.0009], [0.0005, -0.0008], [-0.0009, -0.0004],
  [0.001, 0.0003], [-0.0004, 0.001], [0.0006, -0.0006], [-0.0003, -0.0009],
]

function zone(
  key: string, label: string, department: string, lng: number, lat: number,
  picks: Array<{ authorIdx: number; species: string; sizeCm: number; weightG: number; daysAgo: number }>,
): HeatSeedZone {
  return {
    key, label, department, lng, lat,
    catches: picks.map((p, i) => ({ ...p, dLng: SPREAD[i % SPREAD.length][0], dLat: SPREAD[i % SPREAD.length][1] })),
  }
}

// 3 zones côtières bretonnes (29/56/22), centres sur nœuds 0.20°, 8 prises / 5 pêcheurs distincts.
export const SEED_HEAT_ZONES: HeatSeedZone[] = [
  zone('iroise', 'Mer d’Iroise (29)', '29', -4.6, 48.4, [
    { authorIdx: 0, species: 'bar',           sizeCm: 62, weightG: 2400, daysAgo: 1 },
    { authorIdx: 1, species: 'dorade_royale', sizeCm: 38, weightG: 1100, daysAgo: 2 },
    { authorIdx: 2, species: 'lieu_jaune',    sizeCm: 55, weightG: 1800, daysAgo: 1 },
    { authorIdx: 4, species: 'bar',           sizeCm: 48, weightG: 1300, daysAgo: 3 },
    { authorIdx: 5, species: 'maquereau',     sizeCm: 31, weightG: 380,  daysAgo: 2 },
    { authorIdx: 0, species: 'bar',           sizeCm: 70, weightG: 3100, daysAgo: 4 },
    { authorIdx: 2, species: 'lieu_jaune',    sizeCm: 44, weightG: 1050, daysAgo: 2 },
    { authorIdx: 4, species: 'sar',           sizeCm: 34, weightG: 720,  daysAgo: 5 },
  ]),
  zone('quiberon', 'Baie de Quiberon (56)', '56', -3.2, 47.6, [
    { authorIdx: 2, species: 'bar',           sizeCm: 58, weightG: 2000, daysAgo: 1 },
    { authorIdx: 3, species: 'dorade_royale', sizeCm: 42, weightG: 1400, daysAgo: 2 },
    { authorIdx: 4, species: 'lieu_jaune',    sizeCm: 49, weightG: 1500, daysAgo: 2 },
    { authorIdx: 5, species: 'maquereau',     sizeCm: 29, weightG: 320,  daysAgo: 1 },
    { authorIdx: 0, species: 'bar',           sizeCm: 52, weightG: 1600, daysAgo: 3 },
    { authorIdx: 3, species: 'sar',           sizeCm: 33, weightG: 700,  daysAgo: 5 },
    { authorIdx: 2, species: 'orphie',        sizeCm: 61, weightG: 330,  daysAgo: 2 },
    { authorIdx: 5, species: 'dorade_royale', sizeCm: 36, weightG: 980,  daysAgo: 4 },
  ]),
  zone('brehat', 'Paimpol – Bréhat (22)', '22', -3.0, 48.8, [
    { authorIdx: 4, species: 'lieu_jaune',    sizeCm: 60, weightG: 2200, daysAgo: 1 },
    { authorIdx: 5, species: 'orphie',        sizeCm: 64, weightG: 350,  daysAgo: 2 },
    { authorIdx: 0, species: 'bar',           sizeCm: 56, weightG: 1900, daysAgo: 3 },
    { authorIdx: 1, species: 'maquereau',     sizeCm: 30, weightG: 340,  daysAgo: 1 },
    { authorIdx: 2, species: 'bar',           sizeCm: 47, weightG: 1250, daysAgo: 4 },
    { authorIdx: 4, species: 'lieu_jaune',    sizeCm: 44, weightG: 1050, daysAgo: 2 },
    { authorIdx: 1, species: 'dorade_royale', sizeCm: 40, weightG: 1200, daysAgo: 3 },
    { authorIdx: 5, species: 'maquereau',     sizeCm: 28, weightG: 300,  daysAgo: 5 },
  ]),
]
